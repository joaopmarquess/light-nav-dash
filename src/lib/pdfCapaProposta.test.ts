import { describe, expect, it } from "vitest";
import { mesAnoCapa, rotuloPaginaProposta, sumarioComCapa } from "./pdfCapaProposta";
import { comporPropostaRedePdf } from "./uberabaPropostaRedePdf";
import { buildPropostaComercialPdf } from "./uberabaPropostaComercialPdf";
import { montarPropostaPdf } from "./propostaApbPdf";

describe("capa e sumário das propostas", () => {
  it("capa mostra só mês e ano, no horário de Brasília", () => {
    expect(mesAnoCapa(new Date("2026-11-19T10:00:00Z"))).toBe("Novembro de 2026");
    // 01/12 às 01h UTC ainda é 30/11 em Brasília
    expect(mesAnoCapa(new Date("2026-12-01T01:00:00Z"))).toBe("Novembro de 2026");
  });
  it("capa não conta: relatório com capa + 4 páginas numera o sumário como Página 1 de 4", () => {
    expect(rotuloPaginaProposta(1, 5)).toBeNull();
    expect(rotuloPaginaProposta(2, 5)).toBe("Página 1 de 4");
    expect(rotuloPaginaProposta(3, 5)).toBe("Página 2 de 4");
    expect(rotuloPaginaProposta(5, 5)).toBe("Página 4 de 4");
  });
  it("sumário usa a numeração do rodapé: conteúdo começa na página 2", () => {
    expect(sumarioComCapa([{ titulo: "1. Introdução", pagina: 1 }, { titulo: "4. Condições Gerais", pagina: 3 }]))
      .toEqual([{ titulo: "1. Introdução", pagina: 2 }, { titulo: "4. Condições Gerais", pagina: 4 }]);
  });
  it("Proposta de Rede: capa sem número, sumário Página 1 e os quatro tópicos a partir da Página 2", () => {
    const { doc, sumario } = comporPropostaRedePdf(null);
    expect(sumario.map((s) => s.titulo)).toEqual(["1. Introdução", "2. Credenciamento por Captação", "3. Gestão da Rede", "4. Condições Gerais"]);
    expect(sumario[0].pagina).toBe(2);
    const semCapa = doc.getNumberOfPages() - 1;
    expect(sumario.every((s) => s.pagina >= 2 && s.pagina <= semCapa)).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paginas = (doc as any).internal.pages as string[][];
    expect(paginas[1].join("\n")).toContain("Siga Solu");
    expect(paginas[2].join("\n")).toContain("SUM");
    expect(paginas[3].join("\n")).toContain("1. INTRODU");
    expect(paginas[1].join("\n")).not.toContain("gina ");
    expect(paginas[2].join("\n")).toContain(`gina 1 de ${semCapa}`);
    expect(paginas[3].join("\n")).toContain(`gina 2 de ${semCapa}`);
  });
  it("Proposta Comercial e APB também abrem com capa e sumário", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const com = (buildPropostaComercialPdf(null) as any).internal.pages as string[][];
    expect(com[2].join("\n")).toContain("Gloss");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apb = (montarPropostaPdf({ linEnf: 210, depBase: 130, sinPct: 90, copartPct: 25 }) as any).internal.pages as string[][];
    expect(apb[1].join("\n")).toContain("Proposta APB");
    expect(apb[2].join("\n")).toContain("SUM");
  });
});
