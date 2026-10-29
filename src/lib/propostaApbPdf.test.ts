import { describe, expect, it } from "vitest";
import { montarPropostaPdf } from "./propostaApbPdf";
describe("proposta PDF Estratégico", () => {
  it("usa os preços atuais de titular linear e dependente, não a tabela antiga", () => {
    const pdf = montarPropostaPdf({ linEnf: 210, depBase: 130, sinPct: 90, copartPct: 25 });
    const text = pdf.output();
    expect(text).toContain("210,00");
    expect(text).toContain("315,00");
    expect(text).toContain("130,00");
    expect(text).toContain("195,00");
    expect(text).not.toContain("110,53");
    expect(pdf.getNumberOfPages()).toBe(2);
  });
  it("inclui os valores vigentes da Fácil 50", () => {
    const text = montarPropostaPdf({ linEnf: 199.99, depBase: 125, sinPct: 90, copartPct: 25 }).output();
    for (const value of ["45,00", "60,00", "79,00", "250,00", "50%"] ) expect(text).toContain(value);
  });
});