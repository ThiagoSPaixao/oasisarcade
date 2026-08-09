REVOKE EXECUTE ON FUNCTION public.get_leaderboard(text, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard(text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, integer) TO service_role;