import { describe, expect, it } from "vitest";
import { initialDreExpansion } from "./dreExpansion";

const tree = [
  { key: "g1", label: "EBITDA", children: [{ key: "g2", label: "OPERACIONAL", children: [{ key: "g3", label: "PRINCIPAL", children: [{ key: "g4", label: "FATURAMENTO", children: [] }] }] }] },
  { key: "fin", label: "FINANCEIRO", children: [{ key: "receitas-fin", label: "RECEITAS", children: [] }] },
];
describe("Abertura inicial DRE", () => {
  it("mantém todos os níveis do Bench ANS recolhidos", () => {
    expect(initialDreExpansion(tree, true)).toEqual({});
  });
  it("preserva Demonstrações expandido exceto Financeiro", () => {
    expect(initialDreExpansion(tree)).toEqual({ g1: true, g2: true, g3: true });
  });
});