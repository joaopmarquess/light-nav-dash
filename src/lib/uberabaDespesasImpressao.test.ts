import { describe, expect, it } from "vitest";
import { buildDespesasImpressaoPdf, paginasDespesas } from "./uberabaDespesasImpressao";
import { fontesSimulacao, PADRAO_PARAMETRO, resumoSimulacao, simularPorBase } from "./uberabaSimulacao";
import { INDICADORES_PADRAO_POR_FRENTE, INDICES_PADRAO } from "./uberabaTabelasComerciais";

const nomes = ["PCA", "PME ADM.", "PCE ADM.", "PJ+"];
const configs = fontesSimulacao.padroes.map((c) => ({ ...c, ...PADRAO_PARAMETRO }));
const paginas = paginasDespesas(configs, INDICES_PADRAO, INDICADORES_PADRAO_POR_FRENTE, nomes);
const [percentual, media] = paginas;

describe("relatório das Despesas Assistenciais", () => {
  it("duas folhas: Percentual e depois Média Assist.", () => {
    expect(paginas.map((p) => p.base)).toEqual(["percentual", "media"]);
    expect(buildDespesasImpressaoPdf(null, null, paginas).getNumberOfPages()).toBe(2);
  });
  it("Percentual: despesa = faturamento × 70% em cada modalidade", () => {
    percentual.modalidades.forEach((m) => expect(m.despesa).toBeCloseTo(m.faturamento * 0.7, 6));
    expect(percentual.total.sinistralidadeResultante).toBeCloseTo(0.7, 9);
  });
  it("Média Assist.: despesa = vidas-mês × R$ 190,45", () => {
    media.modalidades.forEach((m) => expect(m.despesa).toBeCloseTo(m.vidasMes * 190.45, 6));
    expect(media.total.despesaVidaMes).toBeCloseTo(190.45, 9);
  });
  it("evolução mensal soma a despesa anual e o quadro da OPERADORA é o da tela", () => {
    for (const pg of paginas) {
      expect(pg.mensal.reduce((s, m) => s + m.despesa, 0)).toBeCloseTo(pg.total.despesa, 6);
      const tela = simularPorBase(configs, INDICES_PADRAO, INDICADORES_PADRAO_POR_FRENTE, pg.base).map((c) => resumoSimulacao(c.resultados).bensaude.liquido);
      expect(pg.operadora.at(-1)!.valores).toEqual(tela);
      expect(pg.operadora.find((l) => l.label.includes("Despesa"))!.valores[0]).toBeCloseTo(-pg.total.despesa, 6);
    }
  });
});
