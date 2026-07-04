import { useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import { Loader2 } from "lucide-react";

// IBGE UF codes for municipality geojson from tbrugz/geodata-br
const UF_CODE: Record<string, string> = { SP: "35", MG: "31", MS: "50" };

const geoUrl = (uf: string) =>
  `https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-${UF_CODE[uf]}-mun.json`;

const STATES_URL =
  "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/brazil-states.geojson";
const NAME_TO_UF: Record<string, string> = {
  "São Paulo": "SP",
  "Minas Gerais": "MG",
  "Mato Grosso do Sul": "MS",
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
  ufs: ("SP" | "MG" | "MS")[];
  cityTotalsByUF: Record<string, Record<string, number>>;
}

type FeatWithUF = Feature<Geometry, { name?: string; _uf: string }>;

export function StateHeatMap({ ufs, cityTotalsByUF }: Props) {
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

      if (isArea) {
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
      }
    })().catch((e) => console.error("Falha ao carregar mapas", e));
    return () => {
      cancelled = true;
    };
  }, [key, isArea]);

  const width = 600;
  const height = 560;

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

  const pathFn = useMemo(() => {
    if (!features) return null;
    const fc: FeatureCollection = { type: "FeatureCollection", features };
    const projection = geoMercator().fitSize([width, height], fc);
    return geoPath(projection);
  }, [features]);

  const colorFor = (total: number) => {
    if (!total || total <= 0) return "hsl(var(--muted))";
    // Discrete tiers by absolute number of lives.
    // base < 300, +1 tone >=300, +2 >=1000, +3 >=3000, +4 >=5000
    const alphas = [0.35, 0.55, 0.75, 0.9, 1];
    let tier = 0;
    if (total >= 5000) tier = 4;
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
    <div className="relative w-full h-full flex items-center justify-center">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full max-h-full"
        role="img"
        aria-label={`Mapa de calor por município — ${ufs.join(", ")}`}
      >
        {features.map((f, i) => {
          const name = f.properties?.name ?? "";
          const uf = f.properties._uf;
          const total = normalizedByUF[uf]?.[normalize(name)] ?? 0;
          const d = pathFn(f) ?? "";
          return (
            <path
              key={i}
              d={d}
              fill={colorFor(total)}
              stroke={isArea ? "none" : "#e5e7eb"}
              strokeWidth={isArea ? 0 : 0.25}
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
              style={{ transition: "fill 120ms" }}
            />
          );
        })}
        {!isArea &&
          features.map((f, i) => (
            <path
              key={`outline-${i}`}
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
              strokeWidth={1.5}
              strokeLinejoin="round"
              pointerEvents="none"
            />
          ))}
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
