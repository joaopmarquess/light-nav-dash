import { describe, expect, it } from "vitest";
import { Packer } from "docx";
import { blocosPropostaRede, documentoPropostaRede } from "./uberabaPropostaRedeDocx";
import { TOPICOS_PROPOSTA_REDE } from "./uberabaPropostaRedePdf";
import { CONDICOES_GERAIS_REDE, regraMensalidadeRede } from "./uberabaPropostaRede";
import { PARAMETROS_REDE_PADRAO } from "./uberabaParametrosRede";

describe("Word da Proposta de Credenciamento e Gestão de Rede", () => {
  const blocos = blocosPropostaRede(PARAMETROS_REDE_PADRAO);
  it("keeps the PDF topics in the same order", () => {
    expect(blocos.filter((b) => b.tipo === "topico").map((b) => (b as { texto: string }).texto)).toEqual(TOPICOS_PROPOSTA_REDE);
  });
  it("writes the Condições Gerais as subtopics 4.1 to 4.5, never as a table", () => {
    const i = blocos.findIndex((b) => b.tipo === "topico" && b.texto === TOPICOS_PROPOSTA_REDE[3]);
    const resto = blocos.slice(i);
    expect(resto.some((b) => b.tipo === "quadro")).toBe(false);
    expect(resto.filter((b) => b.tipo === "subtopico").map((b) => (b as { texto: string }).texto))
      .toEqual(CONDICOES_GERAIS_REDE.map((c, k) => `4.${k + 1} ${c.item}`));
  });
  it("uses the current parameters in the gestão text and the Resultado table", () => {
    const p = { ...PARAMETROS_REDE_PADRAO, parcelasFixas: 4, valorPorVida: 3 };
    const b = blocosPropostaRede(p);
    expect(b.some((x) => x.tipo === "paragrafo" && x.texto === regraMensalidadeRede(p))).toBe(true);
    const resultado = b.filter((x) => x.tipo === "quadro").at(-1) as Extract<(typeof b)[number], { tipo: "quadro" }>;
    expect(resultado.linhas.at(-1)?.[0]).toBe("TOTAL");
    expect(resultado.juntos).toBe(true);
  });
  it("produces a Word file", async () => {
    const buf = await Packer.toBuffer(documentoPropostaRede(blocos, null));
    expect(buf.subarray(0, 2).toString()).toBe("PK");
  });
});
