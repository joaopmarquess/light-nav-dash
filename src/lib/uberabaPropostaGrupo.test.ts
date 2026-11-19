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
    expect(p.venda.map((q) => q.titulo)).toEqual(["ADESÃO", "PME ADMINISTRADAS"]);
  });
  it("Net = Venda × Operadora (77%), Venda = Referência × fator", () => {
    expect(p.venda[0].linhas[0]).toEqual(["00 a 18", "166,25", "207,81"]);
    expect(p.net[0].linhas[0][1]).toBe("128,01");
  });
  it("lists Lancers network and SDR Bensaúde", () => {
    expect(p.distribuidores).toEqual(["Rede de Distribuição da Lancers", "SDR Bensaúde"]);
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
  it("lists Siga with 6-month exclusivity then Hunter Bensaúde", () => {
    expect(p.distribuidores).toEqual(["Siga Soluções (Exclusividade por 6 meses)", "Hunter Bensaúde após 6 meses"]);
  });
});

describe("Batimento de metas › soma das vidas dos produtos, metade por semestre", () => {
  it("default simulation (19/11/2026): ADMINISTRADOS 3.000 + 1.000 = 4.000, 2.000 por semestre", () => {
    expect(propostaGrupo("administrados").metas).toEqual(["ADMINISTRADOS: 4.000 em 2027", "1º Semestre: 2.000", "2º Semestre: 2.000"]);
  });
  it("default simulation: EMPRESARIAIS 1.000 + 5.000 = 6.000, 3.000 por semestre", () => {
    expect(propostaGrupo("empresariais").metas).toEqual(["EMPRESARIAIS: 6.000 em 2027", "1º Semestre: 3.000", "2º Semestre: 3.000"]);
  });
  it("follows the lives edited in the simulation; odd total leaves the extra life in the 2nd semester", () => {
    const vidas = { PCA: 3000, PME_ADMINISTRADO: 2501, PCE_50_99: 1000, PCE_100_MAIS: 5000 };
    expect(propostaGrupo("administrados", undefined, undefined, undefined, undefined, vidas).metas).toEqual(["ADMINISTRADOS: 5.501 em 2027", "1º Semestre: 2.750", "2º Semestre: 2.751"]);
  });
});

describe("Introdução da proposta Administrados (19/11/2026)", () => {
  it("opens with the two user paragraphs addressed to LANCERS ADMINISTRADORA, shifting the numbering", () => {
    const p = propostaGrupo("administrados");
    expect(p.topicos).toEqual(["1. Introdução", "2. Tabela Net", "3. Sugestão de Venda", "4. Distribuidores", "5. Promoção e Metas"]);
    expect(p.introducao[0]).toBe("A presente proposta é destinada à LANCERS ADMINISTRADORA, conforme os entendimentos iniciais entre as partes.");
    expect(p.introducao[1]).toContain("como a SIGA, que também atua na comercialização dos produtos empresariais da Operadora.");
  });
  it("Empresariais keeps its four topics without Introdução", () => {
    const p = propostaGrupo("empresariais");
    expect(p.introducao).toEqual([]);
    expect(p.topicos).toEqual(["1. Tabela Net", "2. Sugestão de Venda", "3. Distribuidores", "4. Promoção e Metas"]);
  });
});

describe("Definição dos SDR Bensaúde (19/11/2026)", () => {
  it("Administrados explains SDR Bensaúde as the Bensaúde pre-sales team", () => {
    expect(propostaGrupo("administrados").definicoes["SDR Bensaúde"]).toContain("equipe de pré-vendas do Bensaúde");
    expect(propostaGrupo("administrados").definicoes["SDR Bensaúde"]).toContain("conclusão da venda com a equipe própria do Bensaúde");
  });
  it("Empresariais has no definitions", () => {
    expect(propostaGrupo("empresariais").definicoes).toEqual({});
  });
});
