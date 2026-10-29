import { describe, expect, it } from "vitest";
import { siglaContratacao } from "./siglaContratacao";

describe("siglaContratacao", () => {
  it("INDIVIDUAL/FAMILIAR = PIF", () => expect(siglaContratacao("3-INDIVIDUAL/FAMILIAR - CONVENCIONAL")).toBe("PIF"));
  it("COLETIVO POR ADESAO = PCA", () => expect(siglaContratacao("4-COLETIVO POR ADESAO - COPARTICIPACAO")).toBe("PCA"));
  it("COLETIVO EMPRESARIAL = PCE", () => expect(siglaContratacao("5-COLETIVO EMPRESARIAL - COPARTICIPACAO")).toBe("PCE"));
  it("não reconhecido = null", () => expect(siglaContratacao("")).toBeNull());
});
