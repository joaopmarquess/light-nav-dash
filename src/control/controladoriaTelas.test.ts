import { describe, expect, it } from "vitest";
import { resumoPainelDre } from "./drePainel";
import { gruposOrcamentoDre, impostosFederais, resultadoLiquido, valoresOrcamento } from "./orcamentoDre";
import type { DreHRow } from "./dreHostinger";

const row = (g1: string, g2: string, g3: string, g4: string, valor: number) => ({ g1, g2, g3, g4, valor, ano: 2026, mes: 1 }) as unknown as DreHRow;

describe("Painel DRE", () => {
  it("encadeia resultados como na tela", () => {
    const r = resumoPainelDre([row("OP", "X", "PRINCIPAL", "FATURAMENTO", 1000), row("OP", "X", "PRINCIPAL", "EVENTOS", -700), row("OP", "ADMINISTRATIVO", "PESSOAL", "", -100), row("FINANCEIRO", "", "", "", 20), row("IMP", "", "", "", -30)]);
    expect(r.fat).toBe(1000);
    expect(r.liq).toBe(190);
    expect(r.cards.find(c => c[0] === "EBITDA")?.[1]).toBe(200);
  });
});

describe("Orçamento DRE", () => {
  it("usa projetado em meses sem realizado", () => {
    const { soma } = valoresOrcamento([{ item: "01|FATURAMENTO", mes: 1, previsto: 10, realizado: 12, projetado: 11 }, { item: "01|FATURAMENTO", mes: 2, previsto: 10, realizado: 0, projetado: 9 }]);
    expect(soma(["01|FATURAMENTO"], [1, 2]).realizado).toBe(21);
  });
  it("agrupa itens nas linhas de topo", () => {
    expect(gruposOrcamentoDre(["01|FATURAMENTO", "08|PESSOAL", "12|FINANCEIRO"]).map(g => g.label)).toEqual(["Operacional", "Despesas administrativas", "Financeiro"]);
  });
  it("aplica impostos de 34% só sobre resultado positivo", () => {
    expect(impostosFederais(100)).toBe(-34);
    expect(impostosFederais(-100)).toBe(0);
    expect(resultadoLiquido(-100)).toBe(-100);
  });
});
