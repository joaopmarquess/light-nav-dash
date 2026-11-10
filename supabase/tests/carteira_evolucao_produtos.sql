-- Executar apenas em banco de teste isolado, com public.view_ecarteira vazia,
-- depois de instalar supabase/sql/sigla_contratacao.sql e supabase/sql/carteira_evolucao_produtos.sql.
-- Matrícula 1: PIF Fácil 50 (169), ativa.
-- Matrícula 2: PCA coparticipativo fora do Fácil 50 (7), desligada em 15/11/2025.
-- Matrícula 3: PCE convencional (11) e, a partir de 01/11/2025, PCE Fácil 50 (170) na mesma matrícula.
-- Matrícula 4: odonto (fora da regra de vidas de saúde).
INSERT INTO public.view_ecarteira (cd_mat_alternativa, tp_plano, tp_linha, cd_plano, tp_recuperacao, tp_contratacao,
  dt_vigencia_beneficiario, dt_desligamento, dt_reativacao)
VALUES (1, 'SAUDE', 'E', 169, 'COPARTICIPACAO', '3-INDIVIDUAL/FAMILIAR - COPARTICIPACAO', '2025-01-01', NULL, NULL),
       (2, 'SAUDE', 'E', 7, 'COPARTICIPACAO', '4-COLETIVO POR ADESAO - COPARTICIPACAO', '2025-01-01', '2025-11-15', NULL),
       (3, 'SAUDE', 'E', 11, 'CONVENCIONAL', '5-COLETIVO EMPRESARIAL - CONVENCIONAL', '2025-03-01', NULL, NULL),
       (3, 'SAUDE', 'E', 170, 'COPARTICIPACAO', '5-COLETIVO EMPRESARIAL - COPARTICIPACAO', '2025-11-01', NULL, NULL),
       (4, 'ODONTO', 'E', 169, 'COPARTICIPACAO', '3-INDIVIDUAL/FAMILIAR - COPARTICIPACAO', '2025-01-01', NULL, NULL);
SELECT public.carteira_evolucao_produtos_refresh();
DO $$
DECLARE out_ text; nov text;
BEGIN
  SELECT string_agg(sigla || ':' || produto || '=' || vidas, ',' ORDER BY sigla, produto) INTO out_
  FROM public.carteira_evolucao_produtos(2025, 2025) WHERE mes = 10;
  IF out_ IS DISTINCT FROM 'PCA:COP=1,PCE:CONV=1,PIF:F50=1'
  THEN RAISE EXCEPTION 'Out/2025 esperado PCA:COP=1,PCE:CONV=1,PIF:F50=1, veio %', out_; END IF;

  SELECT string_agg(sigla || ':' || produto || '=' || vidas, ',' ORDER BY sigla, produto) INTO nov
  FROM public.carteira_evolucao_produtos(2025, 2025) WHERE mes = 11;
  IF nov IS DISTINCT FROM 'PCE:F50=1,PIF:F50=1'
  THEN RAISE EXCEPTION 'Nov/2025 deve usar o produto da vigência mais recente e tirar o desligado, veio %', nov; END IF;

  IF public.produto_carteira(172, 'CONVENCIONAL') <> 'F50' THEN RAISE EXCEPTION 'Planos MV 168 a 173 são sempre Fácil 50'; END IF;
  IF public.produto_carteira(5, NULL) IS NOT NULL THEN RAISE EXCEPTION 'Recuperação ausente não deve ser inferida'; END IF;
END $$;
