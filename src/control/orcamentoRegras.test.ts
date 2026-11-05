import { describe, expect, it } from "vitest";
import { ultimoMesContas41, type DreHRow } from "./dreHostinger";
import { realizadosOrcamento } from "./orcamentoRegras";

const faturamento = (mes: number, valor: number): DreHRow => ({ ano: 2026, mes, tri: 3, g1: "OPERACIONAL", g2: "", g3: "PRINCIPAL", g4: "FATURAMENTO", valor });

describe("meses realizados do orçamento pelo corte das Demonstrações", () => {
  it("inclui setembro e exclui lançamentos de outubro quando o último gatilho é setembro", () => {
    const ultimo = ultimoMesContas41([
      { nr_mes: 9, vl_debito: 29_000_000, vl_credito: 1_000_000 },
      { nr_mes: 10, vl_debito: 20_000_000, vl_credito: 0 },
    ]);
    const periodo = Array.from({ length: ultimo }, (_, i) => i + 1);
    const real = realizadosOrcamento([faturamento(9, 28_000_000), faturamento(10, 20_000_000)], periodo);
    expect([...real.meses]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(real.valor("01|FATURAMENTO", 9)).toBe(28_000_000);
    expect(real.valor("01|FATURAMENTO", 10)).toBe(0);
  });

  it("mantém setembro realizado mesmo quando seus valores classificados são zero", () => {
    const real = realizadosOrcamento([faturamento(9, 0)], [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(real.meses.has(9)).toBe(true);
    expect(real.valor("01|FATURAMENTO", 9)).toBe(0);
    expect(real.meses.has(10)).toBe(false);
  });
});