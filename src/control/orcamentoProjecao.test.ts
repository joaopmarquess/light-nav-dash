import { describe, expect, it } from "vitest";
import { projetadoV2 } from "./orcamentoProjecao";

const linha = (mes: number, realizado: number, item = "Faturamento") => ({ item, mes, realizado });

describe("Projetado v2", () => {
  it("usa a média aritmética das variações percentuais e compõe os meses futuros", () => {
    const valor = projetadoV2([linha(1, 100), linha(2, 110), linha(3, 132)], new Set([1, 2, 3]));
    // 10% e 20% => média 15%, não média absoluta nem taxa geométrica.
    expect(valor("Faturamento", 4)).toBeCloseTo(151.8, 8);
    expect(valor("Faturamento", 5)).toBeCloseTo(174.57, 8);
    expect(valor("Faturamento", 3)).toBe(132);
  });
  it("calcula cada conta separadamente preservando o sinal das despesas", () => {
    const valor = projetadoV2([linha(1, 100), linha(2, 110), linha(1, -200, "Pessoal"), linha(2, -240, "Pessoal")], new Set([1, 2]));
    expect(valor("Faturamento", 3)).toBeCloseTo(121);
    expect(valor("Pessoal", 3)).toBeCloseTo(-288);
  });
  it("ignora lançamentos posteriores ao corte e mantém setembro realizado", () => {
    const valor = projetadoV2([linha(8, 100), linha(9, 110), linha(10, 9000)], new Set([8, 9]));
    expect(valor("Faturamento", 9)).toBe(110);
    expect(valor("Faturamento", 10)).toBeCloseTo(121);
    expect(valor("Faturamento", 12)).toBeCloseTo(146.41);
  });
  it("não divide por zero e repete o último mês sem taxas válidas", () => {
    const valor = projetadoV2([linha(1, 0), linha(2, 200)], new Set([1, 2]));
    expect(valor("Faturamento", 3)).toBe(200);
    expect(projetadoV2([linha(1, -300)], new Set([1]))("Faturamento", 2)).toBe(-300);
    expect(projetadoV2([], new Set())("Faturamento", 1)).toBe(0);
  });
  it("agrega linhas da mesma conta antes de calcular taxas e não reabre base final zero", () => {
    const valor = projetadoV2([linha(1, 40), linha(1, 60), linha(2, 0)], new Set([1, 2]));
    expect(valor("Faturamento", 1)).toBe(100);
    expect(valor("Faturamento", 3)).toBe(0);
  });
});