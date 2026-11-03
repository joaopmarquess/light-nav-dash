CREATE TABLE public.bench_quarter_cache (
  user_id uuid NOT NULL,
  year integer NOT NULL CHECK (year BETWEEN 2015 AND 2100),
  quarter integer NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  revision integer NOT NULL DEFAULT 1,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, year, quarter)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bench_quarter_cache TO authenticated;
GRANT ALL ON public.bench_quarter_cache TO service_role;
ALTER TABLE public.bench_quarter_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY bench_cache_owner_read ON public.bench_quarter_cache FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY bench_cache_owner_insert ON public.bench_quarter_cache FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY bench_cache_owner_update ON public.bench_quarter_cache FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY bench_cache_owner_delete ON public.bench_quarter_cache FOR DELETE TO authenticated USING (user_id = auth.uid());