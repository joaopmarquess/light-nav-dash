import type { Feature, Geometry } from "geojson";

export const normalizeMunicipality = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

export function normalizedMunicipalTotals(totals: Record<string, Record<string, number>>) {
  return Object.fromEntries(Object.entries(totals).map(([uf, cities]) => [uf, Object.fromEntries(Object.entries(cities).map(([name, total]) => [normalizeMunicipality(name), total]))]));
}

export function municipalHeatNeighbors(features: Feature<Geometry, { name?: string; _uf: string }>[], totals: Record<string, Record<string, number>>) {
  const coordinates = (geometry: Geometry): number[][] => geometry.type === "Polygon" ? geometry.coordinates.flat() : geometry.type === "MultiPolygon" ? geometry.coordinates.flat(2) : [];
  const key = (point: number[]) => `${point[0].toFixed(4)},${point[1].toFixed(4)}`;
  const values = features.map((feature) => totals[feature.properties._uf]?.[normalizeMunicipality(feature.properties.name ?? "")] ?? 0);
  const points = new Set<string>();
  features.forEach((feature, index) => { if (values[index] > 70) coordinates(feature.geometry).forEach((point) => points.add(key(point))); });
  return new Set(features.flatMap((feature, index) => values[index] <= 70 && coordinates(feature.geometry).some((point) => points.has(key(point))) ? [index] : []));
}

export function municipalHeatFill(total: number, neighbor: boolean) {
  if (total > 70) {
    const tier = [100, 500, 1000, 5000].filter((limit) => total >= limit).length;
    return `hsl(var(--primary) / ${[0.42, 0.56, 0.7, 0.85, 1][tier]})`;
  }
  if (total > 0) return neighbor ? "hsl(var(--primary) / 0.3)" : "hsl(var(--primary) / 0.14)";
  return neighbor ? "hsl(var(--primary) / 0.08)" : "hsl(var(--muted) / 0.55)";
}