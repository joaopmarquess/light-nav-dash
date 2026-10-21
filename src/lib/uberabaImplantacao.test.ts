import { describe, expect, it } from "vitest";
import { IMPLANTACAO_UBERABA, textoDefinicao } from "./uberabaImplantacao";

describe("Implantação Uberaba", () => {
  it("tem sete etapas em ordem", () => {
    expect(IMPLANTACAO_UBERABA.etapas.map((e) => e.numero)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it("não inventa prazos, responsáveis ou status", () => {
    IMPLANTACAO_UBERABA.etapas.forEach((e) => expect([e.prazo, e.responsavel, e.status]).toEqual([null, null, null]));
    expect(textoDefinicao(null)).toBe("Em definição");
  });
  it("Operação Iniciada é resultado esperado", () => {
    expect(IMPLANTACAO_UBERABA.resultado.tipo).toBe("esperado");
  });
  it("monitora 12 indicadores", () => {
    expect(IMPLANTACAO_UBERABA.indicadores).toHaveLength(12);
  });
});
