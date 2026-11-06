-- Executar somente na Hostinger. Não altera a função original nem os totais.
-- Detalhes sob demanda por contratação, com a mesma classificação e filtros de Suspensos.
CREATE OR REPLACE FUNCTION public.carteira_trial_suspensos_estipulantes(p_data date, p_q text DEFAULT NULL, p_empresa text DEFAULT NULL, p_cidade text DEFAULT NULL, p_de date DEFAULT NULL, p_sigla text DEFAULT NULL)
 RETURNS TABLE(nome_estipulante text, vidas bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  with m as (
    select v.cd_mat_alternativa as mat,
      max(public.sigla_contratacao(v.tp_contratacao)) as sigla,
      coalesce(max(nullif(trim(v.nm_empresa_estipulante), '')), 'NÃO INFORMADO') as nome_estipulante,
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
  select a.nome_estipulante, count(*)
  from a join s on s.mat = a.mat::text
  where not (s.rs is not null and s.rs >= s.susp and s.rs <= p_data)
    and (p_sigla is null or a.sigla = p_sigla)
  group by a.nome_estipulante
  order by count(*) desc, a.nome_estipulante;
$function$;

REVOKE ALL ON FUNCTION public.carteira_trial_suspensos_estipulantes(date, text, text, text, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.carteira_trial_suspensos_estipulantes(date, text, text, text, date, text) TO anon, authenticated, service_role;
