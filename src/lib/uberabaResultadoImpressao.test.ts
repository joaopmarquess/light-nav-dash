import { describe, expect, it } from "vitest";
import { buildResultadoImpressaoPdf, paginasResultado } from "./uberabaResultadoImpressao";
import { fontesSimulacao, PADRAO_PARAMETRO, resumoSimulacao, simularPorBase } from "./uberabaSimulacao";
import { INDICADORES_PADRAO_POR_FRENTE, INDICES_PADRAO } from "./uberabaTabelasComerciais";

const nomes = ["PCA", "PME ADM.", "PCE ADM.", "PJ+"];
const configs = fontesSimulacao.padroes.map((c) => ({ ...c, ...PADRAO_PARAMETRO }));
const cenarios = simularPorBase(configs, INDICES_PADRAO, INDICADORES_PADRAO_POR_FRENTE);
const paginas = paginasResultado(cenarios, nomes, INDICES_PADRAO, INDICADORES_PADRAO_POR_FRENTE);

describe("impressão do Resultado por Ente", () => {
  it("uma folha Contratual e outra Promocional, nessa ordem", () => {
    expect(paginas.map((p) => p.rotulo)).toEqual(["Contratual", "Promocional"]);
    expect(buildResultadoImpressaoPdf(null, null, cenarios, paginas).getNumberOfPages()).toBe(2);
  });
  it("parâmetros das tabelas: % sobre Referência e % Spread de cada tabela", () => {
    expect(paginas[0].tabelas.map((t) => t.sobreReferencia)).toEqual([0.95, 0.9, 0.85, 0.75]);
    expect(paginas[0].tabelas.map((t) => t.spread)).toEqual([0.23, 0.23, 0.23, 0.05]);
    expect(paginas[0].tabelas.map((t) => t.spreadPara)).toEqual(["ADMINISTRADORA", "ADMINISTRADORA", "ADMINISTRADORA", "AGENCIADORA"]);
  });
  it("cada folha usa o agenciamento do seu cenário: PCA 90% contratual e 150% promocional", () => {
    expect(paginas[0].tabelas[0].agenciamento).toBe(0.9);
    expect(paginas[1].tabelas[0].agenciamento).toBe(1.5);
  });
  it("valores dos entes iguais aos da tela em cada cenário", () => {
    paginas.forEach((pg, i) => {
      const r = resumoSimulacao(cenarios[i].resultados);
      const operadora = pg.entes.find((e) => e.titulo === "OPERADORA")!;
      expect(operadora.linhas.at(-1)!.valor).toBeCloseTo(r.bensaude.liquido, 6);
    });
    expect(paginas[0].entes[1].linhas.at(-1)!.valor).not.toBeCloseTo(paginas[1].entes[1].linhas.at(-1)!.valor, 2);
  });
});
