import { describe, expect, it } from "vitest";
import { mesesMovimentacao, somarTotaisMovimentacao } from "./movimentacaoCarga";
import { resumoMovimentacao } from "./movimentacaoResumo";

describe("carga de totais da Movimentação", () => {
  it("preserva limites do período e a janela mensal", () => {
    expect(mesesMovimentacao({ de: "2026-01-15", ate: "2026-03-12" })).toEqual([
      { de: "2026-01-15", ate: "2026-01-31" },
      { de: "2026-02-01", ate: "2026-02-28" },
      { de: "2026-03-01", ate: "2026-03-12" },
    ]);
  });
  it("soma contagens sem confundir transferências com vendas e cancelamentos", () => {
    const total = somarTotaisMovimentacao([
      { vendas: "11771", cancelamentos: "8049", reativacoes: "1179", entradas_transferencia: "2043", saidas_transferencia: "2019" },
      { vendas: 0, cancelamentos: 0, reativacoes: 0, entradas_transferencia: 0, saidas_transferencia: 0 },
    ]);
    expect(total).toEqual({ e: 11771, s: 8049, r: 1179, tp: 2043, tm: 2019 });
    expect(resumoMovimentacao(total.e, total.s, total.r, total.tp, total.tm)).toEqual({ transferenciasLiquidas: 24, crescimento: 4925 });
  });
});