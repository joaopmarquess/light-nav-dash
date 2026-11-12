import { describe, expect, it } from "vitest";
import { quadrosProposta } from "./uberabaPropostaComercialPdf";
import { indicadoresPadrao } from "./uberabaTabelasComerciais";

describe("Proposta Comercial › 1. Tabelas", () => {
  it("lists the three Resultados Comerciais fronts in screen order", () => {
    expect(quadrosProposta().map((q) => q.titulo)).toEqual(["PCA Adm.", "PCE Adm.", "PCE 100+"]);
  });
  it("uses Faixa × Enfermaria at each table's index (90/80/70% by default)", () => {
    const [pca, pce, pce100] = quadrosProposta();
    expect(pca.linhas[0]).toEqual(["00 a 18", "157,50"]);
    expect(pce.linhas[0]).toEqual(["00 a 18", "140,00"]);
    expect(pce100.linhas[0]).toEqual(["00 a 18", "122,50"]);
    expect(pca.linhas).toHaveLength(10);
  });
  it("follows the indices edited in Resultados Comerciais", () => {
    const [pca] = quadrosProposta({ pcaAdm: 100, pceAdm: 80, pce100: 70 });
    expect(pca.linhas[9]).toEqual(["59 ou +", "1.049,70"]);
  });
  it("brings the Indicadores variáveis as on screen", () => {
    const [pca, , pce100] = quadrosProposta();
    expect(pca.blocos.map((b) => b.titulo)).toEqual(["PARTICIPAÇÃO", "AGENCIAMENTO", "TAXA DE ADESÃO"]);
    expect(pca.blocos[0].linhas).toEqual([["SPREAD", "23%"], ["OPERADORA", "77%"], ["ADMINISTRADORA", "19%"], ["AGENCIADORA", "4%"]]);
    expect(pce100.blocos.map((b) => b.titulo)).toEqual(["PARTICIPAÇÃO", "AGENCIAMENTO"]);
    expect(pce100.blocos[0].linhas).toEqual([["VITALÍCIO", "5%"], ["OPERADORA", "95%"], ["AGENCIADORA", "5%"]]);
  });
  it("follows the indicators edited in Resultados Comerciais", () => {
    const ind = indicadoresPadrao();
    ind.pceAdm.adesao = 50;
    const [, pce] = quadrosProposta(undefined, ind);
    expect(pce.blocos[2].linhas).toEqual([["PERCENTUAL", "50%"]]);
  });
});
