import { TABELAS_LANCERS, type LinhaTabelaLancers } from "@/data/produtosLancers";

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
      p = { chave, plano: l.plano, descricao: l.contratacao, vendaEstimada: l.tipo === "PRECO VENDA DESCONHECIDO",
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
