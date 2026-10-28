-- Carteira > Movimentação (v6): cards e detalhes do olho com a mesma regra, mais rápidos.
-- Executar na base da Hostinger, inteiro.
--
-- Regra única (cards e detalhes):
--   * Saúde, matrícula <= 399999999999.
--   * Entradas: linhas E, uma por matrícula + data de vigência no período.
--   * Saídas:   linhas S, uma por matrícula + data de desligamento no período; motivo das linhas S.
--   * Reativações: linhas R, uma por matrícula + data de reativação no período.
--   * Pessoa = nome do beneficiário (maiúsculo, espaços normalizados) + data de nascimento.
--   * Entrada vira transferência (T+): mesma pessoa teve saída S com motivo do grupo
--     "Transferência" em outra matrícula, no mesmo mês da entrada ou no anterior.
--   * Saída vira transferência (T-): motivo do grupo "Transferência" e a mesma pessoa tem
--     entrada E em outra matrícula no mesmo mês da saída ou no seguinte.
--   * Vendas = entradas − T+; Cancelamentos = saídas − T−.
-- Velocidade: cada leitura da tabela é feita uma vez (MATERIALIZED) e a busca de pares
-- usa junção por pessoa, em vez de subconsultas repetidas.

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
  with mt as materialized (
    select cd_motivo_cancelamento::int as cd from public.motivo_cancelamento_grupo
    where lower(trim(gp_motivo_cancelamento)) = 'transferência'
  ),
  linhas as materialized (
    select v.tp_linha, v.cd_mat_alternativa::text as mat,
      (nullif(upper(regexp_replace(trim(v.nm_beneficiario), '\s+', ' ', 'g')), '') || '|' || v.dt_nascimento::date::text) as pk,
      v.dt_vigencia_beneficiario::date as vig, v.dt_desligamento::date as desl, v.dt_reativacao::date as reat,
      v.cd_motivo_cancelamento::int as motivo
    from public.view_ecarteira v
    where v.tp_plano = 'SAUDE' and v.tp_linha in ('E', 'S', 'R')
      and v.cd_mat_alternativa <= 399999999999
      and (  (v.tp_linha = 'E' and v.dt_vigencia_beneficiario::date >= date_trunc('month', p_de)
                               and v.dt_vigencia_beneficiario::date <  date_trunc('month', p_ate) + interval '2 month')
          or (v.tp_linha = 'S' and v.dt_desligamento::date >= date_trunc('month', p_de) - interval '1 month'
                               and v.dt_desligamento::date <  date_trunc('month', p_ate) + interval '1 month')
          or (v.tp_linha = 'R' and v.dt_reativacao::date between p_de and p_ate))
  ),
  -- todas as entradas E da janela (para ligar saídas) e as do período
  e_all as materialized (
    select mat, max(pk) pk, vig, extract(year from vig)::int * 12 + extract(month from vig)::int as m
    from linhas where tp_linha = 'E' group by mat, vig
  ),
  -- saídas S da janela com motivo de transferência (para ligar entradas)
  s_tr as materialized (
    select mat, max(pk) pk, desl, extract(year from desl)::int * 12 + extract(month from desl)::int as m
    from linhas where tp_linha = 'S' and motivo in (select cd from mt) group by mat, desl
  ),
  s_per as materialized (
    select mat, max(pk) pk, desl, bool_or(motivo in (select cd from mt)) as mot_tr,
      extract(year from desl)::int * 12 + extract(month from desl)::int as m
    from linhas where tp_linha = 'S' and desl between p_de and p_ate group by mat, desl
  ),
  e_cls as (
    select e.mat, e.vig, exists (
      select 1 from s_tr s where s.pk = e.pk and s.mat <> e.mat and e.m - s.m in (0, 1)) as tr
    from e_all e where e.pk is not null and e.vig between p_de and p_ate
    union all
    select e.mat, e.vig, false from e_all e where e.pk is null and e.vig between p_de and p_ate
  ),
  s_cls as (
    select s.mat, s.desl, (s.mot_tr and s.pk is not null and exists (
      select 1 from e_all e where e.pk = s.pk and e.mat <> s.mat and e.m - s.m in (0, 1))) as tr
    from s_per s
  )
  select
    (select count(*) from e_cls where not tr),
    (select count(*) from s_cls where not tr),
    (select count(*) from (select distinct mat, reat from linhas where tp_linha = 'R') r),
    (select count(*) from e_cls where tr),
    (select count(*) from s_cls where tr);
end;
$function$;

CREATE OR REPLACE FUNCTION public.carteira_movimentacao(p_de date, p_ate date)
 RETURNS TABLE(tipo text, data date, mat text, cpf text, nome text, empresa text, cd_vendedor integer, nm_vendedor text, mat_anterior text, saida date, motivo integer, mat_nova text, entrada date, cd_vendedor_novo integer, nm_vendedor_novo text, tipo_reentrada text, bloco text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
with mt as materialized (
  select cd_motivo_cancelamento::int as cd from motivo_cancelamento_grupo
  where lower(trim(gp_motivo_cancelamento)) = 'transferência'
),
linhas as materialized (
  select v.tp_linha, v.cd_mat_alternativa::text as mat,
    (nullif(upper(regexp_replace(trim(v.nm_beneficiario), '\s+', ' ', 'g')), '') || '|' || v.dt_nascimento::date::text) as pk,
    v.nr_cpf::text as cpf, v.nm_beneficiario as nome, v.nm_empresa_estipulante as empresa,
    v.cd_vendedor::int as cd_vendedor,
    case when v.cd_vendedor::int = 274 then 'TRANSFERENCIA DE CONTRATO' else v.nm_vendedor end as nm_vendedor,
    v.dt_vigencia_beneficiario::date as vig, v.dt_desligamento::date as desl, v.dt_reativacao::date as reat,
    v.cd_motivo_cancelamento::int as motivo
  from view_ecarteira v
  where v.tp_plano = 'SAUDE' and v.tp_linha in ('E', 'S', 'R')
    and v.cd_mat_alternativa <= 399999999999
    and (  (v.tp_linha = 'E' and v.dt_vigencia_beneficiario::date >= date_trunc('month', p_de)
                             and v.dt_vigencia_beneficiario::date <  date_trunc('month', p_ate) + interval '2 month')
        or (v.tp_linha = 'S' and v.dt_desligamento::date >= date_trunc('month', p_de) - interval '1 month'
                             and v.dt_desligamento::date <  date_trunc('month', p_ate) + interval '1 month')
        or (v.tp_linha = 'R' and v.dt_reativacao::date between p_de and p_ate))
),
e_all as materialized (
  select distinct on (mat, vig) mat, pk, cpf, nome, empresa, cd_vendedor, nm_vendedor, vig,
    extract(year from vig)::int * 12 + extract(month from vig)::int as m
  from linhas where tp_linha = 'E' order by mat, vig, pk desc nulls last
),
s_all as materialized (
  select distinct on (mat, desl) mat, pk, cpf, nome, empresa, cd_vendedor, nm_vendedor, desl,
    -- motivo de transferência tem prioridade quando a saída tem mais de uma linha S
    motivo, motivo in (select cd from mt) as mot_tr,
    extract(year from desl)::int * 12 + extract(month from desl)::int as m
  from linhas where tp_linha = 'S'
  order by mat, desl, (motivo in (select cd from mt)) desc, pk desc nulls last
),
ent_par as (
  select e.*, a.mat a_mat, a.desl a_desl, a.motivo a_motivo
  from e_all e
  left join lateral (
    select s.* from s_all s
    where e.pk is not null and s.pk = e.pk and s.mat <> e.mat and s.mot_tr and e.m - s.m in (0, 1)
    order by abs(e.vig - s.desl) limit 1) a on true
  where e.vig between p_de and p_ate
),
sai_par as (
  select s.*, n.mat n_mat, n.vig n_vig, n.cd_vendedor n_vend, n.nm_vendedor n_nmvend
  from s_all s
  left join lateral (
    select e.* from e_all e
    where s.mot_tr and s.pk is not null and e.pk = s.pk and e.mat <> s.mat and e.m - s.m in (0, 1)
    order by abs(e.vig - s.desl) limit 1) n on true
  where s.desl between p_de and p_ate
)
select
  case when a_mat is null then 'Entrada' else 'T+' end, vig, mat, cpf, nome, empresa, cd_vendedor, nm_vendedor,
  a_mat, a_desl, a_motivo,
  case when a_mat is null then null else mat end, case when a_mat is null then null else vig end,
  case when a_mat is null then null else cd_vendedor end, case when a_mat is null then null else nm_vendedor end,
  case when a_mat is null then null when cd_vendedor in (273, 274) then 'Pura' else 'Revenda' end,
  case when a_mat is null then null
       when date_trunc('month', vig) = date_trunc('month', a_desl) then 'mesmo' else 'anterior' end
from ent_par
union all
select 'Reativação', r.reat, r.mat, r.cpf, r.nome, r.empresa, r.cd_vendedor, r.nm_vendedor,
  null, null, null, null, null, null, null, null, null
from (select distinct on (mat, reat) * from linhas where tp_linha = 'R' order by mat, reat) r
union all
select
  case when n_mat is null then 'Saída' else 'T-' end, desl, mat, cpf, nome, empresa, cd_vendedor, nm_vendedor,
  case when n_mat is null then null else mat end, case when n_mat is null then null else desl end, motivo,
  n_mat, n_vig, n_vend, n_nmvend,
  case when n_mat is null then null when n_vend in (273, 274) then 'Pura' else 'Revenda' end,
  case when n_mat is null then null
       when date_trunc('month', n_vig) > date_trunc('month', desl) then 'proximo' else null end
from sai_par;
$function$;

-- Conferência (01/01 a 30/09/2026, deve manter Vendas 11.734, Cancelamentos 7.634, Reativações 1.072):
-- SELECT * FROM public.carteira_movimentacao_totais(DATE '2026-01-01', DATE '2026-09-30');
