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
