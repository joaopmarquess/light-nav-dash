import { NOMES_PLANOS_LANCERS, TABELAS_LANCERS, type LinhaTabelaLancers } from "@/data/produtosLancers";

/** Faixas na ordem da planilha TABELAS_LANCERS.xlsx. */
export const FAIXAS_LANCERS = ["0 a 18", "19 a 23", "24 a 28", "29 a 33", "34 a 38", "39 a 43", "44 a 48", "49 a 53", "54 a 58", "59 anos ou mais"] as const;
export type ValorLancers = "venda" | "net" | "spread";
export const ACOMODACOES_LANCERS = [
  { id: "PRATA", rotulo: "Enfermaria (Prata)" },
  { id: "OURO", rotulo: "Apartamento (Ouro)" },
] as const;

export type ProdutoLancers = {
  chave: string;
  plano: number;
  /** Nome do plano informado pelo Dênis (null quando não informado). */
  nome: string | null;
  /** Descrição da planilha (coluna CONTRATACAO). */
  descricao: string;
  /** Venda calculada pela planilha a partir do net (TIPO "PRECO VENDA DESCONHECIDO"). */
  vendaEstimada: boolean;
  porAcomodacao: Record<"PRATA" | "OURO", (LinhaTabelaLancers | null)[]>;
};

/** Um produto por plano + descrição + tipo, na ordem da planilha (o 3096 aparece duas vezes, como no arquivo). */
export function produtosLancers(linhas: LinhaTabelaLancers[] = TABELAS_LANCERS): ProdutoLancers[] {
  const mapa = new Map<string, ProdutoLancers>();
  for (const l of linhas) {
    const chave = `${l.plano}|${l.contratacao}|${l.tipo}`;
    let p = mapa.get(chave);
    if (!p) {
      p = { chave, plano: l.plano, nome: NOMES_PLANOS_LANCERS.find((n) => n.plano === l.plano)?.nome ?? null, descricao: l.contratacao, vendaEstimada: l.tipo === "PRECO VENDA DESCONHECIDO",
        porAcomodacao: { PRATA: FAIXAS_LANCERS.map(() => null), OURO: FAIXAS_LANCERS.map(() => null) } };
      mapa.set(chave, p);
    }
    const i = FAIXAS_LANCERS.indexOf(l.faixa as (typeof FAIXAS_LANCERS)[number]);
    if (i >= 0) p.porAcomodacao[l.acomodacao][i] = l;
  }
  return [...mapa.values()];
}

/** Variação entre faixas (VFE) da planilha; null na primeira faixa. */
export const vfeLancers = (linhas: LinhaTabelaLancers[] = TABELAS_LANCERS) =>
  FAIXAS_LANCERS.map((f) => linhas.find((l) => l.faixa === f)?.vfe ?? null);

export const valorLancers = (l: LinhaTabelaLancers | null, valor: ValorLancers) => (l ? l[valor] : null);

const brl = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const formatarValorLancers = (v: number | null, valor: ValorLancers) =>
  v == null ? "—" : valor === "spread" ? pct.format(v) : brl.format(v);
export const formatarVfe = (v: number | null) => (v == null ? "—" : pct.format(v));

export type LinhaFaixaLancers = { faixa: string; net: number | null; venda: number | null; spread: number | null };
export type AcomodacaoLancers = (typeof ACOMODACOES_LANCERS)[number]["id"];

/** Rótulo do filtro de Plano: nome informado (ou a descrição da planilha); quando o plano tem mais de uma tabela
 *  (o 3096), acrescenta a descrição da planilha para distinguir. */
export const rotuloProdutoLancers = (p: ProdutoLancers, todos: ProdutoLancers[] = produtosLancers()) => {
  const repetido = todos.filter((o) => o.plano === p.plano).length > 1;
  if (!p.nome) return `${p.plano}* · ${p.descricao}`; // * = tabela de produto mais antigo (pedido de 19/11/2026)
  return repetido ? `${p.plano} · ${p.nome} · ${p.descricao}` : `${p.plano} · ${p.nome}`;
};

/** Linhas do grid Faixa / Net / Venda / Spread de um produto numa acomodação, na ordem das faixas. */
export const linhasFaixaLancers = (p: ProdutoLancers, acomodacao: AcomodacaoLancers): LinhaFaixaLancers[] =>
  FAIXAS_LANCERS.map((faixa, i) => {
    const l = p.porAcomodacao[acomodacao][i];
    return { faixa, net: l?.net ?? null, venda: l?.venda ?? null, spread: l?.spread ?? null };
  });

/** Tabelas do filtro de Plano: os planos com nome informado, na ordem informada (o 3096 traz as suas duas tabelas);
 *  com "Incluir Tabelas de Produtos mais Antigos", as demais tabelas vêm depois, na ordem da planilha. */
export const produtosFiltroLancers = (todos: ProdutoLancers[] = produtosLancers(), incluirAntigos = false) => {
  const nomeados = NOMES_PLANOS_LANCERS.flatMap((n) => todos.filter((p) => p.plano === n.plano));
  return incluirAntigos ? [...nomeados, ...todos.filter((p) => !nomeados.includes(p))] : nomeados;
};
