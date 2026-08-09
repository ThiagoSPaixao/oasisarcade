-- Remove direct client access to SECURITY DEFINER functions.
REVOKE ALL ON FUNCTION public.get_leaderboard(text, integer) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_xp(integer) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.simulate_subscription(plan_status) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_score(text, integer, integer, text, text) FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.grant_xp_for(uuid, integer) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.simulate_subscription_for(uuid, plan_status) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_score_for(uuid, text, integer, integer, text, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_xp_for(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.simulate_subscription_for(uuid, plan_status) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_score_for(uuid, text, integer, integer, text, text) TO service_role;