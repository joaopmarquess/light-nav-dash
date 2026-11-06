import { describe, expect, it } from "vitest";
import fonte from "@/data/benchVidas/operadoras_vidas_3_produtos_201901_202610.csv?raw";
import { mesesBenchVidas, parseBenchVidas, resumoBenchVidas } from "./benchVidas";

const dados = parseBenchVidas(fonte);
describe("Bench Vidas provisional CSV", () => {
  it("preserves all 4230 supplied records and five operators", () => {
    expect(dados).toHaveLength(4230);
    expect(new Set(dados.map(r => r.operadora)).size).toBe(5);
  });
  it("preserves October 2026 supplied snapshots instead of inferring balance from movements", () => {
    const meses = mesesBenchVidas(dados, "366561", 2026);
    expect(meses).toHaveLength(10);
    expect(meses.at(-1)).toMatchObject({ competencia: "202610", saldo: 1000, adesoes: 1000, cancelamentos: 1000 });
    expect(meses.at(-1)?.planos.PIF.saldo).toBe(520);
    expect(meses.at(-1)?.planos.PCA.saldo).toBe(290);
    expect(meses.at(-1)?.planos.PCE.saldo).toBe(190);
  });
  it("uses closing monthly lives rather than summing stock over the year", () => {
    const meses = mesesBenchVidas(dados, "366561", 2019);
    const resumo = resumoBenchVidas(meses);
    expect(resumo.saldo).toBe(meses[11].saldo);
    expect(resumo.saldo).not.toBe(meses.reduce((s, m) => s + m.saldo, 0));
    expect(resumo.adesoes).toBe(meses.reduce((s, m) => s + m.adesoes, 0));
    expect(resumo.cancelamentos).toBe(meses.reduce((s, m) => s + m.cancelamentos, 0));
  });
  it("isolates operator, year, segment and contracting filters", () => {
    expect(mesesBenchVidas(dados, "366561", 2026, "PCA").at(-1)).toMatchObject({ saldo: 290, adesoes: 300, cancelamentos: 310 });
    expect(mesesBenchVidas(dados, "366561", 2026, "todos", "missing")).toEqual([]);
    expect(mesesBenchVidas(dados, "missing", 2026)).toEqual([]);
    expect(mesesBenchVidas(dados, "366561", 2018)).toEqual([]);
  });
});