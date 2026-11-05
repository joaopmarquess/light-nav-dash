-- Carteira > Evolução Mensal (v3): resultado pré-calculado em tabela, leitura instantânea.
-- O cálculo completo leva mais de 60s e estoura o limite da API; por isso ele roda
-- dentro do banco (SQL editor ou agendamento) e a tela só lê a tabela pronta.
-- Executar na base da Hostinger, inteiro (requer public.sigla_contratacao).
-- Regra de ativo igual a carteira_trial_geo ("Ativos em"). Mês corrente usa a data do cálculo.

CREATE TABLE IF NOT EXISTS public.carteira_evolucao_mensal_cache (
  ano int NOT NULL, mes int NOT NULL, total bigint, pif bigint, pca bigint, pce bigint,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ano, mes)
);
ALTER TABLE public.carteira_evolucao_mensal_cache ENABLE ROW LEVEL SECURITY;

-- 1) Recalcula tudo (2019 até hoje). Rodar no SQL editor: SELECT public.carteira_evolucao_mensal_refresh();
CREATE OR REPLACE FUNCTION public.carteira_evolucao_mensal_refresh()
 RETURNS int
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
 SET statement_timeout TO 0
AS $function$
DECLARE n int;
BEGIN
  DELETE FROM public.carteira_evolucao_mensal_cache;
  INSERT INTO public.carteira_evolucao_mensal_cache (ano, mes, total, pif, pca, pce)
  with d as (
    select least((date_trunc('month', g) + interval '1 month - 1 day')::date, current_date) as dt
    from generate_series(make_date(2019, 1, 1), least(current_date, current_date), interval '1 month') g
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
;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$function$;
REVOKE ALL ON FUNCTION public.carteira_evolucao_mensal_refresh() FROM PUBLIC, anon, authenticated;

-- 2) Leitura usada pela tela (instantânea).
CREATE OR REPLACE FUNCTION public.carteira_evolucao_mensal(p_de int, p_ate int)
 RETURNS TABLE(ano int, mes int, total bigint, pif bigint, pca bigint, pce bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select ano, mes, total, pif, pca, pce
  from public.carteira_evolucao_mensal_cache
  where ano between p_de and p_ate
  order by ano, mes;
$function$;
GRANT EXECUTE ON FUNCTION public.carteira_evolucao_mensal(int, int) TO anon, authenticated;

-- 3) Primeira carga (pode levar alguns minutos):
SELECT public.carteira_evolucao_mensal_refresh();

-- 4) Opcional: atualizar todo dia às 05:00 (se a extensão pg_cron estiver disponível):
-- SELECT cron.schedule('evolucao_mensal_diaria', '0 5 * * *', 'SELECT public.carteira_evolucao_mensal_refresh()');

-- Conferência: dezembro/2025 deve dar 66.386 (igual a carteira_trial_geo em 31/12/2025).
-- SELECT * FROM public.carteira_evolucao_mensal(2019, 2026);
