import { useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import { Loader2 } from "lucide-react";

// IBGE UF codes for municipality geojson from tbrugz/geodata-br
const UF_CODE: Record<string, string> = { SP: "35", MG: "31", MS: "50" };

const geoUrl = (uf: string) =>
  `https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-${UF_CODE[uf]}-mun.json`;

const cache: Record<string, FeatureCollection> = {};

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

interface Props {
  uf: "SP" | "MG" | "MS";
  cityTotals: Record<string, number>;
}

export function StateHeatMap({ uf, cityTotals }: Props) {
  const [geo, setGeo] = useState<FeatureCollection | null>(cache[uf] ?? null);
  const [hover, setHover] = useState<{ name: string; total: number; x: number; y: number } | null>(
    null,
  );

  useEffect(() => {
    setGeo(cache[uf] ?? null);
    if (cache[uf]) return;
    let cancelled = false;
    fetch(geoUrl(uf))
      .then((r) => r.json())
      .then((data: FeatureCollection) => {
        if (cancelled) return;
        cache[uf] = data;
        setGeo(data);
      })
      .catch((e) => console.error("Falha ao carregar mapa de", uf, e));
    return () => {
      cancelled = true;
    };
  }, [uf]);

  const width = 600;
  const height = 560;

  const normalizedCity = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(cityTotals)) out[normalize(k)] = v;
    return out;
  }, [cityTotals]);

  const { pathFn, maxVal } = useMemo(() => {
    if (!geo) return { pathFn: null as ReturnType<typeof geoPath> | null, maxVal: 0 };
    const projection = geoMercator().fitSize([width, height], geo);
    const max = Math.max(0, ...Object.values(cityTotals));
    return { pathFn: geoPath(projection), maxVal: max };
  }, [geo, cityTotals]);

  const colorFor = (total: number) => {
    if (!total || maxVal <= 0) return "hsl(var(--muted))";
    const t = Math.pow(total / maxVal, 0.5);
    const alpha = 0.15 + t * 0.85;
    return `hsl(var(--primary) / ${alpha.toFixed(3)})`;
  };

  if (!geo || !pathFn) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando mapa de {uf}...
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
        aria-label={`Mapa de calor de ${uf} por município`}
      >
        {(geo.features as Feature<Geometry, { name?: string }>[]).map((f, i) => (
          <path
            key={`outline-${i}`}
            d={pathFn(f) ?? ""}
            fill="none"
            stroke="#000"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        ))}
        {(geo.features as Feature<Geometry, { name?: string }>[]).map((f, i) => {
          const name = f.properties?.name ?? "";
          const total = normalizedCity[normalize(name)] ?? 0;
          const d = pathFn(f) ?? "";
          return (
            <path
              key={i}
              d={d}
              fill={colorFor(total)}
              stroke="#4b5563"
              strokeWidth={0.3}
              onMouseMove={(e) => {
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                setHover({
                  name,
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
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-border bg-popover px-2 py-1 text-xs shadow-md"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          <div className="font-semibold text-foreground">{hover.name}</div>
          <div className="text-muted-foreground tabular-nums">
            {hover.total.toLocaleString("pt-BR")} vidas
          </div>
        </div>
      )}
    </div>
  );
}
