import { describe, expect, it } from "vitest";
import fonte from "@/data/benchVidas/operadoras_vidas_3_produtos_201901_202610.csv?raw";
import unificado from "@/data/benchVidas/bench_vidas_unificado_2024_2025_2026.csv?raw";
import { mesesBenchVidas, parseBenchVidas, parseBenchVidasUnificado, resumoBenchVidas } from "./benchVidas";

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

describe("Unified Bench Vidas worksheet", () => {
  const importacao = parseBenchVidasUnificado(unificado);
  const meses = mesesBenchVidas(importacao.dados, "366561", 2026);
  it("preserves source rows and excludes missing normalized dates without inferring them", () => {
    expect(importacao.totalLinhas).toBe(4932);
    expect(importacao.semCompetencia).toBe(492);
    expect(meses.map(m => m.competencia)).toEqual(["202601", "202602", "202603", "202604", "202605", "202606"]);
  });
  it("uses the most recent source for each operator and month, not summed archive versions", () => {
    expect(meses.map(m => m.saldo)).toEqual([71427, 71501, 71910, 72603, 72691, 73399]);
    expect(meses.map(m => m.cancelamentos)).toEqual([806, 918, 875, 525, 1097, 743]);
    expect(importacao.dados.filter(r => r.operadora === "366561" && r.ano === 2026 && r.tipo === "saldo")).toHaveLength(24);
  });
  it("keeps missing adhesions and contracting unknown rather than zero or inferred PIF/PCA/PCE", () => {
    expect(meses.every(m => m.adesoes === null)).toBe(true);
    expect(resumoBenchVidas(meses).adesoes).toBeNull();
    expect(new Set(importacao.dados.filter(r => r.operadora === "366561" && r.ano === 2026).map(r => r.plano))).toEqual(new Set(["Não informado"]));
  });
  it("retains coverage counts and closing annual stock from the supplied source", () => {
    expect(mesesBenchVidas(importacao.dados, "366561", 2026, "todos", "Plano de saúde").at(-1)?.saldo).toBe(69562);
    expect(mesesBenchVidas(importacao.dados, "366561", 2026, "todos", "Odontológico").at(-1)?.saldo).toBe(3837);
    expect(resumoBenchVidas(meses).saldo).toBe(73399);
  });
});