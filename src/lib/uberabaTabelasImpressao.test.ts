import { describe, expect, it } from "vitest";
import { buildTabelasImpressaoPdf, paginasImpressao, quadrosImpressao } from "./uberabaTabelasImpressao";
import { FATORES_PADRAO, INDICADORES_PADRAO_POR_FRENTE, INDICES_PADRAO, lerRotulos, operadoraDe, tabelaNet, tabelaVenda, formatarCentavos } from "./uberabaTabelasComerciais";

const dados = { indices: INDICES_PADRAO, fatores: FATORES_PADRAO, indicadores: INDICADORES_PADRAO_POR_FRENTE, rotulos: lerRotulos(undefined) };

describe("impressão das Tabelas", () => {
  it("Venda imprime Referência × fator: Empresarial primeira faixa 131,25", () => {
    const q = quadrosImpressao("venda", dados).find((x) => x.id === "pce100")!;
    expect(q.linhas[0][1]).toBe("131,25");
    expect(q.linhas.length).toBe(10);
  });
  it("Net imprime Venda × OPERADORA de cada tabela, igual à tela", () => {
    for (const q of quadrosImpressao("net", dados)) {
      const net = tabelaNet(dados.indices[q.id], operadoraDe(q.id, dados.indicadores[q.id]), dados.fatores[q.id]);
      expect(q.linhas.map((l) => l[1])).toEqual(net.map((l) => formatarCentavos(l.enfermariaCentavos)));
      expect(q.linhas.map((l) => l[2])).toEqual(net.map((l) => formatarCentavos(l.apartamentoCentavos)));
    }
  });
  it("imprime as quatro tabelas, com Apartamento mesmo quando a coluna está recolhida na tela", () => {
    const qs = quadrosImpressao("venda", dados);
    expect(qs.map((q) => q.sigla)).toEqual(["PCA", "PME ADM.", "PCE 50-99", "PJ+"]);
    const venda = tabelaVenda(dados.indices.pcaAdm, dados.fatores.pcaAdm);
    expect(qs[0].linhas[9][2]).toBe(formatarCentavos(venda[9].apartamentoCentavos));
  });
  it("imprime sempre duas páginas: Venda e depois Net", () => {
    const paginas = paginasImpressao(dados);
    expect(paginas.map((p) => p.modo)).toEqual(["venda", "net"]);
    expect(buildTabelasImpressaoPdf(null, null, paginas).getNumberOfPages()).toBe(2);
  });
});
