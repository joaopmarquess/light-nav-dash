import { describe, expect, it } from "vitest";
import { PARAMETROS_REDE_PADRAO, lerParametroRede, parametrosRede } from "./uberabaParametrosRede";

describe("Parâmetros de Resultados Rede", () => {
  it("padrões da imagem: 6 parcelas desde o mês 1, R$ 15.000 e R$ 0 por vida", () => {
    expect(PARAMETROS_REDE_PADRAO).toEqual({ parcelasFixas: 6, iniciarEm: 1, valorParcela: 15000, valorPorVida: 0 });
  });
  it("valor digitado prevalece só no campo editado", () => {
    expect(parametrosRede({ valorParcela: 20000 })).toEqual({ parcelasFixas: 6, iniciarEm: 1, valorParcela: 20000, valorPorVida: 0 });
  });
  it("lê números em pt-BR; vazio restaura e inválido é recusado", () => {
    expect(lerParametroRede("", false)).toBeUndefined();
    expect(lerParametroRede("15.000", false)).toBe(15000);
    expect(lerParametroRede("1,50", false)).toBe(1.5);
    expect(lerParametroRede("-1", false)).toBeNull();
    expect(lerParametroRede("8", true)).toBe(8);
    expect(lerParametroRede("6,5", true)).toBeNull();
  });
});

describe("Restaurar padrão dos Parâmetros", () => {
  it("volta a 6 parcelas de R$ 15.000,00 desde o mês 1 e R$ 0,00 por vida", async () => {
    const m = await import("./uberabaParametrosRede");
    m.salvarParametrosRede({ parcelasFixas: 6, iniciarEm: 1, valorParcela: 10000, valorPorVida: 1 });
    m.restaurarParametrosRede();
    expect(m.parametrosRede(m.carregarParametrosRede())).toEqual({ parcelasFixas: 6, iniciarEm: 1, valorParcela: 15000, valorPorVida: 0 });
  });
});
