import { describe, expect, it } from "vitest";
import { hospitaisDaCidade, indexarHospitais } from "./mapaHospitais";
import cadastro from "@/data/hospitais/guia-medico-2026-10-28.json";

describe("Hospitais do mapa recortado", () => {
  it("marca somente cidades com pelo menos um hospital", () => {
    const indice = indexarHospitais([
      { cidade: "Com hospital", uf: "SP", quantidade: 1, hospitais: ["Hospital"] },
      { cidade: "Sem hospital", uf: "SP", quantidade: 0, hospitais: [] },
    ]);
    expect(indice.size).toBe(1);
    expect([...indice.values()][0].cidade).toBe("Com hospital");
  });
  it("reconcilia as 34 cidades e os 39 hospitais do CSV fornecido", () => {
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