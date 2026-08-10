-- 1) Conquista de boas-vindas do Premium
INSERT INTO public.achievements (slug, name, description, icon, category, xp_reward, is_hidden, sort_order)
VALUES ('premium_supporter', 'Apoiador do Oásis', 'Ativou o Oásis Premium e apoiou o arcade.', 'crown', 'premium', 300, false, 100)
ON CONFLICT (slug) DO NOTHING;

-- 2) Estado da assinatura: carência no cancelamento + pagamento pendente
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
  _future boolean := false;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('plan', 'free', 'status', 'free', 'isPremium', false, 'currentPeriodEnd', NULL);
  END IF;

  SELECT * INTO _sub FROM public.subscriptions WHERE user_id = _user_id;
  SELECT plano_status INTO _legacy FROM public.profiles WHERE id = _user_id;

  IF _sub.user_id IS NULL THEN
    _plan := coalesce(_legacy::text, 'free');
    _premium := _plan = 'premium';
    _status := CASE WHEN _premium THEN 'active' ELSE 'free' END;
    RETURN jsonb_build_object('plan', _plan, 'status', _status, 'isPremium', _premium, 'currentPeriodEnd', NULL);
  END IF;

  _plan := _sub.plan::text;
  _future := _sub.current_period_end IS NULL OR _sub.current_period_end > now();

  IF _plan <> 'premium' THEN
    _status := 'free';
  ELSIF _sub.status IN ('cancelled', 'canceled') THEN
    -- Cancelou: mantém acesso até o fim do período já pago.
    _status := CASE WHEN _sub.current_period_end IS NOT NULL AND _future THEN 'cancelled' ELSE 'expired' END;
  ELSIF _sub.status = 'past_due' THEN
    -- Cobrança com problema: acesso preservado durante as retentativas.
    _status := 'past_due';
  ELSIF _sub.current_period_end IS NOT NULL AND NOT _future THEN
    _status := 'expired';
  ELSIF _sub.status = 'active' THEN
    _status := 'active';
  ELSE
    _status := coalesce(nullif(_sub.status, ''), 'free');
  END IF;

  _premium := _plan = 'premium' AND (
    _status = 'active'
    OR _status = 'past_due'
    OR (_status = 'cancelled' AND _future)
  );

  RETURN jsonb_build_object(
    'plan', _plan,
    'status', _status,
    'isPremium', _premium,
    'currentPeriodEnd', _sub.current_period_end
  );
END; $function$;

-- 3) Aplicação da assinatura do provedor + recompensa única de boas-vindas
CREATE OR REPLACE FUNCTION public.apply_provider_subscription(
  _user_id uuid,
  _plan plan_status,
  _status text,
  _provider text,
  _provider_customer_id text,
  _provider_subscription_id text,
  _price_id text,
  _environment text,
  _current_period_start timestamptz,
  _current_period_end timestamptz,
  _cancel_at_period_end boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _ach public.achievements;
  _is_premium boolean;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'missing user'; END IF;

  INSERT INTO public.subscriptions (
    user_id, plan, status, provider, provider_customer_id, provider_subscription_id,
    price_id, environment, current_period_start, current_period_end, cancel_at_period_end
  ) VALUES (
    _user_id, _plan, _status, _provider, _provider_customer_id, _provider_subscription_id,
    _price_id, _environment, _current_period_start, _current_period_end, coalesce(_cancel_at_period_end, false)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan = EXCLUDED.plan,
    status = EXCLUDED.status,
    provider = EXCLUDED.provider,
    provider_customer_id = coalesce(EXCLUDED.provider_customer_id, public.subscriptions.provider_customer_id),
    provider_subscription_id = coalesce(EXCLUDED.provider_subscription_id, public.subscriptions.provider_subscription_id),
    price_id = coalesce(EXCLUDED.price_id, public.subscriptions.price_id),
    environment = EXCLUDED.environment,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    updated_at = now();

  _is_premium := coalesce((public.subscription_state_for(_user_id) ->> 'isPremium')::boolean, false);

  UPDATE public.profiles p
     SET plano_status = CASE WHEN _is_premium THEN 'premium'::plan_status ELSE 'free'::plan_status END,
         updated_at = now()
   WHERE p.id = _user_id;

  -- Conquista de boas-vindas: uma única vez por jogador.
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
END; $$;

REVOKE ALL ON FUNCTION public.apply_provider_subscription(uuid, plan_status, text, text, text, text, text, text, timestamptz, timestamptz, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_provider_subscription(uuid, plan_status, text, text, text, text, text, text, timestamptz, timestamptz, boolean) TO service_role;

-- 4) Selo Premium no ranking (sem expor ids internos)
CREATE OR REPLACE VIEW public.leaderboard_public AS
  SELECT le.game_slug,
         le.username,
         le.level,
         le.score,
         le.scored_at,
         coalesce(p.plano_status = 'premium'::plan_status, false) AS is_premium
    FROM public.leaderboard_entries le
    LEFT JOIN public.profiles p ON p.id = le.user_id;