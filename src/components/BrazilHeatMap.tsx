import { useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import { Loader2 } from "lucide-react";

const GEOJSON_URL =
  "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/brazil-states.geojson";

// Map full state name (as provided by the geojson) -> UF sigla
const NAME_TO_UF: Record<string, string> = {
  Acre: "AC",
  Alagoas: "AL",
  Amapá: "AP",
  Amazonas: "AM",
  Bahia: "BA",
  Ceará: "CE",
  "Distrito Federal": "DF",
  "Espírito Santo": "ES",
  Goiás: "GO",
  Maranhão: "MA",
  "Mato Grosso": "MT",
  "Mato Grosso do Sul": "MS",
  "Minas Gerais": "MG",
  Pará: "PA",
  Paraíba: "PB",
  Paraná: "PR",
  Pernambuco: "PE",
  Piauí: "PI",
  "Rio de Janeiro": "RJ",
  "Rio Grande do Norte": "RN",
  "Rio Grande do Sul": "RS",
  Rondônia: "RO",
  Roraima: "RR",
  "Santa Catarina": "SC",
  "São Paulo": "SP",
  Sergipe: "SE",
  Tocantins: "TO",
};

interface Props {
  ufTotals: Record<string, number>;
  onSelectUF?: (uf: "SP" | "MG" | "MS") => void;
}

const CLICKABLE: Record<string, true> = { SP: true, MG: true, MS: true };

// simple cache across renders
let cachedGeo: FeatureCollection | null = null;

export function BrazilHeatMap({ ufTotals, onSelectUF }: Props) {
  const [geo, setGeo] = useState<FeatureCollection | null>(cachedGeo);
  const [hover, setHover] = useState<{ uf: string; total: number; x: number; y: number } | null>(
    null,
  );

  useEffect(() => {
    if (cachedGeo) return;
    let cancelled = false;
    fetch(GEOJSON_URL)
      .then((r) => r.json())
      .then((data: FeatureCollection) => {
        if (cancelled) return;
        cachedGeo = data;
        setGeo(data);
      })
      .catch((e) => console.error("Falha ao carregar mapa do Brasil", e));
    return () => {
      cancelled = true;
    };
  }, []);

  const width = 600;
  const height = 560;

  const { pathFn, maxVal } = useMemo(() => {
    if (!geo) return { pathFn: null as ReturnType<typeof geoPath> | null, maxVal: 0 };
    const projection = geoMercator().fitSize([width, height], geo);
    const max = Math.max(0, ...Object.values(ufTotals));
    return { pathFn: geoPath(projection), maxVal: max };
  }, [geo, ufTotals]);

  const colorFor = (total: number) => {
    if (!total || maxVal <= 0) return "hsl(var(--muted))";
    const t = Math.pow(total / maxVal, 0.5); // sqrt scale for better contrast
    // interpolate from light to primary color
    const alpha = 0.15 + t * 0.85;
    return `hsl(var(--primary) / ${alpha.toFixed(3)})`;
  };

  if (!geo || !pathFn) {
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
        aria-label="Mapa de calor do Brasil por UF"
      >
        {/* Country outline: thick black stroke drawn first, gets covered on internal borders by subsequent fills */}
        {(geo.features as Feature<Geometry, { name: string }>[]).map((f, i) => (
          <path
            key={`outline-${i}`}
            d={pathFn(f) ?? ""}
            fill="none"
            stroke="#000"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ))}
        {(geo.features as Feature<Geometry, { name: string }>[]).map((f, i) => {
          const uf = NAME_TO_UF[f.properties?.name] ?? "";
          const total = ufTotals[uf] ?? 0;
          const d = pathFn(f) ?? "";
          const clickable = !!(onSelectUF && CLICKABLE[uf]);
          return (
            <path
              key={i}
              d={d}
              fill={colorFor(total)}
              stroke="#4b5563"
              strokeWidth={0.6}
              onMouseMove={(e) => {
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                setHover({
                  uf: uf || f.properties?.name,
                  total,
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                });
              }}
              onMouseLeave={() => setHover(null)}
              onClick={() => {
                if (clickable) onSelectUF!(uf as "SP" | "MG" | "MS");
              }}
              style={{ transition: "fill 120ms", cursor: clickable ? "pointer" : "default" }}
            />
          );
        })}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-border bg-popover px-2 py-1 text-xs shadow-md"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          <div className="font-semibold text-foreground">{hover.uf}</div>
          <div className="text-muted-foreground tabular-nums">
            {hover.total.toLocaleString("pt-BR")} vidas
          </div>
        </div>
      )}
    </div>
  );
}
