-- Self-scoped wrappers callable by the authenticated user via the public Data API
CREATE OR REPLACE FUNCTION public.submit_score(
  _game_slug text,
  _score integer,
  _duration_ms integer DEFAULT NULL,
  _difficulty text DEFAULT NULL,
  _game_version text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  RETURN public.submit_score_for(_uid, _game_slug, _score, _duration_ms, _difficulty, _game_version);
END; $$;

CREATE OR REPLACE FUNCTION public.grant_xp(_amount integer)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  RETURN public.grant_xp_for(_uid, _amount);
END; $$;

CREATE OR REPLACE FUNCTION public.simulate_subscription(_plan public.plan_status)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  RETURN public.simulate_subscription_for(_uid, _plan);
END; $$;

REVOKE ALL ON FUNCTION public.submit_score(text, integer, integer, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.grant_xp(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.simulate_subscription(public.plan_status) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.submit_score(text, integer, integer, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.grant_xp(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.simulate_subscription(public.plan_status) TO authenticated, service_role;