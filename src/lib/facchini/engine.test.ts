import { describe, it, expect } from "vitest";
import * as e from "./engine";
const fx = (t: number[], d: number[]) => t.map((x, i) => ({ titulares: x, dependentes: d[i] }));
const precos = [100, 110, 120, 130, 140, 150, 160, 170, 180, 190];
describe("faixas", () => {
  it("classifica as dez faixas", () => {
    expect([0, 18, 19, 23, 24, 28, 33, 38, 43, 48, 53, 58, 59, 90].map(e.faixaPorIdade)).toEqual([0, 0, 1, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9, 9]);
  });
  it("idade respeita aniversário", () => {
    expect(e.idadeNaData(new Date(Date.UTC(2000, 5, 10)), new Date(Date.UTC(2026, 5, 9)))).toBe(25);
    expect(e.idadeNaData(new Date(Date.UTC(2000, 5, 10)), new Date(Date.UTC(2026, 5, 10)))).toBe(26);
  });
  it("datas brasileiras e ISO; inválidas rejeitadas", () => {
    expect(e.parseData("31/01/1990")?.toISOString().slice(0, 10)).toBe("1990-01-31");
    expect(e.parseData("1990-01-31")?.getUTCDate()).toBe(31);
    expect(e.parseData("31/02/1990")).toBeNull();
  });
});
describe("produção e tickets", () => {
  const f = fx([1, 0, 0, 0, 0, 0, 0, 0, 0, 2], [1, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const p = e.producao(f, precos);
  it("soma vidas e produção", () => {
    expect(p.vidas).toBe(4); expect(p.total).toBe(100 * 2 + 190 * 2);
    expect(p.total).toBe(p.porFaixa.reduce((s, x) => s + x.total, 0));
  });
  it("tickets", () => { expect(p.ticketTitular).toBe(480 / 3); expect(p.ticketDependente).toBe(100); expect(p.ticketGrupo).toBe(145); });
  it("carteira vazia não divide por zero", () => { const v = e.producao([], precos); expect(v.ticketGrupo).toBe(0); expect(v.total).toBe(0); });
  it("tabela sem faixa vale zero e RN63 pede atenção", () => {
    const sem = [...precos]; sem[9] = NaN;
    expect(e.producao(f, sem).total).toBe(200); expect(e.rn63(sem).validacao2).toBe("Atenção");
  });
});
describe("premissas e projeção", () => {
  it("produtividade respeita limite", () => { expect(e.produtividadeAplicada(200000, 0.15, 20000).aplicada).toBe(20000); expect(e.produtividadeAplicada(1000, 0.15, 20000).aplicada).toBe(150); });
  it("sinistralidade líquida", () => { expect(e.sinistralidadeLiquida(0.9, 0.15)).toBeCloseTo(0.765, 12); });
  it("patrocínio e projeção", () => {
    const f = fx([10, 0, 0, 0, 0, 0, 0, 0, 0, 0], [5, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const r = e.projecao(f, precos, e.PREMISSAS_PADRAO);
    expect(r.patrocinio.empresa).toBe(500); expect(r.patrocinio.beneficiarios).toBe(1000);
    expect(r.adesao).toBe(250);
    expect(r.colunas.mes1.saldo).toBeCloseTo(1500 - 225 + 250 - 1350, 9);
    expect(r.colunas.ano1.coparticipacao).toBeCloseTo(1500 * 0.15 * 8, 9);
    expect(r.colunas.ano2.coparticipacao).toBeCloseTo(18000 * 0.15, 9);
    expect(r.colunas.ano2.despesa).toBeLessThan(0);
  });
});
describe("margem e RN 63", () => {
  it("fator e desconto efetivo", () => { const m = e.margem(80, 100); expect(m.fatorEfetivo).toBe(0.8); expect(m.descontoEfetivo).toBeCloseTo(20, 9); });
  it("RN63 Facchini", () => {
    const r = e.rn63([88.76, 103.58, 120.87, 133.2, 155.44, 177.66, 206.75, 257.82, 360.12, 532.44]);
    expect(r.validacao2).toBe("OK"); expect(r.r10_1).toBeCloseTo(532.44 / 88.76, 9);
  });
  it("RN63 não permitido acima de 6x", () => { expect(e.rn63([100, 0, 0, 0, 0, 0, 200, 0, 0, 700]).validacao2).toBe("Não permitido"); });
  it("reajuste de tabela versionada", () => { expect(e.ajustarTabela([100, 200], 0.1).map((x) => +x.toFixed(6))).toEqual([110, 220]); });
});
