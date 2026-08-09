DROP VIEW IF EXISTS public.leaderboard_public;
DROP POLICY IF EXISTS "own leaderboard entry select" ON public.leaderboard_entries;

-- Column-level privileges: no access to user_id for public roles
REVOKE SELECT ON public.leaderboard_entries FROM anon, authenticated;
GRANT SELECT (game_slug, username, level, score, scored_at) ON public.leaderboard_entries TO anon, authenticated;
GRANT ALL ON public.leaderboard_entries TO service_role;

CREATE POLICY "ranking is publicly readable"
ON public.leaderboard_entries
FOR SELECT
TO anon, authenticated
USING (true);

CREATE VIEW public.leaderboard_public
WITH (security_invoker = on) AS
SELECT
  le.game_slug,
  le.username,
  le.level,
  le.score,
  le.scored_at
FROM public.leaderboard_entries le;

GRANT SELECT ON public.leaderboard_public TO anon, authenticated;
