-- Sinistralidade MV: despesa total passa a somar as SEIS colunas de despesa da view_eard_mensal
-- (consulta, urgência, internação, terapia, exame e outros). Antes eram somadas só consulta, urgência e outros,
-- o que deixava a sinistralidade em ~35%. Executar na Hostinger (mesma base da view_eard_mensal).
-- Só substitui as três funções; não altera dados.

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
         sum(coalesce(v.vl_desp_consulta, 0) + coalesce(v.vl_desp_urgencia, 0) + coalesce(v.vl_desp_internacao, 0)
             + coalesce(v.vl_desp_terapia, 0) + coalesce(v.vl_desp_exame, 0) + coalesce(v.vl_desp_outros, 0))
  FROM public.view_eard_mensal v
  WHERE v.nr_ano = p_ano
    AND v.nr_mes BETWEEN 1 AND least(p_ate_mes, 12)
  GROUP BY v.nr_ano, v.nr_mes
  ORDER BY v.nr_mes;
$function$;

REVOKE ALL ON FUNCTION public.sinistralidade_mv_competencias(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sinistralidade_mv_competencias(integer, integer) TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';

-- Executar na mesma base que contém public.view_eard_mensal e public.view_ecarteira (Hostinger).
-- Sinistralidade por plano (4 primeiros dígitos de cd_mat_alternativa) e faixa etária,
-- entre competências p_de e p_ate (AAAAMM), com filtro opcional por trecho do estipulante.
CREATE OR REPLACE FUNCTION public.sinistralidade_mv_empresas(
  p_de integer, p_ate integer, p_empresa text DEFAULT NULL, p_planos text[] DEFAULT NULL)
RETURNS TABLE (plano text, faixa text, vidas bigint, rec_cpp numeric, rec_copart numeric, rec_total numeric, desp_total numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $function$
  with cart as (
    select distinct on (c.cd_matricula) c.cd_matricula,
           left(c.cd_mat_alternativa::text, 4) as plano,
           c.nm_empresa_estipulante
    from public.view_ecarteira c
    where c.cd_matricula in (select distinct e.cd_matricula from public.view_eard_mensal e where e.dt_competencia between p_de and p_ate)
    order by c.cd_matricula, c.dt_vigencia_beneficiario desc nulls last
  )
  select k.plano,
         v.ds_faixa_etaria,
         count(distinct v.cd_matricula),
         sum(coalesce(v.vl_rec_cpp, 0)),
         sum(coalesce(v.vl_rec_copart, 0)),
         sum(coalesce(v.vl_rec_cpp, 0) + coalesce(v.vl_rec_copart, 0) + coalesce(v.vl_rec_outros, 0)),
         sum(coalesce(v.vl_desp_consulta, 0) + coalesce(v.vl_desp_urgencia, 0) + coalesce(v.vl_desp_internacao, 0)
             + coalesce(v.vl_desp_terapia, 0) + coalesce(v.vl_desp_exame, 0) + coalesce(v.vl_desp_outros, 0))
  from public.view_eard_mensal v
  join cart k on k.cd_matricula = v.cd_matricula
  where v.dt_competencia between p_de and p_ate
    and (coalesce(trim(p_empresa), '') = '' or k.nm_empresa_estipulante ilike '%' || trim(p_empresa) || '%')
    and (p_planos is null or cardinality(p_planos) = 0 or k.plano = any(p_planos))
  group by k.plano, v.ds_faixa_etaria;
$function$;

GRANT EXECUTE ON FUNCTION public.sinistralidade_mv_empresas(integer, integer, text, text[]) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';

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
    -- Competência válida: soma das seis despesas (consulta, urgência, internação, terapia, exame, outros) > 0.
    SELECT nr_ano * 12 + nr_mes - 1 AS indice
    FROM public.view_eard_mensal
    WHERE nr_ano BETWEEN 1 AND 9998
      AND nr_mes BETWEEN 1 AND 12
    GROUP BY nr_ano, nr_mes
    HAVING sum(coalesce(vl_desp_consulta, 0) + coalesce(vl_desp_urgencia, 0)
             + coalesce(vl_desp_internacao, 0) + coalesce(vl_desp_terapia, 0)
             + coalesce(vl_desp_exame, 0) + coalesce(vl_desp_outros, 0)) > 0
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

-- Conferir (não modifica dados): dezembro/2025 deve ficar perto de 84%.
SELECT nr_mes, desp_total, rec_total, round(desp_total / nullif(rec_total, 0) * 100, 2) AS sin_pct
FROM public.sinistralidade_mv_competencias(2025, 12);
