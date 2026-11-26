# Laboratory › Facchini — Simulador de Precificação de Planos de Saúde

O pedido anexo é um sistema completo (11 páginas, 9 etapas, ~16 tabelas no banco, importação, perfis, relatório PDF/XLSX). Proponho entregar em fases, cada uma funcionando de verdade e conferida antes da próxima.

## Fase 1 — Motor de cálculo + simulação completa (esta entrega)
- Menu **Facchini** dentro do Laboratory (permissão própria, como os demais itens).
- Motor central testado: faixas etárias por data-base real, agrupamentos, produção, tickets, patrocínio, produtividade com limite, taxa de adesão, despesa assistencial, coparticipação (1º mês / 1º ano / 2º ano), tabela linear, margem de preço, fator/desconto efetivo, RN 63 I e II.
- Banco: empresas, produtos, tabelas de preço (versionadas, com as 5 tabelas iniciais), carteiras e faixas, simulações + premissas + resultados + histórico, com RLS (dono / administrador).
- Telas: Painel, Empresas, Carteiras (digitação por faixa e taxa de dependência), Tabelas de Preços (copiar, reajuste/desconto, inativar), Premissas, Simulações em 9 etapas com salvamento ao avançar, Comparativo de até 4 tabelas com gráficos.
- Testes automatizados da seção 28.

## Fase 2
- Importação XLSX/CSV com mapeamento de colunas, prévia, arquivo de erros e original guardado no armazenamento.
- Coparticipações (cadastro dos 21 eventos), Histórico e Auditoria detalhado, perfis Analista/Consulta e compartilhamento.

## Fase 3
- Relatório final em tela, PDF (capa, sumário, paginação), XLSX e CSVs; memória de cálculo auditável e rotina de conferência "OK/Divergente" contra a planilha.

## Detalhes técnicos
- Fórmulas só em `src/lib/facchini/*Engine.ts` (pricing, portfolio, financialProjection, rn63) com Vitest; telas apenas exibem.
- Tabelas com prefixo `facchini_` para não colidir com `profiles`/tabelas existentes; GRANT + RLS em todas; papel via `axis_is_admin`/`axis_can_access(..., 'Laboratory · Facchini')`.
- Resultados recalculados por função segura no banco antes de gravar (Fase 1 grava o resultado do motor; Fase 3 adiciona a recomputação no servidor).
- Precisão: cálculos em número completo, arredondamento só na exibição.
