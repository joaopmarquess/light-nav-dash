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
  it("lists Lancers network and SDR Bensaúde, goal 2.000 + 2.000 lives in 2027", () => {
    expect(p.distribuidores).toEqual(["Rede de Distribuição da Lancers", "SDR Bensaúde"]);
    expect(p.metas).toEqual(["Venda de 2.000 + 2.000 vidas em 2027"]);
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
  it("puts PJ ADMINISTRADAS beside EMPRESARIAL", () => {
    expect(p.net.map((q) => q.titulo)).toEqual(["PJ ADMINISTRADAS", "EMPRESARIAL"]);
  });
  it("Empresarial Net = 131,25 × 95%", () => {
    expect(p.venda[1].linhas[0][1]).toBe("131,25");
    expect(p.net[1].linhas[0][1]).toBe("124,69");
  });
  it("lists Siga with 6-month exclusivity then Hunter Bensaúde, goal 3.000 + 3.000 lives in 2027", () => {
    expect(p.distribuidores).toEqual(["Siga Soluções (Exclusividade por 6 meses)", "Hunter Bensaúde após 6 meses"]);
    expect(p.metas).toEqual(["Venda de 3.000 + 3.000 vidas em 2027"]);
  });
});
