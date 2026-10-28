import simplify from "simplify-js";
import { topology as topology_ } from "topojson-server";
import { presimplify, quantile, simplify as simplifyTopo } from "topojson-simplify";
import { feature } from "topojson-client";

export type MapPoint = number[];

const includedMunicipalities: Record<string, readonly string[]> = {
  MG: ["LIMEIRA DO OESTE", "CAMPINA VERDE", "COMENDADOR GOMES"],
  GO: ["CHAPADAO DO CEU"],
  MS: ["COSTA RICA"],
};

export function isExplicitMAAMember(uf: string, name: string): boolean {
  const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  return includedMunicipalities[uf]?.includes(normalized) ?? false;
}

// Keep each exterior component, but never outline enclosed holes in red.
export function outerMAARings(rings: MapPoint[][]): MapPoint[][] {
  const area = (ring: MapPoint[]) => Math.abs(ring.reduce((sum, p, i) => {
    const next = ring[(i + 1) % ring.length];
    return sum + p[0] * next[1] - next[0] * p[1];
  }, 0));
  return rings.filter((ring, i) => ring.length >= 4 && !rings.some((other, j) =>
    i !== j && area(other) > area(ring) && insideMAA(ring[0], other),
  ));
}

export function insideMAA(point: MapPoint, ring: MapPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > point[1]) !== (b[1] > point[1]) &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

export function maaFillRole(member: boolean, inside: boolean, lives: number) {
  if (member) return "member";
  if (inside) return "island";
  return lives > 0 ? "outside-with-lives" : "outside-empty";
}

// Pixel-space simplification followed by short rounded corners, not changes to geography.
export function smoothMAAPath(points: MapPoint[]): string {
  if (points.length < 4) return "";
  const reduced = simplify(points.map(([x, y]) => ({ x, y })), 2, true);
  const first = reduced[0], last = reduced[reduced.length - 1];
  if (!first || !last) return "";
  if (first.x === last.x && first.y === last.y) reduced.pop();
  if (reduced.length < 3) return "";
  const start = reduced[0];
  const previous = reduced[reduced.length - 1];
  let d = `M${(previous.x + start.x) / 2},${(previous.y + start.y) / 2}`;
  reduced.forEach((p, i) => {
    const next = reduced[(i + 1) % reduced.length];
    d += `Q${p.x},${p.y} ${(p.x + next.x) / 2},${(p.y + next.y) / 2}`;
  });
  return d + "Z";
}
// Display-only smoothing of municipal borders through shared topology arcs, so neighbours stay gap-free.
export function smoothMunicipalDisplay<F extends GeoJSON.Feature>(features: F[], keepFraction = 0.12): F[] {
  if (features.length === 0) return features;
  const topology = topology_({ m: { type: "FeatureCollection", features } as GeoJSON.FeatureCollection });
  const prepared = presimplify(topology);
  const simplified = simplifyTopo(prepared, quantile(prepared, 1 - keepFraction));
  const out = feature(simplified, simplified.objects.m) as unknown as GeoJSON.FeatureCollection;
  return features.map((original, i) => ({ ...original, geometry: out.features[i]?.geometry ?? original.geometry }));
}
