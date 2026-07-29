## Alterações no submenu "2518 Processo Rec."

### I) Agrupamento de dsevento (só na Seção 2 do PDF)
Manter tabela em tela e Seção 1 exatamente como estão hoje (dsevento bruto agrupado por Mensalidade / Coparticipação / Cartão|Inscrição já existe na tela — permanece igual).

### II) Formato de bscmp (só na Seção 2)
Exibir `bscmp` como `MM|YYYY` (ex.: `202407` → `07|2024`). Tela e Seção 1 seguem com o formato atual.

### III) Nova Seção 2 no PDF

**Fonte de dados:** novo CSV `2518_receitas-2.csv` (será copiado para `public/data/2518_receitas_v2.csv`).
Colunas usadas: `bscmp`, `nmctr`, `cdcontrato`, `dp`, `beneficiario` (nmcli), `dsevento`, `valor`.

**Cabeçalho do PDF:** igual ao PDF de Despesas (2518 Processo) — logo Bensaúde à esquerda, título centralizado "Relatório de Receitas 2518 | Período", subtítulo "2518 Processo Rec." Reaproveita `drawHeader` do padrão existente.

**Grid hierárquico da Seção 2 (linhas sem quebra de texto):**

```text
[bscmp em formato MM|YYYY]                                             (cabeçalho de grupo mesclado)
  nmctr (cdcontrato)                                                    (cabeçalho de sub-grupo mesclado)
    dp - nmcli - dsevento(mapeado) ..................  valor
    dp - nmcli - dsevento(mapeado) ..................  valor
  Subtotal nmctr (cdcontrato) ......................  soma
  ...
Subtotal bscmp MM|YYYY ............................  soma da competência
---
TOTAL GERAL ......................................  soma de todas as bscmp
```

- `dsevento` na linha detalhe usa o rótulo agrupado (Mensalidade / Coparticipação / Cartão|Inscrição), ordenado por `order` do mapa.
- Ordenação: bscmp asc → nmctr asc → dp asc → nmcli asc → order do evento.
- Todas as linhas com `noWrap: true` / `overflow: 'ellipsize'` em autoTable para garantir linha única.
- Subtotais e Total Geral com fundo cinza claro `[235,235,235]` e negrito, mesmo padrão dos subtotais atuais da Seção 3 do outro relatório.

### Arquivos afetados
- `src/components/AssistencialReceitas2518.tsx`
  - novo `loadCsvV2()` para o CSV detalhado (fetch em paralelo ao atual)
  - helper `fmtBscmp(s)` → `MM|YYYY`
  - novo builder `buildSection2()` chamado dentro de `buildPdf`
  - `buildPdf` passa a produzir Seção 1 + Seção 2 no mesmo documento
- `public/data/2518_receitas_v2.csv` — novo arquivo (cópia do upload)

Tela do submenu permanece inalterada.