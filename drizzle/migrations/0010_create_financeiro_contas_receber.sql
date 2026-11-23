CREATE TABLE public.financeiro_contas_receber (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  linha integer NOT NULL,
  tp_plano text, sn_coparticipativo text, cd_contrato text, cd_contrato_interno text, cd_contrato_tem text,
  cd_plano text, nm_responsavel_financeiro text, nr_cpf_cgc text,
  dt_venda date, dt_ultimo_reajuste date, dt_prox_reajuste date,
  cd_con_rec text, cd_reduzido text, cd_tip_doc text, ds_tip_doc text, nr_documento text, nr_serie text,
  nr_ano integer, nr_mes integer, dt_competencia text NOT NULL, cd_itcon_rec text NOT NULL, nr_parcela integer,
  dt_vencimento date, dt_prevista_recebimento date, tp_quitacao text,
  vl_duplicata numeric(14,2) NOT NULL DEFAULT 0, dt_recebimento date, vl_recebido numeric(14,2) NOT NULL DEFAULT 0,
  vl_acrescimo numeric(14,2) NOT NULL DEFAULT 0, vl_desconto numeric(14,2) NOT NULL DEFAULT 0,
  nr_dias_receita integer, nr_dias_fat_antecip integer, nr_dias_cobertura integer,
  cd_con_cor text, ds_con_cor text,
  arquivo text, importado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX financeiro_contas_receber_comp_idx ON public.financeiro_contas_receber (dt_competencia);
CREATE INDEX financeiro_contas_receber_titulo_idx ON public.financeiro_contas_receber (cd_itcon_rec);

GRANT SELECT, INSERT, DELETE ON public.financeiro_contas_receber TO authenticated;
GRANT ALL ON public.financeiro_contas_receber TO service_role;

ALTER TABLE public.financeiro_contas_receber ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura por quem acessa Financeiro Inadimplencia" ON public.financeiro_contas_receber
  FOR SELECT TO authenticated USING (public.axis_can_access(auth.uid(), 'Financeiro · Inadimplência'));
CREATE POLICY "Importacao por administradores" ON public.financeiro_contas_receber
  FOR INSERT TO authenticated WITH CHECK (public.axis_is_admin(auth.uid()));
CREATE POLICY "Substituicao por administradores" ON public.financeiro_contas_receber
  FOR DELETE TO authenticated USING (public.axis_is_admin(auth.uid()));