import { describe, expect, it } from "vitest";
import { buildCenariosFmPdf, paginasCenariosFm } from "./simularDatasFmPdf";
import { avaliarImpactosFm, novaSimulacaoFm, simularDatasFm } from "./simularDatasFm";

const AGORA = "2026-11-18T16:00:00.000Z";
const lista = [
  novaSimulacaoFm("c", AGORA, 3, { mes: 12, ano: 2026, dias: { fechamento: 5 } }, "Folha curta"),
  novaSimulacaoFm("a", AGORA, 1, undefined, "Padrão"),
  novaSimulacaoFm("b", AGORA, 2, { mes: 12, ano: 2026, dias: { arquivo: 28 }, arquivoMes: 12 }),
];

describe("Imprimir Cenários (Simular Datas FM)", () => {
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
});
