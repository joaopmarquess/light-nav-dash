-- Carteira > Painel: quadro "Suspensos" (Mostrar suspensos).
-- p_de/p_data = De/Até: suspensões iniciadas no período e ainda suspensas em Até.
-- Executar na base da Hostinger, inteiro (requer public.sigla_contratacao).
-- Suspensos continuam em Vidas Ativas: mesma regra de ativo e filtros dos cards.
-- Suspenso na data = dt_ult_suspensao <= data e sem reativação da suspensão entre ela e a data.
-- beneficiarios tem matrículas repetidas: uma linha por cd_mat_alternativa (última suspensão).

DROP FUNCTION IF EXISTS public.carteira_trial_suspensos(date, text, text, text);

CREATE OR REPLACE FUNCTION public.carteira_trial_suspensos(p_data date, p_q text DEFAULT NULL, p_empresa text DEFAULT NULL, p_cidade text DEFAULT NULL, p_de date DEFAULT NULL)
 RETURNS TABLE(sigla text, motivo text, faixa text, vidas bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  with m as (
    select v.cd_mat_alternativa as mat,
      max(public.sigla_contratacao(v.tp_contratacao)) as sigla,
      max(v.dt_vigencia_beneficiario::date) as vig,
      max(v.dt_desligamento::date) as desl,
      max(v.dt_reativacao::date) as reat
    from public.view_ecarteira v
    where v.tp_plano = 'SAUDE'
      and v.cd_mat_alternativa <= 399999999999
      and (p_q is null or (case when p_q ~ '^\d+$'
             then v.cd_mat_alternativa::text = p_q or v.cd_contrato::text = p_q
             else v.nm_beneficiario ilike '%' || p_q || '%' end))
      and (p_empresa is null or v.nm_empresa_estipulante ilike '%' || p_empresa || '%')
      and (p_cidade is null or v.nm_cidade_plano ilike '%' || p_cidade || '%')
    group by v.cd_mat_alternativa
  ), a as (
    select * from m
    where vig is not null and vig <= p_data
      and not (desl is not null and desl <= p_data and not (reat is not null and reat <= p_data and reat > desl))
  ), s as (
    select distinct on (b.cd_mat_alternativa)
      b.cd_mat_alternativa as mat, b.dt_ult_suspensao::date as susp,
      b.dt_ult_reat_suspensao::date as rs, nullif(b.ds_motivo_suspensao, 'None') as motivo
    from public.beneficiarios b
    where b.dt_ult_suspensao is not null and b.dt_ult_suspensao::date <= p_data
      and (p_de is null or b.dt_ult_suspensao::date >= p_de)
    order by b.cd_mat_alternativa, b.dt_ult_suspensao desc
  )
  select a.sigla,
    coalesce(s.motivo, 'NÃO INFORMADO'),
    case when p_data - s.susp <= 30 then '0-30' when p_data - s.susp <= 60 then '31-60'
         when p_data - s.susp <= 90 then '61-90' when p_data - s.susp <= 120 then '91-120' else '120+' end,
    count(*)
  from a join s on s.mat = a.mat::text
  where not (s.rs is not null and s.rs >= s.susp and s.rs <= p_data)
  group by 1, 2, 3;
$function$;

GRANT EXECUTE ON FUNCTION public.carteira_trial_suspensos(date, text, text, text, date) TO anon, authenticated;

-- Conferência: SELECT * FROM public.carteira_trial_suspensos(CURRENT_DATE);
