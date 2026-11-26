CREATE TABLE public.facchini_empresas(
 id uuid primary key default gen_random_uuid(),
 razao_social text not null, nome_fantasia text, cnpj text, numero_proposta text,
 agente_codigo text, agente_nome text, responsavel text, data_base date, observacoes text,
 status text not null default 'ativo', created_by uuid not null default auth.uid(),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facchini_empresas TO authenticated;
GRANT ALL ON public.facchini_empresas TO service_role;
ALTER TABLE public.facchini_empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY fe_read ON public.facchini_empresas FOR SELECT TO authenticated USING (axis_can_access(auth.uid(),'Facchini'));
CREATE POLICY fe_ins ON public.facchini_empresas FOR INSERT TO authenticated WITH CHECK (created_by=auth.uid() AND axis_can_access(auth.uid(),'Facchini'));
CREATE POLICY fe_upd ON public.facchini_empresas FOR UPDATE TO authenticated USING ((created_by=auth.uid() OR axis_is_admin(auth.uid())) AND axis_can_access(auth.uid(),'Facchini'));
CREATE POLICY fe_del ON public.facchini_empresas FOR DELETE TO authenticated USING (axis_is_admin(auth.uid()));

CREATE TABLE public.facchini_tabelas(
 id uuid primary key default gen_random_uuid(),
 nome text not null, produto text not null default 'F30', versao integer not null default 1,
 vigencia_inicial date, vigencia_final date, fonte text, observacoes text,
 status text not null default 'ativa', valores numeric[] not null,
 created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facchini_tabelas TO authenticated;
GRANT ALL ON public.facchini_tabelas TO service_role;
ALTER TABLE public.facchini_tabelas ENABLE ROW LEVEL SECURITY;
CREATE POLICY ft_read ON public.facchini_tabelas FOR SELECT TO authenticated USING (axis_can_access(auth.uid(),'Facchini'));
CREATE POLICY ft_ins ON public.facchini_tabelas FOR INSERT TO authenticated WITH CHECK (axis_is_admin(auth.uid()));
CREATE POLICY ft_upd ON public.facchini_tabelas FOR UPDATE TO authenticated USING (axis_is_admin(auth.uid()));
CREATE POLICY ft_del ON public.facchini_tabelas FOR DELETE TO authenticated USING (axis_is_admin(auth.uid()));

INSERT INTO public.facchini_tabelas(nome,produto,fonte,valores) VALUES
('Bensaúde Cheia / Fácil 30','F30','Estudo_Facchini_F30',ARRAY[338.13,394.59,460.48,507.44,592.18,676.86,829.15,1033.95,1372.05,2028.57]),
('ACIRP','F30','Estudo_Facchini_F30',ARRAY[110.53,128.98,150.51,165.86,193.55,221.22,270.99,337.92,448.41,662.97]),
('Fácil 30 Proposta','F30','Estudo_Facchini_F30',ARRAY[111.52,130.14,151.87,167.35,195.29,223.22,273.43,340.97,452.47,668.97]),
('Facchini','F30','Estudo_Facchini_F30',ARRAY[88.76,103.58,120.87,133.20,155.44,177.66,206.75,257.82,360.12,532.44]),
('Âmbar','F30','Estudo_Facchini_F30',ARRAY[83.03,96.89,113.07,124.61,145.41,166.20,203.60,253.88,336.90,498.10]);

CREATE TABLE public.facchini_simulacoes(
 id uuid primary key default gen_random_uuid(),
 nome text not null, empresa_id uuid references public.facchini_empresas(id) on delete set null,
 tabela_id uuid references public.facchini_tabelas(id) on delete set null,
 status text not null default 'Rascunho', etapa integer not null default 1,
 dados jsonb not null default '{}'::jsonb, resultados jsonb not null default '{}'::jsonb,
 created_by uuid not null default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facchini_simulacoes TO authenticated;
GRANT ALL ON public.facchini_simulacoes TO service_role;
ALTER TABLE public.facchini_simulacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY fs_read ON public.facchini_simulacoes FOR SELECT TO authenticated USING (axis_can_access(auth.uid(),'Facchini') AND (created_by=auth.uid() OR axis_is_admin(auth.uid())));
CREATE POLICY fs_ins ON public.facchini_simulacoes FOR INSERT TO authenticated WITH CHECK (created_by=auth.uid() AND axis_can_access(auth.uid(),'Facchini'));
CREATE POLICY fs_upd ON public.facchini_simulacoes FOR UPDATE TO authenticated USING (axis_can_access(auth.uid(),'Facchini') AND (created_by=auth.uid() OR axis_is_admin(auth.uid())));
CREATE POLICY fs_del ON public.facchini_simulacoes FOR DELETE TO authenticated USING (created_by=auth.uid() OR axis_is_admin(auth.uid()));

CREATE TABLE public.facchini_historico(
 id uuid primary key default gen_random_uuid(),
 simulacao_id uuid not null references public.facchini_simulacoes(id) on delete cascade,
 usuario_id uuid not null default auth.uid(), acao text not null, detalhe jsonb,
 created_at timestamptz not null default now());
GRANT SELECT, INSERT ON public.facchini_historico TO authenticated;
GRANT ALL ON public.facchini_historico TO service_role;
ALTER TABLE public.facchini_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY fh_read ON public.facchini_historico FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.facchini_simulacoes s WHERE s.id=simulacao_id));
CREATE POLICY fh_ins ON public.facchini_historico FOR INSERT TO authenticated WITH CHECK (usuario_id=auth.uid() AND EXISTS(SELECT 1 FROM public.facchini_simulacoes s WHERE s.id=simulacao_id));