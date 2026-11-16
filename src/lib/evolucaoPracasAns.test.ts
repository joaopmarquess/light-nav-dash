import { describe, expect, it } from "vitest";
import catalogoJson from "@/data/benchVidas/mensal/catalogo.json";
import type { CatalogoMensal } from "./benchVidasMensal";
import { ansPlanoSaudePorMes, comAns, podeIncluirAns } from "./evolucaoPracasAns";

const catalogo = catalogoJson as unknown as CatalogoMensal;
const seg = (nome: string) => catalogo.valores.segmentacao.indexOf(nome);
// Linha do cubo A: competência, 10 campos (segmentação na posição do catálogo) e ativos, aderidos, cancelados no fim.
const linha = (comp: number, segmentacao: number, ativos: number) => {
  const l = [comp, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ativos, 0, 0];
  l[7] = segmentacao;
  return l;
};

describe("Evolução Produtos × ANS", () => {
  it("só permite incluir a ANS em Vidas com Tipo e Produto em Todos", () => {
    expect(podeIncluirAns({ visao: "Vidas", tipo: null, produto: null })).toBe(true);
    expect(podeIncluirAns({ visao: "Vidas", tipo: "PCA", produto: null })).toBe(false);
    expect(podeIncluirAns({ visao: "Vidas", tipo: null, produto: "Fácil 50" })).toBe(false);
    expect(podeIncluirAns({ visao: "Receita", tipo: null, produto: null })).toBe(false);
  });

  it("ANS soma só Plano de Saúde: segmentações com odontologia ficam fora, como no Bench Vidas", () => {
    const m = ansPlanoSaudePorMes([
      linha(202609, seg("Ambulatorial + Hospitalar com obstetrícia"), 70000),
      linha(202609, seg("Ambulatorial"), 1879),
      linha(202609, seg("Ambulatorial + Hospitalar com obstetrícia + Odontológico"), 826),
      linha(202609, seg("Odontológico"), 5000),
      linha(202508, seg("Ambulatorial"), 64240),
      linha(202610, seg("Ambulatorial"), 99),
    ], catalogo, 202508, 202609);
    expect([...m.entries()]).toEqual([["08/2025", 64240], ["09/2026", 71879]]);
  });

  it("diferença = Total Geral − ANS, em % sobre a ANS; mês sem ANS fica sem diferença e a linha Total sai", () => {
    const r = comAns([
      { rotulo: "09/2026", praca: 18904, regiao: 52440, total: 71344 },
      { rotulo: "10/2026", praca: 19167, regiao: 53175, total: 72342 },
      { rotulo: "Total", praca: 1, regiao: 1, total: 2 },
    ], new Map([["09/2026", 71879]]));
    expect(r.map((l) => [l.rotulo, l.ans, l.diferenca])).toEqual([["09/2026", 71879, -535], ["10/2026", null, null]]);
    expect(r[0].diferencaPct).toBeCloseTo(-0.00744, 5);
  });
});
