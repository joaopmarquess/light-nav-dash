-- Carteira > Painel: card "Contratos".
-- Executar na base da Hostinger, inteiro.
-- Conta titulares distintos (matrícula terminada em 00) ativos na data "Ativos em:",
-- com os mesmos filtros da tela (busca, empresa, cidade), Saúde e matrícula <= 399999999999.
-- Ativo = vigência iniciada até a data e sem desligamento até a data
-- (ou reativado depois do último desligamento), como na lista da tela.

CREATE OR REPLACE FUNCTION public.carteira_trial_contratos(p_data date, p_q text DEFAULT NULL, p_empresa text DEFAULT NULL, p_cidade text DEFAULT NULL)
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  with m as (
    select v.cd_mat_alternativa as mat,
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
  select count(*) from m
  where vig is not null and vig <= p_data
    and not (desl is not null and desl <= p_data and not (reat is not null and reat <= p_data and reat > desl));
$function$;

GRANT EXECUTE ON FUNCTION public.carteira_trial_contratos(date, text, text, text) TO anon, authenticated;

-- Conferência: SELECT public.carteira_trial_contratos(CURRENT_DATE);
