import { describe, expect, it } from "vitest";
import catalogo from "@/data/benchVidas/ans/catalogo.json";
import { adaptarVidasAns, type RegistroAnsVidas } from "./benchVidasAns";
import { mesesBenchVidas, resumoBenchVidas } from "./benchVidas";

const registros: RegistroAnsVidas[] = [["366561", "202609", "1", 36425, 0], ["366561", "202609", "2", 9904, 0], ["366561", "202609", "3", 25550, 0]];
describe("ANS DBC historical base", () => {
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