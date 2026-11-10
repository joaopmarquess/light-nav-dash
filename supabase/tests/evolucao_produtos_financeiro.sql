-- Executar apenas em banco de teste isolado, com public.view_eard_mensal e public.beneficiarios vazias,
-- depois de instalar supabase/sql/evolucao_produtos_financeiro.sql.
-- Matrícula 1: Fácil 50 PCA (172), marcada como coparticipativa.
-- Matrícula 2: Fácil 50 PIF (169), marcada como NÃO coparticipativa: continua Fácil 50.
-- Matrícula 3: PIF coparticipativo fora do Fácil 50 (plano 1).
-- Matrícula 4: PCE convencional (plano 11).
-- Matrícula 5: Odonto antigo no mesmo código de plano do Fácil 50, mas plano MV 31: convencional.
-- Matrícula 6: sem marcação de coparticipação: produto não inferido.
INSERT INTO public.beneficiarios (cd_matricula, cd_plano_mv) VALUES (1, 172), (2, 169), (3, 1), (4, 11), (5, 31), (6, 5);
INSERT INTO public.view_eard_mensal (nr_ano, nr_mes, cd_matricula, tp_plano, sn_coparticipativo,
  vl_rec_cpp, vl_rec_copart, vl_rec_outros,
  vl_desp_consulta, vl_desp_urgencia, vl_desp_internacao, vl_desp_terapia, vl_desp_exame, vl_desp_outros)
VALUES (2025, 10, 1, 'PCA', 'S', 100, 20, 0, 10, 0, 50, 0, 20, 0),
       (2025, 10, 2, 'PIF', 'N', 80, 5, 1, 0, 0, 0, 0, 0, 4),
       (2025, 10, 3, 'PIF', 'S', 50, 10, 0, 5, 5, 0, 0, 0, 0),
       (2025, 10, 4, 'PCE', 'N', 200, 0, 0, 0, 0, 100, 15, 0, 0),
       (2025, 10, 5, 'PCE', 'N', 30, 0, 0, 0, 0, 0, 0, 0, 3),
       (2025, 10, 6, 'PIF', NULL, 7, 0, 0, 0, 0, 0, 0, 0, 0),
       (2025, 9, 1, 'PCA', 'S', 999, 0, 0, 0, 0, 0, 0, 0, 0),
       (2026, 10, 1, 'PCA', 'S', 999, 0, 0, 0, 0, 0, 0, 0, 0);
DO $$
DECLARE r text;
BEGIN
  SELECT string_agg(sigla || ':' || coalesce(produto, '?') || '=' || rec_total || '/' || rec_copart || '/' || desp_total, ','
                    ORDER BY sigla, produto)
    INTO r FROM public.evolucao_produtos_financeiro(202510, 202609);
  IF r IS DISTINCT FROM 'PCA:F50=120/20/80,PCE:CONV=230/0/118,PIF:COP=60/10/10,PIF:F50=86/5/4,PIF:?=7/0/0'
  THEN RAISE EXCEPTION 'Classificação/somas inesperadas: %', r; END IF;
  IF EXISTS (SELECT 1 FROM public.evolucao_produtos_financeiro(202510, 202609) WHERE nr_ano * 100 + nr_mes NOT BETWEEN 202510 AND 202609)
  THEN RAISE EXCEPTION 'Competências fora do período não devem entrar'; END IF;
END $$;
