CREATE TABLE public.bench_vidas_pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia text NOT NULL CHECK (competencia ~ '^\d{6}$'),
  solicitado_por uuid NOT NULL DEFAULT auth.uid(),
  situacao text NOT NULL DEFAULT 'pendente' CHECK (situacao IN ('pendente', 'em_andamento', 'concluido')),
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.bench_vidas_pedidos TO authenticated;
GRANT ALL ON public.bench_vidas_pedidos TO service_role;
ALTER TABLE public.bench_vidas_pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quem acessa o Bench Vidas le os pedidos"
  ON public.bench_vidas_pedidos FOR SELECT TO authenticated
  USING (public.axis_can_access(auth.uid(), 'Carteira · Bench Vidas'));
CREATE POLICY "Quem acessa o Bench Vidas registra pedidos em seu nome"
  ON public.bench_vidas_pedidos FOR INSERT TO authenticated
  WITH CHECK (solicitado_por = auth.uid() AND situacao = 'pendente' AND public.axis_can_access(auth.uid(), 'Carteira · Bench Vidas'));