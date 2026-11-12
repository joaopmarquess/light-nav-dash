import { describe, expect, it } from "vitest";
import { tabelasProposta } from "./uberabaPropostaComercialPdf";

describe("Proposta Comercial › Tabelas e Produtos", () => {
  it("lists PCA, PME ADM and PJ 100+ from the Resultados Comerciais tables", () => {
    expect(tabelasProposta().map((t) => t.titulo)).toEqual(["1 - PCA", "2 - PME ADM", "3 - PJ 100+"]);
  });
  it("uses Faixa etária × Enfermaria at each table's index (90/80/70% by default)", () => {
    const [pca, pme, pj] = tabelasProposta();
    expect(pca.linhas[0]).toEqual(["00 a 18", "157,50"]);
    expect(pme.linhas[0]).toEqual(["00 a 18", "140,00"]);
    expect(pj.linhas[0]).toEqual(["00 a 18", "122,50"]);
    expect(pca.linhas).toHaveLength(10);
  });
  it("follows the indices edited in Resultados Comerciais", () => {
    const [pca] = tabelasProposta({ pcaAdm: 100, pceAdm: 80, pce100: 70 });
    expect(pca.linhas[9]).toEqual(["59 ou +", "1.049,70"]);
  });
});
