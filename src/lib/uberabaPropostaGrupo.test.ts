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

describe("Metas das propostas › Total de vidas da Simulação", () => {
  it("default simulation (19/11/2026): Adesão 3.000 + PME 1.000; EMPRESAS MÉDIAS 1.000 + EMPRESARIAL 5.000", () => {
    expect(propostaGrupo("administrados").metas).toEqual(["Venda de 3.000 + 1.000 vidas em 2027"]);
    expect(propostaGrupo("empresariais").metas).toEqual(["Venda de 1.000 + 5.000 vidas em 2027"]);
  });
  it("follows the lives edited in the simulation parameters", () => {
    const vidas = { PCA: 2000, PME_ADMINISTRADO: 2000, PCE_50_99: 3000, PCE_100_MAIS: 3000 };
    expect(propostaGrupo("administrados", undefined, undefined, undefined, undefined, vidas).metas).toEqual(["Venda de 2.000 + 2.000 vidas em 2027"]);
    expect(propostaGrupo("empresariais", undefined, undefined, undefined, undefined, vidas).metas).toEqual(["Venda de 3.000 + 3.000 vidas em 2027"]);
  });
});
