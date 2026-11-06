-- Executar integralmente na Hostinger, nunca no Lovable Cloud.
-- Preserva todo grupo existente. Sem Registro é a exceção para ausência de motivo.
BEGIN;

CREATE OR REPLACE FUNCTION public.motivo_cancelamento_classificar(
  p_descricao text, p_grupo_atual text DEFAULT NULL
) RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog AS $$
DECLARE v text;
BEGIN
  IF nullif(btrim(p_grupo_atual), '') IS NOT NULL
     AND upper(btrim(p_grupo_atual)) NOT IN ('SEM GRUPO ATRIBUÍDO', 'SEM GRUPO ATRIBUIDO', 'SEM GRUPO DE MOTIVO', 'SEM GRUPO MOTIVOS') THEN
    RETURN p_grupo_atual;
  END IF;
  v := lower(translate(coalesce(p_descricao, ''),
    'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
    'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'));
  IF v ~ '(migr|transf|troc)' THEN RETURN 'Transferência'; END IF;
  IF v ~ '(obit|falec|morte)' THEN RETURN 'Óbito do Beneficiário'; END IF;
  IF btrim(v) = '' OR v ~ '(sem motivo|motivo nao informado|nao informado|sem registro)' THEN RETURN 'Sem Registro'; END IF;
  IF v ~ 'fic[^a-z0-9]*net' THEN RETURN 'Extipulante solicitou'; END IF;
  RETURN 'A pedido do Beneficiário';
END $$;
REVOKE ALL ON FUNCTION public.motivo_cancelamento_classificar(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.motivo_cancelamento_classificar(text,text) TO anon, authenticated, service_role;

-- A tabela de agrupamento já existe; criar somente se ausente.
CREATE TABLE IF NOT EXISTS public.motivo_cancelamento_grupo (
  cd_motivo_cancelamento integer PRIMARY KEY,
  ds_motivo_cancelamento_sb text NOT NULL,
  gp_motivo_cancelamento text NOT NULL
);
GRANT SELECT ON public.motivo_cancelamento_grupo TO anon, authenticated;
GRANT ALL ON public.motivo_cancelamento_grupo TO service_role;
ALTER TABLE public.motivo_cancelamento_grupo ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='motivo_cancelamento_grupo' AND policyname='motivos_leitura') THEN
    CREATE POLICY motivos_leitura ON public.motivo_cancelamento_grupo
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

-- Classifica inclusive novos códigos cadastrados diretamente no agrupamento.
CREATE OR REPLACE FUNCTION public.motivo_cancelamento_grupo_aplicar()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.ds_motivo_cancelamento_sb := coalesce(nullif(btrim(NEW.ds_motivo_cancelamento_sb), ''), 'SEM MOTIVO INFORMADO');
  NEW.gp_motivo_cancelamento := public.motivo_cancelamento_classificar(NEW.ds_motivo_cancelamento_sb, NEW.gp_motivo_cancelamento);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.motivo_cancelamento_grupo_aplicar() FROM PUBLIC;
DROP TRIGGER IF EXISTS motivo_cancelamento_grupo_classificar ON public.motivo_cancelamento_grupo;
CREATE TRIGGER motivo_cancelamento_grupo_classificar BEFORE INSERT OR UPDATE
ON public.motivo_cancelamento_grupo FOR EACH ROW EXECUTE FUNCTION public.motivo_cancelamento_grupo_aplicar();

-- Carga inicial e reparo incremental: lê somente códigos/descrições, não dados pessoais.
CREATE OR REPLACE FUNCTION public.motivo_cancelamento_grupos_atualizar()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE n bigint;
BEGIN
  INSERT INTO public.motivo_cancelamento_grupo AS g
    (cd_motivo_cancelamento,ds_motivo_cancelamento_sb,gp_motivo_cancelamento) VALUES
    (0,'SEM MOTIVO INFORMADO','Sem Registro')
    ON CONFLICT (cd_motivo_cancelamento) DO NOTHING;

  WITH fonte AS (
    SELECT coalesce(v.cd_motivo_cancelamento,0)::integer AS codigo,
      string_agg(DISTINCT nullif(btrim(v.ds_motivo_cancelamento),''), ' | '
        ORDER BY nullif(btrim(v.ds_motivo_cancelamento),'')) AS descricao
    FROM public.view_ecarteira v
    WHERE v.dt_desligamento IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.motivo_cancelamento_grupo g
        WHERE g.cd_motivo_cancelamento=coalesce(v.cd_motivo_cancelamento,0)
          AND nullif(btrim(g.gp_motivo_cancelamento),'') IS NOT NULL
          AND upper(btrim(g.gp_motivo_cancelamento)) NOT IN ('SEM GRUPO ATRIBUÍDO','SEM GRUPO ATRIBUIDO','SEM GRUPO DE MOTIVO','SEM GRUPO MOTIVOS')
      )
    GROUP BY coalesce(v.cd_motivo_cancelamento,0)
  )
  INSERT INTO public.motivo_cancelamento_grupo AS g
    (cd_motivo_cancelamento,ds_motivo_cancelamento_sb,gp_motivo_cancelamento)
  SELECT codigo,coalesce(descricao,'SEM MOTIVO INFORMADO'),public.motivo_cancelamento_classificar(descricao)
  FROM fonte
  ON CONFLICT (cd_motivo_cancelamento) DO UPDATE SET
    ds_motivo_cancelamento_sb=excluded.ds_motivo_cancelamento_sb,
    gp_motivo_cancelamento=public.motivo_cancelamento_classificar(excluded.ds_motivo_cancelamento_sb,g.gp_motivo_cancelamento)
  WHERE g.gp_motivo_cancelamento IS DISTINCT FROM public.motivo_cancelamento_classificar(excluded.ds_motivo_cancelamento_sb,g.gp_motivo_cancelamento);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.motivo_cancelamento_grupos_atualizar() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.motivo_cancelamento_grupos_atualizar() TO service_role;

-- Incremental na origem: beneficiarios contém cd_motivo_deslig / ds_motivo_deslig.
CREATE OR REPLACE FUNCTION public.motivo_cancelamento_beneficiario_aplicar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE c integer; d text;
BEGIN
  IF NEW.cd_motivo_deslig IS NULL THEN RETURN NEW; END IF;
  c := NEW.cd_motivo_deslig::integer;
  IF EXISTS (SELECT 1 FROM public.motivo_cancelamento_grupo
    WHERE cd_motivo_cancelamento=c AND nullif(btrim(gp_motivo_cancelamento),'') IS NOT NULL
      AND upper(btrim(gp_motivo_cancelamento)) NOT IN ('SEM GRUPO ATRIBUÍDO','SEM GRUPO ATRIBUIDO','SEM GRUPO DE MOTIVO','SEM GRUPO MOTIVOS')) THEN RETURN NEW; END IF;
  d := coalesce(nullif(btrim(NEW.ds_motivo_deslig),''),'SEM MOTIVO INFORMADO');
  INSERT INTO public.motivo_cancelamento_grupo AS g
    (cd_motivo_cancelamento,ds_motivo_cancelamento_sb,gp_motivo_cancelamento)
    VALUES (c,d,public.motivo_cancelamento_classificar(d))
    ON CONFLICT (cd_motivo_cancelamento) DO UPDATE SET
      gp_motivo_cancelamento=public.motivo_cancelamento_classificar(d,g.gp_motivo_cancelamento)
    WHERE g.gp_motivo_cancelamento IS DISTINCT FROM public.motivo_cancelamento_classificar(d,g.gp_motivo_cancelamento);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.motivo_cancelamento_beneficiario_aplicar() FROM PUBLIC, anon, authenticated;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='beneficiarios' AND c.relkind IN ('r','p')) THEN
    RAISE EXCEPTION 'beneficiarios precisa ser tabela física para instalar o incremental. Nenhuma alteração foi aplicada.';
  END IF;
END $$;
DROP TRIGGER IF EXISTS motivo_cancelamento_beneficiario_classificar ON public.beneficiarios;
CREATE TRIGGER motivo_cancelamento_beneficiario_classificar
AFTER INSERT OR UPDATE OF cd_motivo_deslig,ds_motivo_deslig ON public.beneficiarios
FOR EACH ROW EXECUTE FUNCTION public.motivo_cancelamento_beneficiario_aplicar();

SELECT public.motivo_cancelamento_grupos_atualizar() AS codigos_classificados;
NOTIFY pgrst, 'reload schema';
COMMIT;

-- Conferência após instalação:
SELECT gp_motivo_cancelamento AS grupo,count(*) AS codigos
FROM public.motivo_cancelamento_grupo GROUP BY 1 ORDER BY 1;
-- Reparar após cargas que desativem triggers:
-- SELECT public.motivo_cancelamento_grupos_atualizar();