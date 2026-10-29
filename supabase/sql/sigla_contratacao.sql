-- De/para do tipo de contratação (view_ecarteira.tp_contratacao) para sigla.
-- Executar na base da Hostinger, inteiro.
--   INDIVIDUAL/FAMILIAR  -> PIF
--   COLETIVO POR ADESAO  -> PCA
--   COLETIVO EMPRESARIAL -> PCE
-- Ignora o número inicial ("4-") e o sufixo (" - CONVENCIONAL"/" - COPARTICIPACAO").
-- Valor não reconhecido ou vazio retorna NULL.

CREATE OR REPLACE FUNCTION public.sigla_contratacao(p_tp_contratacao text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case
    when upper(p_tp_contratacao) like '%INDIVIDUAL/FAMILIAR%' then 'PIF'
    when upper(p_tp_contratacao) like '%COLETIVO POR ADESAO%' then 'PCA'
    when upper(p_tp_contratacao) like '%COLETIVO EMPRESARIAL%' then 'PCE'
  end;
$function$;

GRANT EXECUTE ON FUNCTION public.sigla_contratacao(text) TO anon, authenticated;

-- Conferência:
-- SELECT tp_contratacao, public.sigla_contratacao(tp_contratacao) AS sigla, count(*)
-- FROM public.view_ecarteira GROUP BY 1, 2 ORDER BY 1;
