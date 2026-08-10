-- 1. Sessões de partida: base verificável para pontuação e XP
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_slug text NOT NULL REFERENCES public.games(slug),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '6 hours',
  validated_score integer,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS game_sessions_user_idx ON public.game_sessions (user_id, game_slug, started_at DESC);

GRANT SELECT ON public.game_sessions TO authenticated;
GRANT ALL ON public.game_sessions TO service_role;

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own game sessions select" ON public.game_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 2. Abertura de sessão (somente servidor)
CREATE OR REPLACE FUNCTION public.start_game_session_for(_user_id uuid, _game_slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _id uuid; _recent integer;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'missing user'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.games WHERE slug = _game_slug AND state = 'playable') THEN
    RAISE EXCEPTION 'unknown or unavailable game';
  END IF;
  IF NOT public.can_play_game_for(_user_id, _game_slug) THEN
    RAISE EXCEPTION 'premium access required';
  END IF;

  SELECT count(*) INTO _recent FROM public.game_sessions
   WHERE user_id = _user_id AND started_at > now() - interval '1 minute';
  IF _recent >= 30 THEN RAISE EXCEPTION 'too many sessions'; END IF;

  DELETE FROM public.game_sessions
   WHERE user_id = _user_id AND expires_at < now() - interval '1 day';

  INSERT INTO public.game_sessions (user_id, game_slug)
  VALUES (_user_id, _game_slug)
  RETURNING id INTO _id;

  RETURN _id;
END; $$;

-- 3. Validação da partida: tempo mínimo e pontuação coerente com a duração
CREATE OR REPLACE FUNCTION public.validate_game_session_for(_user_id uuid, _game_slug text, _session_id uuid, _score integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _s public.game_sessions; _elapsed numeric; _max_score numeric;
BEGIN
  IF _user_id IS NULL OR _session_id IS NULL THEN RETURN false; END IF;

  SELECT * INTO _s FROM public.game_sessions
   WHERE id = _session_id AND user_id = _user_id AND game_slug = _game_slug;
  IF _s.id IS NULL THEN RETURN false; END IF;
  IF _s.expires_at < now() THEN RETURN false; END IF;

  _elapsed := extract(epoch FROM (now() - _s.started_at));
  IF _elapsed < 2 THEN RETURN false; END IF;

  -- Teto de plausibilidade: pontos possíveis dentro do tempo realmente jogado.
  _max_score := 300 * _elapsed + 1000;
  IF coalesce(_score, 0) > _max_score THEN RETURN false; END IF;

  -- A mesma sessão só pode confirmar uma pontuação.
  IF _s.validated_score IS NOT NULL AND _s.validated_score <> _score THEN RETURN false; END IF;

  UPDATE public.game_sessions
     SET validated_score = _score,
         validated_at = coalesce(validated_at, now())
   WHERE id = _s.id;

  RETURN true;
END; $$;

-- 4. Pontuação só entra com sessão válida
DROP FUNCTION IF EXISTS public.submit_score_for(uuid, text, integer, integer, text, text);
CREATE OR REPLACE FUNCTION public.submit_score_for(_user_id uuid, _game_slug text, _score integer, _session_id uuid, _duration_ms integer DEFAULT NULL::integer, _difficulty text DEFAULT NULL::text, _game_version text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _is_record boolean := false;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'missing user'; END IF;
  IF _score IS NULL OR _score < 0 THEN RAISE EXCEPTION 'invalid score'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.games g WHERE g.slug = _game_slug) THEN
    RAISE EXCEPTION 'unknown game';
  END IF;
  IF NOT public.can_play_game_for(_user_id, _game_slug) THEN
    RAISE EXCEPTION 'premium access required';
  END IF;
  IF NOT public.validate_game_session_for(_user_id, _game_slug, _session_id, _score) THEN
    RAISE EXCEPTION 'invalid game session';
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

DROP FUNCTION IF EXISTS public.submit_score(text, integer, integer, text, text);

-- 5. Fila de envio exige sessão
ALTER TABLE public.score_submissions ADD COLUMN IF NOT EXISTS session_id uuid;

CREATE OR REPLACE FUNCTION public.process_score_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _recent_count integer;
BEGIN
  IF NEW.user_id IS NULL OR NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'invalid player';
  END IF;
  IF NEW.score < 0 OR NEW.score > 100000000 THEN
    RAISE EXCEPTION 'invalid score';
  END IF;
  IF NEW.duration_ms IS NOT NULL AND (NEW.duration_ms < 0 OR NEW.duration_ms > 86400000) THEN
    RAISE EXCEPTION 'invalid duration';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.games WHERE slug = NEW.game_slug AND state = 'playable') THEN
    RAISE EXCEPTION 'unknown or unavailable game';
  END IF;
  IF NOT public.can_play_game_for(NEW.user_id, NEW.game_slug) THEN
    RAISE EXCEPTION 'premium access required';
  END IF;
  IF NOT public.validate_game_session_for(NEW.user_id, NEW.game_slug, NEW.session_id, NEW.score) THEN
    RAISE EXCEPTION 'invalid game session';
  END IF;

  SELECT count(*) INTO _recent_count
  FROM public.score_submissions
  WHERE user_id = NEW.user_id
    AND submitted_at > now() - interval '10 seconds';
  IF _recent_count >= 5 THEN
    RAISE EXCEPTION 'too many submissions';
  END IF;

  NEW.difficulty := nullif(left(coalesce(NEW.difficulty, ''), 32), '');
  NEW.game_version := nullif(left(coalesce(NEW.game_version, ''), 32), '');
  NEW.submitted_at := now();

  INSERT INTO public.user_scores (user_id, game_slug, score, duration_ms, difficulty, game_version, played_at)
  VALUES (NEW.user_id, NEW.game_slug, NEW.score, NEW.duration_ms, NEW.difficulty, NEW.game_version, NEW.submitted_at)
  ON CONFLICT (user_id, game_slug) DO UPDATE
    SET score = EXCLUDED.score,
        duration_ms = EXCLUDED.duration_ms,
        difficulty = EXCLUDED.difficulty,
        game_version = EXCLUDED.game_version,
        played_at = EXCLUDED.played_at
    WHERE public.user_scores.score < EXCLUDED.score;

  RETURN NEW;
END; $$;

-- 6. Progressão (XP, streak, desafio, conquistas) exige sessão válida
DROP FUNCTION IF EXISTS public.process_game_result_for(uuid, text, integer, boolean);
CREATE OR REPLACE FUNCTION public.process_game_result_for(_user_id uuid, _game_slug text, _score integer, _session_id uuid, _is_record boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'America/Recife')::date;
  _premium boolean;
  _level_before integer;
  _xp_gain integer;
  _stats public.user_stats;
  _act public.user_daily_activity;
  _challenge public.daily_challenges;
  _progress integer := 0;
  _challenge_reward integer := 0;
  _challenge_completed boolean := false;
  _profile public.profiles;
  _unlocked jsonb;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'missing user'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.games WHERE slug = _game_slug) THEN
    RAISE EXCEPTION 'unknown game';
  END IF;
  IF NOT public.can_play_game_for(_user_id, _game_slug) THEN
    RAISE EXCEPTION 'premium access required';
  END IF;
  IF _score IS NULL OR _score < 0 THEN _score := 0; END IF;
  IF _score > 100000000 THEN _score := 100000000; END IF;
  IF NOT public.validate_game_session_for(_user_id, _game_slug, _session_id, _score) THEN
    RAISE EXCEPTION 'invalid game session';
  END IF;

  SELECT level, coalesce((public.subscription_state_for(_user_id) ->> 'isPremium')::boolean, false)
    INTO _level_before, _premium
    FROM public.profiles WHERE id = _user_id;
  IF _level_before IS NULL THEN RAISE EXCEPTION 'missing profile'; END IF;

  INSERT INTO public.user_stats (user_id, plays_total, records_total, best_score, games_played,
                                 current_streak, longest_streak, last_activity_date)
  VALUES (_user_id, 1, CASE WHEN _is_record THEN 1 ELSE 0 END, _score, ARRAY[_game_slug], 1, 1, _today)
  ON CONFLICT (user_id) DO UPDATE SET
    plays_total = public.user_stats.plays_total + 1,
    records_total = public.user_stats.records_total + CASE WHEN _is_record THEN 1 ELSE 0 END,
    best_score = GREATEST(public.user_stats.best_score, _score),
    games_played = CASE WHEN _game_slug = ANY (public.user_stats.games_played)
                        THEN public.user_stats.games_played
                        ELSE public.user_stats.games_played || _game_slug END,
    current_streak = CASE
      WHEN public.user_stats.last_activity_date = _today THEN public.user_stats.current_streak
      WHEN public.user_stats.last_activity_date = _today - 1 THEN public.user_stats.current_streak + 1
      ELSE 1 END,
    longest_streak = GREATEST(public.user_stats.longest_streak, CASE
      WHEN public.user_stats.last_activity_date = _today THEN public.user_stats.current_streak
      WHEN public.user_stats.last_activity_date = _today - 1 THEN public.user_stats.current_streak + 1
      ELSE 1 END),
    last_activity_date = _today
  RETURNING * INTO _stats;

  _xp_gain := GREATEST(1, LEAST(2000, _score / 10)) * CASE WHEN _premium THEN 2 ELSE 1 END;
  PERFORM public.grant_xp_for(_user_id, _xp_gain);

  _challenge := public.daily_challenge_for(_today);
  INSERT INTO public.user_daily_activity (user_id, activity_date, plays, played_slugs, challenge_slug)
  VALUES (_user_id, _today, 1, ARRAY[_game_slug], _challenge.slug)
  ON CONFLICT (user_id, activity_date) DO UPDATE SET
    plays = public.user_daily_activity.plays + 1,
    played_slugs = CASE WHEN _game_slug = ANY (public.user_daily_activity.played_slugs)
                        THEN public.user_daily_activity.played_slugs
                        ELSE public.user_daily_activity.played_slugs || _game_slug END,
    challenge_slug = COALESCE(public.user_daily_activity.challenge_slug, _challenge.slug)
  RETURNING * INTO _act;

  IF _challenge.slug IS NOT NULL AND _act.challenge_slug = _challenge.slug THEN
    _progress := CASE _challenge.type
      WHEN 'plays' THEN _act.plays
      WHEN 'games' THEN coalesce(array_length(_act.played_slugs, 1), 0)
      WHEN 'score' THEN CASE WHEN _challenge.game_slug IS NULL OR _challenge.game_slug = _game_slug
                             THEN GREATEST(_act.challenge_progress, _score)
                             ELSE _act.challenge_progress END
      ELSE 0 END;

    UPDATE public.user_daily_activity
       SET challenge_progress = GREATEST(challenge_progress, _progress),
           challenge_completed_at = CASE
             WHEN challenge_completed_at IS NOT NULL THEN challenge_completed_at
             WHEN _progress >= _challenge.target THEN now()
             ELSE NULL END
     WHERE user_id = _user_id AND activity_date = _today
       AND (challenge_completed_at IS NULL OR challenge_progress < _progress)
    RETURNING * INTO _act;
  END IF;

  SELECT * INTO _act FROM public.user_daily_activity WHERE user_id = _user_id AND activity_date = _today;
  IF _challenge.slug IS NOT NULL AND _act.challenge_completed_at IS NOT NULL
     AND _act.challenge_slug = _challenge.slug
     AND NOT EXISTS (
       SELECT 1 FROM public.user_challenge_rewards r
       WHERE r.user_id = _user_id AND r.activity_date = _today) THEN
    INSERT INTO public.user_challenge_rewards (user_id, activity_date, challenge_slug, xp_reward)
    VALUES (_user_id, _today, _challenge.slug, _challenge.xp_reward)
    ON CONFLICT (user_id, activity_date) DO NOTHING;
    IF FOUND AND _challenge.xp_reward > 0 THEN
      PERFORM public.grant_xp_for(_user_id, _challenge.xp_reward);
      _challenge_reward := _challenge.xp_reward;
      _challenge_completed := true;
    END IF;
  END IF;

  _unlocked := public.evaluate_achievements_for(_user_id);

  SELECT * INTO _profile FROM public.profiles WHERE id = _user_id;

  RETURN jsonb_build_object(
    'xpGained', _xp_gain,
    'xp', _profile.xp,
    'level', _profile.level,
    'levelUp', _profile.level > _level_before,
    'previousLevel', _level_before,
    'currentStreak', _stats.current_streak,
    'longestStreak', _stats.longest_streak,
    'challengeCompleted', _challenge_completed,
    'challengeXp', _challenge_reward,
    'unlocked', _unlocked
  );
END; $$;

-- 7. Remove atalhos sem uso legítimo (XP direto e simulação de plano)
DROP FUNCTION IF EXISTS public.grant_xp(integer);
DROP FUNCTION IF EXISTS public.simulate_subscription(plan_status);
DROP FUNCTION IF EXISTS public.simulate_subscription_for(uuid, plan_status);

-- 8. Ranking público sem visão de permissões elevadas
DROP VIEW IF EXISTS public.leaderboard_public;
DROP FUNCTION IF EXISTS public.get_leaderboard(text, integer);
CREATE OR REPLACE FUNCTION public.get_leaderboard(_game_slug text, _limit integer DEFAULT 20)
RETURNS TABLE(rank integer, username text, level integer, score integer, created_at timestamp with time zone, is_premium boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (row_number() OVER (ORDER BY le.score DESC, le.scored_at ASC))::int AS rank,
         le.username,
         le.level,
         le.score,
         le.scored_at AS created_at,
         coalesce(p.plano_status = 'premium'::plan_status, false) AS is_premium
  FROM public.leaderboard_entries le
  LEFT JOIN public.profiles p ON p.id = le.user_id
  WHERE le.game_slug = _game_slug
  ORDER BY le.score DESC, le.scored_at ASC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 20), 1), 100)
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard(text, integer) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.start_game_session_for(uuid, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_game_session_for(uuid, text, uuid, integer) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_score_for(uuid, text, integer, uuid, integer, text, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.process_game_result_for(uuid, text, integer, uuid, boolean) FROM anon, authenticated;