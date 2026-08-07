CREATE OR REPLACE FUNCTION public.get_leaderboard(_game_slug text, _limit integer DEFAULT 20)
RETURNS TABLE (rank integer, user_id uuid, username text, level integer, score integer, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (row_number() OVER (ORDER BY s.score DESC, s.created_at ASC))::int AS rank,
         s.user_id,
         p.username,
         p.level,
         s.score,
         s.created_at
  FROM public.user_scores s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE s.game_slug = _game_slug
  ORDER BY s.score DESC, s.created_at ASC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 20), 1), 100)
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, integer) TO service_role;