-- Executar apenas em banco de teste isolado, com public.view_ecarteira vazia,
-- depois de instalar sigla_contratacao.sql, carteira_evolucao_produtos.sql e evolucao_produtos_cidades.sql.
-- Matrícula 1: PIF Fácil 50 em Uberaba (IBGE 3170107), ativa.
-- Matrícula 2: PCA coparticipativo em Uberaba e, a partir de 01/11/2025, em Votuporanga (3557105).
-- Matrícula 3: PCE convencional sem cidade (IBGE 0) — fica como cidade não informada, sem inferência.
INSERT INTO public.view_ecarteira (cd_mat_alternativa, tp_plano, tp_linha, cd_plano, tp_recuperacao, tp_contratacao,
  dt_vigencia_beneficiario, dt_desligamento, dt_reativacao, cd_ibge_cidade_plano, nm_cidade_plano, cd_uf_plano)
VALUES (1, 'SAUDE', 'E', 169, 'COPARTICIPACAO', '3-INDIVIDUAL/FAMILIAR - COPARTICIPACAO', '2025-01-01', NULL, NULL, 3170107, 'UBERABA', 'MG'),
       (2, 'SAUDE', 'E', 7, 'COPARTICIPACAO', '4-COLETIVO POR ADESAO - COPARTICIPACAO', '2025-01-01', NULL, NULL, 3170107, 'UBERABA', 'MG'),
       (2, 'SAUDE', 'E', 7, 'COPARTICIPACAO', '4-COLETIVO POR ADESAO - COPARTICIPACAO', '2025-11-01', NULL, NULL, 3557105, 'VOTUPORANGA', 'SP'),
       (3, 'SAUDE', 'E', 11, 'CONVENCIONAL', '5-COLETIVO EMPRESARIAL - CONVENCIONAL', '2025-03-01', NULL, NULL, 0, NULL, NULL);
SELECT public.carteira_evolucao_produtos_refresh();
SELECT public.carteira_evolucao_produtos_cidade_refresh();
DO $$
DECLARE out_ text; nov text; dif int;
BEGIN
  SELECT string_agg(r->>'sigla' || ':' || coalesce(r->>'cidade', '?') || '=' || (r->>'vidas'), ',' ORDER BY r->>'sigla') INTO out_
  FROM json_array_elements(public.carteira_evolucao_produtos_cidade(202510, 202510)) r;
  IF out_ IS DISTINCT FROM 'PCA:UBERABA=1,PCE:?=1,PIF:UBERABA=1'
  THEN RAISE EXCEPTION 'Out/2025 esperado PCA:UBERABA=1,PCE:?=1,PIF:UBERABA=1, veio %', out_; END IF;

  SELECT string_agg(r->>'sigla' || ':' || coalesce(r->>'cidade', '?') || '=' || (r->>'vidas'), ',' ORDER BY r->>'sigla') INTO nov
  FROM json_array_elements(public.carteira_evolucao_produtos_cidade(202511, 202511)) r;
  IF nov IS DISTINCT FROM 'PCA:VOTUPORANGA=1,PCE:?=1,PIF:UBERABA=1'
  THEN RAISE EXCEPTION 'Nov/2025 deve usar a cidade da vigência mais recente, veio %', nov; END IF;

  -- Somando as cidades, cada mês/tipo/produto bate com carteira_evolucao_produtos.
  SELECT count(*) INTO dif FROM (
    SELECT (r->>'ano')::int ano, (r->>'mes')::int mes, r->>'sigla' sigla, r->>'produto' produto, sum((r->>'vidas')::bigint) v
    FROM json_array_elements(public.carteira_evolucao_produtos_cidade(202501, 202512)) r GROUP BY 1, 2, 3, 4
  ) a FULL JOIN (SELECT * FROM public.carteira_evolucao_produtos(2025, 2025)) b USING (ano, mes, sigla, produto)
  WHERE a.v IS DISTINCT FROM b.vidas;
  IF dif > 0 THEN RAISE EXCEPTION 'Vidas por cidade não batem com a grade Tipo × Produto (% diferenças)', dif; END IF;
END $$;
