import { describe, expect, it } from "vitest";
import { GLOSSARIO_PROPOSTA, quadrosProposta } from "./uberabaPropostaComercialPdf";
import { indicadoresPadrao } from "./uberabaTabelasComerciais";

describe("Proposta Comercial › 1. Tabelas", () => {
  it("lists the four Resultados Comerciais tables in screen order", () => {
    expect(quadrosProposta().map((q) => q.titulo)).toEqual(["ADESÃO", "PME ADMINISTRADAS", "PJ ADMINISTRADAS", "EMPRESARIAL"]);
    expect(quadrosProposta().map((q) => q.subtitulo)).toEqual(["PCA", "PME ADM. · 03 A 29 VIDAS", "PCE ADM. · 30 A 99 VIDAS", "PJ+ · 100 OU MAIS VIDAS"]);
  });
  it("splits the Proposal into Administradora products and the Empresarial", () => {
    expect(quadrosProposta().map((q) => q.grupo)).toEqual(["administradora", "administradora", "administradora", "empresarial"]);
  });
  it("uses Faixa × Enfermaria at each table's index (90/85/80/70% by default)", () => {
    const [pca, pme, pce, pce100] = quadrosProposta();
    expect(pca.linhas[0]).toEqual(["00 a 18", "157,50"]);
    expect(pme.linhas[0]).toEqual(["00 a 18", "148,75"]);
    expect(pce.linhas[0]).toEqual(["00 a 18", "140,00"]);
    expect(pce100.linhas[0]).toEqual(["00 a 18", "122,50"]);
    expect(pca.linhas).toHaveLength(10);
  });
  it("follows the indices edited in Resultados Comerciais", () => {
    const [pca] = quadrosProposta({ pcaAdm: 100, pmeAdm: 85, pceAdm: 80, pce100: 70 });
    expect(pca.linhas[9]).toEqual(["59 ou +", "1.049,70"]);
  });
  it("brings the Indicadores variáveis as on screen", () => {
    const [pca, , , pce100] = quadrosProposta();
    expect(pca.blocos.map((b) => b.titulo)).toEqual(["PARTICIPAÇÃO", "AGENCIAMENTO", "TAXA DE ADESÃO"]);
    expect(pca.blocos[0].linhas).toEqual([["SPREAD", "23%"], ["OPERADORA", "77%"], ["ADMINISTRADORA", "19%"], ["AGENCIADORA", "4%"]]);
    expect(pce100.blocos.map((b) => b.titulo)).toEqual(["PARTICIPAÇÃO", "AGENCIAMENTO"]);
    expect(pce100.blocos[0].linhas).toEqual([["VITALÍCIO", "5%"], ["OPERADORA", "95%"], ["AGENCIADORA", "5%"]]);
  });
  it("follows the indicators edited in Resultados Comerciais", () => {
    const ind = indicadoresPadrao();
    ind.pceAdm.adesao = 50;
    const [, , pce] = quadrosProposta(undefined, ind);
    expect(pce.blocos[2].linhas).toEqual([["PERCENTUAL", "50%"]]);
  });
});

describe("Proposta Comercial › Glossário e Notas Explicativas", () => {
  it("ENFERMARIA keeps the Apartamento rule", () => {
    expect(GLOSSARIO_PROPOSTA[0]).toEqual({ termo: "ENFERMARIA", nota: "Apartamento = TRUNCAR(Enfermaria × 1,25; 2)" });
  });
});

import { rotulosPadrao } from "./uberabaTabelasComerciais";

describe("quadrosProposta · nomes redigitados", () => {
  it("uses the names typed on screen", () => {
    const r = rotulosPadrao();
    r.pceAdm = { titulo: "PME ADM", segmento: "MÉDIAS EMPRESAS" };
    const [, , pce] = quadrosProposta(undefined, undefined, r);
    expect(pce.titulo).toBe("PME ADM");
    expect(pce).not.toHaveProperty("segmento"); // a tela não mostra mais o segmento
  });
});

import { glossarioProposta } from "./uberabaPropostaComercialPdf";
import { FATORES_PADRAO } from "./uberabaTabelasComerciais";

describe("Proposta · fator do Apartamento", () => {
  it("each quadro shows its table's factor (1,25 by default)", () => {
    expect(quadrosProposta().map((q) => q.fator)).toEqual(["1,25", "1,25", "1,25", "1,25"]);
    const [, , , pce100] = quadrosProposta(undefined, undefined, undefined, { ...FATORES_PADRAO, pce100: 1.3 });
    expect(pce100.fator).toBe("1,30");
  });
  it("Glossário keeps the single-factor rule when all tables agree", () => {
    expect(glossarioProposta()[0].nota).toBe("Apartamento = TRUNCAR(Enfermaria × 1,25; 2)");
  });
  it("Glossário lists each table's factor when they differ", () => {
    expect(glossarioProposta({ ...FATORES_PADRAO, pcaAdm: 1.3 })[0].nota)
      .toBe("Apartamento = TRUNCAR(Enfermaria × fator da tabela; 2), sendo:\nADESÃO: 1,30\nPME ADMINISTRADAS: 1,25\nPJ ADMINISTRADAS: 1,25\nEMPRESARIAL: 1,25");
  });
  it("Glossário explains each sigla with the supplied parameters and the current index", () => {
    const g = glossarioProposta();
    expect(g.map((t) => t.termo)).toEqual(["ENFERMARIA", "PCA", "PME ADM.", "PCE ADM.", "PJ+"]);
    expect(g[2].nota).toBe("Plano Coletivo Empresarial, de 03 a 29 vidas. Boletagem: Administradora. Distribuidores: Plataformas Associadas. Tabela PME ADMINISTRADAS, a 85% da Tabela Referencial.");
    expect(g[1].nota).toBe("Plano Coletivo por Adesão. Boletagem: Administradora. Distribuidores: Plataformas Associadas. Tabela ADESÃO, a 90% da Tabela Referencial.");
    expect(g[4].nota).toBe("Plano Coletivo Empresarial, de 100 ou mais vidas. Boletagem: Operadora. Distribuidores: Corretoras. Tabela EMPRESARIAL, a 70% da Tabela Referencial.");
  });
});

import { TOPICOS_PROPOSTA, linhasReferencia } from "./uberabaPropostaComercialPdf";

describe("Proposta · tópicos", () => {
  it("Glossário continua como último tópico", () => {
    expect(TOPICOS_PROPOSTA).toEqual(["1. Introdução", "2. Tabela Referencial", "3. Produtos com Administradora", "4. Plano Empresarial", "5. Conclusão", "6. Glossário e Notas Explicativas"]);
  });
  it("Tabela Referencial traz Enfermaria e Apartamento a 100%", () => {
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

describe("tamanhos de fonte da Proposta", () => {
  it("texto geral em 13 pt", async () => {
    const { FONTES_PROPOSTA } = await import("./uberabaPropostaComercialPdf");
    expect(FONTES_PROPOSTA.texto).toBe(13);
  });
  it("demais elementos até 2 pt acima ou abaixo do texto geral", async () => {
    const { FONTES_PROPOSTA } = await import("./uberabaPropostaComercialPdf");
    for (const v of Object.values(FONTES_PROPOSTA)) expect(Math.abs(v - 13)).toBeLessThanOrEqual(2);
  });
});
