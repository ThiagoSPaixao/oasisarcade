-- Leitura de ranking e progressão sem depender da chave de serviço.
CREATE OR REPLACE FUNCTION public.my_gamification_state()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_gamification_state_for(auth.uid())
$$;

REVOKE ALL ON FUNCTION public.my_gamification_state() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_gamification_state() TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, integer) TO authenticated, anon, service_role;