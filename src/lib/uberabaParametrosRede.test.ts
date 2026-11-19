import { describe, expect, it } from "vitest";
import { PARAMETROS_REDE_PADRAO, lerParametroRede, parametrosRede } from "./uberabaParametrosRede";

describe("Parâmetros de Resultados Rede", () => {
  it("padrões: 6 parcelas fixas iniciando no mês 3, parcela R$ 15.000 e R$ 1 por vida", () => {
    expect(PARAMETROS_REDE_PADRAO).toEqual({ parcelasFixas: 3, iniciarEm: 3, valorParcela: 15000, valorPorVida: 2 });
  });
  it("valor digitado prevalece só no campo editado", () => {
    expect(parametrosRede({ valorParcela: 20000 })).toEqual({ parcelasFixas: 3, iniciarEm: 3, valorParcela: 20000, valorPorVida: 2 });
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
  it("volta a 3 parcelas de R$ 15.000,00 a partir do mês 3 e R$ 2,00 por vida", async () => {
    const m = await import("./uberabaParametrosRede");
    m.salvarParametrosRede({ parcelasFixas: 6, iniciarEm: 1, valorParcela: 10000, valorPorVida: 1 });
    m.restaurarParametrosRede();
    expect(m.parametrosRede(m.carregarParametrosRede())).toEqual({ parcelasFixas: 3, iniciarEm: 3, valorParcela: 15000, valorPorVida: 2 });
  });
});
