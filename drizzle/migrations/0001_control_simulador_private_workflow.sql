CREATE TABLE public.simulador_simulacoes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), name text NOT NULL, status text NOT NULL DEFAULT 'in_progress', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.simulador_simulacoes TO authenticated;
GRANT ALL ON public.simulador_simulacoes TO service_role;
ALTER TABLE public.simulador_simulacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY simulator_owner_read ON public.simulador_simulacoes FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE TABLE public.simulador_visoes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), simulation_id uuid NOT NULL REFERENCES public.simulador_simulacoes(id) ON DELETE CASCADE, user_id uuid NOT NULL, position integer NOT NULL CHECK(position BETWEEN 0 AND 2), status text NOT NULL DEFAULT 'not_started', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(simulation_id,position));
GRANT SELECT ON public.simulador_visoes TO authenticated;
GRANT ALL ON public.simulador_visoes TO service_role;
ALTER TABLE public.simulador_visoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY simulator_view_owner_read ON public.simulador_visoes FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE TABLE public.simulador_etapas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), view_id uuid NOT NULL REFERENCES public.simulador_visoes(id) ON DELETE CASCADE, simulation_id uuid NOT NULL REFERENCES public.simulador_simulacoes(id) ON DELETE CASCADE, user_id uuid NOT NULL, stage integer NOT NULL CHECK(stage BETWEEN 0 AND 7), status text NOT NULL DEFAULT 'not_started', data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(view_id,stage));
GRANT SELECT ON public.simulador_etapas TO authenticated;
GRANT ALL ON public.simulador_etapas TO service_role;
ALTER TABLE public.simulador_etapas ENABLE ROW LEVEL SECURITY;
CREATE POLICY simulator_stage_owner_read ON public.simulador_etapas FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE TABLE public.simulador_campos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), stage_id uuid NOT NULL REFERENCES public.simulador_etapas(id) ON DELETE CASCADE, simulation_id uuid NOT NULL REFERENCES public.simulador_simulacoes(id) ON DELETE CASCADE, view_id uuid NOT NULL REFERENCES public.simulador_visoes(id) ON DELETE CASCADE, user_id uuid NOT NULL, field text NOT NULL, value jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(stage_id,field));
GRANT SELECT ON public.simulador_campos TO authenticated;
GRANT ALL ON public.simulador_campos TO service_role;
ALTER TABLE public.simulador_campos ENABLE ROW LEVEL SECURITY;
CREATE POLICY simulator_field_owner_read ON public.simulador_campos FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE INDEX simulator_user_status ON public.simulador_simulacoes(user_id,status,updated_at);
CREATE INDEX simulator_view_status ON public.simulador_visoes(user_id,simulation_id,status);
CREATE INDEX simulator_stage_status ON public.simulador_etapas(user_id,simulation_id,view_id,stage,status);
CREATE INDEX simulator_field_lookup ON public.simulador_campos(user_id,simulation_id,view_id,stage_id);
CREATE OR REPLACE FUNCTION public.simulador_validate_stage(p_stage integer,p_data jsonb) RETURNS void LANGUAGE plpgsql SET search_path=public AS $$
DECLARE ks text[]; k text; field_name text; val jsonb; r jsonb; n numeric; seen text[]:=ARRAY[]::text[];
BEGIN
ks:=CASE p_stage WHEN 0 THEN ARRAY[]::text[] WHEN 1 THEN ARRAY['rows','reaj_v2'] WHEN 2 THEN ARRAY['rec_v2'] WHEN 3 THEN ARRAY['sinLiq_v2','rede_v2'] WHEN 4 THEN ARRAY['demaisOp'] WHEN 5 THEN ARRAY['admPc_v4','admTot_v4'] WHEN 6 THEN ARRAY['finPc_v2'] WHEN 7 THEN ARRAY[]::text[] ELSE NULL END;
IF ks IS NULL OR jsonb_typeof(p_data) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(p_data))<>cardinality(ks) THEN RAISE EXCEPTION 'Campos inválidos para esta etapa'; END IF;
FOREACH k IN ARRAY ks LOOP
val:=p_data->k;
IF val IS NULL THEN RAISE EXCEPTION 'Campo obrigatório: %',k; END IF;
IF k='rows' THEN
IF jsonb_typeof(val) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Informe os três planos'; END IF;
IF jsonb_array_length(val)<>3 THEN RAISE EXCEPTION 'Informe os três planos'; END IF;
FOR r IN SELECT value FROM jsonb_array_elements(val) LOOP
IF jsonb_typeof(r) IS DISTINCT FROM 'object' OR (r->>'id') IS NULL OR NOT (r->>'id'=ANY(ARRAY['PIF','PCA','PCE'])) OR r->>'id'=ANY(seen) THEN RAISE EXCEPTION 'Plano inválido ou duplicado'; END IF;
seen:=array_append(seen,r->>'id');
FOREACH field_name IN ARRAY ARRAY['vidas','ticket','entradas','saidas'] LOOP
IF jsonb_typeof(r->field_name) IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Número obrigatório: %',field_name; END IF;
IF (r->>field_name)::numeric<0 OR (field_name<>'ticket' AND (r->>field_name)::numeric<>trunc((r->>field_name)::numeric)) THEN RAISE EXCEPTION 'Campo inválido: %',field_name; END IF;
END LOOP;
IF (r->>'vidas')::numeric+12*((r->>'entradas')::numeric-(r->>'saidas')::numeric)<0 THEN RAISE EXCEPTION 'Vidas projetadas negativas'; END IF;
END LOOP;
ELSIF k IN ('demaisOp','admPc_v4') THEN
IF jsonb_typeof(val) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Informe os quatro percentuais'; END IF;
IF jsonb_array_length(val)<>4 THEN RAISE EXCEPTION 'Informe os quatro percentuais'; END IF;
FOR r IN SELECT value FROM jsonb_array_elements(val) LOOP
IF jsonb_typeof(r) IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Percentual obrigatório'; END IF;
IF r::text::numeric<0 THEN RAISE EXCEPTION 'Percentual inválido'; END IF;
END LOOP;
ELSE
IF jsonb_typeof(val) IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Número obrigatório: %',k; END IF;
n:=val::text::numeric;
IF (k='reaj_v2' AND n<=-100) OR (k='rede_v2' AND (n<0 OR n>100)) OR (k NOT IN ('reaj_v2','finPc_v2') AND n<0) THEN RAISE EXCEPTION 'Valor inválido: %',k; END IF;
END IF;
END LOOP;
IF p_stage=5 AND (p_data->>'admTot_v4')::numeric+0.0000001 < (p_data->'admPc_v4'->>0)::numeric+(p_data->'admPc_v4'->>1)::numeric+(p_data->'admPc_v4'->>2)::numeric THEN RAISE EXCEPTION 'Total administrativo menor que a soma das parcelas'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.simulador_validate_stage(integer,jsonb) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.simulador_action(p_action text,p_simulation uuid DEFAULT NULL,p_view integer DEFAULT 0,p_stage integer DEFAULT 0,p_data jsonb DEFAULT '{}'::jsonb,p_name text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); sid uuid; vid uuid; eid uuid; i integer; j integer; existing jsonb; vstatus text; kv record;
BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'Login necessário'; END IF;
IF p_action='create' THEN
IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Informe um nome entre 1 e 120 caracteres'; END IF;
INSERT INTO public.simulador_simulacoes(user_id,name) VALUES(uid,trim(p_name)) RETURNING id INTO sid;
FOR i IN 0..2 LOOP
INSERT INTO public.simulador_visoes(simulation_id,user_id,position,status) VALUES(sid,uid,i,CASE WHEN i=0 THEN 'in_progress' ELSE 'blocked' END) RETURNING id INTO vid;
FOR j IN 0..7 LOOP
INSERT INTO public.simulador_etapas(view_id,simulation_id,user_id,stage,status) VALUES(vid,sid,uid,j,CASE WHEN i=0 AND j=0 THEN 'not_started' ELSE 'blocked' END);
END LOOP;
END LOOP;
RETURN sid;
END IF;
SELECT id INTO sid FROM public.simulador_simulacoes WHERE id=p_simulation AND user_id=uid FOR UPDATE;
IF sid IS NULL THEN RAISE EXCEPTION 'Simulação não encontrada ou sem permissão'; END IF;
IF p_view NOT BETWEEN 0 AND 2 OR p_stage NOT BETWEEN 0 AND 7 THEN RAISE EXCEPTION 'Visão ou etapa inválida'; END IF;
SELECT id,status INTO vid,vstatus FROM public.simulador_visoes WHERE simulation_id=sid AND position=p_view;
IF EXISTS(SELECT 1 FROM public.simulador_visoes WHERE simulation_id=sid AND position<p_view AND status<>'completed') THEN RAISE EXCEPTION 'Grave a visão anterior primeiro'; END IF;
IF p_action='reopen' THEN
IF vstatus<>'completed' THEN RAISE EXCEPTION 'Visão ainda não concluída'; END IF;
UPDATE public.simulador_visoes SET status=CASE WHEN position=p_view THEN 'in_progress' ELSE 'blocked' END,updated_at=now() WHERE simulation_id=sid AND position>=p_view;
UPDATE public.simulador_etapas e SET status=CASE WHEN v.position=p_view AND e.stage=0 THEN 'not_started' ELSE 'blocked' END,updated_at=now() FROM public.simulador_visoes v WHERE e.view_id=v.id AND v.simulation_id=sid AND v.position>=p_view;
ELSIF p_action IN ('save','start') THEN
IF vstatus='completed' THEN RAISE EXCEPTION 'Reabra a visão antes de editar'; END IF;
IF EXISTS(SELECT 1 FROM public.simulador_etapas WHERE view_id=vid AND stage<p_stage AND status<>'completed') THEN RAISE EXCEPTION 'Salve a etapa anterior primeiro'; END IF;
SELECT id,data INTO eid,existing FROM public.simulador_etapas WHERE view_id=vid AND stage=p_stage;
IF p_action='save' THEN
PERFORM public.simulador_validate_stage(p_stage,p_data);
IF existing IS DISTINCT FROM p_data THEN
UPDATE public.simulador_etapas SET status='blocked',updated_at=now() WHERE view_id=vid AND stage>p_stage;
END IF;
UPDATE public.simulador_etapas SET data=p_data,status='completed',updated_at=now() WHERE id=eid;
FOR kv IN SELECT key,value FROM jsonb_each(p_data) LOOP
INSERT INTO public.simulador_campos(stage_id,simulation_id,view_id,user_id,field,value) VALUES(eid,sid,vid,uid,kv.key,kv.value) ON CONFLICT(stage_id,field) DO UPDATE SET value=EXCLUDED.value,updated_at=now();
END LOOP;
UPDATE public.simulador_etapas SET status='not_started',updated_at=now() WHERE view_id=vid AND stage=p_stage+1 AND status='blocked';
ELSE
UPDATE public.simulador_etapas SET status='in_progress',updated_at=now() WHERE id=eid AND status<>'completed';
END IF;
UPDATE public.simulador_visoes SET status='in_progress',updated_at=now() WHERE id=vid;
ELSIF p_action='complete' THEN
IF vstatus='completed' OR (SELECT count(*) FROM public.simulador_etapas WHERE view_id=vid AND status='completed')<>8 THEN RAISE EXCEPTION 'Grave todas as oito etapas antes de concluir'; END IF;
UPDATE public.simulador_visoes SET status='completed',updated_at=now() WHERE id=vid;
UPDATE public.simulador_visoes SET status='in_progress',updated_at=now() WHERE simulation_id=sid AND position=p_view+1;
UPDATE public.simulador_etapas e SET status='not_started',updated_at=now() FROM public.simulador_visoes v WHERE e.view_id=v.id AND v.simulation_id=sid AND v.position=p_view+1 AND e.stage=0;
ELSE RAISE EXCEPTION 'Ação inválida';
END IF;
UPDATE public.simulador_simulacoes SET status=CASE WHEN (SELECT count(*) FROM public.simulador_visoes WHERE simulation_id=sid AND status='completed')=3 THEN 'completed' ELSE 'in_progress' END,updated_at=now() WHERE id=sid;
RETURN sid;
END $$;
REVOKE ALL ON FUNCTION public.simulador_action(text,uuid,integer,integer,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.simulador_action(text,uuid,integer,integer,jsonb,text) TO service_role;
CREATE OR REPLACE FUNCTION public.simulador_action_checked(p_action text,p_simulation uuid DEFAULT NULL,p_view integer DEFAULT 0,p_stage integer DEFAULT 0,p_data jsonb DEFAULT '{}'::jsonb,p_name text DEFAULT NULL,p_expected_updated_at timestamptz DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE current_updated timestamptz;
BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login necessário'; END IF;
IF p_action<>'create' THEN
SELECT updated_at INTO current_updated FROM public.simulador_simulacoes WHERE id=p_simulation AND user_id=auth.uid() FOR UPDATE;
IF current_updated IS NULL THEN RAISE EXCEPTION 'Simulação não encontrada ou sem permissão'; END IF;
IF p_expected_updated_at IS NULL OR current_updated IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'Esta simulação foi atualizada em outra janela. Seus campos foram preservados. Recarregue os dados antes de gravar novamente.'; END IF;
END IF;
RETURN public.simulador_action(p_action,p_simulation,p_view,p_stage,p_data,p_name);
END $$;
REVOKE ALL ON FUNCTION public.simulador_action_checked(text,uuid,integer,integer,jsonb,text,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.simulador_action_checked(text,uuid,integer,integer,jsonb,text,timestamptz) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.simulador_delete(p_simulation uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login necessário'; END IF;
DELETE FROM public.simulador_simulacoes WHERE id=p_simulation AND user_id=auth.uid();
IF NOT FOUND THEN RAISE EXCEPTION 'Simulação não encontrada ou sem permissão'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.simulador_delete(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.simulador_delete(uuid) TO authenticated,service_role;