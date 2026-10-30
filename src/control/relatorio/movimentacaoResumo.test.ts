import { describe, expect, it } from "vitest";
import { podeCalcularMovimentacao, resumoMovimentacao } from "./movimentacaoResumo";

describe("resumo do mapa mental", () => {
  it("deduz a transferência líquida dos totais, sem fixar o 25 do exemplo", () => {
    expect(resumoMovimentacao(11771, 8049, 1179, 2043, 2019).transferenciasLiquidas).toBe(24);
  });
  it("reconcilia o crescimento pelos movimentos", () => {
    expect(resumoMovimentacao(11771, 8049, 1179, 2043, 2019).crescimento).toBe(4925);
  });
  it("não calcula sem um período aplicado por Calcular", () => {
    expect(podeCalcularMovimentacao(null)).toBe(false);
    expect(podeCalcularMovimentacao({ de: "2026-01-01", ate: "2026-09-30" })).toBe(true);
  });
});