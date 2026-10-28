-- Carteira > Área Geográfica: ativos por UF/cidade na data p_data.
-- Executar na base da Hostinger (não no backend da aplicação).
--
-- Regra nova:
--   * Conta por matrícula (cd_mat_alternativa), apenas tp_plano = 'SAUDE'
--     e matrículas <= 399999999999.
--   * Vigência, UF e cidade: somente linhas tp_linha = 'E', considerando apenas
--     vigências iniciadas até p_data (a mais recente define UF/cidade).
--   * Desligamento: somente linhas tp_linha = 'S', último dt_desligamento <= p_data.
--   * Reativação: somente linhas tp_linha = 'R', último dt_reativacao <= p_data.
--   * Ativo em p_data = tem vigência E até p_data e
--       (nenhum desligamento até p_data OU reativação até p_data posterior ao último desligamento).
--   * Eventos com data posterior a p_data são ignorados (corrige datas passadas e futuras).
-- Assinatura e retorno iguais à versão anterior: a tela continua funcionando sem mudanças.

-- 0) Conferência prévia (opcional): tipos de linha existentes
-- SELECT tp_linha, count(*) FROM public.view_ecarteira WHERE tp_plano = 'SAUDE' GROUP BY tp_linha;

CREATE OR REPLACE FUNCTION public.carteira_trial_geo(p_data date DEFAULT CURRENT_DATE)
 RETURNS TABLE(uf text, cidade text, ativos bigint)
 LANGUAGE sql
 STABLE
AS $function$
  with base as (
    select cd_mat_alternativa, tp_linha,
           dt_vigencia_beneficiario::date vig,
           dt_desligamento::date des,
           dt_reativacao::date rea,
           cd_uf_plano, nm_cidade_plano
    from public.view_ecarteira
    where tp_plano = 'SAUDE' and cd_mat_alternativa <= 399999999999
  ),
  ent as (
    select cd_mat_alternativa,
      (array_agg(cd_uf_plano order by vig desc))[1] uf,
      (array_agg(nm_cidade_plano order by vig desc))[1] cidade
    from base
    where tp_linha = 'E' and vig is not null and vig <= p_data
    group by cd_mat_alternativa
  ),
  sai as (
    select cd_mat_alternativa, max(des) des
    from base
    where tp_linha = 'S' and des is not null and des <= p_data
    group by cd_mat_alternativa
  ),
  rea as (
    select cd_mat_alternativa, max(rea) rea
    from base
    where tp_linha = 'R' and rea is not null and rea <= p_data
    group by cd_mat_alternativa
  )
  select e.uf::text, e.cidade::text, count(*)
  from ent e
  left join sai s using (cd_mat_alternativa)
  left join rea r using (cd_mat_alternativa)
  where s.des is null or (r.rea is not null and r.rea > s.des)
  group by e.uf, e.cidade;
$function$;

-- Reconciliação (rodar antes e depois, mesma data):
-- SELECT sum(ativos) FROM public.carteira_trial_geo(CURRENT_DATE);
-- SELECT sum(ativos) FROM public.carteira_trial_geo(DATE '2026-01-31');

-- Para voltar à versão anterior, se necessário:
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
