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
  it("shows the full (sale) price: Referência × (index + Administradora/Agenciadora share)", () => {
    const [pca, pme, pce, pce100] = quadrosProposta();
    expect(pce100.linhas[0]).toEqual(["00 a 18", "131,25"]);
    expect(pca.linhas[0]).toEqual(["00 a 18", "197,75"]);
    expect(pme.linhas[0]).toEqual(["00 a 18", "189,00"]);
    expect(pce.linhas[0]).toEqual(["00 a 18", "180,25"]);
    expect(pca.linhas).toHaveLength(10);
  });
  it("follows the indices edited in Resultados Comerciais", () => {
    const [pca] = quadrosProposta({ pcaAdm: 100, pmeAdm: 85, pceAdm: 80, pce100: 70 });
    expect(pca.linhas[9]).toEqual(["59 ou +", "1.291,13"]);
  });
  it("follows the participation edited in Resultados Comerciais", () => {
    const ind = indicadoresPadrao();
    ind.pce100.spread = 10;
    expect(quadrosProposta(undefined, ind)[3].linhas[0]).toEqual(["00 a 18", "140,00"]);
  });
  it("brings the Indicadores variáveis as on screen", () => {
    const [pca, , , pce100] = quadrosProposta();
    expect(pca.blocos.map((b) => b.titulo)).toEqual(["PARTICIPAÇÃO", "AGENCIAMENTO", "TAXA DE ADESÃO"]);
    expect(pca.blocos[0].linhas).toEqual([["ADMINISTRADORA", "23%"], ["OPERADORA", "77%"]]);
    expect(pca.blocos[2].linhas).toEqual([["PERCENTUAL", "99%"]]);
    expect(pce100.blocos.map((b) => b.titulo)).toEqual(["PARTICIPAÇÃO", "AGENCIAMENTO"]);
    expect(pce100.blocos[0].linhas).toEqual([["AGENCIADORA", "5%"], ["OPERADORA", "95%"]]);
  });
  it("follows the indicators edited in Resultados Comerciais", () => {
    const ind = indicadoresPadrao();
    ind.pceAdm.adesao = 50;
    const [, , pce] = quadrosProposta(undefined, ind);
    expect(pce.blocos[2].linhas).toEqual([["PERCENTUAL", "50%"]]);
  });
});

describe("Proposta Comercial › Glossário e Notas Explicativas", () => {
  it("lista só os termos pedidos pelo Dênis, na ordem em que aparecem na Proposta", () => {
    expect(GLOSSARIO_PROPOSTA.map((g) => g.termo)).toEqual([
      "DISTRIBUIDORES", "ENTES", "ADMINISTRADAS",
      "PARTICIPAÇÃO", "AGENCIAMENTO", "CONTRATUAL", "PROMOCIONAL", "TAXA DE ADESÃO",
    ]);
  });
  it("descreve cada ente e os termos da Participação", () => {
    const sub = (t: string) => GLOSSARIO_PROPOSTA.find((g) => g.termo === t)?.itens?.map((i) => i.termo);
    expect(sub("DISTRIBUIDORES")).toEqual(["PLATAFORMAS ASSOCIADAS", "CORRETORAS"]);
    expect(sub("ENTES")).toEqual(["ADMINISTRADORA", "AGENCIADORA", "OPERADORA", "BENEFICIÁRIO"]);
    expect(sub("PARTICIPAÇÃO")).toEqual(["TABELA CHEIA", "TABELA NET", "SPREAD"]);
  });
  it("não traz mais a nota de Enfermaria nem as siglas", () => {
    const termos = GLOSSARIO_PROPOSTA.map((g) => g.termo);
    for (const t of ["ENFERMARIA", "PCA", "PME ADM.", "PCE ADM.", "PJ+"]) expect(termos).not.toContain(t);
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

import { FATORES_PADRAO } from "./uberabaTabelasComerciais";

describe("Proposta · fator do Apartamento", () => {
  it("each quadro shows its table's factor (1,25 by default)", () => {
    expect(quadrosProposta().map((q) => q.fator)).toEqual(["1,25", "1,25", "1,25", "1,25"]);
    const [, , , pce100] = quadrosProposta(undefined, undefined, undefined, { ...FATORES_PADRAO, pce100: 1.3 });
    expect(pce100.fator).toBe("1,30");
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

import { COLUNAS_PARAMETROS, linhasParametros } from "./uberabaPropostaComercialPdf";

describe("Proposta · quadro de parâmetros da Introdução", () => {
  it("traz as colunas da tabela fornecida pelo Dênis", () => {
    expect([...COLUNAS_PARAMETROS]).toEqual(["SIGLA", "CONTRATAÇÃO", "VIDAS", "BOLETAGEM", "DISTRIBUIDORES", "DESCRIÇÃO DA TABELA", "FATOR REF."]);
  });
  it("lista os quatro produtos com os parâmetros fornecidos", () => {
    expect(linhasParametros()).toEqual([
      ["PCA", "PLANO COLETIVO POR ADESÃO", "-", "ADMINISTRADORA", "PLATAFORMAS ASSOCIADAS", "ADESÃO", "0,90"],
      ["PME ADM.", "PLANO COLETIVO EMPRESARIAL", "03 A 29", "ADMINISTRADORA", "PLATAFORMAS ASSOCIADAS", "PME ADMINISTRADAS", "0,85"],
      ["PCE ADM.", "PLANO COLETIVO EMPRESARIAL", "30 A 99", "ADMINISTRADORA", "PLATAFORMAS ASSOCIADAS", "PJ ADMINISTRADAS", "0,80"],
      ["PJ+", "PLANO COLETIVO EMPRESARIAL", "100 OU MAIS", "OPERADORA", "AGENCIADORAS E CORRETORAS AUTORIZADAS", "EMPRESARIAL", "0,70"],
    ]);
  });
  it("acompanha o índice editado em Resultados Comerciais", () => {
    expect(linhasParametros({ pcaAdm: 88, pmeAdm: 85, pceAdm: 80, pce100: 70 })[0][6]).toBe("0,88");
  });
});

import { topicosGlossario } from "./uberabaPropostaComercialPdf";

describe("Glossário · tópicos e subtópicos numerados", () => {
  it("numera termos e subtermos a partir do número do tópico do Glossário", () => {
    const t = topicosGlossario();
    expect(t.slice(0, 3).map((x) => `${x.numero} ${x.termo}`)).toEqual(["6.1 DISTRIBUIDORES", "6.1.1 PLATAFORMAS ASSOCIADAS", "6.1.2 CORRETORAS"]);
    expect(GLOSSARIO_PROPOSTA.find((g) => g.termo === "PROMOCIONAL")?.nota).toMatch(/período determinado.*campanhas.*metas/);
    expect(t.find((x) => x.termo === "ADMINISTRADORA")?.numero).toBe("6.2.1");
    expect(GLOSSARIO_PROPOSTA[0].nota).toContain("Plano Empresarial (PJ+) pode ser distribuído por Agenciadoras e Corretoras Autorizadas");
    expect(t.find((x) => x.termo === "SPREAD")?.numero).toBe("6.4.3");
    expect(t.at(-1)).toMatchObject({ numero: "6.8", termo: "TAXA DE ADESÃO" });
  });
});

import { buildPropostaComercialPdf } from "./uberabaPropostaComercialPdf";

describe("Proposta · página 1", () => {
  it("Introdução e Tabela Referencial (com a última faixa) cabem na primeira página", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paginas = (buildPropostaComercialPdf(null) as any).internal.pages as string[][];
    const p1 = paginas[1].join("\n");
    expect(p1).toContain("1. INTRODU");
    expect(p1).toContain("2. TABELA REFERENCIAL");
    expect(p1).toContain("59 ou +");
    expect(paginas[2].join("\n")).toContain("3. PRODUTOS COM ADMINISTRADORA");
  });
});
