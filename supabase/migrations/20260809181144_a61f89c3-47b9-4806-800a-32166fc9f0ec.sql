-- 1) Remove public direct read of the raw table (which exposes user_id)
DROP POLICY IF EXISTS "ranking is publicly readable" ON public.leaderboard_entries;
REVOKE SELECT ON public.leaderboard_entries FROM anon;

CREATE POLICY "own leaderboard entry select"
ON public.leaderboard_entries
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

GRANT SELECT ON public.leaderboard_entries TO authenticated;
GRANT ALL ON public.leaderboard_entries TO service_role;

-- 2) Public, privacy-safe projection without user_id
CREATE OR REPLACE VIEW public.leaderboard_public
WITH (security_invoker = off) AS
SELECT
  le.game_slug,
  le.username,
  le.level,
  le.score,
  le.scored_at,
  (auth.uid() = le.user_id) AS is_me
FROM public.leaderboard_entries le;

GRANT SELECT ON public.leaderboard_public TO anon, authenticated;
