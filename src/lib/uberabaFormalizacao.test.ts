import { describe, expect, it } from "vitest";
import { FORMALIZACAO_UBERABA as dados } from "./uberabaFormalizacao";

describe("Formalização Uberaba", () => {
  it("restringe a rede dos produtos a Uberaba", () => {
    expect(dados.produtos).toMatchObject({ territorio: "Uberaba", rede: "restrita" });
  });
  it("prevê Protocolos de Intenções antes dos contratos SIGA", () => {
    expect(dados.siga.instrumentoPrevio).toBe("Protocolos de Intenções");
  });
  it("limita os contratos SIGA a venda e captação, sem gestão ou operação", () => {
    expect(dados.siga.frentes).toEqual(["Comercial", "Credenciamento"]);
    expect(dados.siga.escoposContratuais).toEqual(["venda", "captação"]);
    expect(dados.siga.escoposExcluidos).toEqual(["gestão", "operação"]);
  });
  it("prevê contratos com Hospital e Credenciados", () => {
    expect(dados.contratosAssistenciais).toEqual(["Hospital", "Credenciados"]);
  });
});