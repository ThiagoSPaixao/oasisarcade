-- Sprint 06: autoridade de plano/assinatura no banco (sem pagamentos).
-- Fonte da verdade: public.subscriptions. profiles.plano_status permanece como cache derivado.

CREATE OR REPLACE FUNCTION public.subscription_state_for(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _sub public.subscriptions;
  _legacy public.plan_status;
  _plan text;
  _status text;
  _premium boolean := false;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('plan', 'free', 'status', 'free', 'isPremium', false, 'currentPeriodEnd', NULL);
  END IF;

  SELECT * INTO _sub FROM public.subscriptions WHERE user_id = _user_id;
  SELECT plano_status INTO _legacy FROM public.profiles WHERE id = _user_id;

  IF _sub.user_id IS NULL THEN
    -- Compatibilidade legada: perfis antigos sem linha de assinatura.
    _plan := coalesce(_legacy::text, 'free');
    _premium := _plan = 'premium';
    _status := CASE WHEN _premium THEN 'active' ELSE 'free' END;
    RETURN jsonb_build_object('plan', _plan, 'status', _status, 'isPremium', _premium, 'currentPeriodEnd', NULL);
  END IF;

  _plan := _sub.plan::text;

  IF _plan <> 'premium' THEN
    _status := 'free';
  ELSIF _sub.status = 'cancelled' OR _sub.status = 'canceled' THEN
    _status := 'cancelled';
  ELSIF _sub.current_period_end IS NOT NULL AND _sub.current_period_end < now() THEN
    _status := 'expired';
  ELSIF _sub.status = 'active' THEN
    _status := 'active';
  ELSE
    _status := coalesce(nullif(_sub.status, ''), 'free');
  END IF;

  _premium := _plan = 'premium' AND _status = 'active';

  RETURN jsonb_build_object(
    'plan', _plan,
    'status', _status,
    'isPremium', _premium,
    'currentPeriodEnd', _sub.current_period_end
  );
END; $function$;

CREATE OR REPLACE FUNCTION public.can_play_game_for(_user_id uuid, _game_slug text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _is_premium_game boolean;
BEGIN
  SELECT is_premium INTO _is_premium_game FROM public.games WHERE slug = _game_slug;
  IF _is_premium_game IS NULL THEN RETURN false; END IF;
  IF NOT _is_premium_game THEN RETURN true; END IF;
  IF _user_id IS NULL THEN RETURN false; END IF;
  RETURN coalesce((public.subscription_state_for(_user_id) ->> 'isPremium')::boolean, false);
END; $function$;

REVOKE ALL ON FUNCTION public.subscription_state_for(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_play_game_for(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.subscription_state_for(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_play_game_for(uuid, text) TO service_role;

-- Score: exige autorização de acesso ao jogo.
CREATE OR REPLACE FUNCTION public.submit_score_for(_user_id uuid, _game_slug text, _score integer, _duration_ms integer DEFAULT NULL::integer, _difficulty text DEFAULT NULL::text, _game_version text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _is_record boolean := false;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'missing user'; END IF;
  IF _score IS NULL OR _score < 0 THEN RAISE EXCEPTION 'invalid score'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.games g WHERE g.slug = _game_slug) THEN
    RAISE EXCEPTION 'unknown game';
  END IF;
  IF NOT public.can_play_game_for(_user_id, _game_slug) THEN
    RAISE EXCEPTION 'premium access required';
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
END; $function$;

-- Fila de pontuações enviada pelo cliente: mesma autorização.
CREATE OR REPLACE FUNCTION public.process_score_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _recent_count integer;
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
END;
$function$;

-- XP / streak / desafio / conquistas: só para execução autorizada.
CREATE OR REPLACE FUNCTION public.process_game_result_for(_user_id uuid, _game_slug text, _score integer, _is_record boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
END; $function$;