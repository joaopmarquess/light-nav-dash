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
  it("despesa total inclui internação, terapia e exame (dez/2025: 84,40%, não 34,59%)", () => {
    const s = acumular(somaVazia(), [{ vl_desp_consulta: 2275140, vl_desp_urgencia: 1476669, vl_desp_internacao: 9058510, vl_desp_terapia: 2395460, vl_desp_exame: 5337295, vl_desp_outros: 7910636, vl_rec_cpp: 30913276, vl_rec_copart: 2446302, vl_rec_outros: 353809 }]);
    expect(s.despTotal).toBe(28453710);
    expect(s.internacao).toBe(9058510);
    expect(((s.despTotal / s.recTotal) * 100).toFixed(2)).toBe("84.40");
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

import { agruparPorAno, anosSinistralidade, ultimaCompetenciaValida, ateCompetencia } from "./sinistralidadeCompetencias";
describe("competência válida = despesa total acima de R$ 20 milhões", () => {
  const t = (nr_ano: number, nr_mes: number, desp_total: number) => ({ nr_ano, nr_mes, desp_total });
  it("set/2026 (R$ 32 mi) é a última válida; out/2026 (R$ 14,3 mi), nov e dez ficam fora", () =>
    expect(ultimaCompetenciaValida([t(2026, 8, 29_239_593), t(2026, 9, 32_011_080), t(2026, 10, 14_257_762), t(2026, 11, 226_720), t(2026, 12, 0)])).toEqual({ ano: 2026, mes: 9 }));
  it("exatamente R$ 20 milhões não é válido", () =>
    expect(ultimaCompetenciaValida([t(2026, 1, 25_000_000), t(2026, 2, 20_000_000)])).toEqual({ ano: 2026, mes: 1 }));
  it("aceita valores em texto e sem mês válido devolve null", () => {
    expect(ultimaCompetenciaValida([{ nr_ano: "2026", nr_mes: "3", desp_total: "20000000.01" }])).toEqual({ ano: 2026, mes: 3 });
    expect(ultimaCompetenciaValida([t(2026, 10, 14_000_000)])).toBeNull();
  });
  it("meses antigos abaixo de R$ 20 milhões continuam antes do corte", () => {
    expect(ateCompetencia(2024, 1, { ano: 2026, mes: 9 })).toBe(true);
    expect(ateCompetencia(2026, 10, { ano: 2026, mes: 9 })).toBe(false);
  });
});
describe("agrupamento por ano", () => {
  it("com última válida em set/2026, vai de 2022 a setembro de 2026", () =>
    expect(anosSinistralidade({ ano: 2026, mes: 9 })).toEqual([{ ano: 2022, ateMes: 12 }, { ano: 2023, ateMes: 12 }, { ano: 2024, ateMes: 12 }, { ano: 2025, ateMes: 12 }, { ano: 2026, ateMes: 9 }]));
  it("com última válida em dez/2026, o ano de 2027 não aparece", () =>
    expect(anosSinistralidade({ ano: 2026, mes: 12 }).map(a => a.ano)).toEqual([2022, 2023, 2024, 2025, 2026]));
  it("soma os meses de cada ano", () => {
    const s = (v: number) => ({ ...somaVazia(), recTotal: v });
    const r = agruparPorAno([{ ano: 2025, mes: 2, soma: s(5) }, { ano: 2024, mes: 1, soma: s(1) }, { ano: 2025, mes: 1, soma: s(3) }]);
    expect(r.map(a => [a.ano, a.soma.recTotal, a.meses.map(m => m.mes)])).toEqual([[2024, 1, [1]], [2025, 8, [1, 2]]]);
  });
});

import { saldoLimiteSin } from "./sinistralidadeCompetencias";
it("limite Sin 90% = 10% da receita total", () => expect(saldoLimiteSin({ ...somaVazia(), recTotal: 1000 }, 0.9)).toBeCloseTo(100));

import { dominioCentrado } from "./sinistralidadeCompetencias";
it("linha limite fica no centro do eixo", () => { const [a, b] = dominioCentrado([0, 500], [100, 300]); expect((a + b) / 2).toBe(200); });
