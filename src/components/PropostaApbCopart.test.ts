import { describe, expect, it } from "vitest";
import { LINHAS_COPART_FACIL50 } from "./PropostaApbCopart";

describe("Fácil 50 — tabela fornecida", () => {
  it.each([[1, "45,00"], [2, "60,00"], [3, "79,00"], [4, "250,00"], [5, "79,00"], [6, "250,00"], [7, "79,00"], [8, "250,00"], [9, "-"]])("grupo %i preserva o valor %s", (n, valor) => {
    const linhas = LINHAS_COPART_FACIL50.filter((l) => l.n === n);
    expect(linhas.length).toBeGreaterThan(0);
    for (const l of linhas) expect(l.v).toBe(valor);
  });
  it("cobra 50% em exames, terapias e alta complexidade", () => {
    const ls = LINHAS_COPART_FACIL50.filter((l) => l.n >= 5);
    expect(ls).toHaveLength(12);
    for (const l of ls) expect(l.p).toBe("50%");
  });
});