-- Carteira > Painel: Contratos Ativos (titulares, matrícula final 00) por PIF / PCA / PCE, para os tooltips.
-- Executar na base da Hostinger, inteiro (requer public.sigla_contratacao).
-- Mesma regra de ativo e filtros de carteira_trial_siglas.

CREATE OR REPLACE FUNCTION public.carteira_trial_siglas_contratos(p_data date, p_q text DEFAULT NULL, p_empresa text DEFAULT NULL, p_cidade text DEFAULT NULL)
 RETURNS TABLE(sigla text, contratos bigint)
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
      and v.cd_mat_alternativa % 100 = 0
      and (p_q is null or (case when p_q ~ '^\d+$'
             then v.cd_mat_alternativa::text = p_q or v.cd_contrato::text = p_q
             else v.nm_beneficiario ilike '%' || p_q || '%' end))
      and (p_empresa is null or v.nm_empresa_estipulante ilike '%' || p_empresa || '%')
      and (p_cidade is null or v.nm_cidade_plano ilike '%' || p_cidade || '%')
    group by v.cd_mat_alternativa
  )
  select sigla, count(*) from m
  where vig is not null and vig <= p_data
    and not (desl is not null and desl <= p_data and not (reat is not null and reat <= p_data and reat > desl))
  group by sigla;
$function$;

GRANT EXECUTE ON FUNCTION public.carteira_trial_siglas_contratos(date, text, text, text) TO anon, authenticated;

-- Conferência: SELECT * FROM public.carteira_trial_siglas_contratos(CURRENT_DATE);
