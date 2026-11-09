CREATE OR REPLACE FUNCTION public.axis_user_registered(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS(SELECT 1 FROM public.axis_access_users WHERE user_id=_user_id) $$;
REVOKE EXECUTE ON FUNCTION public.axis_user_registered(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.axis_user_registered(uuid) TO authenticated;

DROP POLICY IF EXISTS simulator_owner_read ON public.simulador_simulacoes;
CREATE POLICY simulator_shared_read ON public.simulador_simulacoes FOR SELECT TO authenticated
USING (public.axis_can_access(auth.uid(),'Control · Simulador') AND public.axis_user_registered(user_id));

DROP POLICY IF EXISTS simulator_view_owner_read ON public.simulador_visoes;
CREATE POLICY simulator_view_shared_read ON public.simulador_visoes FOR SELECT TO authenticated
USING (public.axis_can_access(auth.uid(),'Control · Simulador') AND public.axis_user_registered(user_id));

DROP POLICY IF EXISTS simulator_stage_owner_read ON public.simulador_etapas;
CREATE POLICY simulator_stage_shared_read ON public.simulador_etapas FOR SELECT TO authenticated
USING (public.axis_can_access(auth.uid(),'Control · Simulador') AND public.axis_user_registered(user_id));

DROP POLICY IF EXISTS simulator_field_owner_read ON public.simulador_campos;
CREATE POLICY simulator_field_shared_read ON public.simulador_campos FOR SELECT TO authenticated
USING (public.axis_can_access(auth.uid(),'Control · Simulador') AND public.axis_user_registered(user_id));

CREATE OR REPLACE FUNCTION public.simulador_autores()
RETURNS TABLE(user_id uuid, nome text, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT a.user_id, a.nome, a.email
  FROM public.axis_access_users a
  WHERE public.axis_can_access(auth.uid(),'Control · Simulador')
    AND EXISTS(SELECT 1 FROM public.simulador_simulacoes s WHERE s.user_id=a.user_id)
$$;
REVOKE EXECUTE ON FUNCTION public.simulador_autores() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.simulador_autores() TO authenticated;