import type { Feature, Geometry, MultiLineString, Position } from "geojson";

const normalize = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
const targets = new Set(["PARANAIBA", "CASSILANDIA", "CHAPADAO DO SUL"]);
const key = (p: Position) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`;
const rings = (geometry: Geometry): Position[][] => geometry.type === "Polygon"
  ? geometry.coordinates : geometry.type === "MultiPolygon" ? geometry.coordinates.flat() : [];

// The northern arcs are the actual shared MS/GO municipal edges, not a latitude cutoff.
export function northernMunicipalArcs(features: Feature<Geometry, { name?: string; _uf: string }>[]): Position[][] {
  const goPoints = new Set(features.filter((f) => f.properties._uf === "GO")
    .flatMap((f) => rings(f.geometry).flat().map(key)));
  return features.filter((f) => f.properties._uf === "MS" && targets.has(normalize(f.properties.name ?? "")))
    .flatMap((f) => rings(f.geometry).flatMap((ring) => ring.slice(1).flatMap((b, i) => {
      const a = ring[i];
      return goPoints.has(key(a)) && goPoints.has(key(b)) ? [[a, b]] : [];
    })));
}

function distanceSquared(point: Position, a: Position, b: Position): number {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / length));
  return (point[0] - a[0] - t * dx) ** 2 + (point[1] - a[1] - t * dy) ** 2;
}

// State outlines come from a separate source; proximity reconciles their display paths only.
export function partitionNorthernStateBoundary(geometry: Geometry, arcs: Position[][]): { regular: MultiLineString; subtle: MultiLineString } {
  const regular: MultiLineString = { type: "MultiLineString", coordinates: [] };
  const subtle: MultiLineString = { type: "MultiLineString", coordinates: [] };
  for (const ring of rings(geometry)) {
    let run: Position[] = [];
    let previousSubtle: boolean | undefined;
    for (let i = 1; i < ring.length; i++) {
      const a = ring[i - 1], b = ring[i];
      const midpoint = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const isSubtle = arcs.some(([start, end]) => distanceSquared(midpoint, start, end) < 0.03 ** 2);
      if (previousSubtle !== undefined && isSubtle !== previousSubtle) {
        (previousSubtle ? subtle : regular).coordinates.push(run);
        run = [];
      }
      if (!run.length) run.push(a);
      run.push(b);
      previousSubtle = isSubtle;
    }
    if (run.length > 1) (previousSubtle ? subtle : regular).coordinates.push(run);
  }
  return { regular, subtle };
}