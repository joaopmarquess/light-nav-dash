CREATE TABLE public.orcamento_2026 (
  id bigserial PRIMARY KEY,
  item text NOT NULL,
  nr_mes integer NOT NULL,
  previsto numeric NOT NULL DEFAULT 0,
  realizado numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.orcamento_2026 TO anon;
GRANT SELECT ON public.orcamento_2026 TO authenticated;
GRANT ALL ON public.orcamento_2026 TO service_role;

ALTER TABLE public.orcamento_2026 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Orcamento é público para leitura"
ON public.orcamento_2026
FOR SELECT
USING (true);