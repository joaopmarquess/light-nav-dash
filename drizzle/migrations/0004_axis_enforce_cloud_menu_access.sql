ALTER POLICY bench_cache_owner_read ON public.bench_quarter_cache USING(user_id=auth.uid() AND public.axis_can_access(auth.uid(),'Control · Bench C'));
ALTER POLICY bench_cache_owner_insert ON public.bench_quarter_cache WITH CHECK(user_id=auth.uid() AND public.axis_can_access(auth.uid(),'Control · Bench C'));
ALTER POLICY bench_cache_owner_update ON public.bench_quarter_cache USING(user_id=auth.uid() AND public.axis_can_access(auth.uid(),'Control · Bench C')) WITH CHECK(user_id=auth.uid() AND public.axis_can_access(auth.uid(),'Control · Bench C'));
ALTER POLICY bench_cache_owner_delete ON public.bench_quarter_cache USING(user_id=auth.uid() AND public.axis_can_access(auth.uid(),'Control · Bench C'));
ALTER POLICY simulator_owner_read ON public.simulador_simulacoes USING(user_id=auth.uid() AND public.axis_can_access(auth.uid(),'Control · Simulador'));
ALTER POLICY simulator_view_owner_read ON public.simulador_visoes USING(user_id=auth.uid() AND public.axis_can_access(auth.uid(),'Control · Simulador'));
ALTER POLICY simulator_stage_owner_read ON public.simulador_etapas USING(user_id=auth.uid() AND public.axis_can_access(auth.uid(),'Control · Simulador'));
ALTER POLICY simulator_field_owner_read ON public.simulador_campos USING(user_id=auth.uid() AND public.axis_can_access(auth.uid(),'Control · Simulador'));
ALTER POLICY "DRE gerencial é público para leitura" ON public.dre_gerencial_2t2026 TO authenticated USING(public.axis_can_access(auth.uid(),'DRE Gerencial PE') OR public.axis_can_access(auth.uid(),'Control · DRE Gerencial PE') OR public.axis_can_access(auth.uid(),'Control · Relatório'));
ALTER POLICY "Orcamento é público para leitura" ON public.orcamento_2026 TO authenticated USING(public.axis_can_access(auth.uid(),'Orçamento') OR public.axis_can_access(auth.uid(),'Control · Orçamento Vigente') OR public.axis_can_access(auth.uid(),'Control · Relatório'));
REVOKE SELECT ON public.dre_gerencial_2t2026,public.orcamento_2026 FROM anon;
CREATE OR REPLACE FUNCTION public.simulador_action_checked(p_action text,p_simulation uuid DEFAULT NULL,p_view integer DEFAULT 0,p_stage integer DEFAULT 0,p_data jsonb DEFAULT '{}'::jsonb,p_name text DEFAULT NULL,p_expected_updated_at timestamptz DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE current_updated timestamptz;
BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login necessário'; END IF;
IF NOT public.axis_can_access(auth.uid(),'Control · Simulador') THEN RAISE EXCEPTION 'Acesso não autorizado'; END IF;
IF p_action<>'create' THEN
SELECT updated_at INTO current_updated FROM public.simulador_simulacoes WHERE id=p_simulation AND user_id=auth.uid() FOR UPDATE;
IF current_updated IS NULL THEN RAISE EXCEPTION 'Simulação não encontrada ou sem permissão'; END IF;
IF p_expected_updated_at IS NULL OR current_updated IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'Esta simulação foi atualizada em outra janela. Seus campos foram preservados. Recarregue os dados antes de gravar novamente.'; END IF;
END IF;
RETURN public.simulador_action(p_action,p_simulation,p_view,p_stage,p_data,p_name);
END $$;
CREATE OR REPLACE FUNCTION public.simulador_delete(p_simulation uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login necessário'; END IF;
IF NOT public.axis_can_access(auth.uid(),'Control · Simulador') THEN RAISE EXCEPTION 'Acesso não autorizado'; END IF;
DELETE FROM public.simulador_simulacoes WHERE id=p_simulation AND user_id=auth.uid();
IF NOT FOUND THEN RAISE EXCEPTION 'Simulação não encontrada ou sem permissão'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.simulador_action_checked(text,uuid,integer,integer,jsonb,text,timestamptz),public.simulador_delete(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.simulador_action_checked(text,uuid,integer,integer,jsonb,text,timestamptz),public.simulador_delete(uuid) TO authenticated,service_role;
REVOKE SELECT ON public.axis_access_users FROM authenticated;
GRANT SELECT(user_id,email,nome,status,activated_at,created_at,updated_at,invite_expires_at) ON public.axis_access_users TO authenticated;