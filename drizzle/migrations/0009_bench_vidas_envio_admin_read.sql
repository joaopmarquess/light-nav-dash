DROP POLICY IF EXISTS "Usuarios autenticados leem o andamento do envio" ON public.bench_vidas_envio;
REVOKE ALL ON public.bench_vidas_envio FROM anon;
GRANT SELECT ON public.bench_vidas_envio TO authenticated;
GRANT ALL ON public.bench_vidas_envio TO service_role;
ALTER TABLE public.bench_vidas_envio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Administradores leem o andamento do envio"
  ON public.bench_vidas_envio
  FOR SELECT
  TO authenticated
  USING (public.axis_is_admin(auth.uid()));