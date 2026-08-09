DROP VIEW public.leaderboard_public;

CREATE TABLE public.leaderboard_entries (
  game_slug text NOT NULL,
  user_id uuid NOT NULL,
  username text NOT NULL,
  level integer NOT NULL,
  score integer NOT NULL,
  scored_at timestamptz NOT NULL,
  PRIMARY KEY (game_slug, user_id)
);

GRANT SELECT ON public.leaderboard_entries TO anon, authenticated;
GRANT ALL ON public.leaderboard_entries TO service_role;

ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ranking is publicly readable"
ON public.leaderboard_entries
FOR SELECT
TO anon, authenticated
USING (true);

INSERT INTO public.leaderboard_entries (game_slug, user_id, username, level, score, scored_at)
SELECT s.game_slug, s.user_id, p.username, p.level, s.score, s.created_at
FROM public.user_scores s
JOIN public.profiles p ON p.id = s.user_id;

CREATE OR REPLACE FUNCTION public.sync_leaderboard_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.leaderboard_entries (game_slug, user_id, username, level, score, scored_at)
  SELECT NEW.game_slug, NEW.user_id, p.username, p.level, NEW.score, NEW.created_at
  FROM public.profiles p
  WHERE p.id = NEW.user_id
  ON CONFLICT (game_slug, user_id) DO UPDATE
    SET username = EXCLUDED.username,
        level = EXCLUDED.level,
        score = EXCLUDED.score,
        scored_at = EXCLUDED.scored_at;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_leaderboard_score() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_leaderboard_score() TO service_role;

CREATE TRIGGER sync_leaderboard_after_score
AFTER INSERT OR UPDATE OF score, created_at ON public.user_scores
FOR EACH ROW
EXECUTE FUNCTION public.sync_leaderboard_score();

CREATE OR REPLACE FUNCTION public.sync_leaderboard_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.leaderboard_entries
  SET username = NEW.username,
      level = NEW.level
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_leaderboard_profile() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_leaderboard_profile() TO service_role;

CREATE TRIGGER sync_leaderboard_after_profile
AFTER UPDATE OF username, level ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_leaderboard_profile();