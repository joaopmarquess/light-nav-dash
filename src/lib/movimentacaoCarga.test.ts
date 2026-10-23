import { describe, expect, it } from "vitest";
import { janelaMesesMovimentacao, datasVidasIndicadores, mesesMovimentacao, ultimosMesesMovimentacao, somarTotaisMovimentacao, fechamentosMensaisMovimentacao, escalaVidasMensais, fluxoMensalMovimentacao, combinarFluxosEVidas } from "./movimentacaoCarga";
import { resumoMovimentacao } from "./movimentacaoResumo";

describe("carga de totais da Movimentação", () => {
  it("desloca a janela de 12 meses um mês por clique", () => {
    const periodo = { de: "2025-01-15", ate: "2026-10-23" };
    const recente = janelaMesesMovimentacao(periodo);
    const anterior = janelaMesesMovimentacao(periodo, 1);
    expect(recente.meses).toHaveLength(12);
    expect(recente.anteriores).toBe(true);
    expect(recente.posteriores).toBe(false);
    expect(anterior.meses).toHaveLength(12);
    expect(anterior.meses[0]).toEqual({ de: "2025-10-01", ate: "2025-10-31" });
    expect(anterior.meses[11]).toEqual({ de: "2026-09-01", ate: "2026-09-30" });
    expect(anterior.anteriores).toBe(true);
    expect(anterior.posteriores).toBe(true);
    expect(janelaMesesMovimentacao(periodo, anterior.pagina - 1)).toEqual(recente);
    expect(janelaMesesMovimentacao(periodo, -1)).toEqual(recente);
  });
  it("para no primeiro mês disponível sem reduzir a janela de 12 meses", () => {
    const limite = janelaMesesMovimentacao({ de: "2025-01-15", ate: "2026-10-23" }, 99);
    expect(limite.pagina).toBe(10);
    expect(limite.meses).toHaveLength(12);
    expect(limite.meses[0]).toEqual({ de: "2025-01-15", ate: "2025-01-31" });
    expect(limite.meses[11]).toEqual({ de: "2025-12-01", ate: "2025-12-31" });
    expect(limite.anteriores).toBe(false);
    expect(limite.posteriores).toBe(true);
  });
  it("não permite navegar quando há menos de 12 meses", () => {
    const janela = janelaMesesMovimentacao({ de: "2026-08-01", ate: "2026-10-23" });
    expect(janela.meses).toHaveLength(3);
    expect(janela.anteriores).toBe(false);
    expect(janela.posteriores).toBe(false);
  });
  it("consulta o Final no mesmo fechamento da linha para um mês completo", () => {
    const periodo = { de: "2026-09-01", ate: "2026-09-30" };
    expect(datasVidasIndicadores(periodo)).toEqual({ anterior: "2026-08-31", final: "2026-09-30" });
    expect(datasVidasIndicadores(periodo).final).toBe(fechamentosMensaisMovimentacao(periodo)[0]);
  });
  it("preserva a data final aplicada em períodos parciais e o anterior UTC na virada do ano", () => {
    expect(datasVidasIndicadores({ de: "2026-01-01", ate: "2026-10-23" })).toEqual({ anterior: "2025-12-31", final: "2026-10-23" });
  });
  it("limita os botões aos últimos 12 meses do período", () => {
    const meses = ultimosMesesMovimentacao({ de: "2025-01-01", ate: "2026-10-23" });
    expect(meses).toHaveLength(12);
    expect(meses[0]).toEqual({ de: "2025-11-01", ate: "2025-11-30" });
    expect(meses[11]).toEqual({ de: "2026-10-01", ate: "2026-10-23" });
  });
  it("mantém os limites aplicados ao selecionar um mês parcial", () => {
    expect(ultimosMesesMovimentacao({ de: "2026-08-15", ate: "2026-10-23" })).toEqual([
      { de: "2026-08-15", ate: "2026-08-31" },
      { de: "2026-09-01", ate: "2026-09-30" },
      { de: "2026-10-01", ate: "2026-10-23" },
    ]);
  });
  it("usa vidas consultadas no fechamento para a linha, sem substituir pelo crescimento líquido", () => {
    expect(combinarFluxosEVidas([{ mes: "2026-09", vendas: 1200, saidas: 1000, crescimento: 300 }], [{ mes: "2026-09", data: "2026-09-30", vidas: 71337 }])).toEqual([{ mes: "2026-09", vendas: 1200, saidas: 1000, crescimento: 300, data: "2026-09-30", vidas: 71337 }]);
  });
  it("combina vendas e saídas absolutas com crescimento segundo a regra dos cards", () => {
    expect(fluxoMensalMovimentacao("2026-09", { vendas: 11771, cancelamentos: 8049, reativacoes: 1179, entradas_transferencia: 2043, saidas_transferencia: 2019 })).toEqual({ mes: "2026-09", vendas: 11771, saidas: 8049, crescimento: 4925 });
    expect(fluxoMensalMovimentacao("2026-10", { vendas: 10, cancelamentos: 30 })).toEqual({ mes: "2026-10", vendas: 10, saidas: 30, crescimento: -20 });
  });
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