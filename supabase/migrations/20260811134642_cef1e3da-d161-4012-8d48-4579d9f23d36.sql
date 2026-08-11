CREATE TABLE public.dre_gerencial_2t2026 (
  id BIGSERIAL PRIMARY KEY,
  nr_ano INTEGER NOT NULL,
  nr_mes INTEGER NOT NULL,
  nr_trimestre INTEGER NOT NULL,
  g1 TEXT,
  g2 TEXT,
  g3 TEXT,
  g4 TEXT,
  valor NUMERIC NOT NULL DEFAULT 0
);
GRANT SELECT ON public.dre_gerencial_2t2026 TO anon;
GRANT SELECT ON public.dre_gerencial_2t2026 TO authenticated;
GRANT ALL ON public.dre_gerencial_2t2026 TO service_role;
ALTER TABLE public.dre_gerencial_2t2026 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "DRE gerencial é público para leitura" ON public.dre_gerencial_2t2026 FOR SELECT USING (true);
CREATE INDEX idx_dre_ger_periodo ON public.dre_gerencial_2t2026 (nr_ano, nr_mes);