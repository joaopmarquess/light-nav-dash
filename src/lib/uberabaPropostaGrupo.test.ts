import { describe, expect, it } from "vitest";
import { BOTOES_PROPOSTA_COMERCIAL, propostaGrupo } from "./uberabaPropostaGrupo";
import { indicadoresPadrao } from "./uberabaTabelasComerciais";

describe("Proposta Comercial › botões", () => {
  it("shows short labels with full names in the tooltip", () => {
    expect(BOTOES_PROPOSTA_COMERCIAL.map((b) => [b.rotulo, b.nome])).toEqual([
      ["Administrados", "Produtos da Administradora"],
      ["Empresariais", "Planos Coletivos Empresariais"],
      ["Original", "Proposta Original"],
    ]);
  });
});

describe("Proposta Administrados", () => {
  const p = propostaGrupo("administrados");
  it("puts Adesão beside PME ADMINISTRADAS", () => {
    expect(p.net.map((q) => q.titulo)).toEqual(["ADESÃO", "PME ADMINISTRADAS"]);
  });
  it("keeps Net = Venda × Operadora (77%)", () => {
    expect(p.net[0].linhas[0][1]).toBe("128,01");
  });
  it("omits sale tables only from the Administrados proposal", () => {
    expect(p.venda).toHaveLength(0);
    expect(propostaGrupo("empresariais").venda).toHaveLength(2);
  });
  it("lists Lancers network and the Bensaúde own team (no SDR)", () => {
    expect(p.distribuidores).toEqual(["Rede de Distribuição da Lancers", "Equipe própria do Bensaúde"]);
    expect(p.promocao).toContain("6 meses renováveis por mais 6 meses");
  });
  it("follows the participation edited on screen", () => {
    const ind = indicadoresPadrao();
    ind.pcaAdm.spread = 50;
    expect(propostaGrupo("administrados", undefined, ind).net[0].linhas[0][1]).toBe("83,13");
  });
});

describe("Proposta Empresariais", () => {
  const p = propostaGrupo("empresariais");
  it("puts EMPRESAS MÉDIAS beside EMPRESARIAL", () => {
    expect(p.net.map((q) => q.titulo)).toEqual(["EMPRESAS MÉDIAS", "EMPRESAS GRANDES"]);
  });
  it("Empresarial Net = 131,25 × 95%", () => {
    expect(p.venda[1].linhas[0][1]).toBe("148,75");
    expect(p.net[1].linhas[0][1]).toBe("141,31");
  });
  it("reserves Siga exclusivity for the first semester of 2027", () => {
    const periodo = p.distribuidores[0].match(/Exclusiva no (primeiro|segundo) semestre de (\d{4})/);
    expect(periodo?.slice(1)).toEqual(["primeiro", "2027"]);
  });
  it("starts the own team's joint operation in the second semester of 2027", () => {
    const periodo = p.distribuidores[1].match(/a partir do (primeiro|segundo) semestre de (\d{4})/);
    expect(periodo?.slice(1)).toEqual(["segundo", "2027"]);
  });
  it("shows sale prices for Médias Empresas but no price values for Empresarial", () => {
    expect(p.produtosEmpresariais[0].tabela.linhas[0]).toEqual(["00 a 18", "155,75", "194,68"]);
    expect(p.produtosEmpresariais[1].tabela.linhas.every((l) => l[1] === "" && l[2] === "")).toBe(true);
  });
  it("preserves all PCE 50+ prices supplied in base v2", () => {
    expect(p.produtosEmpresariais[0].tabela.linhas.map(([, enf, apt]) => [enf, apt])).toEqual([
      ["155,75", "194,68"], ["181,76", "227,20"], ["212,10", "265,12"], ["233,73", "292,16"],
      ["272,75", "340,93"], ["311,74", "389,67"], ["381,87", "477,33"], ["476,19", "595,23"],
      ["631,89", "789,86"], ["934,23", "1.167,78"],
    ]);
  });
  it("uses the v2 contractual agenciamento: 05% vitalício and 100% contratual, independently of the simulator", () => {
    const ind = indicadoresPadrao();
    ind.pceAdm = { spread: 7, contratual: 80, promocional: 120, adesao: 0 };
    ind.pce100 = { spread: 6, contratual: 85, promocional: 110, adesao: 0 };
    expect(propostaGrupo("empresariais", undefined, ind).agenciamento).toEqual({ vitalicio: 5, contratual: 100 });
  });
});

describe("Batimento de metas › soma das vidas dos produtos, metade por semestre", () => {
  it("default simulation (19/11/2026): ADMINISTRADOS 3.000 + 1.000 = 4.000, 2.000 por semestre", () => {
    expect(propostaGrupo("administrados").metas).toEqual(["4.000 em 2027", "1º Semestre: 2.000", "2º Semestre: 2.000"]);
  });
  it("v2: Empresariais has a single annual goal of 6.000 lives in 2027, independent of simulation assumptions", () => {
    expect(propostaGrupo("empresariais", undefined, undefined, undefined, undefined, { PCA: 0, PME_ADMINISTRADO: 0, PCE_50_99: 2, PCE_100_MAIS: 3 }).metas).toEqual(["6.000 vidas em 2027"]);
  });
  it("follows the lives edited in the simulation; odd total leaves the extra life in the 2nd semester", () => {
    const vidas = { PCA: 3000, PME_ADMINISTRADO: 2501, PCE_50_99: 1000, PCE_100_MAIS: 5000 };
    expect(propostaGrupo("administrados", undefined, undefined, undefined, undefined, vidas).metas).toEqual(["5.501 em 2027", "1º Semestre: 2.750", "2º Semestre: 2.751"]);
  });
});

describe("Introdução da proposta Administrados (19/11/2026)", () => {
  it("opens with the two user paragraphs addressed to LANCERS ADMINISTRADORA, shifting the numbering", () => {
    const p = propostaGrupo("administrados");
    expect(p.topicos).toEqual(["1. Introdução", "2. Tabela Net", "3. Sugestão de Venda", "4. Distribuidores", "5. Promoção e Metas"]);
    expect(p.introducao[0]).toBe("A presente proposta é destinada à LANCERS ADMINISTRADORA, conforme os entendimentos iniciais entre as partes.");
  });
  it("Empresariais opens with the SIGA introduction", () => {
    const p = propostaGrupo("empresariais");
    expect(p.introducao[0]).toBe("A presente proposta considera a SIGA como responsável pela operação comercial do segmento EMPRESARIAL em Uberaba, observadas as condições e responsabilidades que vierem a ser acordadas entre as partes e formalizadas em instrumento contratual específico.");
  });
});

describe("Equipe própria do Bensaúde nos Distribuidores (19/11/2026)", () => {
  it("Administrados has no definitions", () => {
    expect(propostaGrupo("administrados").definicoes).toEqual({});
  });
  it("Empresariais has no definitions", () => {
    expect(propostaGrupo("empresariais").definicoes).toEqual({});
  });
});
