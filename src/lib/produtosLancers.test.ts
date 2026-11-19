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
  it("keeps the spreadsheet's estimated venda (net ÷ 0,77) for unknown prices without a new sale price", () => {
    const l = produtos.find((p) => p.plano === 2933)!.porAcomodacao.PRATA[0]!;
    expect(l.venda).toBeCloseTo(l.net / 0.77, 6);
    expect(produtos.find((p) => p.plano === 2933)!.vendaEstimada).toBe(true);
  });
  it("reads VFE per band", () => {
    expect(vfeLancers()[0]).toBeNull();
    expect(vfeLancers()[9]).toBe(0.4785);
  });
});

import { linhasFaixaLancers, rotuloProdutoLancers } from "./produtosLancers";

describe("Produtos Lancers por plano e acomodação", () => {
  const produtos = produtosLancers();
  it("labels 3096 by its name only, since its Desconhecido table is hidden", () => {
    expect(rotuloProdutoLancers(produtos.find((p) => p.plano === 3096)!, produtos)).toBe("3096 · F50 PCA (ENTIDADES FECHADAS)");
  });
  it("uses the plan names supplied by the user and keeps the spreadsheet description", () => {
    const nome = (plano: number) => produtos.find((p) => p.plano === plano)?.nome;
    expect([3019, 3020, 3120, 3096, 3097, 3116].map(nome)).toEqual([
      "F50 PCA (GERAL)", "F50 PCE (GERAL)", "F50 PCA (MELHOR IDADE)", "F50 PCA (ENTIDADES FECHADAS)", "F50 PCA (ACE MIRASSOL)", "F50 PCA (LINS E SERV. PÚBLICOS)"]);
    expect(produtos.find((p) => p.plano === 3019)?.descricao).toBe("PCA RIO PRETO");
    expect(nome(2961)).toBeNull();
    expect(rotuloProdutoLancers(produtos.find((p) => p.plano === 3019)!, produtos)).toBe("3019 · F50 PCA (GERAL)");
    expect(rotuloProdutoLancers(produtos.find((p) => p.plano === 2961)!, produtos)).toBe("2961* · PCA");
  });
  it("returns faixa, net and venda for the chosen accommodation", () => {
    const pca = produtos.find((p) => p.plano === 2961)!;
    const prata = linhasFaixaLancers(pca, "PRATA");
    expect(prata).toHaveLength(10);
    expect(prata[0]).toEqual({ faixa: "0 a 18", net: 132.44, venda: 165.55, spread: 1 - 132.44 / 165.55 });
    const ouro = linhasFaixaLancers(pca, "OURO");
    expect(ouro[9]).toMatchObject({ faixa: "59 anos ou mais", net: 1191.78, venda: 1489.73 });
  });
});

import { produtosFiltroLancers } from "./produtosLancers";

describe("Filtro de Plano dos Produtos Lancers", () => {
  it("lists only the named plans, in the order given, without the 3096 Desconhecido table", () => {
    expect(produtosFiltroLancers().map((p) => `${p.plano} ${p.descricao}`)).toEqual([
      "3019 PCA RIO PRETO", "3020 PCE RIO PRETO", "3120 Desconhecido",
      "3096 PCA LINS/VOTUPORANGA", "3097 Desconhecido", "3116 Desconhecido"]);
  });
  it("adds the older tables after the named ones when requested", () => {
    const todos = produtosFiltroLancers(produtosLancers(), true);
    expect(todos).toHaveLength(12);
    expect(todos.some((p) => p.plano === 3096 && p.descricao === "Desconhecido")).toBe(false);
    expect(todos.slice(0, 6)).toEqual(produtosFiltroLancers());
    expect(todos.slice(6).map((p) => p.plano)).toEqual([2961, 2962, 2997, 2998, 3095, 2933]);
  });
});

import { formatarSpreadTabela, spreadTabelaLancers } from "./produtosLancers";

describe("Spread da tabela Lancers", () => {
  const produtos = produtosLancers();
  const plano = (n: number) => produtos.find((p) => p.plano === n)!;
  it("computes spread as 1 − net ÷ venda over the table, not from the spreadsheet column", () => {
    const p = plano(3019);
    const net = p.porAcomodacao.PRATA.reduce((s, l) => s + l!.net, 0), venda = p.porAcomodacao.PRATA.reduce((s, l) => s + l!.venda, 0);
    expect(spreadTabelaLancers(p, "PRATA")).toBeCloseTo(1 - net / venda, 12);
    expect(formatarSpreadTabela(spreadTabelaLancers(plano(2961), "OURO"))).toBe("20,00%");
  });
});

import { PRECOS_VENDA_LANCERS } from "@/data/precosVendaLancers";

describe("Preços de venda atualizados (arquivo de 19/11/2026)", () => {
  const produtos = produtosLancers();
  const visivel = (n: number) => produtos.find((p) => p.plano === n && p.descricao !== "Desconhecido") ?? produtos.find((p) => p.plano === n)!;
  it("keeps the 60 supplied prices for the six named plans", () => {
    expect(PRECOS_VENDA_LANCERS).toHaveLength(60);
    expect([...new Set(PRECOS_VENDA_LANCERS.map((v) => v.plano))]).toEqual([3019, 3020, 3120, 3096, 3097, 3116]);
  });
  it("uses the new Enfermaria/Apartamento sale prices and keeps the spreadsheet net", () => {
    const p3019 = visivel(3019);
    expect(p3019.porAcomodacao.PRATA[0]).toMatchObject({ venda: 134.14, net: 103.28 });
    expect(p3019.porAcomodacao.OURO[9]?.venda).toBe(1119.82);
    const p3116 = visivel(3116);
    expect(p3116.porAcomodacao.PRATA[0]).toMatchObject({ venda: 117.38, net: 93.9 });
    expect(p3116.vendaEstimada).toBe(false);
    expect(p3116.vendaAtualizada).toBe(true);
    expect(visivel(3120).porAcomodacao.OURO[9]?.venda).toBe(2340.7);
    expect(visivel(3096).porAcomodacao.PRATA[2]?.venda).toBe(158.27);
  });
  it("leaves the hidden 3096 table and older tables with the spreadsheet sale price", () => {
    const oculta = produtos.find((p) => p.plano === 3096 && p.descricao === "Desconhecido")!;
    expect(oculta.vendaAtualizada).toBe(false);
    expect(visivel(2961).porAcomodacao.PRATA[0]?.venda).toBe(165.55);
  });
});

describe("Spread por faixa (1 − Net ÷ Venda)", () => {
  it("computes each band's spread from net and venda, not the spreadsheet column", () => {
    const p = produtosLancers().find((x) => x.plano === 3019)!;
    const [primeira] = linhasFaixaLancers(p, "OURO");
    expect(primeira.spread).toBeCloseTo(1 - primeira.net! / primeira.venda!, 12);
    expect(primeira.spread).not.toBeCloseTo(p.porAcomodacao.OURO[0]!.spread, 3);
  });
});

import { rotuloFaixaLancers } from "./produtosLancers";

describe("Rótulo das faixas", () => {
  it("shows bands as 00 A 18 … 54 A 58, 59 OU +", () => {
    expect(FAIXAS_LANCERS.map(rotuloFaixaLancers)).toEqual([
      "00 A 18", "19 A 23", "24 A 28", "29 A 33", "34 A 38", "39 A 43", "44 A 48", "49 A 53", "54 A 58", "59 OU +"]);
  });
});
