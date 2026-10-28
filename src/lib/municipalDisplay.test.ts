import { describe, expect, it } from "vitest";
import type { Feature, Polygon } from "geojson";
import { smoothMunicipalDisplay } from "./maaGeometry";

describe("municipal display topology", () => {
  it("preserves municipality identities, lives and original geometry", () => {
    const source: Feature<Polygon>[] = [
      { type: "Feature", properties: { name: "A", lives: 1000 }, geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1.02, 0.2], [0.98, 0.4], [1, 1], [0, 1], [0, 0]]] } },
      { type: "Feature", properties: { name: "B", lives: 3000 }, geometry: { type: "Polygon", coordinates: [[[1, 0], [2, 0], [2, 1], [1, 1], [0.98, 0.4], [1.02, 0.2], [1, 0]]] } },
    ];
    const original = JSON.stringify(source);
    const result = smoothMunicipalDisplay(source);
    expect(JSON.stringify(source)).toBe(original);
    expect(result.map(f => f.properties)).toEqual([{ name: "A", lives: 1000 }, { name: "B", lives: 3000 }]);
    const a = result[0].geometry.coordinates[0];
    const b = result[1].geometry.coordinates[0];
    const shared = a.filter(p => p[0] > 0.9 && p[0] < 1.1);
    expect(shared.length).toBeGreaterThanOrEqual(2);
    for (const point of shared) expect(b).toContainEqual(point);
    expect(a.length).toBeLessThan(source[0].geometry.coordinates[0].length);
  });
});