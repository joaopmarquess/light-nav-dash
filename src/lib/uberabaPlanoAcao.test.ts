import { describe, expect, it } from "vitest";
import { PLANO_FORMALIZACAO_UBERABA, PLANO_HOME_UBERABA, PLANO_IMPLANTACAO_UBERABA, PLANO_MARKETING_UBERABA } from "./uberabaPlanoAcao";

const itens = (c: { grupos: { itens: { titulo: string }[] }[] }) => c.grupos.flatMap((g) => g.itens.map((i) => i.titulo));

describe("Plano de Ação no formato do Modelo de Atuação", () => {
  it("Home keeps the six project fronts and states Operação Iniciada only as the expected result", () => {
    expect(itens(PLANO_HOME_UBERABA)).toEqual(["REDE ASSISTENCIAL", "MODELO COMERCIAL", "CREDENCIAMENTO", "PLANO DE MARKETING", "MODELO DE OPERAÇÃO", "FORMALIZAÇÃO"]);
    expect(PLANO_HOME_UBERABA.destaque_titulo).toBe("RESULTADO ESPERADO");
    expect(PLANO_HOME_UBERABA.nota).toContain("não uma operação já iniciada");
  });
  it("Marketing keeps the six narrative premises, both channels and the release guideline", () => {
    expect(itens(PLANO_MARKETING_UBERABA)).toHaveLength(8);
    expect(PLANO_MARKETING_UBERABA.destaque_itens[0]).toContain("somente após validação e autorização formal");
  });
  it("Formalização keeps SIGA contracts limited to sales and capture, restricted to Uberaba", () => {
    expect(itens(PLANO_FORMALIZACAO_UBERABA)).toContain("Contratos de venda e captação");
    expect(JSON.stringify(PLANO_FORMALIZACAO_UBERABA)).toContain("Rede restrita a Uberaba");
    expect(JSON.stringify(PLANO_FORMALIZACAO_UBERABA)).toContain("Não há contrato de gestão ou operação");
  });
  it("Implantação keeps its seven stages and shows undefined deadlines/owners as Em definição", () => {
    expect(itens(PLANO_IMPLANTACAO_UBERABA)).toHaveLength(7);
    expect(PLANO_IMPLANTACAO_UBERABA.nota).toBe("Prazos e responsáveis das etapas: Em definição.");
    expect(PLANO_IMPLANTACAO_UBERABA.destaque_titulo).toBe("RESULTADO ESPERADO · OPERAÇÃO INICIADA");
  });
});
