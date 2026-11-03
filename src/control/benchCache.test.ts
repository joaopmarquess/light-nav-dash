import { describe, expect, it } from "vitest";
import { cacheIsFresh, CACHE_REVISION } from "../../supabase/functions/bench-c/cachePolicy";
import { prepareBenchYears } from "./benchPrefetch";

describe("conservação e preparação do Bench", () => {
  const now = Date.UTC(2026, 10, 3, 12);
  it("renova ano atual e anterior após 24 horas", () => {
    for (const year of [2025, 2026]) {
      expect(cacheIsFresh(year, new Date(now - 23 * 3600000).toISOString(), CACHE_REVISION, now)).toBe(true);
      expect(cacheIsFresh(year, new Date(now - 24 * 3600000).toISOString(), CACHE_REVISION, now)).toBe(false);
    }
  });
  it("preserva históricos sem expiração e invalida revisão antiga", () => {
    expect(cacheIsFresh(2015, "2020-01-01T00:00:00Z", CACHE_REVISION, now)).toBe(true);
    expect(cacheIsFresh(2015, "2020-01-01T00:00:00Z", 0, now)).toBe(false);
  });
  it("prepara um trimestre por vez e para quando a seleção muda", async () => {
    let stopped = false;
    const calls: string[] = [];
    let concurrent = 0;
    let peak = 0;
    await prepareBenchYears([2025, 2024], {
      stopped: () => stopped,
      periods: async year => ({ quarters: year === 2025 ? [1, 2] : [1] }),
      quarter: async (year, quarter) => {
        concurrent++; peak = Math.max(peak, concurrent);
        await Promise.resolve(); calls.push(`${year}/${quarter}`); concurrent--;
        if (quarter === 2) stopped = true;
      },
    });
    expect(calls).toEqual(["2025/1", "2025/2"]);
    expect(peak).toBe(1);
  });
  it("continua com o próximo ano se um arquivo histórico falhar", async () => {
    const calls: number[] = [];
    await prepareBenchYears([2025, 2024], {
      stopped: () => false,
      periods: async () => ({ quarters: [1] }),
      quarter: async year => { calls.push(year); if (year === 2025) throw new Error("ANS indisponível"); },
    });
    expect(calls).toEqual([2025, 2024]);
  });
});