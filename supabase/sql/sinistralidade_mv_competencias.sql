-- Executar na mesma base que contém public.view_eard_mensal.
-- Soma receitas e despesas por competência, de 01/p_ano até p_ate_mes.
CREATE OR REPLACE FUNCTION public.sinistralidade_mv_competencias(p_ano integer, p_ate_mes integer DEFAULT 12)
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
  SELECT v.nr_ano,
         v.nr_mes,
         sum(coalesce(v.vl_rec_cpp, 0)),
         sum(coalesce(v.vl_rec_copart, 0)),
         sum(coalesce(v.vl_rec_cpp, 0) + coalesce(v.vl_rec_copart, 0) + coalesce(v.vl_rec_outros, 0)),
         sum(coalesce(v.vl_desp_consulta, 0) + coalesce(v.vl_desp_urgencia, 0) + coalesce(v.vl_desp_outros, 0))
  FROM public.view_eard_mensal v
  WHERE v.nr_ano = p_ano
    AND v.nr_mes BETWEEN 1 AND least(p_ate_mes, 12)
  GROUP BY v.nr_ano, v.nr_mes
  ORDER BY v.nr_mes;
$function$;

REVOKE ALL ON FUNCTION public.sinistralidade_mv_competencias(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sinistralidade_mv_competencias(integer, integer) TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';

-- Índice recomendado (acelera o filtro por competência):
CREATE INDEX IF NOT EXISTS view_eard_mensal_ano_mes_idx ON public.view_eard_mensal (nr_ano, nr_mes);

-- Conferir (não modifica dados):
SELECT * FROM public.sinistralidade_mv_competencias(2026, 10);
