import { describe, expect, it } from "vitest";
import { colunasDre, trimestresFechados } from "./dreTrimestres";

const ate = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe("DRE trimestral", () => {
  it("1T = jan a mar, 2T = abr a jun, 3T = jul a set, 4T = out a dez", () => {
    const cols = colunasDre(ate(12), 2026, "Trimestral");
    expect(cols.slice(0, 4).map((c) => [c.label, c.meses])).toEqual([
      ["1T2026", [1, 2, 3]], ["2T2026", [4, 5, 6]], ["3T2026", [7, 8, 9]], ["4T2026", [10, 11, 12]],
    ]);
  });
  it("mostra apenas trimestres fechados", () => {
    expect(trimestresFechados(ate(10))).toEqual([1, 2, 3]);
    expect(trimestresFechados(ate(2))).toEqual([]);
    const cols = colunasDre(ate(10), 2026, "Trimestral");
    expect(cols.map((c) => c.label)).toEqual(["1T2026", "2T2026", "3T2026", "Jan–Set/2026"]);
    expect(cols[3].meses).toEqual(ate(9));
  });
  it("Mensal continua com um mês por coluna e o acumulado do período", () => {
    const cols = colunasDre(ate(10), 2026);
    expect(cols).toHaveLength(11);
    expect(cols[0].label).toBe("Jan/2026");
    expect(cols[10]).toEqual({ label: "Jan–Out/2026", meses: ate(10), kind: "ano" });
  });
});
