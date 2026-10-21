import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import { Loader2 } from "lucide-react";

// IBGE UF codes for municipality geojson from tbrugz/geodata-br
const UF_CODE: Record<string, string> = { SP: "35", MG: "31", MS: "50", GO: "52" };

const geoUrl = (uf: string) =>
  `https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-${UF_CODE[uf]}-mun.json`;

const STATES_URL =
  "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/brazil-states.geojson";
const NAME_TO_UF: Record<string, string> = {
  "São Paulo": "SP",
  "Minas Gerais": "MG",
  "Mato Grosso do Sul": "MS",
  "Goiás": "GO",
};

const cache: Record<string, FeatureCollection> = {};
let statesCache: FeatureCollection | null = null;

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

interface Props {
  ufs: ("SP" | "MG" | "MS" | "GO")[];
  cityTotalsByUF: Record<string, Record<string, number>>;
  onSelectUF?: (uf: "SP" | "MG" | "MS" | "GO") => void;
  stateTotals?: Record<string, number>;
  outrosTotal?: number;
  trialScale?: boolean;
  core?: boolean;
}

type FeatWithUF = Feature<Geometry, { name?: string; _uf: string }>;

export function StateHeatMap({ ufs, cityTotalsByUF, onSelectUF, stateTotals, outrosTotal, trialScale, core }: Props) {
  const isArea = ufs.length > 1;
  const key = ufs.join("-");
  const [features, setFeatures] = useState<FeatWithUF[] | null>(null);
  const [stateOutlines, setStateOutlines] = useState<Feature<Geometry>[] | null>(null);
  const [hover, setHover] = useState<{ name: string; uf: string; total: number; x: number; y: number } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    setFeatures(null);
    setStateOutlines(null);
    (async () => {
      const results = await Promise.all(
        ufs.map(async (uf) => {
          if (!cache[uf]) {
            const res = await fetch(geoUrl(uf));
            cache[uf] = await res.json();
          }
          return cache[uf].features.map((f) => ({
            ...f,
            properties: { ...(f.properties ?? {}), _uf: uf },
          })) as FeatWithUF[];
        }),
      );
      if (cancelled) return;
      setFeatures(results.flat());

      if (!statesCache) {
        const res = await fetch(STATES_URL);
        statesCache = await res.json();
      }
      if (cancelled) return;
      const wanted = new Set(ufs as string[]);
      setStateOutlines(
        (statesCache!.features as Feature<Geometry, { name: string }>[]).filter(
          (f) => wanted.has(NAME_TO_UF[f.properties?.name] ?? ""),
        ),
      );
    })().catch((e) => console.error("Falha ao carregar mapas", e));
    return () => {
      cancelled = true;
    };
  }, [key, isArea]);

  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 560 });
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width: w, height: h } = e.contentRect;
      if (w > 50 && h > 50) setSize({ w: Math.round(w), h: Math.round(h) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [features]);
  const width = size.w;
  const height = size.h;

  const normalizedByUF = useMemo(() => {
    const out: Record<string, Record<string, number>> = {};
    for (const uf of ufs) {
      const m: Record<string, number> = {};
      for (const [k, v] of Object.entries(cityTotalsByUF[uf] ?? {})) m[normalize(k)] = v;
      out[uf] = m;
    }
    return out;
  }, [ufs, cityTotalsByUF]);

  const maxVal = useMemo(() => {
    let m = 0;
    for (const uf of ufs) {
      for (const v of Object.values(cityTotalsByUF[uf] ?? {})) if (v > m) m = v;
    }
    return m;
  }, [ufs, cityTotalsByUF]);

  // Centro principal: bloco contíguo de municípios com mais de 70 vidas que contém o maior município
  const coreData = useMemo(() => {
    if (!core || !features) return null;
    const rings = (g: any): number[][][] => (g.type === "Polygon" ? g.coordinates : g.type === "MultiPolygon" ? g.coordinates.flat() : []);
    const k = (c: number[]) => `${c[0].toFixed(4)},${c[1].toFixed(4)}`;
    const tot = features.map((f) => normalizedByUF[f.properties._uf]?.[normalize(f.properties?.name ?? "")] ?? 0);
    const owners = new Map<string, number[]>();
    features.forEach((f, i) => rings(f.geometry).flat().forEach((c) => { const key = k(c); const a = owners.get(key); if (!a) owners.set(key, [i]); else if (a[a.length - 1] !== i) a.push(i); }));
    const nb = (i: number) => { const s = new Set<number>(); rings(features[i].geometry).flat().forEach((c) => owners.get(k(c))?.forEach((j) => j !== i && s.add(j))); return s; };
    let start = 0; tot.forEach((t, i) => { if (t > tot[start]) start = i; });
    const set = new Set<number>([start]); const q = [start];
    while (q.length) { const i = q.shift()!; nb(i).forEach((j) => { if (!set.has(j) && tot[j] > 70) { set.add(j); q.push(j); } }); }
    const show = new Set<number>(set); set.forEach((i) => nb(i).forEach((j) => show.add(j)));
    const seg = (a: number[], b: number[]) => [k(a), k(b)].sort().join("|");
    const cnt = new Map<string, number>();
    set.forEach((i) => rings(features[i].geometry).forEach((r) => r.slice(1).forEach((c, n) => { const s = seg(r[n], c); cnt.set(s, (cnt.get(s) ?? 0) + 1); })));
    const lines: number[][][] = [];
    set.forEach((i) => rings(features[i].geometry).forEach((r) => {
      let cur: number[][] = [];
      r.slice(1).forEach((c, n) => { if (cnt.get(seg(r[n], c)) === 1) { if (!cur.length) cur.push(r[n]); cur.push(c); } else { if (cur.length > 1) lines.push(cur); cur = []; } });
      if (cur.length > 1) lines.push(cur);
    }));
    const total = [...set].reduce((s, i) => s + tot[i], 0);
    return { set, show, lines, total };
  }, [core, features, normalizedByUF]);

  const { pathFn, projection } = useMemo(() => {
    if (!features) return { pathFn: null, projection: null };
    const fc: FeatureCollection = { type: "FeatureCollection", features: coreData ? features.filter((_, i) => coreData.set.has(i)) : features };
    const projection = geoMercator().fitExtent([[4, 4], [width - 4, height - 4]], fc);
    return { pathFn: geoPath(projection), projection };
  }, [features, width, height, coreData]);
  const label = (x: number, y: number, t1: string, t2: string, k: string) => (
    <g key={k} transform={`translate(${x},${y})`} pointerEvents="none">
      <text textAnchor="middle" fontSize={14} fontWeight={700} fill="hsl(var(--foreground))" stroke="hsl(var(--background))" strokeWidth={3} paintOrder="stroke">{t1}</text>
      <text y={17} textAnchor="middle" fontSize={13} fontWeight={600} fill="hsl(var(--foreground))" stroke="hsl(var(--background))" strokeWidth={3} paintOrder="stroke">{t2}</text>
    </g>
  );

  const vizinhos = useMemo(() => {
    const out = new Set<number>();
    if (!trialScale || !features) return out;
    const coords = (g: any): number[][] =>
      g.type === "Polygon" ? g.coordinates.flat() : g.type === "MultiPolygon" ? g.coordinates.flat(2) : [];
    const k = (c: number[]) => `${c[0].toFixed(4)},${c[1].toFixed(4)}`;
    const tot = features.map((f) => normalizedByUF[f.properties._uf]?.[normalize(f.properties?.name ?? "")] ?? 0);
    const pts = new Set<string>();
    features.forEach((f, i) => { if (tot[i] > 70) coords(f.geometry).forEach((c) => pts.add(k(c))); });
    features.forEach((f, i) => { if (tot[i] <= 70 && coords(f.geometry).some((c) => pts.has(k(c)))) out.add(i); });
    return out;
  }, [trialScale, features, normalizedByUF]);

  const colorFor = (total: number, i = -1) => {
    if (trialScale) {
      if (!total || total <= 0) return vizinhos.has(i) ? "hsl(var(--primary) / 0.12)" : "hsl(var(--muted))";
      const lim = [100, 500, 1000, 5000];
      const alphas = [0.42, 0.56, 0.7, 0.85, 1];
      const t = lim.filter((l) => total >= l).length;
      return `hsl(var(--primary) / ${alphas[t]})`;
    }
    if (!total || total <= 0) return "hsl(var(--muted))";
    // Discrete tiers by absolute number of lives.
    // base < 300, +1 tone >=300, +2 >=1000, +3 >=3000, +4 >=5000
    const alphas = [0.35, 0.55, 0.75, 0.9, 1];
    let tier = 0;
    if (total > 7000) tier = 4;
    else if (total >= 3000) tier = 3;
    else if (total >= 1000) tier = 2;
    else if (total >= 300) tier = 1;
    return `hsl(var(--primary) / ${alphas[tier]})`;
  };

  if (!features || !pathFn) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando mapa...
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative w-full h-full min-h-[300px]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full"
        role="img"
        aria-label={`Mapa de calor por município — ${ufs.join(", ")}`}
      >
        {features.map((f, i) => {
          const name = f.properties?.name ?? "";
          const uf = f.properties._uf;
          const total = normalizedByUF[uf]?.[normalize(name)] ?? 0;
          if (coreData && !coreData.show.has(i)) return null;
          const d = pathFn(f) ?? "";
          return (
            <path
              key={i}
              d={d}
              fill={!trialScale ? colorFor(total, i) : total > 70 ? colorFor(total, i) : total > 0 ? (vizinhos.has(i) ? "hsl(var(--primary) / 0.3)" : "hsl(var(--primary) / 0.14)") : vizinhos.has(i) ? "hsl(var(--primary) / 0.08)" : "hsl(var(--muted) / 0.55)"}
              stroke={coreData ? "hsl(var(--background))" : trialScale ? (total > 70 ? "hsl(var(--background))" : "hsl(var(--border))") : "none"}
              strokeWidth={coreData ? 0.8 : trialScale ? (total > 70 ? 0.8 : 0.3) : 0}
              strokeLinejoin="round"
              onMouseMove={(e) => {
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                setHover({
                  name,
                  uf,
                  total,
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                });
              }}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelectUF?.(uf as any)}
              style={{ transition: "fill 120ms", cursor: onSelectUF ? "pointer" : "default" }}
            />
          );
        })}
        {!isArea && stateOutlines?.map((f, i) => (
          <path
            key={`uf-outline-${i}`}
            d={pathFn(f) ?? ""}
            fill="none"
            stroke="#000"
            strokeWidth={1.2}
            strokeLinejoin="round"
            pointerEvents="none"
          />
        ))}
        {isArea &&
          stateOutlines?.map((f, i) => (
            <path
              key={`state-outline-${i}`}
              d={pathFn(f) ?? ""}
              fill="none"
              stroke="#000"
              strokeWidth={coreData ? 2.5 : 1.5}
              strokeLinejoin="round"
              pointerEvents="none"
            />
          ))}
        {coreData && (
          <path d={pathFn({ type: "MultiLineString", coordinates: coreData.lines } as any) ?? ""} fill="none" stroke="hsl(var(--destructive))" strokeWidth={3} strokeLinejoin="round" pointerEvents="none" />
        )}
        {!coreData && stateTotals && stateOutlines?.map((f, i) => {
          const uf = NAME_TO_UF[(f.properties as any)?.name] ?? "";
          const [x, y] = pathFn.centroid(f);
          return label(x, y, uf, (stateTotals[uf] ?? 0).toLocaleString("pt-BR") + " vidas", `lbl-${i}`);
        })}
        {!coreData && outrosTotal != null && projection && (() => {
          const p = projection([-54.8, -16.2]);
          return p ? label(p[0], p[1], "Outros", outrosTotal.toLocaleString("pt-BR") + " vidas", "lbl-outros") : null;
        })()}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-border bg-popover px-2 py-1 text-xs shadow-md"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          <div className="font-semibold text-foreground">
            {hover.name} <span className="text-muted-foreground">/ {hover.uf}</span>
          </div>
          <div className="text-muted-foreground tabular-nums">
            {hover.total.toLocaleString("pt-BR")} vidas
          </div>
        </div>
      )}
    </div>
  );
}
