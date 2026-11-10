-- Home > Evolução Produtos: vidas no fim de cada mês por tipo de plano (PIF/PCA/PCE)
-- e tipo de produto (Convencional / Fácil 50 / Outros coparticipativos).
-- Executar na base da Hostinger, inteiro (requer public.sigla_contratacao).
-- Mesma regra de ativo de carteira_evolucao_mensal ("Ativos em"); não altera aquela tabela/função.
-- O cálculo é pesado: roda dentro do banco e a tela só lê a tabela pronta.
--
-- Tipo de produto, pela linha de vigência mais recente da matrícula (view_ecarteira):
--   Fácil 50                  -> cd_plano (plano MV) 168 a 173
--   Outros coparticipativos   -> tp_recuperacao = COPARTICIPACAO (fora do Fácil 50)
--   Convencional              -> tp_recuperacao = CONVENCIONAL (integral, sem coparticipação)
--   Qualquer outro valor      -> NULL (não é inferido)

CREATE OR REPLACE FUNCTION public.produto_carteira(p_cd_plano int, p_tp_recuperacao text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case
    when p_cd_plano between 168 and 173 then 'F50'
    when upper(trim(p_tp_recuperacao)) like 'COPARTICIPA%' then 'COP'
    when upper(trim(p_tp_recuperacao)) = 'CONVENCIONAL' then 'CONV'
  end;
$function$;
GRANT EXECUTE ON FUNCTION public.produto_carteira(int, text) TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.carteira_evolucao_produtos_cache (
  ano int NOT NULL, mes int NOT NULL, sigla text NOT NULL, produto text NOT NULL, vidas bigint NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ano, mes, sigla, produto)
);
ALTER TABLE public.carteira_evolucao_produtos_cache ENABLE ROW LEVEL SECURITY;

-- 1) Recalcula tudo (2019 até hoje). Rodar no SQL editor: SELECT public.carteira_evolucao_produtos_refresh();
CREATE OR REPLACE FUNCTION public.carteira_evolucao_produtos_refresh()
 RETURNS int
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
 SET statement_timeout TO 0
AS $function$
DECLARE n int;
BEGIN
  DELETE FROM public.carteira_evolucao_produtos_cache;
  INSERT INTO public.carteira_evolucao_produtos_cache (ano, mes, sigla, produto, vidas)
  with d as (
    select least((date_trunc('month', g) + interval '1 month - 1 day')::date, current_date) as dt
    from generate_series(make_date(2019, 1, 1), current_date, interval '1 month') g
  ),
  e as (
    select cd_mat_alternativa mat,
           dt_vigencia_beneficiario::date vig, dt_desligamento::date des, dt_reativacao::date rea,
           rpad(coalesce(public.sigla_contratacao(tp_contratacao), ''), 3, '-')
             || coalesce(public.produto_carteira(cd_plano::int, tp_recuperacao), '---') tipo
    from public.view_ecarteira
    where tp_plano = 'SAUDE' and tp_linha = 'E' and cd_mat_alternativa <= 399999999999
  ),
  ev as (            -- um evento por data e tipo
    select mat, vig dt, vig v, null::date ds, null::date r, to_char(vig, 'YYYYMMDD') || tipo vs from e where vig is not null
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
      substr(max(vs) over w, 9) tipo
    from p
    window w as (partition by mat order by dt rows between unbounded preceding and current row),
           w1 as (partition by mat order by dt)
  ),
  a as (
    select dt, coalesce(prox, 'infinity'::date) prox,
           substr(tipo, 1, 3) sigla, nullif(rtrim(substr(tipo, 4), '-'), '') produto
    from s
    where v is not null and (ds is null or (r is not null and r > ds))
  )
  select extract(year from d.dt)::int, extract(month from d.dt)::int,
         a.sigla, a.produto, count(*)
  from d join a on d.dt >= a.dt and d.dt < a.prox
  where a.sigla in ('PIF', 'PCA', 'PCE') and a.produto is not null
  group by d.dt, a.sigla, a.produto
  order by d.dt;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$function$;
REVOKE ALL ON FUNCTION public.carteira_evolucao_produtos_refresh() FROM PUBLIC, anon, authenticated;

-- 2) Leitura usada pela tela (instantânea).
CREATE OR REPLACE FUNCTION public.carteira_evolucao_produtos(p_de int, p_ate int)
 RETURNS TABLE(ano int, mes int, sigla text, produto text, vidas bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select ano, mes, sigla, produto, vidas
  from public.carteira_evolucao_produtos_cache
  where ano between p_de and p_ate
  order by ano, mes, sigla, produto;
$function$;
GRANT EXECUTE ON FUNCTION public.carteira_evolucao_produtos(int, int) TO anon, authenticated;

-- 3) Primeira carga (pode levar alguns minutos):
SELECT public.carteira_evolucao_produtos_refresh();

-- Conferência: a soma dos três produtos de cada tipo deve bater com carteira_evolucao_mensal
-- (out/2025: PIF 37.823, PCA 19.536, PCE 7.832).
-- SELECT ano, mes, sigla, sum(vidas) FROM public.carteira_evolucao_produtos(2025, 2026) GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;
