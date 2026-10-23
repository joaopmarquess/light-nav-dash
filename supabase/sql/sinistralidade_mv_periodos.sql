-- Executar na mesma base que contém public.view_eard_mensal.
-- Conceito: maior competência COM DESPESAS fecha o bloco; 12 meses = mês final menos 11 meses.
-- Lista somente blocos que possuem competências com despesas.
CREATE OR REPLACE FUNCTION public.sinistralidade_mv_periodos()
RETURNS TABLE (
  periodo text,
  data_inicio date,
  data_fim date,
  meses_disponiveis integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
  WITH meses AS (
    -- Competência válida: soma de vl_desp_consulta + vl_desp_urgencia + vl_desp_outros > 0.
    SELECT nr_ano * 12 + nr_mes - 1 AS indice
    FROM public.view_eard_mensal
    WHERE nr_ano BETWEEN 1 AND 9998
      AND nr_mes BETWEEN 1 AND 12
    GROUP BY nr_ano, nr_mes
    HAVING sum(coalesce(vl_desp_consulta, 0) + coalesce(vl_desp_urgencia, 0)
             + coalesce(vl_desp_outros, 0)) > 0
  ), base AS (
    SELECT max(indice) AS ultimo FROM meses
  ), blocos AS (
    SELECT (b.ultimo - m.indice) / 12 AS bloco,
           b.ultimo,
           count(*)::integer AS meses_disponiveis
    FROM meses m CROSS JOIN base b
    GROUP BY (b.ultimo - m.indice) / 12, b.ultimo
  ), limites AS (
    SELECT ultimo - bloco * 12 AS fim,
           meses_disponiveis
    FROM blocos
  ), datas AS (
    SELECT make_date((fim - 11) / 12, (fim - 11) % 12 + 1, 1) AS inicio,
           make_date(fim / 12, fim % 12 + 1, 1) AS mes_final,
           meses_disponiveis
    FROM limites
    WHERE fim - 11 >= 12
  )
  SELECT to_char(inicio, 'MM/YYYY') || ' a ' || to_char(mes_final, 'MM/YYYY'),
         inicio,
         (mes_final + interval '1 month' - interval '1 day')::date,
         meses_disponiveis
  FROM datas
  ORDER BY mes_final DESC;
$function$;

REVOKE ALL ON FUNCTION public.sinistralidade_mv_periodos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sinistralidade_mv_periodos() TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';

-- Conferir os períodos (não modifica dados):
SELECT * FROM public.sinistralidade_mv_periodos();