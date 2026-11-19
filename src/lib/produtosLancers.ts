import { NOMES_PLANOS_LANCERS, TABELAS_LANCERS, type LinhaTabelaLancers } from "@/data/produtosLancers";
import { PRECOS_VENDA_LANCERS, type PrecoVendaLancers } from "@/data/precosVendaLancers";

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
  /** Venda calculada pela planilha a partir do net (TIPO "PRECO VENDA DESCONHECIDO") e sem preço no arquivo de venda. */
  vendaEstimada: boolean;
  /** Venda tirada do arquivo de preços de venda enviado em 19/11/2026 (PRECOS_VENDA_LANCERS). */
  vendaAtualizada: boolean;
  porAcomodacao: Record<"PRATA" | "OURO", (LinhaTabelaLancers | null)[]>;
};

/** Tabelas retiradas do filtro a pedido do Dênis (19/11/2026): a do 3096 sem preço de venda ("Desconhecido").
 *  Os dados da planilha continuam intactos. */
export const TABELAS_OCULTAS_LANCERS = [{ plano: 3096, descricao: "Desconhecido" }] as const;
export const tabelaOcultaLancers = (p: Pick<ProdutoLancers, "plano" | "descricao">) =>
  TABELAS_OCULTAS_LANCERS.some((t) => t.plano === p.plano && t.descricao === p.descricao);

/** "0 a 18 anos" → "0 a 18"; "59 anos ou mais" fica igual (faixas do arquivo de preços de venda). */
export const faixaPrecoVendaLancers = (faixa: string) => (faixa.includes("ou mais") ? faixa : faixa.replace(/ anos$/, ""));

/** Um produto por plano + descrição + tipo, na ordem da planilha (o 3096 aparece duas vezes, como no arquivo).
 *  Pedido de 19/11/2026: a venda dos planos presentes em `precos` vem desse arquivo (net da planilha mantido); as
 *  TABELAS_OCULTAS_LANCERS continuam com a venda original. */
export function produtosLancers(linhas: LinhaTabelaLancers[] = TABELAS_LANCERS, precos: PrecoVendaLancers[] = PRECOS_VENDA_LANCERS): ProdutoLancers[] {
  const mapa = new Map<string, ProdutoLancers>();
  for (const l of linhas) {
    const chave = `${l.plano}|${l.contratacao}|${l.tipo}`;
    let p = mapa.get(chave);
    if (!p) {
      p = { chave, plano: l.plano, nome: NOMES_PLANOS_LANCERS.find((n) => n.plano === l.plano)?.nome ?? null, descricao: l.contratacao, vendaEstimada: l.tipo === "PRECO VENDA DESCONHECIDO",
        vendaAtualizada: false, porAcomodacao: { PRATA: FAIXAS_LANCERS.map(() => null), OURO: FAIXAS_LANCERS.map(() => null) } };
      mapa.set(chave, p);
    }
    const i = FAIXAS_LANCERS.indexOf(l.faixa as (typeof FAIXAS_LANCERS)[number]);
    if (i >= 0) p.porAcomodacao[l.acomodacao][i] = l;
  }
  const produtos = [...mapa.values()];
  for (const p of produtos) {
    if (tabelaOcultaLancers(p)) continue;
    const doPlano = precos.filter((v) => v.plano === p.plano);
    if (!doPlano.length) continue;
    for (const a of ["PRATA", "OURO"] as const) p.porAcomodacao[a] = p.porAcomodacao[a].map((l) => {
      const v = l && doPlano.find((x) => faixaPrecoVendaLancers(x.faixa) === l.faixa);
      return l && v ? { ...l, venda: a === "PRATA" ? v.enfermaria : v.apartamento } : l;
    });
    p.vendaAtualizada = true;
    p.vendaEstimada = false;
  }
  return produtos;
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

/** spread da faixa = 1 − Net ÷ Venda (calculado; nunca a coluna SPREAD da planilha). */
export type LinhaFaixaLancers = { faixa: string; net: number | null; venda: number | null; spread: number | null };
export type AcomodacaoLancers = (typeof ACOMODACOES_LANCERS)[number]["id"];

/** Rótulo do filtro de Plano: nome informado (ou a descrição da planilha); quando o plano tem mais de uma tabela
 *  (o 3096), acrescenta a descrição da planilha para distinguir. */
export const rotuloProdutoLancers = (p: ProdutoLancers, todos: ProdutoLancers[] = produtosLancers()) => {
  const repetido = todos.filter((o) => o.plano === p.plano && !tabelaOcultaLancers(o)).length > 1;
  if (!p.nome) return `${p.plano}* · ${p.descricao}`; // * = tabela de produto mais antigo (pedido de 19/11/2026)
  return repetido ? `${p.plano} · ${p.nome} · ${p.descricao}` : `${p.plano} · ${p.nome}`;
};

/** Linhas do grid Faixa / Net / Venda de um produto numa acomodação, na ordem das faixas. */
export const linhasFaixaLancers = (p: ProdutoLancers, acomodacao: AcomodacaoLancers): LinhaFaixaLancers[] =>
  FAIXAS_LANCERS.map((faixa, i) => {
    const l = p.porAcomodacao[acomodacao][i];
    const net = l?.net ?? null, venda = l?.venda ?? null;
    return { faixa, net, venda, spread: net != null && venda ? 1 - net / venda : null };
  });

/** Spread da tabela (pedido de 19/11/2026): calculado pelo net e pela venda, nunca pela coluna SPREAD da planilha:
 *  1 − (Σ net ÷ Σ venda) nas faixas da acomodação; null sem venda. */
export const spreadTabelaLancers = (p: ProdutoLancers, acomodacao: AcomodacaoLancers) => {
  const ls = p.porAcomodacao[acomodacao].filter((l): l is LinhaTabelaLancers => l != null);
  const venda = ls.reduce((s, l) => s + l.venda, 0);
  return venda > 0 ? 1 - ls.reduce((s, l) => s + l.net, 0) / venda : null;
};
const pct2 = new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatarSpreadTabela = (v: number | null) => (v == null ? "—" : pct2.format(v));

/** Tabelas do filtro de Plano: os planos com nome informado, na ordem informada (sem as TABELAS_OCULTAS_LANCERS);
 *  com "Incluir Tabelas de Produtos mais Antigos", as demais tabelas vêm depois, na ordem da planilha. */
export const produtosFiltroLancers = (todos: ProdutoLancers[] = produtosLancers(), incluirAntigos = false) => {
  const visiveis = todos.filter((p) => !tabelaOcultaLancers(p));
  const nomeados = NOMES_PLANOS_LANCERS.flatMap((n) => visiveis.filter((p) => p.plano === n.plano));
  return incluirAntigos ? [...nomeados, ...visiveis.filter((p) => !nomeados.includes(p))] : nomeados;
};
