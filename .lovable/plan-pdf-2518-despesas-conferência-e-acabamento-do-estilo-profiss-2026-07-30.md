# PDF 2518 Despesas — conferência e acabamento do estilo profissional

## Situação atual (verificada no código)

O relatório de Despesas (`AssistencialRelatorioExecutor.tsx`) **já importa e usa** o tema compartilhado `src/lib/pdfTheme.ts`:

- Títulos "Seção 1/2/3" em azul institucional com linha divisória.
- Cabeçalhos de coluna azul-marinho com texto branco, tema `grid` e linhas zebra.
- Subtotais em azul-claro e linhas TOTAL em azul-marinho com texto branco.
- Valores negativos em vermelho via `negativeRed`.
- Timbrado e margens (44mm topo / 40mm rodapé) preservados.

Não há estilos antigos hardcoded remanescentes no arquivo — a busca por `fillColor: [...]`, `theme: "plain"` e cores fixas não retornou ocorrências.

O que ainda **não** foi feito: a conferência visual página a página do PDF de Despesas (só o de Receitas foi renderizado e revisado).

## O que será feito

1. Gerar o PDF do submenu **2518 Despesas** e renderizá-lo em imagens para inspeção.
2. Revisar as três seções procurando por:
   - Sobreposição do total/subtotal com a numeração de página.
   - Repetição indevida da linha de total em todas as páginas.
   - Cabeçalho de grupo ou subtotal quebrando em duas linhas.
   - Colunas com texto cortado, desalinhamento de valores à direita.
   - Conflito de qualquer elemento com a arte do timbrado.
3. Corrigir os pontos encontrados diretamente no componente e/ou no tema.
4. Re-renderizar e confirmar que cada correção resolveu sem criar novo problema.

## Detalhes técnicos

- Estilos permanecem centralizados em `src/lib/pdfTheme.ts`; ajustes globais vão para lá, ajustes específicos de coluna (larguras `s3W`, `truncFront`) ficam no componente.
- Margens e `pdfTimbrado.ts` não serão alterados, salvo se a inspeção mostrar colisão real.
- Verificação por render do PDF em imagens (não por screenshot da tela).
