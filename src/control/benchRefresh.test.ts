import { describe, expect, it } from "vitest";
import { refreshBenchYears, type BenchRefreshProgress } from "./benchRefresh";

describe("atualização manual de todos os anos do menu", () => {
  it("atualiza todos os trimestres de cada ano sequencialmente com progresso de 0 a 100%", async () => {
    const calls: string[] = [];
    const progress: BenchRefreshProgress[] = [];
    let concurrent = 0; let peak = 0;
    await refreshBenchYears([2026, 2025, 2015], {
      periods: async year => ({ quarters: year === 2026 ? [2, 1] : [1, 2, 3, 4] }),
      quarter: async (year, quarter) => { concurrent++; peak = Math.max(peak, concurrent); await Promise.resolve(); calls.push(`${year}/${quarter}`); concurrent--; },
      progress: state => progress.push(state), stopped: () => false,
    });
    expect(calls).toEqual(["2026/1", "2026/2", "2025/1", "2025/2", "2025/3", "2025/4", "2015/1", "2015/2", "2015/3", "2015/4"]);
    expect(peak).toBe(1);
    expect(progress[0]).toEqual({ completed: 0, total: 0 });
    expect(progress.at(-1)).toMatchObject({ completed: 10, total: 10 });
  });
  it("continua após uma falha sem indicar 100%", async () => {
    const calls: number[] = []; const progress: BenchRefreshProgress[] = [];
    await expect(refreshBenchYears([2026, 2015], {
      periods: async () => ({ quarters: [1, 2] }),
      quarter: async (year, quarter) => { calls.push(year); if (year === 2026 && quarter === 1) throw new Error("falhou"); },
      progress: state => progress.push(state), stopped: () => false,
    })).rejects.toThrow("2026/1º tri");
    expect(calls).toEqual([2026, 2026, 2015, 2015]);
    expect(progress.at(-1)).toMatchObject({ completed: 3, total: 4 });
  });
  it("não inicia outros arquivos depois da interrupção", async () => {
    let stopped = false; const calls: number[] = [];
    await expect(refreshBenchYears([2026], {
      periods: async () => ({ quarters: [1, 2] }),
      quarter: async (_, quarter) => { calls.push(quarter); stopped = true; },
      progress: () => undefined, stopped: () => stopped,
    })).rejects.toThrow("interrompida");
    expect(calls).toEqual([1]);
  });
});