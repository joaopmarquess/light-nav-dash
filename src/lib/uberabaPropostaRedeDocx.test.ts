import { describe, expect, it } from "vitest";
import { Packer } from "docx";
import { blocosPropostaRede, documentoPropostaRede } from "./uberabaPropostaRedeDocx";
import { TOPICOS_PROPOSTA_REDE } from "./uberabaPropostaRedePdf";
import { CONDICOES_GERAIS_REDE, linhasParametrosRede } from "./uberabaPropostaRede";
import { PARAMETROS_REDE_PADRAO } from "./uberabaParametrosRede";

describe("Word da Proposta de Credenciamento e Gestão de Rede", () => {
  const blocos = blocosPropostaRede(PARAMETROS_REDE_PADRAO);
  it("keeps the PDF topics in the same order", () => {
    expect(blocos.filter((b) => b.tipo === "topico").map((b) => (b as { texto: string }).texto)).toEqual(TOPICOS_PROPOSTA_REDE);
  });
  it("writes the Condições Gerais as unnumbered subtopics, never as a table", () => {
    const i = blocos.findIndex((b) => b.tipo === "topico" && b.texto === TOPICOS_PROPOSTA_REDE[3]);
    const resto = blocos.slice(i);
    expect(resto.some((b) => b.tipo === "quadro")).toBe(false);
    expect(resto.filter((b) => b.tipo === "subtopico").map((b) => (b as { texto: string }).texto))
      .toEqual(CONDICOES_GERAIS_REDE.map((c) => c.item));
  });
  it("labels the three tables Quadro 1, 2 and 3, each right before its table", () => {
    const rotulos = blocos.flatMap((b, k) => (b.tipo === "rotulo" ? [[b.texto, blocos[k + 1]?.tipo]] : []));
    expect(rotulos).toEqual([["Quadro 1", "quadro"], ["Quadro 2", "quadro"], ["Quadro 3", "quadro"]]);
  });
  it("uses the current parameters in the gestão text and the Resultado table", () => {
    const p = { ...PARAMETROS_REDE_PADRAO, parcelasFixas: 4, valorPorVida: 3 };
    const b = blocosPropostaRede(p);
    const quadros = b.filter((x) => x.tipo === "quadro") as Extract<(typeof b)[number], { tipo: "quadro" }>[];
    expect(quadros[1].linhas).toEqual(linhasParametrosRede(p));
    const resultado = quadros.at(-1)!;
    expect(resultado.linhas.at(-1)?.[0]).toBe("TOTAL");
    expect(resultado.juntos).toBe(true);
  });
  it("Word com capa e sumário: páginas do sumário como campos PAGEREF apontando para os tópicos", async () => {
    const JSZip = (await import("jszip")).default;
    const sumario = [{ titulo: "1. Introdução", pagina: 3 }, { titulo: "2. Credenciamento por Captação", pagina: 3 }];
    const buf = await Packer.toBuffer(documentoPropostaRede(blocos, null, { capa: { titulo: "Proposta de Credenciamento e Gestão de Rede", mesAno: "Novembro de 2026", destinatario: "Siga Soluções" }, sumario }));
    const xml = await (await JSZip.loadAsync(buf)).file("word/document.xml")!.async("string");
    expect(xml).toContain("SUMÁRIO");
    expect(xml).toContain("Novembro de 2026");
    expect(xml).toContain("PAGEREF topico_1");
    expect(xml).toContain('w:name="topico_1"');
  });
  it("produces a Word file", async () => {
    const buf = await Packer.toBuffer(documentoPropostaRede(blocos, null));
    expect(buf.subarray(0, 2).toString()).toBe("PK");
  });
});
