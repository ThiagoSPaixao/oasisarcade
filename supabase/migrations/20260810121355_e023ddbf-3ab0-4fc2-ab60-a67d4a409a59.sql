-- 1. Uma assinatura por jogador POR AMBIENTE (sandbox, live, comped)
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS is_comped boolean NOT NULL DEFAULT false;
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_key;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_id_environment_key UNIQUE (user_id, environment);

-- 2. Estado da assinatura, agora por ambiente + cortesia
CREATE OR REPLACE FUNCTION public.subscription_state_for(_user_id uuid, _environment text DEFAULT 'live')
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _sub public.subscriptions;
  _plan text;
  _status text;
  _premium boolean := false;
  _future boolean := false;
  _interval text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('plan', 'free', 'status', 'free', 'isPremium', false,
      'currentPeriodEnd', NULL, 'priceId', NULL, 'interval', NULL,
      'cancelAtPeriodEnd', false, 'isComped', false);
  END IF;

  SELECT * INTO _sub
    FROM public.subscriptions
   WHERE user_id = _user_id
     AND (is_comped OR environment = coalesce(_environment, 'live'))
   ORDER BY is_comped DESC, updated_at DESC
   LIMIT 1;

  IF _sub.user_id IS NULL THEN
    RETURN jsonb_build_object('plan', 'free', 'status', 'free', 'isPremium', false,
      'currentPeriodEnd', NULL, 'priceId', NULL, 'interval', NULL,
      'cancelAtPeriodEnd', false, 'isComped', false);
  END IF;

  -- Cortesia vitalícia: sempre Premium, em qualquer ambiente.
  IF _sub.is_comped THEN
    RETURN jsonb_build_object('plan', 'premium', 'status', 'active', 'isPremium', true,
      'currentPeriodEnd', NULL, 'priceId', _sub.price_id, 'interval', NULL,
      'cancelAtPeriodEnd', false, 'isComped', true);
  END IF;

  _plan := _sub.plan::text;
  _future := _sub.current_period_end IS NULL OR _sub.current_period_end > now();
  _interval := CASE
    WHEN _sub.price_id IS NULL THEN NULL
    WHEN _sub.price_id LIKE '%yearly%' THEN 'yearly'
    WHEN _sub.price_id LIKE '%monthly%' THEN 'monthly'
    ELSE NULL END;

  IF _plan <> 'premium' THEN
    _status := 'free';
  ELSIF _sub.status IN ('cancelled', 'canceled') THEN
    _status := CASE WHEN _sub.current_period_end IS NOT NULL AND _future THEN 'cancelled' ELSE 'expired' END;
  ELSIF _sub.status = 'past_due' THEN
    _status := 'past_due';
  ELSIF _sub.current_period_end IS NOT NULL AND NOT _future THEN
    _status := 'expired';
  ELSIF _sub.status = 'active' THEN
    _status := 'active';
  ELSE
    _status := coalesce(nullif(_sub.status, ''), 'free');
  END IF;

  _premium := _plan = 'premium' AND (
    _status = 'active' OR _status = 'past_due' OR (_status = 'cancelled' AND _future));

  RETURN jsonb_build_object(
    'plan', _plan,
    'status', _status,
    'isPremium', _premium,
    'currentPeriodEnd', _sub.current_period_end,
    'priceId', _sub.price_id,
    'interval', _interval,
    'cancelAtPeriodEnd', coalesce(_sub.cancel_at_period_end, false),
    'isComped', false
  );
END; $function$;

-- 3. Acesso a jogo por ambiente
CREATE OR REPLACE FUNCTION public.can_play_game_for(_user_id uuid, _game_slug text, _environment text DEFAULT 'live')
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
  RETURN coalesce((public.subscription_state_for(_user_id, _environment) ->> 'isPremium')::boolean, false);
END; $function$;

-- 4. Sessão de partida ciente do ambiente
CREATE OR REPLACE FUNCTION public.start_game_session_for(_user_id uuid, _game_slug text, _environment text DEFAULT 'live')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _id uuid; _recent integer;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'missing user'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.games WHERE slug = _game_slug AND state = 'playable') THEN
    RAISE EXCEPTION 'unknown or unavailable game';
  END IF;
  IF NOT public.can_play_game_for(_user_id, _game_slug, _environment) THEN
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
END; $function$;

-- 5. Pontuação ciente do ambiente
CREATE OR REPLACE FUNCTION public.submit_score_for(_user_id uuid, _game_slug text, _score integer, _session_id uuid, _duration_ms integer DEFAULT NULL::integer, _difficulty text DEFAULT NULL::text, _game_version text DEFAULT NULL::text, _environment text DEFAULT 'live')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _is_record boolean := false;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'missing user'; END IF;
  IF _score IS NULL OR _score < 0 THEN RAISE EXCEPTION 'invalid score'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.games g WHERE g.slug = _game_slug) THEN
    RAISE EXCEPTION 'unknown game';
  END IF;
  IF NOT public.can_play_game_for(_user_id, _game_slug, _environment) THEN
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
END; $function$;

-- 6. Progressão ciente do ambiente (XP em dobro só com Premium válido no ambiente)
CREATE OR REPLACE FUNCTION public.process_game_result_for(_user_id uuid, _game_slug text, _score integer, _session_id uuid, _is_record boolean DEFAULT false, _environment text DEFAULT 'live')
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
  IF NOT public.can_play_game_for(_user_id, _game_slug, _environment) THEN
    RAISE EXCEPTION 'premium access required';
  END IF;
  IF _score IS NULL OR _score < 0 THEN _score := 0; END IF;
  IF _score > 100000000 THEN _score := 100000000; END IF;
  IF NOT public.validate_game_session_for(_user_id, _game_slug, _session_id, _score) THEN
    RAISE EXCEPTION 'invalid game session';
  END IF;

  SELECT level, coalesce((public.subscription_state_for(_user_id, _environment) ->> 'isPremium')::boolean, false)
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

-- 7. Sincronização com o provedor: chave de conflito agora inclui o ambiente
CREATE OR REPLACE FUNCTION public.apply_provider_subscription(_user_id uuid, _plan plan_status, _status text, _provider text, _provider_customer_id text, _provider_subscription_id text, _price_id text, _environment text, _current_period_start timestamp with time zone, _current_period_end timestamp with time zone, _cancel_at_period_end boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _ach public.achievements;
  _is_premium boolean;
  _env text := coalesce(nullif(_environment, ''), 'live');
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'missing user'; END IF;

  INSERT INTO public.subscriptions (
    user_id, plan, status, provider, provider_customer_id, provider_subscription_id,
    price_id, environment, current_period_start, current_period_end, cancel_at_period_end
  ) VALUES (
    _user_id, _plan, _status, _provider, _provider_customer_id, _provider_subscription_id,
    _price_id, _env, _current_period_start, _current_period_end, coalesce(_cancel_at_period_end, false)
  )
  ON CONFLICT (user_id, environment) DO UPDATE SET
    plan = EXCLUDED.plan,
    status = EXCLUDED.status,
    provider = EXCLUDED.provider,
    provider_customer_id = coalesce(EXCLUDED.provider_customer_id, public.subscriptions.provider_customer_id),
    provider_subscription_id = coalesce(EXCLUDED.provider_subscription_id, public.subscriptions.provider_subscription_id),
    price_id = coalesce(EXCLUDED.price_id, public.subscriptions.price_id),
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    updated_at = now();

  PERFORM public.refresh_plan_cache_for(_user_id);
  _is_premium := coalesce((public.subscription_state_for(_user_id, _env) ->> 'isPremium')::boolean, false);

  IF _is_premium THEN
    SELECT * INTO _ach FROM public.achievements WHERE slug = 'premium_supporter';
    IF _ach.id IS NOT NULL THEN
      INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (_user_id, _ach.id)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      IF FOUND AND _ach.xp_reward > 0 THEN
        PERFORM public.grant_xp_for(_user_id, _ach.xp_reward);
      END IF;
    END IF;
  END IF;
END; $function$;

-- 8. Cache do selo Premium exibido (perfil/ranking) sempre coerente
CREATE OR REPLACE FUNCTION public.refresh_plan_cache_for(_user_id uuid)
RETURNS plan_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _premium boolean;
BEGIN
  _premium := coalesce((public.subscription_state_for(_user_id, 'live') ->> 'isPremium')::boolean, false)
           OR coalesce((public.subscription_state_for(_user_id, 'sandbox') ->> 'isPremium')::boolean, false);

  UPDATE public.profiles
     SET plano_status = CASE WHEN _premium THEN 'premium'::plan_status ELSE 'free'::plan_status END,
         updated_at = now()
   WHERE id = _user_id
     AND plano_status IS DISTINCT FROM CASE WHEN _premium THEN 'premium'::plan_status ELSE 'free'::plan_status END;

  RETURN CASE WHEN _premium THEN 'premium'::plan_status ELSE 'free'::plan_status END;
END; $function$;

CREATE OR REPLACE FUNCTION public.reconcile_plan_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _row record; _count integer := 0;
BEGIN
  FOR _row IN SELECT id FROM public.profiles LOOP
    PERFORM public.refresh_plan_cache_for(_row.id);
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END; $function$;

-- 9. Novo perfil de permissões: nenhuma dessas funções é chamável pelo cliente
REVOKE ALL ON FUNCTION public.subscription_state_for(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_play_game_for(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.start_game_session_for(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_score_for(uuid, text, integer, uuid, integer, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_game_result_for(uuid, text, integer, uuid, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_provider_subscription(uuid, plan_status, text, text, text, text, text, text, timestamptz, timestamptz, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_plan_cache_for(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reconcile_plan_cache() FROM PUBLIC, anon, authenticated;

-- 10. Assinaturas antigas com aridade menor deixam de existir (evita chamada sem ambiente)
DROP FUNCTION IF EXISTS public.subscription_state_for(uuid);
DROP FUNCTION IF EXISTS public.can_play_game_for(uuid, text);
DROP FUNCTION IF EXISTS public.start_game_session_for(uuid, text);
DROP FUNCTION IF EXISTS public.submit_score_for(uuid, text, integer, uuid, integer, text, text);
DROP FUNCTION IF EXISTS public.process_game_result_for(uuid, text, integer, uuid, boolean);

-- 11. Novo jogador: linha gratuita criada no ambiente correto de conflito
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''), split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $function$;

-- 12. Rotina diária de conferência do selo Premium
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$
BEGIN
  PERFORM cron.unschedule('reconcile-plan-cache');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT cron.schedule('reconcile-plan-cache', '17 5 * * *', $$SELECT public.reconcile_plan_cache();$$);