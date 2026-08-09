DROP FUNCTION IF EXISTS public.grant_xp(integer);
DROP FUNCTION IF EXISTS public.submit_score(text, integer, integer, text, text);
DROP FUNCTION IF EXISTS public.simulate_subscription(public.plan_status);

CREATE OR REPLACE FUNCTION public.grant_xp_for(_user_id uuid, _amount integer)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.profiles;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'missing user'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'invalid xp amount'; END IF;
  IF _amount > 5000 THEN _amount := 5000; END IF;

  UPDATE public.profiles p
     SET xp = p.xp + _amount,
         level = GREATEST(1, ((p.xp + _amount) / 500) + 1),
         updated_at = now()
   WHERE p.id = _user_id
  RETURNING * INTO _row;

  RETURN _row;
END; $$;
REVOKE ALL ON FUNCTION public.grant_xp_for(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_xp_for(uuid, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.submit_score_for(
  _user_id uuid,
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
  _is_record boolean := false;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'missing user'; END IF;
  IF _score IS NULL OR _score < 0 THEN RAISE EXCEPTION 'invalid score'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.games g WHERE g.slug = _game_slug) THEN
    RAISE EXCEPTION 'unknown game';
  END IF;
  IF _duration_ms IS NOT NULL AND _duration_ms < 0 THEN _duration_ms := NULL; END IF;

  INSERT INTO public.user_scores (user_id, game_slug, score, duration_ms, difficulty, game_version, played_at)
  VALUES (_user_id, _game_slug, _score, _duration_ms, nullif(left(coalesce(_difficulty, ''), 32), ''), nullif(left(coalesce(_game_version, ''), 32), ''), now())
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
REVOKE ALL ON FUNCTION public.submit_score_for(uuid, text, integer, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_score_for(uuid, text, integer, integer, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.simulate_subscription_for(_user_id uuid, _plan public.plan_status)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.profiles;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'missing user'; END IF;

  INSERT INTO public.subscriptions (user_id, plan, status, current_period_end)
  VALUES (_user_id, _plan, 'active', CASE WHEN _plan = 'premium' THEN now() + interval '30 days' ELSE NULL END)
  ON CONFLICT (user_id) DO UPDATE
    SET plan = EXCLUDED.plan,
        status = EXCLUDED.status,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = now();

  UPDATE public.profiles p
     SET plano_status = _plan, updated_at = now()
   WHERE p.id = _user_id
  RETURNING * INTO _row;

  RETURN _row;
END; $$;
REVOKE ALL ON FUNCTION public.simulate_subscription_for(uuid, public.plan_status) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.simulate_subscription_for(uuid, public.plan_status) TO service_role;