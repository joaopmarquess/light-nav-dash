import { describe, expect, it } from "vitest";
import { COMERCIAL_UBERABA, REDE_UBERABA } from "./uberabaFrentes";
import { RESUMO_CREDENCIAMENTO } from "./uberabaCredenciamento";

describe("Modelo de Atuação fronts", () => {
  it("organizes Comercial into Forças de Vendas and Produtos with the supplied items", () => {
    expect(COMERCIAL_UBERABA.subtitulo).toBe("Modelo comercial e estrutura de vendas em Uberaba");
    const [forcas, produtos] = COMERCIAL_UBERABA.grupos;
    expect(forcas.titulo).toBe("Forças de Vendas");
    expect(forcas.itens.map((i) => i.titulo)).toEqual(["Farmer em Uberaba", "Equipe própria SDR em Rio Preto", "Agentes Comerciais Autorizados em Uberaba"]);
    expect(forcas.itens[2].subitens).toEqual(["Siga Soluções", "Corretores Lancers"]);
    expect(produtos.titulo).toBe("Produtos");
    expect(produtos.itens.map((i) => i.titulo)).toEqual(["PCA e PME Administrado", "PCE 100+"]);
  });

  it("uses the five supplied Comercial indicators and the MODELO COMERCIAL band", () => {
    expect(COMERCIAL_UBERABA.indicadores).toEqual(["FARMER EM UBERABA", "SDR EM RIO PRETO", "AGENTES AUTORIZADOS", "PCA / PME", "PCE 100+"]);
    expect(COMERCIAL_UBERABA.destaque_titulo).toBe("MODELO COMERCIAL");
    expect(COMERCIAL_UBERABA.destaque_itens.join(" • ")).toBe("Presença local em Uberaba • Apoio SDR em Rio Preto • Agentes autorizados • Portfólio direcionado");
  });

  it("uses the credentialing totals for the network indicators", () => {
    expect(REDE_UBERABA.indicadores?.[1]).toBe(`${RESUMO_CREDENCIAMENTO.quantidade} REFERÊNCIAS`);
    expect(REDE_UBERABA.etapas[0].etapa_descricao).toContain("229 referências");
  });
});
