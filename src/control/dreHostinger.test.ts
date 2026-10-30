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