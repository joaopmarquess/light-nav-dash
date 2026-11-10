import { describe, expect, it } from "vitest";
import { CAMPOS_GESTAO_REDE, GESTAO_REDE_PADRAO, gravarGestaoRede, lerGestaoRede, parseNumeroBR } from "./uberabaGestaoRede";

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
