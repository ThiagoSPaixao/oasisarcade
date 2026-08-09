GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, integer) TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon;
REVOKE SELECT ON public.profiles FROM anon;