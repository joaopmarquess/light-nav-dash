import { describe, it, expect } from "vitest";
import { gridFaixas, normFaixa, parsePlanos, competencia } from "./sinistralidadeEmpresas";

describe("Sinistralidade · Empresas", () => {
  it("aceita vários planos de 4 dígitos", () => expect(parsePlanos("2290, 2490 2890;12")).toEqual(["2290", "2490", "2890"]));
  it("normaliza faixa", () => { expect(normFaixa("0 a 18 anos")).toBe("00 a 18"); expect(normFaixa("59 anos ou mais")).toBe("59 ou +"); });
  it("competência AAAAMM", () => expect(competencia("2026-03")).toBe(202603));
  it("saldo = despesas − receita total; sinistralidade = despesas ÷ receita total", () => {
    const { total } = gridFaixas([{ plano: "2290", faixa: "00 a 18", vidas: 2, recCpp: 800, recCopart: 200, recTotal: 1000, despTotal: 650 }]);
    expect(total.saldo).toBe(-350);
    expect(total.sin).toBeCloseTo(0.65);
  });
});
