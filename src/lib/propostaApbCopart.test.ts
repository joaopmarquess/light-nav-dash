import { describe, expect, it } from "vitest";
import { COPART_PROPOSTA_2027, LIMITES_PADRAO, chaveCopart, gravarLimitesCopart, lerLimitesCopart, linhasComLimites } from "./propostaApbCopart";

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };
const lim = (n: number) => COPART_PROPOSTA_2027.filter((l) => l.n === n).map((l) => l.limite);

describe("Coparticipação do Plano Proposto 2027", () => {
  it("tem 12 grupos e 19 linhas, como a tabela fornecida", () => {
    expect(new Set(COPART_PROPOSTA_2027.map((l) => l.n)).size).toBe(12);
    expect(COPART_PROPOSTA_2027).toHaveLength(19);
  });
  it.each([[1, 43.47], [2, 88.06], [3, 88.06], [4, 277.57], [5, 277.57], [6, 277.57], [7, 88.06], [8, 88.06], [9, 277.57], [10, 88.06], [11, 277.57], [12, 555.15]])("grupo %i tem limite R$ %f", (n, v) => {
    expect(lim(n).every((x) => x === v)).toBe(true);
  });
  it("consulta, oftalmológica, emergência e internação sem percentual; demais 50%", () => {
    for (const l of COPART_PROPOSTA_2027) expect(l.p).toBe(l.n <= 4 ? "-" : "50%");
  });
  it("sem gravação, usa os limites da tabela", () => {
    expect(lerLimitesCopart(mem())).toEqual(LIMITES_PADRAO);
  });
  it("grava e relê um limite alterado sem mudar os outros", () => {
    const s = mem(), k = chaveCopart({ n: 1, s: "Consulta" });
    gravarLimitesCopart(s, { ...LIMITES_PADRAO, [k]: 50 });
    const lido = lerLimitesCopart(s);
    expect(lido[k]).toBe(50);
    expect(linhasComLimites(lido).find((l) => l.n === 4)?.limite).toBe(277.57);
  });
  it("recusa limite negativo", () => {
    const k = chaveCopart({ n: 4, s: "Internação" });
    expect(() => gravarLimitesCopart(mem(), { ...LIMITES_PADRAO, [k]: -1 })).toThrow();
  });
});
