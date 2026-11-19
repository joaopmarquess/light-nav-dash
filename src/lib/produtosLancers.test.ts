import { describe, expect, it } from "vitest";
import { TABELAS_LANCERS } from "@/data/produtosLancers";
import { FAIXAS_LANCERS, formatarValorLancers, produtosLancers, valorLancers, vfeLancers } from "./produtosLancers";

describe("Produtos Lancers", () => {
  const produtos = produtosLancers();
  it("keeps all 260 spreadsheet lines", () => {
    expect(TABELAS_LANCERS).toHaveLength(260);
    const total = produtos.reduce((s, p) => s + p.porAcomodacao.PRATA.filter(Boolean).length + p.porAcomodacao.OURO.filter(Boolean).length, 0);
    expect(total).toBe(260);
  });
  it("lists 13 products, 3096 twice (tabela and desconhecido)", () => {
    expect(produtos).toHaveLength(13);
    expect(produtos.filter((p) => p.plano === 3096).map((p) => [p.descricao, p.vendaEstimada])).toEqual([["PCA LINS/VOTUPORANGA", false], ["Desconhecido", true]]);
  });
  it("fills the 10 age bands for Prata and Ouro in order", () => {
    for (const p of produtos) for (const a of ["PRATA", "OURO"] as const) {
      expect(p.porAcomodacao[a].map((l) => l?.faixa)).toEqual([...FAIXAS_LANCERS]);
    }
  });
  it("shows venda, net and spread from the spreadsheet", () => {
    const pca = produtos.find((p) => p.plano === 2961)!;
    const l = pca.porAcomodacao.PRATA[0];
    expect(valorLancers(l, "venda")).toBe(165.55);
    expect(valorLancers(l, "net")).toBe(132.44);
    expect(formatarValorLancers(valorLancers(l, "spread"), "spread")).toBe("20,0%");
    expect(pca.porAcomodacao.OURO[9]?.venda).toBe(1489.73);
  });
  it("keeps the spreadsheet's estimated venda (net ÷ 0,77) for unknown prices", () => {
    const l = produtos.find((p) => p.plano === 3116)!.porAcomodacao.PRATA[0]!;
    expect(l.net).toBe(93.9);
    expect(formatarValorLancers(l.venda, "venda")).toBe("121,95");
    expect(l.spread).toBe(0.23);
  });
  it("reads VFE per band", () => {
    expect(vfeLancers()[0]).toBeNull();
    expect(vfeLancers()[9]).toBe(0.4785);
  });
});
