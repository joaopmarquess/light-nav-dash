## Objetivo

Ter dois submenus dentro de "Sinistralidade":

- **Consulta por Plano/Empresa** — a tela atual, sem mudanças de comportamento.
- **Consulta por Beneficiário** — mesma tela, mas cada linha é um beneficiário (`codigo` + `nmcli`), sem agrupamentos, e o filtro busca por `codigo` e `nmcli`.

Tudo o mais (seletor de base/período, colunas Curta/Completa, ordenação em todas as colunas, colunas em negrito, loader divertido, rodapé de totais) continua idêntico nas duas.

## Mudanças

### 1. Menu lateral (`src/pages/Index.tsx`)

Substituir o item filho "Consulta" do grupo "Sinistralidade" por dois itens:

```text
Sinistralidade
├─ Consulta por Plano/Empresa   (Search icon)
├─ Consulta por Beneficiário    (UserCheck icon)
└─ PBI U12
```

Adicionar dois `active === ...` no roteador do `<main>`:

- `"Consulta por Plano/Empresa"` → renderiza `<SinistralidadeConsulta mode="plano" />`
- `"Consulta por Beneficiário"` → renderiza `<SinistralidadeConsulta mode="beneficiario" />`

Remover o antigo `active === "Consulta"`.

### 2. Componente `SinistralidadeConsulta` (`src/components/SinistralidadeConsulta.tsx`)

Aceitar prop opcional `mode: "plano" | "beneficiario"` (default `"plano"`).

Em `mode === "beneficiario"`:

- Cabeçalho da primeira coluna vira **"Beneficiário"** (label `"codigo nmcli"`).
- A agregação vira uma lista plana: uma linha por chave `codigo`+`nmcli`, somando as métricas de todas as linhas do período com aquele beneficiário (mesmo raciocínio que hoje faz para os grupos, mas na granularidade beneficiário). `VIDA` = 1 por linha; o total no rodapé continua sendo a contagem distinta de `codigo`.
- Sem chevrons, sem `expanded`, sem subgrupos e sem filhos — apenas o corpo da tabela com essas linhas.
- Filtro do topo busca em `codigo` **ou** `nmcli` (case-insensitive, `includes`).
- Ordenação nas colunas funciona sobre essa lista plana usando exatamente as mesmas regras já implementadas para `cmpRow` (texto para "Beneficiário", numérico/ratio para as demais, `VIDA` neutro).

Em `mode === "plano"`: comportamento atual permanece intacto (grupo → cdpln → filhos, filtro por GRUPO/cdpln, ordenação nos 3 níveis).

Ambos os modos continuam usando a RPC `sinistralidade_periodos()` para a lista de bases e a mesma query de linhas por `PERIODO`.

### Detalhes técnicos

- Um único componente com branch por `mode` mantém o custo baixo: a lógica de fetch, seleção de período, view Curta/Completa, formatação, negrito, loader e totais é compartilhada.
- A agregação por beneficiário reaproveita o mesmo padrão do `useMemo` de grupos: `Map<chave, Acc>` somando `NUM_COLS`, onde `chave = ${codigo}||${nmcli}`. Ignora linhas sem `codigo`.
- O tipo `SortKey` continua igual. `cmpRow` já existente cobre a ordenação da lista plana; para o `mode === "beneficiario"`, o `filtered` retorna diretamente o array ordenado por `cmpRow` sem o mapeamento de subgroups/children.
- Renderização condicional: se `mode === "beneficiario"`, o `<tbody>` mapeia direto sobre `filtered` e emite uma `<tr>` por beneficiário, sem os dois `Fragment` aninhados; se `plano`, mantém o render atual.
- Nome do estado ativo do menu passa a ser `"Consulta por Plano/Empresa"` / `"Consulta por Beneficiário"` — usados nos comparativos do `Index.tsx` e como título mostrado no header (`{active}`).

### Fora do escopo

- Não alterar `mv_sinistralidade`, nem a RPC, nem o schema.
- Não mudar a Consulta original (Plano/Empresa) — só renomear o rótulo do submenu.
