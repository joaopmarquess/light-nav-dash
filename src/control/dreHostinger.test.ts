import { describe, it, expect, vi } from "vitest";

const calls = vi.hoisted(() => [] as { table: string; filters: Record<string, number>; orders: string[]; range: number[] }[]);
vi.mock("@/lib/hostingerClient", () => ({ hostinger: { from: (table: string) => {
  const state = { table, filters: {} as Record<string, number>, orders: [] as string[], range: [] as number[] };
  const query = {
    select: () => query, neq: () => query, gte: () => query, lte: () => query,
    eq: (key: string, value: number) => { state.filters[key] = value; return query; },
    order: (key: string) => { state.orders.push(key); return query; },
    range: async (from: number, to: number) => {
      state.range = [from, to]; calls.push(state);
      return { data: table === "demonstracoes_contabeis_oracle_mv" && from === 0 ? Array.from({ length: 1000 }, () => ({ nr_mes: state.filters.nr_mes, cd_conta_contabil: 123456789, vl_debito: 0, vl_credito: 1 })) : [], error: null };
    },
  };
  return query;
} } }));
import { loadDreHostinger } from "./dreHostinger";

describe("Paginação do balancete Control", () => {
  it("consulta um mês por vez em cada página, com ordem múltipla sem depender do id nulo", async () => {
    calls.length = 0;
    await loadDreHostinger(2026, [7, 8]);
    const bal = calls.filter(c => c.table === "demonstracoes_contabeis_oracle_mv");
    expect(bal).toHaveLength(4);
    expect(bal.map(c => c.filters.nr_mes).sort()).toEqual([7, 7, 8, 8]);
    for (const call of bal) {
      expect(call.filters.nr_ano).toBe(2026);
      expect(call.orders).toEqual(["cd_conta_contabil", "vl_debito", "vl_credito"]);
    }
    expect(bal.filter(c => c.filters.nr_mes === 7).map(c => c.range)).toEqual([[0, 999], [1000, 1999]]);
  });
});
describe("período de Demonstrações", () => {
  it("usa o último mês cujas contas 41 superam R$ 20 milhões", async () => {
    const { ultimoMesContas41 } = await import("./dreHostinger");
    expect(ultimoMesContas41([
      { nr_mes: 8, vl_debito: 26_000_000, vl_credito: 0 },
      { nr_mes: 9, vl_debito: 29_000_000, vl_credito: 0 },
      { nr_mes: 10, vl_debito: 0, vl_credito: 0 },
    ])).toBe(9);
  });
  it("não aceita exatamente R$ 20 milhões", async () => {
    const { ultimoMesContas41 } = await import("./dreHostinger");
    expect(ultimoMesContas41([{ nr_mes: 9, vl_debito: 20_000_000, vl_credito: 0 }])).toBe(0);
  });
});
