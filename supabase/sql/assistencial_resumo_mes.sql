-- Executar na mesma base que contém public.view_eassistencial.
-- Devolve, numa única resposta, o mês somado por guia, tipo, prestador executor e prestador de pagamento.
-- Mantém o mesmo total e a mesma contagem de guias da tela, com muito menos linhas que os itens da view.
CREATE OR REPLACE FUNCTION public.assistencial_resumo_mes(p_competencia integer)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_array(nr_guia, ds_tipo_atendimento, cd_prestador, nm_prestador,
           cd_prestador_pagamento, nm_prestador_pagamento, vl)), '[]'::jsonb)
  FROM (
    SELECT nr_guia, ds_tipo_atendimento, cd_prestador, nm_prestador, cd_prestador_pagamento, nm_prestador_pagamento,
           SUM(vl_total_pago) AS vl
    FROM public.view_eassistencial
    WHERE dt_competencia = p_competencia
    GROUP BY 1, 2, 3, 4, 5, 6
  ) g;
$$;
GRANT EXECUTE ON FUNCTION public.assistencial_resumo_mes(integer) TO anon, authenticated;
