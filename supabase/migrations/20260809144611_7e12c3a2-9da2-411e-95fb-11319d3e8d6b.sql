-- 1. PROFILES: restrict client-editable columns to username/avatar_url
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (username, avatar_url) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 2. USER_SCORES: reads only from the client; writes go through RPC
DROP POLICY IF EXISTS "own scores" ON public.user_scores;
CREATE POLICY "own scores select" ON public.user_scores
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.user_scores FROM authenticated;
GRANT SELECT ON public.user_scores TO authenticated;
GRANT ALL ON public.user_scores TO service_role;

-- anti-cheat groundwork (nullable, non-breaking)
ALTER TABLE public.user_scores
  ADD COLUMN IF NOT EXISTS duration_ms integer,
  ADD COLUMN IF NOT EXISTS difficulty text,
  ADD COLUMN IF NOT EXISTS game_version text,
  ADD COLUMN IF NOT EXISTS played_at timestamptz NOT NULL DEFAULT now();

-- 3. SUBSCRIPTIONS: read-only from client
DROP POLICY IF EXISTS "own subscription" ON public.subscriptions;
CREATE POLICY "own subscription select" ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- 4. Indexes for RLS/query columns
CREATE INDEX IF NOT EXISTS user_scores_user_id_idx ON public.user_scores (user_id);
CREATE INDEX IF NOT EXISTS user_scores_game_slug_score_idx ON public.user_scores (game_slug, score DESC);
CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON public.favorites (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions (user_id);

-- 5. XP grant (server authority)
CREATE OR REPLACE FUNCTION public.grant_xp(_amount integer)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.profiles;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'invalid xp amount'; END IF;
  IF _amount > 5000 THEN _amount := 5000; END IF;

  UPDATE public.profiles p
     SET xp = p.xp + _amount,
         level = GREATEST(1, ((p.xp + _amount) / 500) + 1),
         updated_at = now()
   WHERE p.id = _uid
  RETURNING * INTO _row;

  RETURN _row;
END; $$;
REVOKE ALL ON FUNCTION public.grant_xp(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_xp(integer) TO authenticated;

-- 6. Atomic personal-record submission
CREATE OR REPLACE FUNCTION public.submit_score(
  _game_slug text,
  _score integer,
  _duration_ms integer DEFAULT NULL,
  _difficulty text DEFAULT NULL,
  _game_version text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_record boolean := false;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _score IS NULL OR _score < 0 THEN RAISE EXCEPTION 'invalid score'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.games g WHERE g.slug = _game_slug) THEN
    RAISE EXCEPTION 'unknown game';
  END IF;
  IF _duration_ms IS NOT NULL AND _duration_ms < 0 THEN _duration_ms := NULL; END IF;

  INSERT INTO public.user_scores (user_id, game_slug, score, duration_ms, difficulty, game_version, played_at)
  VALUES (_uid, _game_slug, _score, _duration_ms, left(coalesce(_difficulty, ''), 32), left(coalesce(_game_version, ''), 32), now())
  ON CONFLICT (user_id, game_slug) DO UPDATE
    SET score = EXCLUDED.score,
        duration_ms = EXCLUDED.duration_ms,
        difficulty = EXCLUDED.difficulty,
        game_version = EXCLUDED.game_version,
        played_at = EXCLUDED.played_at
    WHERE public.user_scores.score < EXCLUDED.score;

  _is_record := FOUND;
  RETURN _is_record;
END; $$;
REVOKE ALL ON FUNCTION public.submit_score(text, integer, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_score(text, integer, integer, text, text) TO authenticated;

-- 7. Development-only subscription simulation (no payment gateway)
CREATE OR REPLACE FUNCTION public.simulate_subscription(_plan public.plan_status)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.profiles;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  INSERT INTO public.subscriptions (user_id, plan, status, current_period_end)
  VALUES (_uid, _plan, 'active', CASE WHEN _plan = 'premium' THEN now() + interval '30 days' ELSE NULL END)
  ON CONFLICT (user_id) DO UPDATE
    SET plan = EXCLUDED.plan,
        status = EXCLUDED.status,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = now();

  UPDATE public.profiles p
     SET plano_status = _plan, updated_at = now()
   WHERE p.id = _uid
  RETURNING * INTO _row;

  RETURN _row;
END; $$;
REVOKE ALL ON FUNCTION public.simulate_subscription(public.plan_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.simulate_subscription(public.plan_status) TO authenticated;