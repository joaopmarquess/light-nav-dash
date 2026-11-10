import { describe, expect, it } from "vitest";
import { CAMPOS_GESTAO_REDE, GESTAO_REDE_PADRAO, antecipacaoPessoa, distribuirVidas, calcularGestaoRede, gravarGestaoRede, lerGestaoRede, parseNumeroBR, totaisGestaoRede } from "./uberabaGestaoRede";

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
  const linhas = calcularGestaoRede(GESTAO_REDE_PADRAO);
  it("uses the defaults requested on 10/11/2026", () => {
    expect(GESTAO_REDE_PADRAO).toMatchObject({ tetoPaulo: 15000, tetoAdeir: 15000, adiantamentoPaulo: 7500, adiantamentoAdeir: 7500, valorVidaPaulo: 1, valorVidaAdeir: 1, numeroVidasTotal: 10000 });
  });
  it("spreads the 10.000 lives over the 12 months, reaching the total in month 12", () => {
    const { entradas, vidas } = distribuirVidas(10000);
    expect(vidas[0]).toBe(833);
    expect(vidas[11]).toBe(10000);
    expect(entradas.reduce((s, x) => s + x, 0)).toBe(10000);
    expect(Math.max(...entradas) - Math.min(...entradas)).toBeLessThanOrEqual(1);
  });
  it("Mensal = accumulated lives × value per life, capped at the ceiling", () => {
    expect(linhas[11].mensalPaulo).toBe(10000);
    const limitado = calcularGestaoRede({ ...GESTAO_REDE_PADRAO, tetoAdeir: 5000 });
    expect(limitado[11].mensalAdeir).toBe(5000);
    expect(limitado[11].tetoAdeir).toBe(true);
  });
  it("pays 7.500 in months 1–2, mensal in 3–10 and deducts the advances in months 11–12", () => {
    const p = linhas.map((l) => l.antecipacaoPaulo);
    expect(p.slice(0, 2)).toEqual([7500, 7500]);
    expect(p.slice(2, 10)).toEqual(linhas.slice(2, 10).map((l) => l.mensalPaulo));
    // excess = 15.000 − (833 + 1.667) = 12.500; months 11–12: (9.167 + 10.000 − 12.500) / 2
    expect(p.slice(10)).toEqual([3333.5, 3333.5]);
    expect(linhas[10].tipoPaulo).toBe("recuperacao");
    expect(linhas[9].tipoPaulo).toBe("mensal");
  });
  it("total antecipação equals total mensal", () => {
    const t = totaisGestaoRede(linhas);
    expect(t.antecipacaoPaulo).toBe(t.mensalPaulo);
    expect(t.antecipacaoTotal).toBe(t.mensalTotal);
  });
  it("still reproduces the first supplied sheet (1.700 in months 11–12)", () => {
    const { valores } = antecipacaoPessoa([300, 600, 1200, 2000, 2800, 3600, 4400, 5200, 6000, 6800, 7500, 10000], 7500);
    expect(valores.slice(10)).toEqual([1700, 1700]);
  });
});
