-- Carteira > Movimentação: Base apenas com linhas tp_linha = 'E'.
-- Executar na base da Hostinger, inteiro. Muda só o filtro da Base nas duas funções
-- (cards e detalhes), para que continuem batendo entre si.

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
    and v.tp_linha = 'E'
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
    (select count(*) from entradas_classificadas where not transferencia),
    (select count(*) from saidas_classificadas where not transferencia),
    (select count(*) from reativados),
    (select count(*) from entradas_classificadas where transferencia),
    (select count(*) from saidas_classificadas where transferencia);
end;
$function$;

CREATE OR REPLACE FUNCTION public.carteira_movimentacao(p_de date, p_ate date)
 RETURNS TABLE(tipo text, data date, mat text, cpf text, nome text, empresa text, cd_vendedor integer, nm_vendedor text, mat_anterior text, saida date, motivo integer, mat_nova text, entrada date, cd_vendedor_novo integer, nm_vendedor_novo text, tipo_reentrada text, bloco text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
with motT as (
  select cd_motivo_cancelamento::int as cd
  from motivo_cancelamento_grupo
  where lower(trim(gp_motivo_cancelamento)) = 'transferência'
),
base as (
  select distinct on (v.cd_mat_alternativa, v.dt_vigencia_beneficiario::date, v.dt_desligamento::date, v.dt_reativacao::date)
    v.cd_mat_alternativa::text as mat,
    nullif(ltrim(regexp_replace(coalesce(v.nr_cpf::text, ''), '\D', '', 'g'), '0'), '') as cpfk,
    v.nr_cpf::text as cpf,
    v.nm_beneficiario as nome,
    v.nm_empresa_estipulante as empresa,
    v.cd_vendedor::int as cd_vendedor,
    case when v.cd_vendedor::int = 274 then 'TRANSFERENCIA DE CONTRATO' else v.nm_vendedor end as nm_vendedor,
    v.dt_vigencia_beneficiario::date as vig,
    v.dt_desligamento::date as desl,
    v.dt_reativacao::date as reat,
    v.cd_motivo_cancelamento::int as motivo
  from view_ecarteira v
  where v.tp_plano = 'SAUDE'
    and v.tp_linha = 'E'
    and v.cd_mat_alternativa <= 399999999999
),
-- candidatos para ligação: janela de 1 mês antes a 1 mês depois do período
cand as (
  select * from base
  where (vig  >= date_trunc('month', p_de) - interval '1 month' and vig  < date_trunc('month', p_ate) + interval '2 month')
     or (desl >= date_trunc('month', p_de) - interval '1 month' and desl < date_trunc('month', p_ate) + interval '2 month')
),
ent as (select distinct on (mat, vig) * from cand where vig between p_de and p_ate),
sai as (select distinct on (mat, desl) * from cand where desl between p_de and p_ate),
rea as (select distinct on (mat, reat) * from base where reat between p_de and p_ate),
-- entradas: procura saída anterior por transferência do mesmo CPF
ent_par as (
  select e.*, a.mat as a_mat, a.desl as a_desl, a.motivo as a_motivo
  from ent e
  left join lateral (
    select c.* from cand c
    where e.cpfk is not null and c.cpfk = e.cpfk and c.mat <> e.mat
      and c.desl is not null and c.motivo in (select cd from motT)
      and ((extract(year from e.vig) * 12 + extract(month from e.vig))
         - (extract(year from c.desl) * 12 + extract(month from c.desl))) in (0, 1)
    order by abs(e.vig - c.desl)
    limit 1
  ) a on true
),
-- saídas: procura nova entrada do mesmo CPF
sai_par as (
  select s.*, n.mat as n_mat, n.vig as n_vig, n.cd_vendedor as n_vend, n.nm_vendedor as n_nmvend
  from sai s
  left join lateral (
    select c.* from cand c
    where s.motivo in (select cd from motT)
      and s.cpfk is not null and c.cpfk = s.cpfk and c.mat <> s.mat
      and c.vig is not null
      and ((extract(year from c.vig) * 12 + extract(month from c.vig))
         - (extract(year from s.desl) * 12 + extract(month from s.desl))) in (0, 1)
    order by abs(c.vig - s.desl)
    limit 1
  ) n on true
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
select 'Reativação', reat, mat, cpf, nome, empresa, cd_vendedor, nm_vendedor,
  null, null, null, null, null, null, null, null, null
from rea
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
