-- Home > Evolução Produtos: Receita, Coparticipação e Despesas por tipo de plano e tipo de produto.
-- Executar na Hostinger (mesma base de public.view_eard_mensal e public.beneficiarios), inteiro.
--
-- Período: p_de e p_ate no formato AAAAMM (ex.: 202510 a 202609), inclusivos.
-- Tipo de plano  = view_eard_mensal.tp_plano (PIF / PCA / PCE).
-- Tipo de produto, por matrícula e competência:
--   F50  (Fácil 50)                -> matrícula com plano MV 168 a 173 em beneficiarios
--                                     (pela matrícula, nunca pelos 4 dígitos do plano: há Odonto antigo no mesmo código)
--   COP  (Outros coparticipativos) -> sn_coparticipativo = 'S', fora do Fácil 50
--   CONV (Convencional)            -> sn_coparticipativo = 'N', fora do Fácil 50
--   Qualquer outro valor           -> NULL (não é inferido; a tela informa o valor fora dos totais)
-- Receita total = vl_rec_cpp + vl_rec_copart + vl_rec_outros.
-- Despesa total = soma das seis colunas de despesa (consulta, urgência, internação, terapia, exame, outros).
CREATE OR REPLACE FUNCTION public.evolucao_produtos_financeiro(p_de integer, p_ate integer)
RETURNS TABLE (
  nr_ano integer,
  nr_mes integer,
  sigla text,
  produto text,
  rec_cpp numeric,
  rec_copart numeric,
  rec_outros numeric,
  rec_total numeric,
  desp_total numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
  WITH f50 AS (
    SELECT DISTINCT b.cd_matricula
    FROM public.beneficiarios b
    WHERE b.cd_plano_mv IN (168, 169, 170, 171, 172, 173)
  )
  SELECT v.nr_ano::integer,
         v.nr_mes::integer,
         nullif(upper(trim(v.tp_plano)), '') AS sigla,
         CASE
           WHEN f.cd_matricula IS NOT NULL THEN 'F50'
           WHEN upper(trim(v.sn_coparticipativo)) = 'S' THEN 'COP'
           WHEN upper(trim(v.sn_coparticipativo)) = 'N' THEN 'CONV'
         END AS produto,
         sum(coalesce(v.vl_rec_cpp, 0)),
         sum(coalesce(v.vl_rec_copart, 0)),
         sum(coalesce(v.vl_rec_outros, 0)),
         sum(coalesce(v.vl_rec_cpp, 0) + coalesce(v.vl_rec_copart, 0) + coalesce(v.vl_rec_outros, 0)),
         sum(coalesce(v.vl_desp_consulta, 0) + coalesce(v.vl_desp_urgencia, 0) + coalesce(v.vl_desp_internacao, 0)
             + coalesce(v.vl_desp_terapia, 0) + coalesce(v.vl_desp_exame, 0) + coalesce(v.vl_desp_outros, 0))
  FROM public.view_eard_mensal v
  LEFT JOIN f50 f ON f.cd_matricula = v.cd_matricula
  WHERE v.nr_ano BETWEEN p_de / 100 AND p_ate / 100
    AND v.nr_ano * 100 + v.nr_mes BETWEEN p_de AND p_ate
  GROUP BY 1, 2, 3, 4
  ORDER BY 1, 2, 3, 4;
$function$;

REVOKE ALL ON FUNCTION public.evolucao_produtos_financeiro(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evolucao_produtos_financeiro(integer, integer) TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';

-- Conferência: a soma de dezembro/2025 deve bater com Sinistralidade > Períodos (Geral):
-- receita R$ 33,71 mi e despesa R$ 28,45 mi.
-- SELECT sum(rec_total), sum(desp_total) FROM public.evolucao_produtos_financeiro(202512, 202512);
