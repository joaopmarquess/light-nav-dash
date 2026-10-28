import { describe, expect, it } from "vitest";
import { cidadesComHospitais, hospitaisDaCidade, indexarHospitais, ordenarCidadesComHospitais, quantidadeHospitaisPsiquiatricos } from "./mapaHospitais";
import cadastro from "@/data/hospitais/guia-medico-2026-10-28.json";

describe("Hospitais do mapa recortado", () => {
  it("destaca dois hospitais psiquiátricos somente em São José do Rio Preto SP sem alterar o cadastro", () => {
    expect(quantidadeHospitaisPsiquiatricos("SAO JOSE DO RIO PRETO", "sp")).toBe(2);
    expect(quantidadeHospitaisPsiquiatricos("São José do Rio Preto", "MG")).toBe(0);
    expect(quantidadeHospitaisPsiquiatricos("Fernandópolis", "SP")).toBe(0);
    expect(hospitaisDaCidade("São José do Rio Preto", "SP")?.quantidade).toBe(3);
  });
  const cidade = (nome: string, quantidade: number) => ({ cidade: nome, uf: "SP", quantidade, hospitais: [] });
  it("prioriza a quantidade decrescente de hospitais acima das vidas", () => {
    expect(ordenarCidadesComHospitais({ SP: { A: 9000, B: 1 } }, [cidade("A", 1), cidade("B", 3)]).map(r => r.cidade)).toEqual(["B", "A"]);
  });
  it("desempata hospitais por vidas decrescentes, normalizando cidade e UF", () => {
    expect(ordenarCidadesComHospitais({ sp: { ÁGUA: 10, B: 20 } }, [cidade("Água", 2), cidade("B", 2)]).map(r => r.cidade)).toEqual(["B", "Água"]);
  });
  it("desempata hospitais e vidas em ordem alfabética", () => {
    expect(ordenarCidadesComHospitais({ SP: { A: 10, B: 10 } }, [cidade("B", 1), cidade("A", 1)]).map(r => r.cidade)).toEqual(["A", "B"]);
  });
  it("marca somente cidades com pelo menos um hospital", () => {
    const indice = indexarHospitais([
      { cidade: "Com hospital", uf: "SP", quantidade: 1, hospitais: ["Hospital"] },
      { cidade: "Sem hospital", uf: "SP", quantidade: 0, hospitais: [] },
    ]);
    expect(indice.size).toBe(1);
    expect([...indice.values()][0].cidade).toBe("Com hospital");
  });
  it("reconcilia as 34 cidades e os 39 hospitais do CSV fornecido", () => {
    expect(cidadesComHospitais).toHaveLength(34);
    expect(cidadesComHospitais.reduce((sum, row) => sum + row.quantidade, 0)).toBe(39);
    for (const row of cidadesComHospitais) expect(hospitaisDaCidade(row.cidade, row.uf)).toEqual(row);
    expect(indexarHospitais(cadastro).size).toBe(34);
    expect(cadastro.reduce((s, row) => s + row.quantidade, 0)).toBe(39);
    for (const row of cadastro) expect(row.hospitais.length).toBe(row.quantidade);
  });
  it("combina cidade e UF ignorando acentos e capitalização", () => {
    expect(hospitaisDaCidade("SAO JOSE DO RIO PRETO", "SP")?.quantidade).toBe(3);
    expect(hospitaisDaCidade("Estrela d’Oeste", "SP")?.quantidade).toBe(1);
    expect(hospitaisDaCidade("São José do Rio Preto", "MG")).toBeUndefined();
    expect(hospitaisDaCidade("Uberaba", "MG")).toBeUndefined();
  });
});