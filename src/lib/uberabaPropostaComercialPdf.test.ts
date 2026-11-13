import { describe, expect, it } from "vitest";
import { GLOSSARIO_PROPOSTA, marcadorGlossario, quadrosProposta } from "./uberabaPropostaComercialPdf";
import { indicadoresPadrao } from "./uberabaTabelasComerciais";

describe("Proposta Comercial › 1. Tabelas", () => {
  it("lists the three Resultados Comerciais fronts in screen order", () => {
    expect(quadrosProposta().map((q) => q.titulo)).toEqual(["Plano Coletivo por Adesão", "PME Administrada (02 a 99 vidas)", "Plano Empresarial 100+"]);
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

describe("Proposta Comercial › Glossário e Notas Explicativas", () => {
  it("ENFERMARIA is note 1 with the Apartamento rule", () => {
    expect(marcadorGlossario("ENFERMARIA")).toBe(1);
    expect(GLOSSARIO_PROPOSTA[0]).toEqual({ termo: "ENFERMARIA", nota: "Apartamento = TRUNCAR(Enfermaria × 1,25; 2)" });
  });
  it("terms without a note get no marker", () => {
    expect(marcadorGlossario("FAIXA")).toBeNull();
  });
});

import { rotulosPadrao } from "./uberabaTabelasComerciais";

describe("quadrosProposta · nomes redigitados", () => {
  it("uses the names typed on screen", () => {
    const r = rotulosPadrao();
    r.pceAdm = { titulo: "PME ADM", segmento: "MÉDIAS EMPRESAS" };
    const [, pce] = quadrosProposta(undefined, undefined, r);
    expect(pce.titulo).toBe("PME ADM");
    expect(pce).not.toHaveProperty("segmento"); // a tela não mostra mais o segmento
  });
});

import { glossarioProposta } from "./uberabaPropostaComercialPdf";
import { FATORES_PADRAO } from "./uberabaTabelasComerciais";

describe("Proposta · fator do Apartamento", () => {
  it("each quadro shows its table's factor (1,25 by default)", () => {
    expect(quadrosProposta().map((q) => q.fator)).toEqual(["1,25", "1,25", "1,25"]);
    const [, , pce100] = quadrosProposta(undefined, undefined, undefined, { ...FATORES_PADRAO, pce100: 1.3 });
    expect(pce100.fator).toBe("1,30");
  });
  it("Glossário keeps the single-factor rule when all tables agree", () => {
    expect(glossarioProposta()[0].nota).toBe("Apartamento = TRUNCAR(Enfermaria × 1,25; 2)");
  });
  it("Glossário lists each table's factor when they differ", () => {
    expect(glossarioProposta({ ...FATORES_PADRAO, pcaAdm: 1.3 })[0].nota)
      .toBe("Apartamento = TRUNCAR(Enfermaria × fator da tabela; 2), sendo:\nPlano Coletivo por Adesão: 1,30\nPME Administrada (02 a 99 vidas): 1,25\nPlano Empresarial 100+: 1,25");
  });
});

import { TOPICOS_PROPOSTA, linhasReferencia } from "./uberabaPropostaComercialPdf";

describe("Proposta · tópicos", () => {
  it("Glossário continua como último tópico", () => {
    expect(TOPICOS_PROPOSTA).toEqual(["1. Introdução", "2. Tabela Referência", "3. Tabelas", "4. Proposta de Remuneração", "5. Descrição da Proposta", "6. Glossário e Notas Explicativas"]);
  });
  it("Tabela Referência traz Enfermaria e Apartamento a 100%", () => {
    expect(linhasReferencia()[0]).toEqual(["00 a 18", "175,00", "218,75"]);
    expect(linhasReferencia()).toHaveLength(10);
  });
});

import { textoPdf } from "./uberabaPropostaComercialPdf";

describe("Proposta · texto no PDF", () => {
  it("troca o sinal de menos das fórmulas por hífen, que a fonte do PDF tem", () => {
    expect(textoPdf("Operadora = 100% − Spread")).toBe("Operadora = 100% - Spread");
    expect(textoPdf("Apartamento = TRUNCAR(Enfermaria × 1,25; 2)")).toBe("Apartamento = TRUNCAR(Enfermaria × 1,25; 2)");
  });
});
