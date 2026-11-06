-- Somente em banco PostgreSQL isolado e vazio, nunca em produção.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;
CREATE FUNCTION public.sigla_contratacao(text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT $1 $$;
CREATE TABLE public.view_ecarteira (
  cd_mat_alternativa bigint, tp_contratacao text, dt_vigencia_beneficiario date,
  dt_desligamento date, dt_reativacao date, tp_plano text, cd_contrato bigint,
  nm_beneficiario text, nm_empresa_estipulante text, nm_cidade_plano text
);
CREATE TABLE public.beneficiarios (
  cd_mat_alternativa text, dt_ult_suspensao date, dt_ult_reat_suspensao date, ds_motivo_suspensao text
);
\ir ../sql/carteira_trial_suspensos.sql
\ir ../sql/carteira_trial_suspensos_estipulantes.sql
INSERT INTO public.view_ecarteira VALUES
 (1,'PCA','2020-01-01',NULL,NULL,'SAUDE',1,'Um','Empresa A','Uberaba'),
 (1,'PCA','2020-01-01',NULL,NULL,'SAUDE',1,'Um','Empresa A','Uberaba'),
 (2,'PCA','2020-01-01',NULL,NULL,'SAUDE',2,'Dois','Empresa B','Uberaba'),
 (3,'PCE','2020-01-01',NULL,NULL,'SAUDE',3,'Três','Empresa C','Uberaba'),
 (4,'PCA','2020-01-01',NULL,NULL,'SAUDE',4,'Quatro','Empresa A','Uberaba'),
 (5,'PCA','2020-01-01','2026-10-01',NULL,'SAUDE',5,'Cinco','Empresa A','Uberaba'),
 (6,'PCA','2020-01-01',NULL,NULL,'SAUDE',6,'Seis','Empresa A','Uberaba');
INSERT INTO public.beneficiarios VALUES
 ('1','2026-11-01',NULL,'INADIMPLENCIA'),
 ('2','2026-10-01',NULL,'INADIMPLENCIA'),
 ('3','2026-01-01',NULL,'INADIMPLENCIA'),
 ('4','2026-11-01','2026-11-06','INADIMPLENCIA'),
 ('5','2026-11-01',NULL,'INADIMPLENCIA'),
 ('6','2025-12-31',NULL,'INADIMPLENCIA');
DO $$
DECLARE old_total bigint; new_total bigint;
BEGIN
 SELECT sum(vidas) INTO old_total FROM public.carteira_trial_suspensos('2026-11-06',p_de=>'2026-01-01');
 SELECT sum(vidas) INTO new_total FROM public.carteira_trial_suspensos_estipulantes('2026-11-06',p_de=>'2026-01-01');
 IF old_total <> 3 OR new_total IS DISTINCT FROM old_total THEN RAISE EXCEPTION 'Detalhamento altera o total de vidas'; END IF;
 IF (SELECT sum(vidas) FROM public.carteira_trial_suspensos_estipulantes('2026-11-06',p_de=>'2026-01-01',p_sigla=>'PCA')) <> 2 THEN RAISE EXCEPTION 'PCA deve conter duas vidas sem duplicar matrícula'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.carteira_trial_suspensos_estipulantes('2026-11-06',p_de=>'2026-01-01',p_sigla=>'PCA') WHERE nome_estipulante='Empresa A' AND vidas=1) THEN RAISE EXCEPTION 'Nome_Estipulante incorreto'; END IF;
 IF (SELECT sum(vidas) FROM public.carteira_trial_suspensos_estipulantes('2026-11-06',p_empresa=>'Empresa B',p_de=>'2026-01-01')) <> 1 THEN RAISE EXCEPTION 'Filtro de empresa incorreto'; END IF;
END $$;