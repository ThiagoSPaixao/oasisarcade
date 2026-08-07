-- Internal trigger-only function: must not be callable from the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Leaderboard is intentionally callable, but only by signed-in players
REVOKE ALL ON FUNCTION public.get_leaderboard(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, integer) TO authenticated, service_role;
