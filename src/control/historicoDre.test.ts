import { describe, expect, it } from "vitest";
import { HISTORICO_ANOS, historicoDoAno } from "./historicoDre";

describe("Histórico do arquivo anexado", () => {
  it("disponibiliza os nove anos solicitados, de 2018 a 2026", () => {
    expect(HISTORICO_ANOS).toEqual([2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018]);
    for (const ano of HISTORICO_ANOS) expect(historicoDoAno(ano).rows.length).toBeGreaterThan(0);
  });
  it("preserva os centavos do resultado de 2018 no arquivo", () => {
    expect(historicoDoAno(2018).rows.reduce((s, r) => s + r.valor, 0)).toBeCloseTo(11323395.65, 2);
  });
  it("concilia 2023 com o novo CSV sem duplicar a apuração do resultado", () => {
    const { rows, meses } = historicoDoAno(2023);
    expect(meses).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(rows.reduce((s, r) => s + r.valor, 0)).toBeCloseTo(-28675264.75, 2);
    const mensal = meses.map((mes) => rows.filter((r) => r.mes === mes).reduce((s, r) => s + r.valor, 0));
    const esperado = [-5211664.08, 400813.11, -10084200.92, -5404610.03, -7738985.36, -4280773.26, -2841655.25, -2585113.33, -646402.01, 489435.96, -1705129.50, 10933019.92];
    mensal.forEach((valor, i) => expect(valor).toBeCloseTo(esperado[i], 2));
  });
  it("mantém as contas divergentes no primeiro grupo histórico de tecnologia", () => {
    const tecnologia = historicoDoAno(2023).rows.filter((r) => r.g3 === "03|TECNOLOGIA DA INFORMAÇÃO");
    expect(tecnologia).toHaveLength(12);
    expect(tecnologia.every((r) => r.g1 === "1|EBITDA" && r.g2 === "2|ADMINISTRATIVO" && r.g4 === "")).toBe(true);
    expect(tecnologia.reduce((s, r) => s + r.valor, 0)).toBeCloseTo(-1674520.12, 2);
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