-- Carteira > Evolução Mensal: vidas ativas no fim de cada mês, total e por PIF/PCA/PCE,
-- numa única chamada (substitui ~2 chamadas por mês).
-- Executar na base da Hostinger, inteiro (requer public.sigla_contratacao).
-- Regra de ativo igual a carteira_trial_geo ("Ativos em"): linhas E, SAUDE, matrícula <= 399999999999;
-- maior vigência/desligamento/reativação <= data; ativo se tem vigência e
-- (sem desligamento ou reativação posterior ao último desligamento).
-- Mês corrente usa CURRENT_DATE em vez do fim do mês.

CREATE OR REPLACE FUNCTION public.carteira_evolucao_mensal(p_de int, p_ate int)
 RETURNS TABLE(ano int, mes int, total bigint, pif bigint, pca bigint, pce bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  with d as (
    select least((date_trunc('month', g) + interval '1 month - 1 day')::date, current_date) as dt
    from generate_series(make_date(p_de, 1, 1), least(make_date(p_ate, 12, 1), current_date), interval '1 month') g
  ),
  e as (
    select cd_mat_alternativa mat,
           dt_vigencia_beneficiario::date vig, dt_desligamento::date des, dt_reativacao::date rea,
           public.sigla_contratacao(tp_contratacao) sigla
    from public.view_ecarteira
    where tp_plano = 'SAUDE' and tp_linha = 'E' and cd_mat_alternativa <= 399999999999
  ),
  m as (
    select d.dt, e.mat,
      max(e.vig) filter (where e.vig <= d.dt) vig,
      max(e.des) filter (where e.des <= d.dt) des,
      max(e.rea) filter (where e.rea <= d.dt) rea,
      (array_agg(e.sigla order by e.vig desc nulls last) filter (where e.vig <= d.dt))[1] sigla
    from e join d on e.vig <= d.dt
    group by d.dt, e.mat
  )
  select extract(year from dt)::int, extract(month from dt)::int,
         count(*),
         count(*) filter (where sigla = 'PIF'),
         count(*) filter (where sigla = 'PCA'),
         count(*) filter (where sigla = 'PCE')
  from m
  where vig is not null and (des is null or (rea is not null and rea > des))
  group by dt
  order by dt;
$function$;

GRANT EXECUTE ON FUNCTION public.carteira_evolucao_mensal(int, int) TO anon, authenticated;

-- Conferência (deve bater com sum(ativos) de carteira_trial_geo na mesma data):
-- SELECT * FROM public.carteira_evolucao_mensal(2019, 2026);
