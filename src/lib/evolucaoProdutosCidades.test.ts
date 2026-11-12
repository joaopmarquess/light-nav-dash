import { describe, expect, it } from "vitest";
import { grupoDaCidade, mesesPeriodo, modeloDadosCidades, montarGrade, montarGradeCidades, rotuloCidade, CIDADE_NAO_INFORMADA, type LinhaFinanceiraCidade, type LinhaVidasCidade } from "./evolucaoProdutos";

const meses = mesesPeriodo({ ano: 2026, mes: 8 }, { ano: 2026, mes: 9 });
const vidas: LinhaVidasCidade[] = [
  { ano: 2026, mes: 8, sigla: "PIF", produto: "CONV", uf: "MG", cidade: "UBERABA", vidas: 100 },
  { ano: 2026, mes: 8, sigla: "PCA", produto: "F50", uf: "SP", cidade: "VOTUPORANGA", vidas: 300 },
  { ano: 2026, mes: 8, sigla: "PCE", produto: "COP", uf: "SP", cidade: "JALES", vidas: 50 },
  { ano: 2026, mes: 9, sigla: "PIF", produto: "CONV", uf: "MG", cidade: "UBERABA", vidas: 120 },
  { ano: 2026, mes: 9, sigla: "PIF", produto: "F50", uf: "MG", cidade: "UBERABA", vidas: 30 },
  { ano: 2026, mes: 9, sigla: "PCA", produto: "F50", uf: "SP", cidade: "VOTUPORANGA", vidas: 310 },
  { ano: 2026, mes: 9, sigla: "PCE", produto: "COP", uf: null, cidade: null, vidas: 2 },
  { ano: 2026, mes: 8, sigla: "PCE", produto: "CONV", uf: "SP", cidade: "SAO JOSE DO RIO PRETO", vidas: 40 },
  { ano: 2026, mes: 9, sigla: "PCE", produto: "CONV", uf: "SP", cidade: "SAO JOSE DO RIO PRETO", vidas: 45 },
];
const fin = (ano: number, mes: number, sigla: string | null, produto: string | null, uf: string | null, cidade: string | null, rec: number, desp: number): LinhaFinanceiraCidade =>
  ({ nr_ano: ano, nr_mes: mes, sigla, produto, uf, cidade, rec_cpp: rec, rec_copart: 0, rec_outros: 0, desp_total: desp });
const financeiro: LinhaFinanceiraCidade[] = [
  fin(2026, 8, "PIF", "CONV", "MG", "UBERABA", 1000, 800),
  fin(2026, 8, "PCA", "F50", "SP", "VOTUPORANGA", 3000, 1500),
  fin(2026, 9, "PIF", "CONV", "MG", "UBERABA", 1200, 1200),
  fin(2026, 9, "PCA", "F50", "SP", "VOTUPORANGA", 3100, 2000),
  fin(2026, 9, null, null, "SP", "VOTUPORANGA", 50, 0),
];

describe("Evolução Produtos — visão Cidade (UF)", () => {
  it("rotula como CIDADE (UF) e não inventa cidade ausente", () => {
    expect(rotuloCidade("Uberaba", "mg")).toBe("UBERABA (MG)");
    expect(rotuloCidade(null, null)).toBe(CIDADE_NAO_INFORMADA);
  });
  it("Total Geral das cidades é igual ao Total Geral da grade Tipo × Produto", () => {
    const c = montarGradeCidades(meses, "Vidas", { vidas, fin: null })!;
    const t = montarGrade(meses, "Vidas", { vidas, fin: null }, {})!;
    expect(c.total.valores).toEqual(t.meses.map((m) => m.total));
    expect(c.total.valores).toEqual([490, 507]);
  });
  it("Praça é só São José do Rio Preto (SP); as demais cidades, inclusive não informada, são Região", () => {
    expect(grupoDaCidade("São José do Rio Preto", "sp")).toBe("PRACA");
    expect(grupoDaCidade("SAO JOSE DO RIO PRETO", "MG")).toBe("REGIAO");
    expect(grupoDaCidade("RIBEIRAO PRETO", "SP")).toBe("REGIAO");
    expect(grupoDaCidade(null, null)).toBe("REGIAO");
  });
  it("agrupa em Praça e Região com subtotal, cidades pelas vidas do último mês e não informada por último", () => {
    const c = montarGradeCidades(meses, "Vidas", { vidas, fin: null })!;
    expect(c.grupos.map((g) => g.rotulo)).toEqual(["Praça", "Região"]);
    expect(c.grupos[0].cidades.map((x) => x.rotulo)).toEqual(["SAO JOSE DO RIO PRETO (SP)"]);
    expect(c.grupos[0].subtotal.valores).toEqual([40, 45]);
    expect(c.grupos[1].cidades.map((x) => x.rotulo)).toEqual(["VOTUPORANGA (SP)", "UBERABA (MG)", "JALES (SP)", CIDADE_NAO_INFORMADA]);
    expect(c.grupos[1].subtotal.valores).toEqual([450, 462]);
  });
  it("cidade sem vidas num mês com dado vale 0; Vidas não somam no período", () => {
    const c = montarGradeCidades(meses, "Vidas", { vidas, fin: null })!;
    const jales = c.grupos[1].cidades.find((x) => x.cidade === "JALES")!.linha;
    expect(jales.valores).toEqual([50, 0]);
    expect(jales.periodo).toBeNull();
  });
  it("mês sem nenhuma linha fica sem dado", () => {
    const c = montarGradeCidades(mesesPeriodo({ ano: 2026, mes: 9 }, { ano: 2026, mes: 10 }), "Vidas", { vidas, fin: null })!;
    expect(c.total.valores).toEqual([507, null]);
  });
  it("filtros de tipo e produto somam só o que foi escolhido e omitem grupo vazio", () => {
    const c = montarGradeCidades(meses, "Vidas", { vidas, fin: null }, { tipo: "PIF", produto: "F50" })!;
    expect(c.grupos.map((g) => g.rotulo)).toEqual(["Região"]);
    expect(c.total.valores).toEqual([0, 30]);
  });
  it("Receita soma o período e informa o valor sem tipo/produto fora dos totais", () => {
    const c = montarGradeCidades(meses, "Receita", { vidas, fin: financeiro })!;
    expect(c.total.valores).toEqual([4000, 4300]);
    expect(c.total.periodo).toBe(8300);
    expect(c.fora).toEqual([0, 50]);
  });
  it("Sinistralidade por cidade e no período é a razão das somas", () => {
    const c = montarGradeCidades(meses, "Sinistralidade", { vidas, fin: financeiro })!;
    const uberaba = c.grupos.find((g) => g.id === "REGIAO")!.cidades.find((x) => x.cidade === "UBERABA")!.linha;
    expect(uberaba.valores).toEqual([0.8, 1]);
    expect(uberaba.periodo).toBeCloseTo(2000 / 2200, 10);
    expect(c.total.periodo).toBeCloseTo(5500 / 8300, 10);
  });
  it("Per capita divide pelas vidas da mesma cidade", () => {
    const c = montarGradeCidades(meses, "Receita", { vidas, fin: financeiro }, { perCapita: true })!;
    const voto = c.grupos.find((g) => g.id === "REGIAO")!.cidades.find((x) => x.cidade === "VOTUPORANGA")!.linha;
    expect(voto.valores).toEqual([10, 10]);
    expect(voto.periodo).toBe(6100 / 610);
  });
  it("modelo de dados XLSX: soma as vidas do grid, Total Receitas = Receita + Coparticipação e Saldo = Total Receitas − Despesas", () => {
    const linhas = modeloDadosCidades(meses, { vidas, fin: financeiro });
    const grade = montarGradeCidades(meses, "Vidas", { vidas, fin: null })!;
    meses.forEach((m, i) => {
      const soma = linhas.filter((l) => l.ano === m.ano && l.mes === m.mes).reduce((s, l) => s + (l.vidas ?? 0), 0);
      expect(soma).toBe(grade.total.valores[i]);
    });
    const ub = linhas.find((l) => l.mes === 9 && l.cidade === "UBERABA" && l.produto === "Convencional")!;
    expect(ub).toMatchObject({ competencia: "09/2026", grupo: "Região", tipo: "PIF", vidas: 120, receita: 1200, totalReceitas: 1200, despesas: 1200, saldo: 0 });
    expect(linhas[0]).toMatchObject({ competencia: "08/2026", grupo: "Praça", cidadeUf: "SAO JOSE DO RIO PRETO (SP)", vidas: 40, receita: 0 });
    // Receita sem tipo/produto (50 em 09/2026) fica fora, como no grid.
    expect(linhas.filter((l) => l.mes === 9).reduce((s, l) => s + (l.receita ?? 0), 0)).toBe(4300);
  });
  it("modelo de dados XLSX respeita os filtros e deixa o financeiro em branco sem dado", () => {
    const linhas = modeloDadosCidades(meses, { vidas, fin: null }, { tipo: "PCA" });
    expect(linhas.map((l) => [l.competencia, l.cidade, l.vidas, l.receita])).toEqual([["08/2026", "VOTUPORANGA", 300, null], ["09/2026", "VOTUPORANGA", 310, null]]);
  });
});
