-- Executar apenas em banco de teste isolado, com public.view_eard_mensal e public.beneficiarios vazias,
-- depois de instalar supabase/sql/sinistralidade_mv_competencias_grupo.sql.
-- Matrícula 1: Fácil 50 PCA Prata (172). Matrícula 2: Odonto (31) no mesmo código de plano. Matrícula 3: outro plano (9).
INSERT INTO public.beneficiarios (cd_matricula, cd_plano_mv, cd_plano_alternativo) VALUES (1, 172, 2955), (2, 31, 2955), (3, 9, 2243);
INSERT INTO public.view_eard_mensal (nr_ano, nr_mes, cd_matricula, vl_rec_cpp, vl_rec_copart, vl_rec_outros,
  vl_desp_consulta, vl_desp_urgencia, vl_desp_internacao, vl_desp_terapia, vl_desp_exame, vl_desp_outros)
VALUES (2025, 12, 1, 100, 0, 0, 10, 0, 50, 0, 20, 0),
       (2025, 12, 2, 30, 0, 0, 0, 0, 0, 0, 0, 3),
       (2025, 12, 3, 200, 10, 0, 0, 5, 100, 15, 0, 0);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.sinistralidade_mv_competencias_grupo(2025, 12, 'facil50') WHERE rec_total = 100 AND desp_total = 80)
  THEN RAISE EXCEPTION 'Fácil 50 deve conter só matrículas dos planos MV 168 a 173'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sinistralidade_mv_competencias_grupo(2025, 12, 'demais') WHERE rec_total = 240 AND desp_total = 123)
  THEN RAISE EXCEPTION 'Demais deve conter todas as matrículas fora do Fácil 50, inclusive Odonto do mesmo código'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sinistralidade_mv_competencias_grupo(2025, 12, 'geral') WHERE rec_total = 340 AND desp_total = 203)
  THEN RAISE EXCEPTION 'Geral deve somar Fácil 50 e Demais'; END IF;
  IF EXISTS (SELECT 1 FROM public.sinistralidade_mv_competencias_grupo(2025, 12, 'xpto'))
  THEN RAISE EXCEPTION 'Visão desconhecida não deve retornar linhas'; END IF;
END $$;
