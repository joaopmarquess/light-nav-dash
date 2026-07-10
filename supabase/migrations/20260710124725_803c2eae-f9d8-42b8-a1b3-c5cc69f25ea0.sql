GRANT SELECT ON public.sv_ecarteira_movimentacao TO anon;
GRANT SELECT ON public.sv_ecarteira_movimentacao TO authenticated;
GRANT ALL ON public.sv_ecarteira_movimentacao TO service_role;

ALTER TABLE public.sv_ecarteira_movimentacao ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'sv_ecarteira_movimentacao'
      AND policyname = 'read_sv_ecarteira_movimentacao'
  ) THEN
    CREATE POLICY read_sv_ecarteira_movimentacao
      ON public.sv_ecarteira_movimentacao
      FOR SELECT
      USING (true);
  END IF;
END $$;