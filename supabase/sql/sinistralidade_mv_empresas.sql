-- Executar na mesma base que contém public.view_eard_mensal e public.view_ecarteira (Hostinger).
-- Sinistralidade por plano (4 primeiros dígitos de cd_mat_alternativa) e faixa etária,
-- entre competências p_de e p_ate (AAAAMM), com filtro opcional por trecho do estipulante.
DROP FUNCTION IF EXISTS public.sinistralidade_mv_empresas(integer, integer, text, text[]);
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
         sum(coalesce(v.vl_desp_consulta, 0) + coalesce(v.vl_desp_urgencia, 0) + coalesce(v.vl_desp_outros, 0))
  from public.view_eard_mensal v
  join cart k on k.cd_matricula = v.cd_matricula
  where v.dt_competencia between p_de and p_ate
    and (coalesce(trim(p_empresa), '') = '' or k.nm_empresa_estipulante ilike '%' || trim(p_empresa) || '%')
    and (p_planos is null or cardinality(p_planos) = 0 or k.plano = any(p_planos))
  group by k.plano, v.ds_faixa_etaria;
$function$;

GRANT EXECUTE ON FUNCTION public.sinistralidade_mv_empresas(integer, integer, text, text[]) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';

-- Índice recomendado:
CREATE INDEX IF NOT EXISTS view_eard_mensal_competencia_idx ON public.view_eard_mensal (dt_competencia);

-- Conferir:
SELECT * FROM public.sinistralidade_mv_empresas(202601, 202609, NULL, ARRAY['2290','2490','2890']);
