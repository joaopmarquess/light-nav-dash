import { describe, expect, it } from "vitest";
import { montarPropostaPdf } from "./propostaApbPdf";
import { LIMITES_PADRAO, chaveCopart } from "./propostaApbCopart";
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
  it("inclui os limites da coparticipação do Plano Proposto 2027", () => {
    const text = montarPropostaPdf({ linEnf: 199.99, depBase: 125, sinPct: 90, copartPct: 25 }).output();
    for (const value of ["43,47", "88,06", "277,57", "555,15", "50%"]) expect(text).toContain(value);
  });
  it("usa os limites gravados", () => {
    const text = montarPropostaPdf({ linEnf: 199.99, depBase: 125, sinPct: 90, copartPct: 25 }, { ...LIMITES_PADRAO, [chaveCopart({ n: 1, s: "Consulta" })]: 51.23 }).output();
    expect(text).toContain("51,23");
    expect(text).not.toContain("43,47");
  });
});