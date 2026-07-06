## Objetivo
Substituir as 3 telas do menu Carteira que hoje leem JSONs pré-processados por consultas diretas à tabela `public.sv_ecarteira` no DW, e remover os arquivos JSON.

## Escopo por submenu

### 1) Consulta Beneficiário (`src/components/ConsultaBeneficiario.tsx`)
Substituir `fetch(beneficiarios.json.asset)` por uma query ao DW no clique de "Consultar":
```
dw.from("sv_ecarteira")
  .select('CDREGUSR,NOME_BENEFICIARIO,VIGENCIA_BENEFICIARIO,REATIVACAO,CANCELAMENTO,STATUS')
  .ilike("NOME_BENEFICIARIO", `%${termo}%`)
  .limit(1000)
```
- Colunas mostradas: CDREGUSR, NOME, VIGÊNCIA, REATIVAÇÃO, CANCELAMENTO, ATIVO_EM (hoje), STATUS (A=ATIVO, resto=CANCELADO).
- Sem pré-carregar tudo — busca só quando o usuário clica.

### 2) Ativos em (`src/components/AtivosEm.tsx`)
- Carregar de `sv_ecarteira` (paginação de 1000, com filtros `TIPO_LINHA=E`, `Plano_de=Saúde`) apenas as colunas `PLANO, NOME_PLANO, VIGENCIA_BENEFICIARIO, REATIVACAO, CANCELAMENTO`.
- Calcular "vidas ativas em <data>" em memória: contar linhas onde a data de referência está dentro da vigência e antes do cancelamento.
- **Remover colunas de dinheiro** (R$ Mensalidade, Copart., Receitas, Despesas, Saldo) e o gráfico de pizzas — não existem em sv_ecarteira.
- **Remover coluna "Entrou"** (vinha de vendas.json) ou recalcular a partir de `DATA_CADASTRO` = mês da data de referência (menos preciso; posso incluir se preferir).
- Tabela final: PLANO, NOME_PLANO, VIDAS (+ subtotal por NOME_PLANO, resumir, filtros por trecho — tudo mantido).

### 3) Vendas (`src/components/Vendas.tsx`)
Reescrever para agrupar linhas de `sv_ecarteira` por VENDEDOR e por PLANO/NOME_PLANO usando `DATA_CADASTRO`:
- Filtros: intervalo de datas (com base em DATA_CADASTRO), UF, PME.
- Tabela: VENDEDOR · # vidas · # planos distintos.
- **Remove** o agrupamento por "agente comercial" (COMERCIAL/CORRETOR/etc.) — não existe em sv_ecarteira.
- Mantém o drill de "vidas por plano" clicando no vendedor.

## Arquivos a remover
- `public/data/ativos.json`
- `public/data/receitas.json`
- `public/data/vendas.json`
- Asset `src/data/beneficiarios.json.asset.json` (delete via `lovable-assets delete`)
- Também remover pointers órfãos: `src/data/ativos.bin.asset.json`, `ativos.bin.gz.asset.json`, `ativos.dat.asset.json`, `ativos.json.asset.json` (já vazios/não referenciados)

Mantidos: `public/data/dre.json`, `public/data/sinistralidade.json`, `src/data/plans.json` (usado no fallback de nomes de plano, se necessário — posso substituir por NOME_PLANO da própria tabela e apagar também; confirmar).

## Impacto/aviso
- Cada abertura de "Ativos em" ou "Vendas" fará ~70+ requisições paginadas ao DW (mesma latência já observada no dashboard DW Carteira). Vou adicionar loading e cache em memória por sessão.
- Perda irreversível de UI: colunas de receita/despesa/saldo, gráficos de pizza financeiros, agrupamento por agente comercial. (Você já confirmou.)

## Ordem de execução
1. Reescrever `ConsultaBeneficiario.tsx` (mais simples).
2. Reescrever `Vendas.tsx`.
3. Reescrever `AtivosEm.tsx`.
4. `bun run build` para validar.
5. Apagar os JSONs e o asset.
6. Build final.

Confirma para eu executar?