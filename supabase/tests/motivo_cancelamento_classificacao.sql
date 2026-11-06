-- Somente em PostgreSQL isolado e vazio, nunca em produção.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;
CREATE TABLE public.beneficiarios (cd_motivo_deslig integer,ds_motivo_deslig text);
CREATE TABLE public.view_ecarteira (cd_motivo_cancelamento integer,ds_motivo_cancelamento text,dt_desligamento date);
CREATE TABLE public.motivo_cancelamento_grupo (cd_motivo_cancelamento integer PRIMARY KEY,ds_motivo_cancelamento_sb text NOT NULL,gp_motivo_cancelamento text);
INSERT INTO public.motivo_cancelamento_grupo VALUES (10,'CANCELAMENTO AUTOMATICO','Inadimplência (N13)'),(42,'PORTABILIDADE','A pedido do Beneficiário'),(21,'.FICNET','Extipulante solicitou');
INSERT INTO public.view_ecarteira VALUES (10,'migração','2026-01-01'),(2,'migração','2026-01-01'),(2,'migracao','2026-01-01'),(3,'.FICNET - OBITO','2026-01-01'),(4,NULL,'2026-01-01'),(5,'FIC NET','2026-01-01'),(6,'outros','2026-01-01');
\ir ../sql/motivo_cancelamento_classificacao.sql
DO $$ BEGIN
  IF public.motivo_cancelamento_classificar('migração','Inadimplência (N13)') <> 'Inadimplência (N13)' THEN RAISE EXCEPTION 'Regra 1: preservar grupo'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(ARRAY['migração','MIGRACAO','Transferência','Transf.','troca','transferencia de plano']) v WHERE public.motivo_cancelamento_classificar(v) <> 'Transferência') THEN RAISE EXCEPTION 'Regra 2a: transferência'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(ARRAY['óbito','OBITO','falecimento','morte','.FICNET - OBITO']) v WHERE public.motivo_cancelamento_classificar(v) <> 'Óbito do Beneficiário') THEN RAISE EXCEPTION 'Regra 2b: óbito'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(ARRAY['Sem motivo informado','',NULL,'motivo não informado']) v WHERE public.motivo_cancelamento_classificar(v) <> 'Sem Registro') THEN RAISE EXCEPTION 'Regra 2c: Sem Registro'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(ARRAY['Ficnet','FIC NET','.FIC-NET']) v WHERE public.motivo_cancelamento_classificar(v) <> 'Extipulante solicitou') THEN RAISE EXCEPTION 'Regra 2d: Ficnet'; END IF;
  IF public.motivo_cancelamento_classificar('outros') <> 'A pedido do Beneficiário' THEN RAISE EXCEPTION 'Regra 2e: padrão'; END IF;
  IF public.motivo_cancelamento_classificar('troca por óbito Ficnet') <> 'Transferência' THEN RAISE EXCEPTION 'Prioridade: transferência antes de óbito'; END IF;
  IF public.motivo_cancelamento_classificar('Sem motivo informado Ficnet') <> 'Sem Registro' THEN RAISE EXCEPTION 'Prioridade: sem registro antes de Ficnet'; END IF;
  IF (SELECT gp_motivo_cancelamento FROM public.motivo_cancelamento_grupo WHERE cd_motivo_cancelamento=2) <> 'Transferência' THEN RAISE EXCEPTION 'Carga inicial'; END IF;
  IF public.motivo_cancelamento_grupos_atualizar() <> 0 THEN RAISE EXCEPTION 'Incremental precisa ser idempotente'; END IF;
END $$;
INSERT INTO public.beneficiarios VALUES (900,'TRANSF.'),(901,'óbito'),(902,'FICNET'),(903,NULL),(904,'sem regra'),(10,'troca');
DO $$ BEGIN
  IF (SELECT gp_motivo_cancelamento FROM public.motivo_cancelamento_grupo WHERE cd_motivo_cancelamento=900) <> 'Transferência' THEN RAISE EXCEPTION 'Regra 3: código novo automático'; END IF;
  IF (SELECT gp_motivo_cancelamento FROM public.motivo_cancelamento_grupo WHERE cd_motivo_cancelamento=10) <> 'Inadimplência (N13)' THEN RAISE EXCEPTION 'Regra 3: não sobrescrever'; END IF;
  IF (SELECT count(*) FROM public.motivo_cancelamento_grupo WHERE cd_motivo_cancelamento BETWEEN 900 AND 904) <> 5 THEN RAISE EXCEPTION 'Regra 3: todos os códigos classificados'; END IF;
END $$;
INSERT INTO public.motivo_cancelamento_grupo VALUES (905,'troca',NULL);
DO $$ BEGIN
  IF (SELECT gp_motivo_cancelamento FROM public.motivo_cancelamento_grupo WHERE cd_motivo_cancelamento=905) <> 'Transferência' THEN RAISE EXCEPTION 'Incremental no cadastro de grupos'; END IF;
END $$;
SELECT 'Todas as regras aprovadas' AS resultado;