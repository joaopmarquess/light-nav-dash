import { describe, expect, it } from "vitest";
import { filtrarLinhasSaidas } from "./carteiraLinhas";

describe("filtro das linhas de Saídas", () => {
  it("consulta exclusivamente tp_linha S", () => {
    const linhas = [{ tp_linha: "E" }, { tp_linha: "S" }, { tp_linha: "R" }];
    const consulta = {
      linhas,
      eq(campo: string, valor: string) {
        return { ...this, linhas: this.linhas.filter(l => l[campo as keyof typeof l] === valor) };
      },
    };
    expect(filtrarLinhasSaidas(consulta, "saidas").linhas).toEqual([{ tp_linha: "S" }]);
  });
  it("preserva a consulta de Entradas", () => {
    const consulta = { eq() { throw new Error("Entradas não deve receber este filtro"); } };
    expect(filtrarLinhasSaidas(consulta, "entradas")).toBe(consulta);
  });
});