import { describe, expect, it } from "vitest";
import { mesesMovimentacao, somarTotaisMovimentacao, fechamentosMensaisMovimentacao, escalaVidasMensais } from "./movimentacaoCarga";
import { resumoMovimentacao } from "./movimentacaoResumo";

describe("carga de totais da Movimentação", () => {
  it("fixa a escala de vidas entre 50.000 e 80.000 com intervalos de 2.000", () => {
    expect(escalaVidasMensais.dominio).toEqual([50000, 80000]);
    expect(escalaVidasMensais.marcas).toEqual([50000, 52000, 54000, 56000, 58000, 60000, 62000, 64000, 66000, 68000, 70000, 72000, 74000, 76000, 78000, 80000]);
  });
  it("consulta o último dia de cada mês inclusive quando o período termina antes do fechamento", () => {
    expect(fechamentosMensaisMovimentacao({ de: "2026-08-15", ate: "2026-10-23" })).toEqual(["2026-08-31", "2026-09-30", "2026-10-31"]);
  });
  it("preserva fechamento UTC de fevereiro bissexto e virada de ano", () => {
    expect(fechamentosMensaisMovimentacao({ de: "2024-02-01", ate: "2024-02-29" })).toEqual(["2024-02-29"]);
    expect(fechamentosMensaisMovimentacao({ de: "2025-12-01", ate: "2026-01-15" })).toEqual(["2025-12-31", "2026-01-31"]);
  });
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