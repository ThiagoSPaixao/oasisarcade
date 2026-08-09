CREATE TABLE public.score_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_slug text NOT NULL,
  score integer NOT NULL,
  duration_ms integer,
  difficulty text,
  game_version text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.score_submissions TO authenticated;
GRANT ALL ON public.score_submissions TO service_role;

ALTER TABLE public.score_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "players submit own scores"
ON public.score_submissions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.process_score_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _recent_count integer;
BEGIN
  IF NEW.user_id IS NULL OR NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'invalid player';
  END IF;
  IF NEW.score < 0 OR NEW.score > 100000000 THEN
    RAISE EXCEPTION 'invalid score';
  END IF;
  IF NEW.duration_ms IS NOT NULL AND (NEW.duration_ms < 0 OR NEW.duration_ms > 86400000) THEN
    RAISE EXCEPTION 'invalid duration';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.games WHERE slug = NEW.game_slug AND state = 'playable') THEN
    RAISE EXCEPTION 'unknown or unavailable game';
  END IF;

  SELECT count(*) INTO _recent_count
  FROM public.score_submissions
  WHERE user_id = NEW.user_id
    AND submitted_at > now() - interval '10 seconds';
  IF _recent_count >= 5 THEN
    RAISE EXCEPTION 'too many submissions';
  END IF;

  NEW.difficulty := nullif(left(coalesce(NEW.difficulty, ''), 32), '');
  NEW.game_version := nullif(left(coalesce(NEW.game_version, ''), 32), '');
  NEW.submitted_at := now();

  INSERT INTO public.user_scores (user_id, game_slug, score, duration_ms, difficulty, game_version, played_at)
  VALUES (NEW.user_id, NEW.game_slug, NEW.score, NEW.duration_ms, NEW.difficulty, NEW.game_version, NEW.submitted_at)
  ON CONFLICT (user_id, game_slug) DO UPDATE
    SET score = EXCLUDED.score,
        duration_ms = EXCLUDED.duration_ms,
        difficulty = EXCLUDED.difficulty,
        game_version = EXCLUDED.game_version,
        played_at = EXCLUDED.played_at
    WHERE public.user_scores.score < EXCLUDED.score;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.process_score_submission() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_score_submission() TO service_role;

CREATE TRIGGER process_score_submission_before_insert
BEFORE INSERT ON public.score_submissions
FOR EACH ROW
EXECUTE FUNCTION public.process_score_submission();

CREATE VIEW public.leaderboard_public
WITH (security_invoker = false)
AS
SELECT
  s.game_slug,
  s.user_id,
  p.username,
  p.level,
  s.score,
  s.created_at,
  row_number() OVER (
    PARTITION BY s.game_slug
    ORDER BY s.score DESC, s.created_at ASC
  )::integer AS rank
FROM public.user_scores s
JOIN public.profiles p ON p.id = s.user_id;

REVOKE ALL ON public.leaderboard_public FROM PUBLIC;
GRANT SELECT ON public.leaderboard_public TO anon, authenticated;
GRANT ALL ON public.leaderboard_public TO service_role;