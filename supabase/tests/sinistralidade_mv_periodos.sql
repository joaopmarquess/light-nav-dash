-- Executar apenas em banco de teste isolado com a tabela de competências vazia.
-- Despesas de 01/2024 a 08/2026; competências futuras só com receita não contam.
INSERT INTO public.view_eard_mensal (nr_ano, nr_mes, vl_desp_consulta)
SELECT extract(year FROM mes)::integer, extract(month FROM mes)::integer, 10
FROM generate_series(date '2024-01-01', date '2026-08-01', interval '1 month') mes;
INSERT INTO public.view_eard_mensal (nr_ano, nr_mes, vl_rec_cpp, vl_desp_consulta)
VALUES (2026, 12, 500, NULL), (2026, 9, 500, 0), (2026, 8, NULL, 5), (2026, 13, NULL, 5);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.sinistralidade_mv_periodos()
    WHERE periodo = '09/2025 a 08/2026' AND data_inicio = date '2025-09-01'
      AND data_fim = date '2026-08-31' AND meses_disponiveis = 12)
  THEN RAISE EXCEPTION 'Maior competência com despesas deve encerrar o bloco'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sinistralidade_mv_periodos()
    WHERE periodo = '09/2024 a 08/2025' AND meses_disponiveis = 12)
  THEN RAISE EXCEPTION 'Bloco anterior deve recuar 12 meses'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sinistralidade_mv_periodos()
    WHERE periodo = '09/2023 a 08/2024' AND meses_disponiveis = 8)
  THEN RAISE EXCEPTION 'Histórico parcial deve conter 01/2024 a 08/2024'; END IF;
  IF (SELECT count(*) FROM public.sinistralidade_mv_periodos()) <> 3
  THEN RAISE EXCEPTION 'Quantidade incorreta de blocos'; END IF;
END $$;
TRUNCATE public.view_eard_mensal;
INSERT INTO public.view_eard_mensal (nr_ano, nr_mes, vl_rec_cpp) VALUES (2026, 8, 100);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.sinistralidade_mv_periodos())
  THEN RAISE EXCEPTION 'Base sem despesas deve devolver zero períodos'; END IF;
END $$;
