-- Executar apenas em banco de teste isolado com a tabela de competências vazia.
INSERT INTO public.view_eard_mensal (nr_ano, nr_mes)
SELECT extract(year FROM mes)::integer, extract(month FROM mes)::integer
FROM generate_series(date '2024-01-01', date '2026-08-01', interval '1 month') mes;
-- Duplicatas de beneficiários não podem aumentar a quantidade de meses.
INSERT INTO public.view_eard_mensal VALUES (2026, 8), (2026, 13), (NULL, NULL);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.sinistralidade_mv_periodos()
    WHERE periodo = '09/2025 a 08/2026' AND data_inicio = date '2025-09-01'
      AND data_fim = date '2026-08-31' AND meses_disponiveis = 12)
  THEN RAISE EXCEPTION 'Maior competência deve encerrar o bloco de 12 meses'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sinistralidade_mv_periodos()
    WHERE periodo = '09/2024 a 08/2025' AND meses_disponiveis = 12)
  THEN RAISE EXCEPTION 'Bloco anterior deve recuar 12 meses'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sinistralidade_mv_periodos()
    WHERE periodo = '09/2023 a 08/2024' AND meses_disponiveis = 8)
  THEN RAISE EXCEPTION 'Histórico parcial deve informar meses disponíveis'; END IF;
  IF (SELECT count(*) FROM public.sinistralidade_mv_periodos()) <> 3
  THEN RAISE EXCEPTION 'Quantidade incorreta de blocos'; END IF;
END $$;
TRUNCATE public.view_eard_mensal;
INSERT INTO public.view_eard_mensal VALUES (2026, 10);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.sinistralidade_mv_periodos()
    WHERE periodo = '11/2025 a 10/2026' AND meses_disponiveis = 1)
  THEN RAISE EXCEPTION 'Agrupamento não pode ser fixo em setembro nem depender de hoje'; END IF;
END $$;
TRUNCATE public.view_eard_mensal;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.sinistralidade_mv_periodos())
  THEN RAISE EXCEPTION 'Base vazia deve devolver zero períodos'; END IF;
END $$;