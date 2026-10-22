import { describe, expect, it } from "vitest";
import { municipalHeatFill, normalizedMunicipalTotals } from "./municipalHeatColors";

describe("shared geographic municipal colors", () => {
  it("uses identical geographic tiers at the exact life boundaries", () => {
    for (const [total, alpha] of [[71, .42], [99, .42], [100, .56], [499, .56], [500, .7], [1000, .85], [5000, 1]]) {
      expect(municipalHeatFill(total, false)).toBe(`hsl(var(--primary) / ${alpha})`);
    }
    expect(municipalHeatFill(70, false)).toBe("hsl(var(--primary) / 0.14)");
    expect(municipalHeatFill(70, true)).toBe("hsl(var(--primary) / 0.3)");
    expect(municipalHeatFill(0, true)).toBe("hsl(var(--primary) / 0.08)");
    expect(municipalHeatFill(0, false)).toBe("hsl(var(--muted) / 0.55)");
  });
  it("matches municipalities independently by state and normalized name", () => {
    expect(normalizedMunicipalTotals({ MG: { "Uberaba": 10 }, GO: { "Catalão": 20 }, SP: { "São José do Rio Preto": 30 }, MS: { "Costa Rica": 40 } })).toEqual({ MG: { UBERABA: 10 }, GO: { CATALAO: 20 }, SP: { "SAO JOSE DO RIO PRETO": 30 }, MS: { "COSTA RICA": 40 } });
  });
});