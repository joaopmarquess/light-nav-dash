import { describe, expect, it } from "vitest";
import { PARAMETROS_REDE_PADRAO, lerParametroRede, parametrosRede } from "./uberabaParametrosRede";

describe("Parâmetros de Resultados Rede", () => {
  it("padrões: 6 parcelas fixas, parcela R$ 15.000 e R$ 1 por vida", () => {
    expect(PARAMETROS_REDE_PADRAO).toEqual({ parcelasFixas: 6, valorParcela: 15000, valorPorVida: 1 });
  });
  it("valor digitado prevalece só no campo editado", () => {
    expect(parametrosRede({ valorParcela: 20000 })).toEqual({ parcelasFixas: 6, valorParcela: 20000, valorPorVida: 1 });
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
