import { describe, expect, it } from "vitest";
import { acumular, competenciasDoAno, somaVazia, somarTotais } from "./sinistralidadeCompetencias";

describe("somas por competência", () => {
  it("despesa total soma consulta, urgência e outros; receita total soma cpp, copart e outros", () => {
    const s = acumular(somaVazia(), [
      { vl_desp_consulta: 10, vl_desp_urgencia: "5", vl_desp_outros: null, vl_rec_cpp: 100, vl_rec_copart: 20, vl_rec_outros: 3 },
      { vl_desp_consulta: 1, vl_desp_urgencia: 1, vl_desp_outros: 1 },
    ]);
    expect(s.despTotal).toBe(18);
    expect(s.recCpp).toBe(100);
    expect(s.recCopart).toBe(20);
    expect(s.recTotal).toBe(123);
  });
  it("total geral soma as competências", () => {
    const a = acumular(somaVazia(), [{ vl_desp_consulta: 2 }]);
    expect(somarTotais([a, a]).despTotal).toBe(4);
  });
  it("competências vão de janeiro até o mês atual", () => {
    expect(competenciasDoAno(new Date("2026-10-23T12:00:00Z")).map(c => c.mes)).toEqual([1,2,3,4,5,6,7,8,9,10]);
  });
});

import { saldoCompetencia, sinistralidade } from "./sinistralidadeCompetencias";
describe("saldo e sin", () => {
  const s = { ...somaVazia(), recTotal: 200, despTotal: 150 };
  it("saldo = rec. total − desp. total", () => expect(saldoCompetencia(s)).toBe(50));
  it("sin = desp. total ÷ rec. total", () => expect(sinistralidade(s)).toBe(0.75));
  it("sin sem receita fica vazio", () => expect(sinistralidade(somaVazia())).toBeNull());
});

import { agruparPorAno, anosSinistralidade } from "./sinistralidadeCompetencias";
describe("agrupamento por ano", () => {
  it("anos 2024, 2025 completos e 2026 até outubro", () =>
    expect(anosSinistralidade(new Date("2026-10-23T12:00:00Z"))).toEqual([{ ano: 2024, ateMes: 12 }, { ano: 2025, ateMes: 12 }, { ano: 2026, ateMes: 10 }]));
  it("soma os meses de cada ano", () => {
    const s = (v: number) => ({ ...somaVazia(), recTotal: v });
    const r = agruparPorAno([{ ano: 2025, mes: 2, soma: s(5) }, { ano: 2024, mes: 1, soma: s(1) }, { ano: 2025, mes: 1, soma: s(3) }]);
    expect(r.map(a => [a.ano, a.soma.recTotal, a.meses.map(m => m.mes)])).toEqual([[2024, 1, [1]], [2025, 8, [1, 2]]]);
  });
});
