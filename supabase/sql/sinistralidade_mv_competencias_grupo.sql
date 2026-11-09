-- Executar na Hostinger (mesma base de public.view_eard_mensal e public.beneficiarios).
-- Sinistralidade por competência com visão: 'geral', 'facil50' ou 'demais' (todos menos Fácil 50).
-- Fácil 50 = matrícula cujo plano MV em beneficiarios é um dos produtos FACIL 50:
--   168 PF Ouro, 169 PF Prata, 170 PCE Prata, 171 PCE Ouro, 172 PCA Prata, 173 PCA Ouro.
-- A classificação é pela matrícula (não pelos 4 dígitos do plano), porque alguns códigos de plano
-- também têm beneficiários Odonto antigos.
-- Despesa total = soma das seis colunas de despesa. Visão desconhecida não retorna linhas.
CREATE OR REPLACE FUNCTION public.sinistralidade_mv_competencias_grupo(
  p_ano integer, p_ate_mes integer DEFAULT 12, p_grupo text DEFAULT 'geral')
RETURNS TABLE (
  nr_ano integer,
  nr_mes integer,
  rec_cpp numeric,
  rec_copart numeric,
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
  SELECT v.nr_ano,
         v.nr_mes,
         sum(coalesce(v.vl_rec_cpp, 0)),
         sum(coalesce(v.vl_rec_copart, 0)),
         sum(coalesce(v.vl_rec_cpp, 0) + coalesce(v.vl_rec_copart, 0) + coalesce(v.vl_rec_outros, 0)),
         sum(coalesce(v.vl_desp_consulta, 0) + coalesce(v.vl_desp_urgencia, 0) + coalesce(v.vl_desp_internacao, 0)
             + coalesce(v.vl_desp_terapia, 0) + coalesce(v.vl_desp_exame, 0) + coalesce(v.vl_desp_outros, 0))
  FROM public.view_eard_mensal v
  LEFT JOIN f50 f ON f.cd_matricula = v.cd_matricula
  WHERE v.nr_ano = p_ano
    AND v.nr_mes BETWEEN 1 AND least(p_ate_mes, 12)
    AND CASE lower(coalesce(p_grupo, 'geral'))
          WHEN 'geral' THEN true
          WHEN 'facil50' THEN f.cd_matricula IS NOT NULL
          WHEN 'demais' THEN f.cd_matricula IS NULL
          ELSE false
        END
  GROUP BY v.nr_ano, v.nr_mes
  ORDER BY v.nr_mes;
$function$;

REVOKE ALL ON FUNCTION public.sinistralidade_mv_competencias_grupo(integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sinistralidade_mv_competencias_grupo(integer, integer, text) TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
