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
    expect(p.net.map((q) => q.titulo)).toEqual(["EMPRESAS MÉDIAS", "EMPRESARIAL"]);
  });
  it("Empresarial Net = 131,25 × 95%", () => {
    expect(p.venda[1].linhas[0][1]).toBe("131,25");
    expect(p.net[1].linhas[0][1]).toBe("124,69");
  });
  it("lists Siga then the Bensaúde own team", () => {
    expect(p.distribuidores).toEqual(["Siga Soluções", "Equipe própria Bensaúde"]);
  });
  it("shows sale prices for Médias Empresas but no price values for Empresarial", () => {
    expect(p.produtosEmpresariais[0].tabela.linhas[0]).toEqual(["00 a 18", "148,75", "185,93"]);
    expect(p.produtosEmpresariais[1].tabela.linhas.every((l) => l[1] === "" && l[2] === "")).toBe(true);
  });
  it("takes all three commissions separately from each product's current parameters", () => {
    const ind = indicadoresPadrao();
    ind.pceAdm = { spread: 7, contratual: 80, promocional: 120, adesao: 0 };
    ind.pce100 = { spread: 6, contratual: 85, promocional: 110, adesao: 0 };
    const produtos = propostaGrupo("empresariais", undefined, ind).produtosEmpresariais;
    expect(produtos.map(({ vitalicio, contratual, promocional }) => [vitalicio, contratual, promocional])).toEqual([[7, 80, 120], [6, 85, 110]]);
  });
});

describe("Batimento de metas › soma das vidas dos produtos, metade por semestre", () => {
  it("default simulation (19/11/2026): ADMINISTRADOS 3.000 + 1.000 = 4.000, 2.000 por semestre", () => {
    expect(propostaGrupo("administrados").metas).toEqual(["4.000 em 2027", "1º Semestre: 2.000", "2º Semestre: 2.000"]);
  });
  it("default simulation: EMPRESARIAIS 1.000 + 5.000 = 6.000, 3.000 por semestre", () => {
    expect(propostaGrupo("empresariais").metas).toEqual(["6.000 em 2027", "1º Semestre: 3.000", "2º Semestre: 3.000"]);
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
    expect(p.topicos).toEqual(["1. Introdução", "2. Médias Empresas", "3. Empresarial", "4. Distribuidores", "5. Promoção e Metas"]);
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
