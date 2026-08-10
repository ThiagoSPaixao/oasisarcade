ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_customer_id text,
  ADD COLUMN IF NOT EXISTS provider_subscription_id text,
  ADD COLUMN IF NOT EXISTS price_id text,
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_provider_subscription_id_key
  ON public.subscriptions (provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.payment_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  environment text NOT NULL,
  provider text NOT NULL DEFAULT 'stripe',
  user_id uuid,
  received_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.register_payment_event(
  _event_id text,
  _event_type text,
  _environment text,
  _user_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _inserted boolean := false;
BEGIN
  IF _event_id IS NULL OR _event_id = '' THEN RAISE EXCEPTION 'missing event id'; END IF;
  INSERT INTO public.payment_events (event_id, event_type, environment, user_id)
  VALUES (_event_id, _event_type, _environment, _user_id)
  ON CONFLICT (event_id) DO NOTHING;
  _inserted := FOUND;
  RETURN _inserted;
END; $$;

REVOKE ALL ON FUNCTION public.register_payment_event(text, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_payment_event(text, text, text, uuid) TO service_role;

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

  UPDATE public.profiles p
     SET plano_status = CASE WHEN _plan = 'premium' AND _status = 'active' THEN 'premium'::plan_status ELSE 'free'::plan_status END,
         updated_at = now()
   WHERE p.id = _user_id;
END; $$;

REVOKE ALL ON FUNCTION public.apply_provider_subscription(uuid, plan_status, text, text, text, text, text, text, timestamptz, timestamptz, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_provider_subscription(uuid, plan_status, text, text, text, text, text, text, timestamptz, timestamptz, boolean) TO service_role;