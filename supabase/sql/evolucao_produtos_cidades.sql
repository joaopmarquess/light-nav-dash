-- Evolução Produtos > visão Cidade (UF): vidas, receitas e despesas por município, tipo de plano e tipo de produto.
-- Executar na Hostinger, inteiro (requer sigla_contratacao.sql e carteira_evolucao_produtos.sql).
-- Não altera carteira_evolucao_produtos nem evolucao_produtos_financeiro.
--
-- Cidade = município do plano (código IBGE), a mesma cidade usada na Área Geográfica:
--   * Vidas: cd_ibge_cidade_plano da vigência mais recente da matrícula até o fim de cada mês (view_ecarteira).
--   * Receitas e despesas: beneficiarios.cd_cidade da matrícula (igual a cd_ibge_cidade_plano na carteira).
--   * Nome e UF: grafia mais frequente na carteira para cada código IBGE (distritos e variações de acento
--     ficam no município). Código 0 ou ausente = cidade não informada (uf e cidade NULL, nada é inferido).

CREATE TABLE IF NOT EXISTS public.carteira_cidade_ibge (
  ibge bigint PRIMARY KEY, uf text, cidade text NOT NULL
);
ALTER TABLE public.carteira_cidade_ibge ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.carteira_evolucao_produtos_cidade_cache (
  ano int NOT NULL, mes int NOT NULL, sigla text NOT NULL, produto text NOT NULL, ibge bigint NOT NULL, vidas bigint NOT NULL,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ano, mes, sigla, produto, ibge)
);
ALTER TABLE public.carteira_evolucao_produtos_cidade_cache ENABLE ROW LEVEL SECURITY;

-- 1) Recalcula nomes e vidas por cidade (2019 até hoje): SELECT public.carteira_evolucao_produtos_cidade_refresh();
CREATE OR REPLACE FUNCTION public.carteira_evolucao_produtos_cidade_refresh()
 RETURNS int
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
 SET statement_timeout TO 0
AS $function$
DECLARE n int;
BEGIN
  DELETE FROM public.carteira_cidade_ibge;
  INSERT INTO public.carteira_cidade_ibge (ibge, uf, cidade)
  SELECT DISTINCT ON (ibge) ibge, uf, cidade
  FROM (
    SELECT cd_ibge_cidade_plano ibge, nullif(upper(trim(cd_uf_plano)), '') uf, upper(trim(nm_cidade_plano)) cidade, count(*) c
    FROM public.view_ecarteira
    WHERE cd_ibge_cidade_plano > 0 AND nullif(trim(nm_cidade_plano), '') IS NOT NULL
    GROUP BY 1, 2, 3
  ) x
  ORDER BY ibge, c DESC, cidade;

  DELETE FROM public.carteira_evolucao_produtos_cidade_cache;
  INSERT INTO public.carteira_evolucao_produtos_cidade_cache (ano, mes, sigla, produto, ibge, vidas)
  with d as (
    select least((date_trunc('month', g) + interval '1 month - 1 day')::date, current_date) as dt
    from generate_series(make_date(2019, 1, 1), current_date, interval '1 month') g
  ),
  e as (
    select cd_mat_alternativa mat,
           dt_vigencia_beneficiario::date vig, dt_desligamento::date des, dt_reativacao::date rea,
           rpad(coalesce(public.sigla_contratacao(tp_contratacao), ''), 3, '-')
             || rpad(coalesce(public.produto_carteira(cd_plano::int, tp_recuperacao), ''), 4, '-')
             || greatest(coalesce(cd_ibge_cidade_plano, 0), 0)::text tipo
    from public.view_ecarteira
    where tp_plano = 'SAUDE' and tp_linha = 'E' and cd_mat_alternativa <= 399999999999
  ),
  ev as (            -- um evento por data e tipo (mesma regra de carteira_evolucao_produtos)
    select mat, vig dt, vig v, null::date ds, null::date r, to_char(vig, 'YYYYMMDD') || tipo vs from e where vig is not null
    union all select mat, des, null, des, null, null from e where des is not null
    union all select mat, rea, null, null, rea, null from e where rea is not null
  ),
  p as (select mat, dt, max(v) v, max(ds) ds, max(r) r, max(vs) vs from ev group by mat, dt),
  s as (
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
           substr(tipo, 1, 3) sigla, nullif(rtrim(substr(tipo, 4, 4), '-'), '') produto, substr(tipo, 8)::bigint ibge
    from s
    where v is not null and (ds is null or (r is not null and r > ds))
  )
  select extract(year from d.dt)::int, extract(month from d.dt)::int, a.sigla, a.produto, a.ibge, count(*)
  from d join a on d.dt >= a.dt and d.dt < a.prox
  where a.sigla in ('PIF', 'PCA', 'PCE') and a.produto is not null
  group by d.dt, a.sigla, a.produto, a.ibge;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$function$;
REVOKE ALL ON FUNCTION public.carteira_evolucao_produtos_cidade_refresh() FROM PUBLIC, anon, authenticated;

-- 2) Vidas por cidade no período AAAAMM (leitura instantânea do cache).
--    Retorna um único array JSON: o período tem milhares de linhas e a API limita tabelas a 1.000 por chamada.
DROP FUNCTION IF EXISTS public.carteira_evolucao_produtos_cidade(int, int);
CREATE OR REPLACE FUNCTION public.carteira_evolucao_produtos_cidade(p_de int, p_ate int)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select coalesce(json_agg(r order by r.ano, r.mes, r.sigla, r.produto, r.uf, r.cidade), '[]'::json)
  from (
    select c.ano, c.mes, c.sigla, c.produto, n.uf, n.cidade, sum(c.vidas)::bigint vidas
    from public.carteira_evolucao_produtos_cidade_cache c
    left join public.carteira_cidade_ibge n on n.ibge = c.ibge
    where c.ano * 100 + c.mes between p_de and p_ate
    group by 1, 2, 3, 4, 5, 6
  ) r;
$function$;
GRANT EXECUTE ON FUNCTION public.carteira_evolucao_produtos_cidade(int, int) TO anon, authenticated;

-- 3) Receitas e despesas por cidade no período AAAAMM (mesmas regras de evolucao_produtos_financeiro).
--    Também retorna um único array JSON (milhares de linhas por período).
DROP FUNCTION IF EXISTS public.evolucao_produtos_financeiro_cidade(integer, integer);
CREATE OR REPLACE FUNCTION public.evolucao_produtos_financeiro_cidade(p_de integer, p_ate integer)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH f50 AS (
    SELECT DISTINCT b.cd_matricula FROM public.beneficiarios b WHERE b.cd_plano_mv IN (168, 169, 170, 171, 172, 173)
  ),
  cid AS (
    SELECT DISTINCT ON (b.cd_matricula) b.cd_matricula, b.cd_cidade
    FROM public.beneficiarios b
    ORDER BY b.cd_matricula, b.dt_ult_alteracao DESC NULLS LAST
  ),
  r AS (
    SELECT v.nr_ano::integer AS nr_ano,
           v.nr_mes::integer AS nr_mes,
           nullif(upper(trim(v.tp_plano)), '') AS sigla,
           CASE
             WHEN f.cd_matricula IS NOT NULL THEN 'F50'
             WHEN upper(trim(v.sn_coparticipativo)) = 'S' THEN 'COP'
             WHEN upper(trim(v.sn_coparticipativo)) = 'N' THEN 'CONV'
           END AS produto,
           n.uf,
           n.cidade,
           sum(coalesce(v.vl_rec_cpp, 0)) AS rec_cpp,
           sum(coalesce(v.vl_rec_copart, 0)) AS rec_copart,
           sum(coalesce(v.vl_rec_outros, 0)) AS rec_outros,
           sum(coalesce(v.vl_rec_cpp, 0) + coalesce(v.vl_rec_copart, 0) + coalesce(v.vl_rec_outros, 0)) AS rec_total,
           sum(coalesce(v.vl_desp_consulta, 0) + coalesce(v.vl_desp_urgencia, 0) + coalesce(v.vl_desp_internacao, 0)
               + coalesce(v.vl_desp_terapia, 0) + coalesce(v.vl_desp_exame, 0) + coalesce(v.vl_desp_outros, 0)) AS desp_total
    FROM public.view_eard_mensal v
    LEFT JOIN f50 f ON f.cd_matricula = v.cd_matricula
    LEFT JOIN cid c ON c.cd_matricula = v.cd_matricula
    LEFT JOIN public.carteira_cidade_ibge n ON n.ibge = c.cd_cidade
    WHERE v.nr_ano BETWEEN p_de / 100 AND p_ate / 100
      AND v.nr_ano * 100 + v.nr_mes BETWEEN p_de AND p_ate
    GROUP BY 1, 2, 3, 4, 5, 6
  )
  SELECT coalesce(json_agg(r ORDER BY r.nr_ano, r.nr_mes, r.sigla, r.produto, r.uf, r.cidade), '[]'::json) FROM r;
$function$;
REVOKE ALL ON FUNCTION public.evolucao_produtos_financeiro_cidade(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evolucao_produtos_financeiro_cidade(integer, integer) TO anon, authenticated, service_role;

-- 4) Primeira carga (pode levar alguns minutos):
SELECT public.carteira_evolucao_produtos_cidade_refresh();
NOTIFY pgrst, 'reload schema';

-- Conferência: somando as cidades, cada mês bate com carteira_evolucao_produtos e evolucao_produtos_financeiro.
-- SELECT r->>'mes', sum((r->>'vidas')::int) FROM json_array_elements(public.carteira_evolucao_produtos_cidade(202510, 202609)) r GROUP BY 1;
