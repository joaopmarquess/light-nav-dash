import { describe, expect, it } from "vitest";
import { financeiroPorMes, perCapita, lerAnoMes, mascaraAnoMes, mesesPeriodo, periodoPadrao, produtosPorMes, validarAte, periodoAte, montarGrade, somaPeriodo, subtotalTipo, totalGeral, vidasPorMes } from "./evolucaoProdutos";

describe("Evolução Produtos — período", () => {
  const meses = mesesPeriodo({ ano: 2025, mes: 10 }, { ano: 2026, mes: 9 });
  it("vai de 10/2025 a 09/2026, 12 meses", () => {
    expect(meses).toHaveLength(12);
    expect(meses[0].rotulo).toBe("Out/25");
    expect(meses[11].rotulo).toBe("Set/26");
  });
  it("usa o último dia de cada mês", () => {
    expect(meses[0].dataFim).toBe("2025-10-31");
    expect(meses.find((m) => m.mes === 2)?.dataFim).toBe("2026-02-28");
    expect(meses[11].dataFim).toBe("2026-09-30");
  });
  it("não inventa vidas para mês sem dado", () => {
    const r = vidasPorMes(meses, [{ ano: 2025, mes: 10, total: "65191" }]);
    expect(r[0].vidas).toBe(65191);
    expect(r[1].vidas).toBeNull();
  });
  it("abre o mês em PIF, PCA e PCE sem inventar tipo ausente", () => {
    const r = vidasPorMes(meses, [
      { ano: 2025, mes: 10, total: 65191, pif: 37823, pca: "19536", pce: 7832 },
      { ano: 2025, mes: 11, total: 65781 },
    ]);
    expect(r[0].porTipo).toEqual({ PIF: 37823, PCA: 19536, PCE: 7832 });
    expect(r[0].porTipo.PIF! + r[0].porTipo.PCA! + r[0].porTipo.PCE!).toBe(r[0].vidas);
    expect(r[1].porTipo).toEqual({ PIF: null, PCA: null, PCE: null });
  });
  it("abre cada tipo de plano em Convencional, Fácil 50 e Outros coparticipativos", () => {
    const r = produtosPorMes(meses, [
      { ano: 2025, mes: 10, sigla: "PIF", produto: "CONV", vidas: 19818 },
      { ano: 2025, mes: 10, sigla: "PIF", produto: "F50", vidas: "3809" },
      { ano: 2025, mes: 10, sigla: "PIF", produto: "COP", vidas: 14196 },
      { ano: 2025, mes: 10, sigla: "PCA", produto: "F50", vidas: 12628 },
    ]);
    expect(r[0].valores.PIF).toEqual({ CONV: 19818, F50: 3809, COP: 14196 });
    expect(r[0].valores.PIF.CONV! + r[0].valores.PIF.F50! + r[0].valores.PIF.COP!).toBe(37823);
    expect(r[0].valores.PCA).toEqual({ CONV: 0, F50: 12628, COP: 0 });
    expect(r[1].valores.PCE).toEqual({ CONV: null, F50: null, COP: null });
  });
  it("soma subtotais por tipo e o total geral do mês", () => {
    const r = produtosPorMes(meses, [
      { ano: 2025, mes: 10, sigla: "PIF", produto: "CONV", vidas: 19818 },
      { ano: 2025, mes: 10, sigla: "PIF", produto: "F50", vidas: 3809 },
      { ano: 2025, mes: 10, sigla: "PIF", produto: "COP", vidas: 14196 },
      { ano: 2025, mes: 10, sigla: "PCA", produto: "CONV", vidas: 2211 },
      { ano: 2025, mes: 10, sigla: "PCA", produto: "F50", vidas: 12628 },
      { ano: 2025, mes: 10, sigla: "PCA", produto: "COP", vidas: 4697 },
      { ano: 2025, mes: 10, sigla: "PCE", produto: "CONV", vidas: 1416 },
      { ano: 2025, mes: 10, sigla: "PCE", produto: "F50", vidas: 3305 },
      { ano: 2025, mes: 10, sigla: "PCE", produto: "COP", vidas: 3111 },
    ]);
    expect(subtotalTipo(r[0].valores, "PIF")).toBe(37823);
    expect(subtotalTipo(r[0].valores, "PCA")).toBe(19536);
    expect(subtotalTipo(r[0].valores, "PCE")).toBe(7832);
    expect(totalGeral(r[0].valores)).toBe(65191);
    expect(totalGeral(r[1].valores)).toBeNull();
  });
  const fin = [
    { nr_ano: 2025, nr_mes: 10, sigla: "PCA", produto: "F50", rec_cpp: "100.5", rec_copart: 20, rec_outros: 9, desp_total: 80 },
    { nr_ano: 2025, nr_mes: 10, sigla: "PIF", produto: "COP", rec_cpp: 50, rec_copart: 10, rec_outros: 1, desp_total: 90 },
    { nr_ano: 2025, nr_mes: 10, sigla: "PIF", produto: null, rec_cpp: 7, rec_copart: 0, rec_outros: 0, desp_total: 2 },
  ];
  it("Receita soma vl_rec_cpp e vl_rec_outros, sem inferir produto ausente", () => {
    const rec = financeiroPorMes(meses, fin, "Receita");
    expect(rec[0].valores.PCA.F50).toBe(109.5);
    expect(rec[0].valores.PIF).toEqual({ CONV: 0, F50: 0, COP: 51 });
    expect(rec[0].total).toBe(160.5);
    expect(rec[0].foraDosTotais).toBe(7);
    expect(rec[1].valores.PCA.F50).toBeNull();
  });
  it("Coparticipação usa somente vl_rec_copart", () => {
    expect(financeiroPorMes(meses, fin, "Coparticipação")[0].total).toBe(30);
  });
  it("Total Receitas = Receita + Coparticipação (com outras receitas)", () => {
    const t = financeiroPorMes(meses, fin, "Total Receitas");
    expect(t[0].valores.PCA.F50).toBe(129.5);
    expect(t[0].subtotais.PIF).toBe(61);
    expect(t[0].total).toBe(190.5);
  });
  it("Despesas soma desp_total", () => {
    expect(financeiroPorMes(meses, fin, "Despesas")[0].total).toBe(170);
  });
  it("Saldo = Total Receitas − Despesas", () => {
    const s = financeiroPorMes(meses, fin, "Saldo");
    expect(s[0].valores.PCA.F50).toBe(49.5);
    expect(s[0].subtotais.PIF).toBe(-29);
    expect(s[0].total).toBe(20.5);
  });
  it("Sinistralidade = Despesas ÷ Total Receitas, com subtotal e total pela razão das somas", () => {
    const s = financeiroPorMes(meses, fin, "Sinistralidade");
    expect(s[0].valores.PIF.COP).toBeCloseTo(90 / 61, 10);
    expect(s[0].valores.PIF.CONV).toBeNull();
    expect(s[0].subtotais.PIF).toBeCloseTo(90 / 61, 10);
    expect(s[0].total).toBeCloseTo(170 / 190.5, 10);
    expect(s[1].total).toBeNull();
  });
  it("Per capita divide cada célula, subtotal e total pelas vidas correspondentes", () => {
    const vidas = produtosPorMes(meses, [
      { ano: 2025, mes: 10, sigla: "PCA", produto: "F50", vidas: 10 },
      { ano: 2025, mes: 10, sigla: "PIF", produto: "COP", vidas: 5 },
    ]);
    const pc = perCapita(financeiroPorMes(meses, fin, "Receita"), vidas);
    expect(pc[0].valores.PCA.F50).toBeCloseTo(10.95, 10);
    expect(pc[0].valores.PIF.COP).toBeCloseTo(10.2, 10);
    expect(pc[0].valores.PIF.CONV).toBeNull();
    expect(pc[0].subtotais.PIF).toBeCloseTo(10.2, 10);
    expect(pc[0].total).toBeCloseTo(160.5 / 15, 10);
    expect(pc[1].total).toBeNull();
  });
  it("período inicial: 12 meses até dois meses antes do mês atual", () => {
    expect(periodoPadrao(new Date(Date.UTC(2026, 10, 10)))).toEqual({ de: { ano: 2025, mes: 10 }, ate: { ano: 2026, mes: 9 } });
    expect(periodoPadrao(new Date(Date.UTC(2027, 1, 5)))).toEqual({ de: { ano: 2026, mes: 1 }, ate: { ano: 2026, mes: 12 } });
  });
  it("valida o filtro De/Até", () => {
    const hoje = new Date(Date.UTC(2026, 10, 10));
    expect(lerAnoMes("10/2025")).toEqual({ ano: 2025, mes: 10 });
    expect(lerAnoMes("13/2025")).toBeNull();
    expect(lerAnoMes("10/25")).toBeNull();
    expect(mascaraAnoMes("102025")).toBe("10/2025");
    expect(mascaraAnoMes("10/20a25x")).toBe("10/2025");
    expect(validarAte(lerAnoMes("09/2026"), hoje)).toBeNull();
    expect(validarAte(lerAnoMes("11/2026"), hoje)).toBeNull();
    expect(validarAte(lerAnoMes("12/2026"), hoje)).not.toBeNull();
    expect(validarAte(lerAnoMes("12/2019"), hoje)).toBeNull();
    expect(validarAte(lerAnoMes("11/2019"), hoje)).not.toBeNull();
    expect(validarAte(null, hoje)).not.toBeNull();
  });
  it("o período é sempre de 12 meses até o mês final (09/2026 → 10/2025 a 09/2026)", () => {
    expect(periodoAte({ ano: 2026, mes: 9 })).toEqual({ de: { ano: 2025, mes: 10 }, ate: { ano: 2026, mes: 9 } });
    expect(periodoAte({ ano: 2026, mes: 12 })).toEqual({ de: { ano: 2026, mes: 1 }, ate: { ano: 2026, mes: 12 } });
  });
  const vid = [
    { ano: 2025, mes: 10, sigla: "PCA", produto: "F50", vidas: 10 },
    { ano: 2025, mes: 10, sigla: "PIF", produto: "COP", vidas: 5 },
    { ano: 2025, mes: 11, sigla: "PCA", produto: "F50", vidas: 20 },
    { ano: 2025, mes: 11, sigla: "PIF", produto: "COP", vidas: 5 },
  ];
  const dois = meses.slice(0, 2);
  it("coluna Total soma o período", () => {
    const p = somaPeriodo(produtosPorMes(dois, vid));
    expect(p.valores.PCA.F50).toBe(30);
    expect(p.subtotais.PIF).toBe(10);
    expect(p.total).toBe(40);
  });
  it("Vidas não somam no período: coluna Total vazia", () => {
    expect(montarGrade(dois, "Vidas", { vidas: vid, fin: null })!.periodo).toBeNull();
  });
  it("coluna Total fica sem dado se algum mês não tem dado", () => {
    expect(somaPeriodo(produtosPorMes(meses.slice(0, 3), vid)).total).toBeNull();
  });
  it("produto selecionado: subtotais e totais somam só esse produto", () => {
    const g = montarGrade(dois, "Vidas", { vidas: vid, fin: null }, { produto: "F50" })!;
    expect(g.meses[0].subtotais.PIF).toBe(0);
    expect(g.meses[0].subtotais.PCA).toBe(10);
    expect(g.meses[0].total).toBe(10);
    expect(g.meses[1].total).toBe(20);
    expect(somaPeriodo(g.meses).total).toBe(30);
    expect(g.meses[0].valores.PIF.COP).toBe(5);
  });
  it("Sinistralidade com produto selecionado e no Total do período usa a razão das somas", () => {
    const f2 = [...fin, { nr_ano: 2025, nr_mes: 11, sigla: "PCA", produto: "F50", rec_cpp: 70.5, rec_copart: 0, rec_outros: 0, desp_total: 100 }];
    const g = montarGrade(dois, "Sinistralidade", { vidas: null, fin: f2 }, { produto: "F50" })!;
    expect(g.meses[0].total).toBeCloseTo(80 / 129.5, 10);
    expect(g.periodo!.total).toBeCloseTo(180 / 200, 10);
  });
  it("Per capita no Total do período = soma do valor ÷ soma das vidas", () => {
    const f2 = [...fin, { nr_ano: 2025, nr_mes: 11, sigla: "PCA", produto: "F50", rec_cpp: 70.5, rec_copart: 0, rec_outros: 0, desp_total: 100 }];
    const g = montarGrade(dois, "Receita", { vidas: vid, fin: f2 }, { perCapita: true })!;
    expect(g.periodo!.total).toBeCloseTo(231 / 40, 10);
    expect(g.periodo!.valores.PCA.F50).toBeCloseTo(180 / 30, 10);
  });
});
