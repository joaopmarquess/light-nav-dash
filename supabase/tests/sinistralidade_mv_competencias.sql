-- Executar apenas em banco de teste isolado com a tabela de competências vazia.
-- Despesa total = consulta + urgência + internação + terapia + exame + outros.
INSERT INTO public.view_eard_mensal (nr_ano, nr_mes, vl_rec_cpp, vl_rec_copart, vl_rec_outros,
  vl_desp_consulta, vl_desp_urgencia, vl_desp_internacao, vl_desp_terapia, vl_desp_exame, vl_desp_outros)
VALUES (2025, 12, 80, 15, 5, 10, 5, 40, 8, 20, 1), (2025, 12, NULL, NULL, NULL, NULL, NULL, 2, NULL, NULL, NULL);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.sinistralidade_mv_competencias(2025, 12)
    WHERE nr_mes = 12 AND rec_total = 100 AND desp_total = 86)
  THEN RAISE EXCEPTION 'Despesa total deve somar as seis colunas de despesa'; END IF;
END $$;
TRUNCATE public.view_eard_mensal;
INSERT INTO public.view_eard_mensal (nr_ano, nr_mes, vl_rec_cpp, vl_desp_internacao) VALUES (2026, 8, 100, 50);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.sinistralidade_mv_periodos() WHERE data_fim = date '2026-08-31')
  THEN RAISE EXCEPTION 'Competência só com internação deve contar como mês com despesa'; END IF;
END $$;
