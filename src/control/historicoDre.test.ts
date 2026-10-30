import { describe, expect, it } from "vitest";
import { HISTORICO_ANOS, historicoDoAno } from "./historicoDre";

describe("Histórico do arquivo anexado", () => {
  it("disponibiliza os nove anos solicitados, de 2018 a 2026", () => {
    expect(HISTORICO_ANOS).toEqual([2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]);
    for (const ano of HISTORICO_ANOS) expect(historicoDoAno(ano).rows.length).toBeGreaterThan(0);
  });
  it("preserva os centavos do resultado de 2018 no arquivo", () => {
    expect(historicoDoAno(2018).rows.reduce((s, r) => s + r.valor, 0)).toBeCloseTo(11323395.65, 2);
  });
  it("preserva os períodos fornecidos para 2026 sem inventar novembro e dezembro", () => {
    const { rows, meses } = historicoDoAno(2026);
    expect(meses).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(rows.reduce((s, r) => s + r.valor, 0)).toBeCloseTo(-2578395.54, 2);
  });
  it("não mistura os dados de anos diferentes", () => {
    const { rows } = historicoDoAno(2025);
    expect(rows.every((r) => r.ano === 2025)).toBe(true);
    expect(rows.reduce((s, r) => s + r.valor, 0)).toBeCloseTo(5696167.52, 2);
  });
});