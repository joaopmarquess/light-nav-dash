import { describe, expect, it } from "vitest";
import { CENARIOS_AJUSTE, LINHAS_AJUSTE, formatarAjuste, valorAjuste } from "./ajuste";

describe("Ajuste do Simulador", () => {
  it("guarda as 19 linhas na ordem da imagem fornecida", () => {
    expect(LINHAS_AJUSTE).toHaveLength(19);
    expect(LINHAS_AJUSTE[0].rotulo).toBe("ENTRADAS OPERACIONAIS");
    expect(LINHAS_AJUSTE.at(-1)!.rotulo).toBe("EBITDA");
  });
  it("mantém os valores fornecidos", () => {
    expect(formatarAjuste(valorAjuste("entradas", "realista"))).toBe("501.815.212,36");
    expect(formatarAjuste(valorAjuste("liquido", "otimista"))).toBe("16.695.848,26");
    expect(formatarAjuste(valorAjuste("ebitda", "pessimista"))).toBe("-18.939.630,64");
  });
  it("resultado antes dos impostos e líquido fecham com as linhas fornecidas", () => {
    for (const c of CENARIOS_AJUSTE) {
      const rai = ["entradas", "assistenciais", "demaisOperacionais", "administrativas", "financeiro"].reduce((s, k) => s + valorAjuste(k as never, c), 0);
      expect(rai).toBe(valorAjuste("antesImpostos", c));
      expect(rai + valorAjuste("impostosFederais", c)).toBe(valorAjuste("liquido", c));
    }
  });
});
