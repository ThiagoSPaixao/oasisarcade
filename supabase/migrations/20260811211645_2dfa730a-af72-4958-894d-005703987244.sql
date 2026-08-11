CREATE OR REPLACE FUNCTION public.my_can_play_game(_game_slug text, _environment text DEFAULT 'live')
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_play_game_for(auth.uid(), _game_slug, coalesce(_environment, 'live'))
$$;

REVOKE ALL ON FUNCTION public.my_can_play_game(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_can_play_game(text, text) TO authenticated, service_role;