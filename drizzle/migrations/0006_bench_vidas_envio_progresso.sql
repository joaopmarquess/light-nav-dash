CREATE TABLE public.bench_vidas_envio (
  id text PRIMARY KEY,
  rotulo text NOT NULL,
  etapa text NOT NULL,
  etapa_ordem integer NOT NULL DEFAULT 1,
  etapas integer NOT NULL DEFAULT 1,
  unidade text NOT NULL DEFAULT 'arquivos',
  total integer NOT NULL DEFAULT 0,
  feitos integer NOT NULL DEFAULT 0,
  falhas integer NOT NULL DEFAULT 0,
  situacao text NOT NULL DEFAULT 'em_andamento' CHECK (situacao IN ('em_andamento', 'concluido', 'erro')),
  mensagem text,
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  progresso_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bench_vidas_envio TO authenticated;
GRANT ALL ON public.bench_vidas_envio TO service_role;
ALTER TABLE public.bench_vidas_envio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios autenticados leem o andamento do envio"
  ON public.bench_vidas_envio FOR SELECT TO authenticated USING (true);

CREATE TABLE public.bench_vidas_envio_chave (
  id text PRIMARY KEY,
  hash text NOT NULL
);
GRANT ALL ON public.bench_vidas_envio_chave TO service_role;
ALTER TABLE public.bench_vidas_envio_chave ENABLE ROW LEVEL SECURITY;
INSERT INTO public.bench_vidas_envio_chave (id, hash)
VALUES ('mensal-sp-mg', 'e46ae1cd3c31d4422fb45889660e1e11d484c86386d95c949e4dd752a1f752a5');

CREATE OR REPLACE FUNCTION public.bench_vidas_envio_registrar(
  p_chave text, p_id text, p_rotulo text, p_etapa text, p_etapa_ordem integer, p_etapas integer,
  p_total integer, p_feitos integer, p_falhas integer, p_situacao text, p_mensagem text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.bench_vidas_envio_chave
    WHERE id = p_id AND hash = encode(sha256(convert_to(coalesce(p_chave, ''), 'UTF8')), 'hex')
  ) THEN
    RAISE EXCEPTION 'chave invalida' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.bench_vidas_envio AS e (id, rotulo, etapa, etapa_ordem, etapas, total, feitos, falhas, situacao, mensagem)
  VALUES (p_id, p_rotulo, p_etapa, p_etapa_ordem, p_etapas, greatest(p_total, 0), greatest(p_feitos, 0), greatest(p_falhas, 0), p_situacao, p_mensagem)
  ON CONFLICT (id) DO UPDATE SET
    rotulo = excluded.rotulo,
    etapa = excluded.etapa,
    etapa_ordem = excluded.etapa_ordem,
    etapas = excluded.etapas,
    total = excluded.total,
    feitos = excluded.feitos,
    falhas = excluded.falhas,
    situacao = excluded.situacao,
    mensagem = excluded.mensagem,
    progresso_em = CASE WHEN e.feitos IS DISTINCT FROM excluded.feitos OR e.etapa IS DISTINCT FROM excluded.etapa
      OR e.situacao IS DISTINCT FROM excluded.situacao THEN now() ELSE e.progresso_em END,
    atualizado_em = now();
END;
$$;
REVOKE ALL ON FUNCTION public.bench_vidas_envio_registrar(text, text, text, text, integer, integer, integer, integer, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bench_vidas_envio_registrar(text, text, text, text, integer, integer, integer, integer, integer, text, text) TO anon, authenticated;