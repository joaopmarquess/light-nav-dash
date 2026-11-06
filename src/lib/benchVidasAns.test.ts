import { describe, expect, it } from "vitest";
import catalogo from "@/data/benchVidas/ans/catalogo.json";
import { adaptarVidasAns, compararOperadorasVidasAns, crescimentoPeriodoVidasAns, escalaVidasAns, limitesPeriodoVidasAns, nomeOperadoraAns, percentualCrescimentoVidasAns, periodoPadraoVidasAns, planosDisponiveisAns, type RegistroAnsVidas } from "./benchVidasAns";
import { mesesBenchVidas, resumoBenchVidas } from "./benchVidas";

const registros: RegistroAnsVidas[] = [["366561", "202609", "1", 36425, 0], ["366561", "202609", "2", 9904, 0], ["366561", "202609", "3", 25550, 0]];
describe("ANS DBC historical base", () => {
  it("compares every selected operator in the same period without filling missing balances", () => {
    const dados = adaptarVidasAns([...registros, ["x", "202603", "1", 100, 5], ["x", "202609", "1", 120, 6], ["z", "202609", "1", 999, 0], ["x", "202503", "1", 80, 0]], new Map());
    expect(compararOperadorasVidasAns(dados, ["366561", "x"], 2026, 2026)).toEqual([
      { competencia: "202603", saldos: { "366561": null, x: 105 } },
      { competencia: "202609", saldos: { "366561": 71879, x: 126 } },
    ]);
    expect(compararOperadorasVidasAns(dados, ["366561", "x"], 2026, 2026, "PIF", "Plano de saúde").at(-1)?.saldos).toEqual({ "366561": 36425, x: 120 });
  });
  it("computes growth percentage against the initial balance", () => {
    expect(percentualCrescimentoVidasAns(41978.75, 33583)).toBe(80);
    expect(percentualCrescimentoVidasAns(100, -20)).toBe(-20);
    expect(percentualCrescimentoVidasAns(100, 0)).toBe(0);
    expect(percentualCrescimentoVidasAns(0, 100)).toBeNull();
    expect(percentualCrescimentoVidasAns(null, 100)).toBeNull();
  });
  it("initializes the period picker with the smallest and largest available years", () => {
    expect(limitesPeriodoVidasAns(catalogo.anos)).toEqual({ de: 2011, ate: 2026 });
    expect(limitesPeriodoVidasAns([2025, 2019, 2024])).toEqual({ de: 2019, ate: 2025 });
  });
  it("calculates period growth as final balance minus initial balance without summing stocks", () => {
    expect(crescimentoPeriodoVidasAns([{ competencia: "202609", saldo: 71879 }, { competencia: "202603", saldo: 71427 }, { competencia: "202606", saldo: 71501 }])).toBe(452);
    expect(crescimentoPeriodoVidasAns([{ competencia: "202403", saldo: 100 }, { competencia: "202609", saldo: 80 }])).toBe(-20);
    expect(crescimentoPeriodoVidasAns([{ competencia: "202609", saldo: 71879 }])).toBe(0);
    expect(crescimentoPeriodoVidasAns([])).toBeNull();
    expect(crescimentoPeriodoVidasAns([{ competencia: "202603", saldo: null }, { competencia: "202609", saldo: 71879 }])).toBeNull();
  });
  it("defaults both period boundaries to the current year", () => {
    expect(periodoPadraoVidasAns(new Date(2026, 10, 6))).toEqual({ de: 2026, ate: 2026 });
    expect(periodoPadraoVidasAns(new Date(2027, 0, 1))).toEqual({ de: 2027, ate: 2027 });
  });
  it("rounds ninety and one hundred eighty percent upward to ten thousand", () => {
    const escala = escalaVidasAns(71879);
    expect(escala.dominio).toEqual([0, 130000]);
    expect(escala.marcas).toEqual([0, 70000, 130000]);
  });
  it("preserves exact ten-thousand boundaries and avoids duplicate marks", () => {
    expect(escalaVidasAns(100000).marcas).toEqual([0, 90000, 180000]);
    expect(escalaVidasAns(200).marcas).toEqual([0, 10000]);
  });
  it("keeps an empty or zero lives axis non-degenerate", () => {
    expect(escalaVidasAns(0).dominio).toEqual([0, 10000]);
    expect(escalaVidasAns(null).dominio).toEqual([0, 10000]);
  });
  it("omits absent contracting categories for the selected operator", () => {
    const dados = adaptarVidasAns([...registros, ["x", "202609", "0", 4, 0], ["x", "202609", "4", 10, 0]], new Map());
    expect(planosDisponiveisAns(dados, "366561", 2026)).toEqual(["PIF", "PCA", "PCE"]);
    expect(planosDisponiveisAns(dados, "x", 2026)).toEqual(["Não informado", "PIF + PCE"]);
  });
  it("does not display a category missing from an individual quarter", () => {
    const dados = adaptarVidasAns([["x", "202603", "1", 0, 0], ["x", "202609", "4", 10, 0]], new Map());
    expect(planosDisponiveisAns(dados, "x", 2026, "todos", "202603")).toEqual(["PIF"]);
    expect(planosDisponiveisAns(dados, "x", 2026, "todos", "202609")).toEqual(["PIF + PCE"]);
  });
  it("uses the first name for non-Unimed operators", () => {
    expect(nomeOperadoraAns("BRADESCO SAÚDE S/A")).toBe("Bradesco");
    expect(nomeOperadoraAns("BENSAUDE PLANO DE ASSISTENCIA MEDICA")).toBe("Bensaúde");
  });
  it("preserves uppercase operator initials", () => {
    expect(nomeOperadoraAns("H.b. Saúde")).toBe("H.B.");
    expect(nomeOperadoraAns("h.b. saúde")).toBe("H.B.");
    expect(nomeOperadoraAns("CCG SAÚDE")).toBe("CCG");
  });
  it("retains the Unimed city rather than the legal suffix", () => {
    expect(nomeOperadoraAns("UNIMED DE RIO CLARO SP COOPERATIVA DE TRABA")).toBe("Unimed Rio Claro");
    expect(nomeOperadoraAns("UNIMED PELOTAS/RS - COOPERATIVA DE ASSISTÊN")).toBe("Unimed Pelotas");
    expect(nomeOperadoraAns("UNIMED SAO JOSÉ DO RIO PRETO - COOP. DE TRA")).toBe("Unimed Sao José do Rio Preto");
  });
  it("covers every supplied quarter and every operator since 2011", () => {
    expect(catalogo.inicio).toBe("201106");
    expect(catalogo.fim).toBe("202609");
    expect(catalogo.arquivos).toHaveLength(62);
    expect(catalogo.operadoras).toHaveLength(1679);
    expect(catalogo.anos).toEqual(Array.from({ length: 16 }, (_, i) => 2011 + i));
  });
  it("reconciles medical plus dental counts for every original file", () => {
    expect(catalogo.arquivos.reduce((s, f) => s + f.linhas, 0)).toBe(3490950);
    for (const arquivo of catalogo.arquivos) expect(arquivo.medico + arquivo.odontologico).toBe(arquivo.total);
  });
  it("maps ANS contracting codes without swapping PCA and PCE", () => {
    const meses = mesesBenchVidas(adaptarVidasAns(registros, new Map()), "366561", 2026);
    expect(meses[0].saldo).toBe(71879);
    expect(meses[0].planos.PIF.saldo).toBe(36425);
    expect(meses[0].planos.PCE.saldo).toBe(9904);
    expect(meses[0].planos.PCA.saldo).toBe(25550);
    expect(resumoBenchVidas(meses).adesoes).toBeNull();
    expect(resumoBenchVidas(meses).cancelamentos).toBeNull();
  });
  it("preserves unknown and combined contracting without inferring subdivisions", () => {
    const dados = adaptarVidasAns([["x", "201106", "4", 10, 5], ["x", "201106", "0", 4, 2]], new Map());
    const meses = mesesBenchVidas(dados, "x", 2011);
    expect(meses[0].planos["PIF + PCE"].saldo).toBe(15);
    expect(meses[0].planos["Não informado"].saldo).toBe(6);
    expect(meses[0].planos.PIF.saldo).toBe(0);
  });
});