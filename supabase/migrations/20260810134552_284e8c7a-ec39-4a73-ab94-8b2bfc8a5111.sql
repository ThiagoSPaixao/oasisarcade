DROP POLICY IF EXISTS "ranking is publicly readable" ON public.leaderboard_entries;
REVOKE ALL ON public.leaderboard_entries FROM anon, authenticated;
GRANT ALL ON public.leaderboard_entries TO service_role;