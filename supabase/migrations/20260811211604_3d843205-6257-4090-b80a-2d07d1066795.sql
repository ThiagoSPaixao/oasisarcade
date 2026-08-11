CREATE OR REPLACE FUNCTION public.my_start_game_session(_game_slug text, _environment text DEFAULT 'live')
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.start_game_session_for(auth.uid(), _game_slug, coalesce(_environment, 'live'))
$$;

CREATE OR REPLACE FUNCTION public.my_submit_score(_game_slug text, _score integer, _session_id uuid, _duration_ms integer DEFAULT NULL, _difficulty text DEFAULT NULL, _game_version text DEFAULT NULL, _environment text DEFAULT 'live')
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.submit_score_for(auth.uid(), _game_slug, _score, _session_id, _duration_ms, _difficulty, _game_version, coalesce(_environment, 'live'))
$$;

CREATE OR REPLACE FUNCTION public.my_process_game_result(_game_slug text, _score integer, _session_id uuid, _is_record boolean DEFAULT false, _environment text DEFAULT 'live')
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.process_game_result_for(auth.uid(), _game_slug, _score, _session_id, _is_record, coalesce(_environment, 'live'))
$$;

CREATE OR REPLACE FUNCTION public.my_subscription_state(_environment text DEFAULT 'live')
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.subscription_state_for(auth.uid(), coalesce(_environment, 'live'))
$$;

REVOKE ALL ON FUNCTION public.my_start_game_session(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_submit_score(text, integer, uuid, integer, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_process_game_result(text, integer, uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_subscription_state(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.my_start_game_session(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_submit_score(text, integer, uuid, integer, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_process_game_result(text, integer, uuid, boolean, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_subscription_state(text) TO authenticated, service_role;