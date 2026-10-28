import { describe, expect, it } from "vitest";
import type { Feature, Geometry } from "geojson";
import { northernMunicipalArcs, partitionNorthernStateBoundary } from "./northernBoundaryDisplay";

const municipality = (name: string, uf: string, points: number[][]): Feature<Geometry, { name: string; _uf: string }> => ({
  type: "Feature", properties: { name, _uf: uf }, geometry: { type: "Polygon", coordinates: [points] },
});

describe("Northern border geographic selection", () => {
  for (const name of ["Paranaíba", "Cassilândia", "Chapadão do Sul"]) {
    it(`selects only the shared Goiás boundary of ${name}`, () => {
      const features = [municipality(name, "MS", [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]),
        municipality("Vizinha", "GO", [[0, 1], [1, 1], [1, 2], [0, 2], [0, 1]])];
      const before = JSON.stringify(features);
      expect(northernMunicipalArcs(features)).toEqual([[[1, 1], [0, 1]]]);
      expect(JSON.stringify(features)).toBe(before);
    });
  }
  it("does not select other municipalities", () => {
    expect(northernMunicipalArcs([
      municipality("Costa Rica", "MS", [[0, 0], [1, 0], [0, 0]]),
      municipality("Vizinha", "GO", [[0, 0], [1, 0], [0, 0]]),
    ])).toEqual([]);
  });
  it("partitions independent state geometry without changing or dropping its segments", () => {
    const geometry: Geometry = { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] };
    const before = JSON.stringify(geometry);
    const result = partitionNorthernStateBoundary(geometry, [[[1, 1.001], [0, 1.001]]]);
    expect(result.subtle.coordinates).toEqual([[[1, 1], [0, 1]]]);
    expect([...result.regular.coordinates, ...result.subtle.coordinates].reduce((sum, line) => sum + line.length - 1, 0)).toBe(4);
    expect(JSON.stringify(geometry)).toBe(before);
  });
});