import { describe, expect, it } from "vitest";
import { EM_BLOCOS_FM, buildCenariosFmPdf, escalaCenarioFm, paginasCenariosFm } from "./simularDatasFmPdf";
import { avaliarImpactosFm, novaSimulacaoFm, simularDatasFm } from "./simularDatasFm";

const AGORA = "2026-11-18T16:00:00.000Z";
const lista = [
  novaSimulacaoFm("c", AGORA, 3, { mes: 12, ano: 2026, dias: { fechamento: 5 } }, "Folha curta"),
  novaSimulacaoFm("a", AGORA, 1, undefined, "Padrão"),
  novaSimulacaoFm("b", AGORA, 2, { mes: 12, ano: 2026, dias: { arquivo: 28 }, arquivoMes: 12 }),
];

describe("Imprimir Cenários (Simular Datas FM)", () => {
  it("imprime os mesmos dois grupos unidos do cenário salvo", () => {
    const s = novaSimulacaoFm("dois", AGORA, 1, { mes: 12, ano: 2026, dias: {}, blocos: true, quantidadeBlocos: 2 });
    const [pagina] = paginasCenariosFm([s]);
    expect(pagina.blocos?.partes[0].linhas).toEqual([
      { bloco: "Bloco 1", periodo: "20/11/2026 a 05/12/2026", dias: "16 dias", arquivo: "06/12/2026" },
      { bloco: "Bloco 2", periodo: "06/12/2026 a 19/12/2026", dias: "14 dias", arquivo: "20/12/2026" },
    ]);
    expect(buildCenariosFmPdf(null, [s]).getNumberOfPages()).toBe(1);
  });
  it("uma página por cenário, na ordem de inserção", () => {
    const p = paginasCenariosFm(lista);
    expect(p.map((x) => [x.titulo, x.cenario])).toEqual([["Cenário 01", "Padrão"], ["Cenário 02", "Sem nome"], ["Cenário 03", "Folha curta"]]);
    expect(buildCenariosFmPdf(null, lista).getNumberOfPages()).toBe(3);
  });
  it("mostra as mesmas datas e situações da tela", () => {
    const [padrao, , curta] = paginasCenariosFm(lista);
    expect(padrao.arquivo).toBe("20/12/2026");
    expect(padrao.datas.map((d) => d.data)).toEqual(simularDatasFm(lista[1].entrada).filter((l) => l.id !== "arquivo").map((l) => l.data));
    expect(padrao.impactos.map((i) => i.situacao)).toEqual(avaliarImpactosFm(lista[1].entrada).map((i) => i.status));
    expect(curta.prazoFolha).toBe("05 dias para Fechar a Folha");
  });
  it("prints the blocks box only for scenarios simulated in blocks, still one page each", () => {
    const comBlocos = [...lista, novaSimulacaoFm("d", AGORA, 4, { mes: 12, ano: 2026, dias: {}, blocos: true }, "Blocos")];
    const p = paginasCenariosFm(comBlocos);
    expect(p.slice(0, 3).every((x) => x.blocos === undefined)).toBe(true);
    const b = p[3].blocos!;
    expect(b.partes.map((x) => x.titulo)).toEqual(["Parte 1 — Outros Credenciados", "Parte 2 — Hospital Benê"]);
    expect(b.partes[0].linhas.map((l) => l.arquivo)).toEqual(["28/11/2026", "06/12/2026", "13/12/2026", "20/12/2026"]);
    expect(b.partes[1].linhas).toEqual([{ bloco: "Período geral", periodo: "20/11/2026 a 19/12/2026", dias: "30 dias", arquivo: "20/12/2026" }]);
    expect(b.contexto).toContain("data limite do cenário (20/12/2026)");
    expect(EM_BLOCOS_FM).toBe("Em blocos");
    expect(buildCenariosFmPdf(null, comBlocos).getNumberOfPages()).toBe(4);
  });
  it("fits every scenario on exactly one page, including long names in blocks", () => {
    const longo = "Cenário com descrição bem longa para testar a quebra do título ".repeat(4).slice(0, 200);
    const todos = [
      ...lista,
      novaSimulacaoFm("e", AGORA, 5, { mes: 12, ano: 2026, dias: { fechamento: 5 }, blocos: true }, longo),
      novaSimulacaoFm("f", AGORA, 6, { mes: 2, ano: 2027, dias: { arquivo: 31 }, arquivoMes: 3, blocos: true }, longo),
    ];
    expect(buildCenariosFmPdf(null, todos).getNumberOfPages()).toBe(todos.length);
    const [padrao] = paginasCenariosFm(lista);
    expect(escalaCenarioFm(padrao)).toBe(1);
  });
});
