-- Carteira > Movimentação: regra nova nos cards Vendas e Cancelamentos (v4).
-- Reativações e Transferências permanecem na regra original.
-- Executar na base da Hostinger, inteiro.
-- Altera somente carteira_movimentacao_totais. Os detalhes do olho seguem na versão original.

CREATE OR REPLACE FUNCTION public.carteira_movimentacao_totais(p_de date, p_ate date)
 RETURNS TABLE(vendas bigint, cancelamentos bigint, reativacoes bigint, entradas_transferencia bigint, saidas_transferencia bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if p_de is null or p_ate is null or p_de > p_ate then
    raise exception 'Informe um período válido (De <= Até).' using errcode = '22023';
  end if;

  return query
  with motivos_transferencia as (
    select cd_motivo_cancelamento::int as cd
    from public.motivo_cancelamento_grupo
    where lower(trim(gp_motivo_cancelamento)) = 'transferência'
  ),
  base as (
    select distinct on (
      v.cd_mat_alternativa,
      v.dt_vigencia_beneficiario::date,
      v.dt_desligamento::date,
      v.dt_reativacao::date
    )
      v.cd_mat_alternativa::text as mat,
      nullif(ltrim(regexp_replace(coalesce(v.nr_cpf::text, ''), '\D', '', 'g'), '0'), '') as cpfk,
      v.dt_vigencia_beneficiario::date as vig,
      v.dt_desligamento::date as desl,
      v.dt_reativacao::date as reat,
      v.cd_motivo_cancelamento::int as motivo
    from public.view_ecarteira v
    where v.tp_plano = 'SAUDE'
      and v.cd_mat_alternativa <= 399999999999
  ),
  candidatos as (
    select * from base
    where (vig >= date_trunc('month', p_de) - interval '1 month'
       and vig < date_trunc('month', p_ate) + interval '2 month')
       or (desl >= date_trunc('month', p_de) - interval '1 month'
       and desl < date_trunc('month', p_ate) + interval '2 month')
  ),
  entradas as (
    select distinct on (mat, vig) * from candidatos where vig between p_de and p_ate
  ),
  saidas as (
    select distinct on (mat, desl) * from candidatos where desl between p_de and p_ate
  ),
  reativados as (
    select distinct on (mat, reat) * from base where reat between p_de and p_ate
  ),
  -- VENDAS (regra nova): entradas só de linhas E; transferência quando a mesma pessoa
  -- (nome + nascimento) teve saída em linha S, em outra matrícula, com motivo do grupo
  -- "Transferência", no mesmo mês da entrada ou no mês anterior.
  e_base as materialized (
    select distinct on (v.cd_mat_alternativa, v.dt_vigencia_beneficiario::date)
      v.cd_mat_alternativa::text as mat,
      (nullif(upper(regexp_replace(trim(v.nm_beneficiario), '\s+', ' ', 'g')), '') || '|' || v.dt_nascimento::date::text) as pk,
      v.dt_vigencia_beneficiario::date as vig
    from public.view_ecarteira v
    where v.tp_plano = 'SAUDE' and v.tp_linha = 'E'
      and v.cd_mat_alternativa <= 399999999999
      and v.dt_vigencia_beneficiario::date between p_de and p_ate
  ),
  s_base as materialized (
    select distinct
      v.cd_mat_alternativa::text as mat,
      (nullif(upper(regexp_replace(trim(v.nm_beneficiario), '\s+', ' ', 'g')), '') || '|' || v.dt_nascimento::date::text) as pk,
      v.dt_desligamento::date as desl
    from public.view_ecarteira v
    where v.tp_plano = 'SAUDE' and v.tp_linha = 'S'
      and v.cd_mat_alternativa <= 399999999999
      and v.cd_motivo_cancelamento::int in (select cd from motivos_transferencia)
      and v.dt_desligamento::date >= date_trunc('month', p_de) - interval '1 month'
      and v.dt_desligamento::date < date_trunc('month', p_ate) + interval '1 month'
  ),
  vendas_novas as (
    select count(*) as n from e_base e
    where e.pk is null or not exists (
      select 1 from s_base s
      where s.pk = e.pk and s.mat <> e.mat
        and ((extract(year from e.vig) * 12 + extract(month from e.vig))
           - (extract(year from s.desl) * 12 + extract(month from s.desl))) in (0, 1)
    )
  ),
  -- CANCELAMENTOS (regra nova): saídas e motivos só de linhas S; vira transferência quando
  -- o motivo é do grupo "Transferência" e a mesma pessoa (nome + nascimento) tem entrada
  -- em linha E, em outra matrícula, no mesmo mês da saída ou no seguinte.
  s_saidas as materialized (
    select v.cd_mat_alternativa::text as mat,
      (nullif(upper(regexp_replace(trim(v.nm_beneficiario), '\s+', ' ', 'g')), '') || '|' || v.dt_nascimento::date::text) as pk,
      v.dt_desligamento::date as desl,
      bool_or(v.cd_motivo_cancelamento::int in (select cd from motivos_transferencia)) as motivo_transf
    from public.view_ecarteira v
    where v.tp_plano = 'SAUDE' and v.tp_linha = 'S'
      and v.cd_mat_alternativa <= 399999999999
      and v.dt_desligamento::date between p_de and p_ate
    group by 1, 2, 3
  ),
  e_entradas as materialized (
    select distinct v.cd_mat_alternativa::text as mat,
      (nullif(upper(regexp_replace(trim(v.nm_beneficiario), '\s+', ' ', 'g')), '') || '|' || v.dt_nascimento::date::text) as pk,
      v.dt_vigencia_beneficiario::date as vig
    from public.view_ecarteira v
    where v.tp_plano = 'SAUDE' and v.tp_linha = 'E'
      and v.cd_mat_alternativa <= 399999999999
      and v.dt_vigencia_beneficiario::date >= date_trunc('month', p_de)
      and v.dt_vigencia_beneficiario::date < date_trunc('month', p_ate) + interval '2 month'
  ),
  cancelamentos_novos as (
    select count(*) as n from (select distinct mat, desl from s_saidas s
      where not (s.motivo_transf and s.pk is not null and exists (
        select 1 from e_entradas e
        where e.pk = s.pk and e.mat <> s.mat
          and ((extract(year from e.vig) * 12 + extract(month from e.vig))
             - (extract(year from s.desl) * 12 + extract(month from s.desl))) in (0, 1)))) x
  ),
  entradas_classificadas as (
    select exists (
      select 1 from candidatos c
      where e.cpfk is not null and c.cpfk = e.cpfk and c.mat <> e.mat
        and c.desl is not null
        and c.motivo in (select cd from motivos_transferencia)
        and ((extract(year from e.vig) * 12 + extract(month from e.vig))
           - (extract(year from c.desl) * 12 + extract(month from c.desl))) in (0, 1)
    ) as transferencia
    from entradas e
  ),
  saidas_classificadas as (
    select exists (
      select 1 from candidatos c
      where s.motivo in (select cd from motivos_transferencia)
        and s.cpfk is not null and c.cpfk = s.cpfk and c.mat <> s.mat
        and c.vig is not null
        and ((extract(year from c.vig) * 12 + extract(month from c.vig))
           - (extract(year from s.desl) * 12 + extract(month from s.desl))) in (0, 1)
    ) as transferencia
    from saidas s
  )
  select
    (select n from vendas_novas),
    (select n from cancelamentos_novos),
    (select count(*) from reativados),
    (select count(*) from entradas_classificadas where transferencia),
    (select count(*) from saidas_classificadas where transferencia);
end;
$function$;

