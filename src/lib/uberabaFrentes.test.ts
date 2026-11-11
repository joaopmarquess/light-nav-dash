import { describe, expect, it } from "vitest";
import { comercialUberaba, REDE_UBERABA } from "./uberabaFrentes";
import { RESUMO_CREDENCIAMENTO } from "./uberabaCredenciamento";

describe("Modelo de Atuação fronts", () => {
  it("shows the default 90/80/70% indices on PCA Adm., PCE Adm. and PCE 100+", () => {
    const etapas = comercialUberaba().etapas;
    expect(etapas.map((e) => e.etapa_titulo).slice(0, 3)).toEqual(["PCA ADM.", "PCE ADM.", "PCE 100+"]);
    expect(etapas[0].etapa_descricao).toContain("90%");
    expect(etapas[1].etapa_descricao).toContain("80%");
    expect(etapas[2].etapa_descricao).toContain("70%");
  });

  it("follows the indices saved in Estudo › Comercial", () => {
    expect(comercialUberaba({ pcaAdm: 85, pceAdm: 80, pce100: 75 }).etapas[2].etapa_descricao).toContain("75%");
  });

  it("uses the credentialing totals for the network indicators", () => {
    expect(REDE_UBERABA.indicadores?.[1]).toBe(`${RESUMO_CREDENCIAMENTO.quantidade} REFERÊNCIAS`);
    expect(REDE_UBERABA.etapas[0].etapa_descricao).toContain("229 referências");
  });
});
