-- Carteira > Evolução Mensal: vidas ativas no fim de cada mês, total e por PIF/PCA/PCE,
-- numa única chamada. v2: calcula a situação de cada matrícula só nas datas de evento
-- (vigência/desligamento/reativação) e cruza os intervalos com os fins de mês (rápido).
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
  ev as (            -- um evento por data e tipo
    select mat, vig dt, vig v, null::date ds, null::date r, to_char(vig, 'YYYYMMDD') || coalesce(sigla, '') vs from e where vig is not null
    union all select mat, des, null, des, null, null from e where des is not null
    union all select mat, rea, null, null, rea, null from e where rea is not null
  ),
  p as (             -- colapsa por matrícula/data
    select mat, dt, max(v) v, max(ds) ds, max(r) r, max(vs) vs from ev group by mat, dt
  ),
  s as (             -- situação acumulada a partir de cada data de evento
    select mat, dt,
      lead(dt) over w1 prox,
      max(v) over w v, max(ds) over w ds, max(r) over w r,
      substr(max(vs) over w, 9) sigla
    from p
    window w as (partition by mat order by dt rows between unbounded preceding and current row),
           w1 as (partition by mat order by dt)
  ),
  a as (
    select dt, coalesce(prox, 'infinity'::date) prox, sigla from s
    where v is not null and (ds is null or (r is not null and r > ds))
  )
  select extract(year from d.dt)::int, extract(month from d.dt)::int,
         count(*),
         count(*) filter (where a.sigla = 'PIF'),
         count(*) filter (where a.sigla = 'PCA'),
         count(*) filter (where a.sigla = 'PCE')
  from d join a on d.dt >= a.dt and d.dt < a.prox
  group by d.dt
  order by d.dt;
$function$;

GRANT EXECUTE ON FUNCTION public.carteira_evolucao_mensal(int, int) TO anon, authenticated;

-- Conferência (deve bater com sum(ativos) de carteira_trial_geo na mesma data, ex.: 31/12/2025 = 66.386):
-- SELECT * FROM public.carteira_evolucao_mensal(2019, 2026);
