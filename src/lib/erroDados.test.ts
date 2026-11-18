import { describe, expect, it } from "vitest";
import { mensagemErroDados, MSG_SERVIDOR_INDISPONIVEL, servidorIndisponivel } from "./erroDados";

describe("erroDados", () => {
  it("trata falha de rede do navegador como servidor indisponível", () => {
    expect(mensagemErroDados({ message: "TypeError: Failed to fetch" })).toBe(MSG_SERVIDOR_INDISPONIVEL);
    expect(servidorIndisponivel(new Error("Load failed"))).toBe(true);
  });
  it("trata tempo esgotado e gateway 502/503/504 como indisponível", () => {
    expect(servidorIndisponivel("Tempo esgotado ao contactar o servidor de dados")).toBe(true);
    expect(servidorIndisponivel("503 Service Unavailable")).toBe(true);
  });
  it("mantém o detalhe de erros que não são de conexão", () => {
    expect(servidorIndisponivel("column x does not exist")).toBe(false);
    expect(mensagemErroDados("column x does not exist")).toBe("Não foi possível carregar os dados: column x does not exist");
  });
});
