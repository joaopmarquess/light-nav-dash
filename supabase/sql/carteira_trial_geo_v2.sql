-- Carteira > Área Geográfica: ativos por UF/cidade na data p_data.
-- Executar na base da Hostinger (não no backend da aplicação).
--
-- Regra:
--   * Somente linhas tp_linha = 'E', tp_plano = 'SAUDE', matrículas <= 399999999999.
--   * Agrupa por matrícula (cd_mat_alternativa).
--   * Vigência: maior dt_vigencia_beneficiario <= p_data (UF/cidade da linha dessa vigência).
--   * Desligamento: maior dt_desligamento <= p_data.
--   * Reativação: maior dt_reativacao <= p_data.
--   * Ativo = tem vigência até p_data e (sem desligamento até p_data
--     ou reativação até p_data posterior ao último desligamento).
--   * Datas posteriores a p_data são ignoradas (corrige datas passadas e futuras).
-- Assinatura e retorno iguais: a tela não precisa mudar.

CREATE OR REPLACE FUNCTION public.carteira_trial_geo(p_data date DEFAULT CURRENT_DATE)
 RETURNS TABLE(uf text, cidade text, ativos bigint)
 LANGUAGE sql
 STABLE
AS $function$
  with e as (
    select cd_mat_alternativa,
           dt_vigencia_beneficiario::date vig, dt_desligamento::date des, dt_reativacao::date rea,
           cd_uf_plano, nm_cidade_plano
    from public.view_ecarteira
    where tp_plano = 'SAUDE' and tp_linha = 'E' and cd_mat_alternativa <= 399999999999
  ),
  m as (
    select cd_mat_alternativa,
      max(vig) filter (where vig <= p_data) vig,
      max(des) filter (where des <= p_data) des,
      max(rea) filter (where rea <= p_data) rea,
      (array_agg(cd_uf_plano order by vig desc nulls last) filter (where vig <= p_data))[1] uf,
      (array_agg(nm_cidade_plano order by vig desc nulls last) filter (where vig <= p_data))[1] cidade
    from e
    group by cd_mat_alternativa
  )
  select uf::text, cidade::text, count(*)
  from m
  where vig is not null and (des is null or (rea is not null and rea > des))
  group by uf, cidade;
$function$;

-- Reconciliação (antes e depois, mesma data):
-- SELECT sum(ativos) FROM public.carteira_trial_geo(CURRENT_DATE);

-- Versão anterior (para voltar, se necessário):
-- CREATE OR REPLACE FUNCTION public.carteira_trial_geo(p_data date DEFAULT CURRENT_DATE)
--  RETURNS TABLE(uf text, cidade text, ativos bigint) LANGUAGE sql STABLE AS $f$
--   with m as (
--     select cd_mat_alternativa,
--       max(dt_vigencia_beneficiario)::date vig, max(dt_desligamento)::date can, max(dt_reativacao)::date rea,
--       (array_agg(cd_uf_plano order by dt_vigencia_beneficiario desc nulls last))[1] uf,
--       (array_agg(nm_cidade_plano order by dt_vigencia_beneficiario desc nulls last))[1] cidade
--     from public.view_ecarteira
--     where tp_plano = 'SAUDE' and cd_mat_alternativa <= 399999999999
--     group by cd_mat_alternativa)
--   select uf::text, cidade::text, count(*) from m
--   where vig <= p_data and ((can is null and rea is null) or (rea <= p_data and (can is null or rea > can)))
--   group by uf, cidade;
-- $f$;
