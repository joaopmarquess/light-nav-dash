import { describe, expect, it } from "vitest";
import { COMERCIAL_UBERABA, ESCRITORIO_UBERABA, REDE_UBERABA } from "./uberabaFrentes";

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

  it("organizes Rede Assistencial under Gestão de Rede with the supplied teams", () => {
    const [gestao] = REDE_UBERABA.grupos;
    expect(REDE_UBERABA.grupos).toHaveLength(1);
    expect(gestao.titulo).toBe("Gestão de Rede");
    expect(gestao.itens.map((i) => i.titulo)).toEqual(["Captação", "Manutenção e Relacionamento", "Gestão de Sinistros"]);
    expect(gestao.itens[0]).toMatchObject({ rotulo: "Equipe", subitens: ["Equipe da Siga Soluções com apoio de Dr. Adeir"] });
    expect(gestao.itens[1]).toMatchObject({ rotulo: "Equipe", subitens: ["O Farmer em Uberaba terá esta função acessória na manutenção da rede", "Equipe da Siga Soluções"] });
    expect(gestao.itens[2].rotulo).toBe("Dr. Adeir");
    expect(gestao.itens[2].subitens).toBeUndefined();
  });

  it("organizes Escritório Local into Equipes, Estrutura and Processos with the supplied items", () => {
    const [grupo] = ESCRITORIO_UBERABA.grupos;
    expect(grupo.itens.map((i) => i.titulo)).toEqual(["Equipes", "Estrutura", "Processos"]);
    expect(grupo.itens[0].subitens).toEqual(["Farmer", "SDR", "Assistente/Secretária"]);
    expect(grupo.itens[1].subitens).toEqual(["Mesas para a equipe fixa", "Mesas para a equipe em viagem", "Sala de reuniões"]);
    expect(grupo.itens[2].subitens).toEqual(["Suporte ao credenciado", "Suporte ao beneficiário", "Fomento de Adesões nas empresas PJ 100+", "Atendimento a leads locais"]);
  });
});
