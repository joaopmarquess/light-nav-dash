import { describe, expect, it } from "vitest";
import { buildResultadoImpressaoPdf, cenariosPorBaseDespesa, paginasResultado } from "./uberabaResultadoImpressao";
import { fontesSimulacao, PADRAO_PARAMETRO, resumoSimulacao } from "./uberabaSimulacao";
import { INDICADORES_PADRAO_POR_FRENTE, INDICES_PADRAO } from "./uberabaTabelasComerciais";

const nomes = ["PCA", "PME ADM.", "PCE 50+", "PJ+"];
const configs = fontesSimulacao.padroes.map((c) => ({ ...c, ...PADRAO_PARAMETRO }));
const porBase = cenariosPorBaseDespesa(configs, INDICES_PADRAO, INDICADORES_PADRAO_POR_FRENTE);
const paginas = paginasResultado(porBase, nomes, INDICES_PADRAO, INDICADORES_PADRAO_POR_FRENTE);
const linha = (pi: number, ente: string, rotulo: string) => paginas[pi].entes.find((e) => e.titulo === ente)!.linhas.find((l) => l.label.includes(rotulo))!;

describe("impressão do Resultado por Ente", () => {
  it("uma folha Contratual e outra Promocional, nessa ordem", () => {
    expect(paginas.map((p) => p.rotulo)).toEqual(["Contratual", "Promocional"]);
    expect(buildResultadoImpressaoPdf(null, null, paginas).getNumberOfPages()).toBe(2);
  });
  it("cada folha traz as despesas por Percentual e por Média Assist., nessa ordem", () => {
    paginas.forEach((pg) => expect(pg.bases.map((b) => b.id)).toEqual(["percentual", "media"]));
  });
  it("parâmetros das tabelas: % sobre Referência e % Spread de cada tabela", () => {
    expect(paginas[0].tabelas.map((t) => t.sobreReferencia)).toEqual([0.95, 0.95, 0.89, 0.85]);
    expect(paginas[0].tabelas.map((t) => t.spread)).toEqual([0.23, 0.23, 0.05, 0.05]);
    expect(paginas[0].tabelas.map((t) => t.spreadPara)).toEqual(["ADMINISTRADORA", "ADMINISTRADORA", "AGENCIADORA", "AGENCIADORA"]);
  });
  it("cada folha usa o agenciamento do seu cenário: PCA 90% contratual e 150% promocional", () => {
    expect(paginas[0].tabelas[0].agenciamento).toBe(0.9);
    expect(paginas[1].tabelas[0].agenciamento).toBe(1.5);
  });
  it("Despesa Assistencial: Percentual = faturamento × 70%; Média = vidas acumuladas × R$ 190,45", () => {
    const faturamento = porBase.percentual[0].resultados.reduce((s, r) => s + r.anual.faturamento, 0);
    const vidasMes = porBase.media[0].resultados.reduce((s, r) => s + r.mensal.reduce((t, m) => t + m.acumuladas, 0), 0);
    for (const pi of [0, 1]) {
      const [pct, media] = linha(pi, "OPERADORA", "Despesa").valores;
      expect(-pct).toBeCloseTo(faturamento * 0.7, 6);
      expect(-media).toBeCloseTo(vidasMes * 190.45, 6);
    }
  });
  it("valores de cada coluna iguais aos da tela com a chave na base correspondente", () => {
    paginas.forEach((pg, i) => {
      const esperado = pg.bases.map((b) => resumoSimulacao(porBase[b.id][i].resultados).bensaude.liquido);
      expect(linha(i, "OPERADORA", "Resultado Líquido").valores).toEqual(esperado);
    });
    expect(linha(0, "AGENCIADORA", "Resultado").valores[0]).not.toBeCloseTo(linha(1, "AGENCIADORA", "Resultado").valores[0], 2);
  });
});
