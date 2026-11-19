import { describe, expect, it } from "vitest";
import { mesAnoCapa, sumarioComCapa } from "./pdfCapaProposta";
import { comporPropostaRedePdf } from "./uberabaPropostaRedePdf";
import { buildPropostaComercialPdf } from "./uberabaPropostaComercialPdf";
import { montarPropostaPdf } from "./propostaApbPdf";

describe("capa e sumário das propostas", () => {
  it("capa mostra só mês e ano, no horário de Brasília", () => {
    expect(mesAnoCapa(new Date("2026-11-19T10:00:00Z"))).toBe("Novembro de 2026");
    // 01/12 às 01h UTC ainda é 30/11 em Brasília
    expect(mesAnoCapa(new Date("2026-12-01T01:00:00Z"))).toBe("Novembro de 2026");
  });
  it("páginas do sumário contam a capa e o sumário (conteúdo começa na página 3)", () => {
    expect(sumarioComCapa([{ titulo: "1. Introdução", pagina: 1 }, { titulo: "4. Condições Gerais", pagina: 3 }]))
      .toEqual([{ titulo: "1. Introdução", pagina: 3 }, { titulo: "4. Condições Gerais", pagina: 5 }]);
  });
  it("Proposta de Rede: capa na 1, sumário na 2 e os quatro tópicos com página a partir da 3", () => {
    const { doc, sumario } = comporPropostaRedePdf(null);
    expect(sumario.map((s) => s.titulo)).toEqual(["1. Introdução", "2. Credenciamento por Captação", "3. Gestão da Rede", "4. Condições Gerais"]);
    expect(sumario[0].pagina).toBe(3);
    expect(sumario.every((s) => s.pagina >= 3 && s.pagina <= doc.getNumberOfPages())).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paginas = (doc as any).internal.pages as string[][];
    expect(paginas[1].join("\n")).toContain("Siga Solu");
    expect(paginas[2].join("\n")).toContain("SUM");
    expect(paginas[3].join("\n")).toContain("1. INTRODU");
    expect(paginas[1].join("\n")).not.toContain("gina 1 de");
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
