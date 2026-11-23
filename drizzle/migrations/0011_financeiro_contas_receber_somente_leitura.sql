DROP POLICY IF EXISTS "Importacao por administradores" ON public.financeiro_contas_receber;
DROP POLICY IF EXISTS "Substituicao por administradores" ON public.financeiro_contas_receber;
REVOKE INSERT, DELETE ON public.financeiro_contas_receber FROM authenticated;