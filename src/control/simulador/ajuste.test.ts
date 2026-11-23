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

import { lerPercentualAjuste, lerValorAjuste, percentualOriginalAjuste, percentualSobreFaturamento, valoresCenarioAjuste } from "./ajuste";

describe("Ajuste variável sobre o Faturamento", () => {
  it("sem alterações, mostra exatamente os valores fornecidos", () => {
    for (const c of CENARIOS_AJUSTE) for (const l of LINHAS_AJUSTE) expect(valoresCenarioAjuste(c)[l.chave]).toBe(l.valores[c]);
  });
  it("percentual é sobre o Faturamento do mesmo cenário", () => {
    expect(percentualOriginalAjuste("faturamento", "realista")).toBe(100);
    expect(percentualSobreFaturamento(-45118205743, 45619564759).toFixed(2)).toBe("-98.90");
  });
  it("alterar um percentual muda o valor da linha e os totais que a contêm", () => {
    const v = valoresCenarioAjuste("realista", { percentuais: { pessoal: -5 } });
    expect(v.pessoal).toBe(Math.round(-0.05 * 45619564759));
    const delta = v.pessoal - valorAjuste("pessoal", "realista");
    expect(v.administrativas).toBe(valorAjuste("administrativas", "realista") + delta);
    expect(v.antesImpostos).toBe(valorAjuste("antesImpostos", "realista") + delta);
    expect(v.liquido).toBe(valorAjuste("liquido", "realista") + delta);
    expect(v.ebitda).toBe(valorAjuste("ebitda", "realista") + delta);
    expect(v.entradas).toBe(valorAjuste("entradas", "realista"));
  });
  it("alterar o Faturamento mantém os percentuais das demais linhas", () => {
    const v = valoresCenarioAjuste("otimista", { faturamento: 50000000000 });
    expect(percentualSobreFaturamento(v.marketing, 50000000000)).toBeCloseTo(percentualOriginalAjuste("marketing", "otimista"), 6);
    expect(v.entradas - valorAjuste("entradas", "otimista")).toBe(v.faturamento + v.coparticipacao - valorAjuste("faturamento", "otimista") - valorAjuste("coparticipacao", "otimista"));
  });
  it("resultado financeiro sai do EBITDA", () => {
    const v = valoresCenarioAjuste("pessimista", { percentuais: { financeiro: 10 } });
    expect(v.ebitda).toBe(valorAjuste("ebitda", "pessimista"));
  });
  it("lê o que é digitado; sem sinal, despesa continua negativa", () => {
    expect(lerPercentualAjuste("5,5", true)).toBe(-5.5);
    expect(lerPercentualAjuste("+5,5", true)).toBe(5.5);
    expect(lerPercentualAjuste("4.5%", false)).toBe(4.5);
    expect(lerPercentualAjuste("abc", false)).toBeNull();
    expect(lerValorAjuste("455.000.000,10")).toBe(45500000010);
  });
});
