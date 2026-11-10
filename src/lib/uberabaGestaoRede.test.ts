import { describe, expect, it } from "vitest";
import { CAMPOS_GESTAO_REDE, GESTAO_REDE_PADRAO, VIDAS_MES_PADRAO, antecipacaoPessoa, calcularGestaoRede, gravarGestaoRede, lerGestaoRede, parseNumeroBR, totaisGestaoRede } from "./uberabaGestaoRede";

const memoria = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };

describe("Gestão Rede variables", () => {
  it("lists the seven requested variables in order", () => {
    expect(CAMPOS_GESTAO_REDE.map((c) => c.label)).toEqual([
      "Valor Vida Paulo", "Valor Vida Adeir", "Teto Paulo", "Teto Adeir", "Número Vidas total", "Adiantamento Paulo", "Adiantamento Adeir",
    ]);
  });
  it("parses pt-BR numbers and rejects invalid text", () => {
    expect(parseNumeroBR("1.234,56")).toBe(1234.56);
    expect(parseNumeroBR("R$ 50")).toBe(50);
    expect(parseNumeroBR("")).toBe(0);
    expect(parseNumeroBR("12a")).toBeNaN();
  });
  it("saves and reads back values, rounding lives to whole numbers", () => {
    const s = memoria();
    gravarGestaoRede(s, { ...GESTAO_REDE_PADRAO, valorVidaPaulo: 12.345, numeroVidasTotal: 1500.6 });
    const lido = lerGestaoRede(s);
    expect(lido.valorVidaPaulo).toBe(12.35);
    expect(lido.numeroVidasTotal).toBe(1501);
  });
  it("refuses negative values", () => {
    expect(() => gravarGestaoRede(memoria(), { ...GESTAO_REDE_PADRAO, tetoAdeir: -1 })).toThrow();
  });
});

describe("Gestão Rede monthly grid", () => {
  const linhas = calcularGestaoRede(GESTAO_REDE_PADRAO, VIDAS_MES_PADRAO);
  it("Mensal = lives × value per life, per person", () => {
    expect(linhas[0].mensalPaulo).toBe(300);
    expect(linhas[11].mensalAdeir).toBe(10000);
    expect(linhas[11].mensalTotal).toBe(20000);
  });
  it("reproduces the supplied Antecipação column: 7.500 in months 1–2, mensal in 3–10, 1.700 in 11–12", () => {
    expect(linhas.map((l) => l.antecipacaoPaulo)).toEqual([7500, 7500, 1200, 2000, 2800, 3600, 4400, 5200, 6000, 6800, 1700, 1700]);
    expect(linhas[0].antecipacaoTotal).toBe(15000);
    expect(linhas[10].antecipacaoTotal).toBe(3400);
  });
  it("totals match the supplied sheet: 50.400 per person and 100.800 overall", () => {
    const t = totaisGestaoRede(linhas);
    expect(t.antecipacaoPaulo).toBe(50400);
    expect(t.antecipacaoAdeir).toBe(50400);
    expect(t.mensalPaulo).toBe(50400);
    expect(t.mensalTotal).toBe(100800);
  });
  it("recovers the advance in the last month when no month reaches the cap", () => {
    const { valores, tipos } = antecipacaoPessoa([100, 100, 100, 100], 500, 1000);
    expect(valores).toEqual([500, 500, 100, -700]);
    expect(tipos[3]).toBe("recuperacao");
  });
});
