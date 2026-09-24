import { useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { Loader2 } from "lucide-react";

const UF_CODE: Record<string, string> = { SP: "35", MG: "31", MS: "50", GO: "52" };
const UFS = Object.keys(UF_CODE);
const NAME_TO_UF: Record<string, string> = {
  "São Paulo": "SP", "Minas Gerais": "MG", "Mato Grosso do Sul": "MS", "Goiás": "GO",
};
const STATES_URL =
  "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/brazil-states.geojson";
const munUrl = (uf: string) =>
  `https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-${UF_CODE[uf]}-mun.json`;

const MIN_VIDAS = 10;
const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/['’`-]/g, " ").replace(/\s+/g, " ").trim();

type F = Feature<Geometry, { name?: string; _uf: string }>;

const CarteiraMapa = () => {
  const [feats, setFeats] = useState<F[] | null>(null);
  const [states, setStates] = useState<Feature<Geometry>[]>([]);
  const [vidas, setVidas] = useState<Record<string, number>>({});
  const [hover, setHover] = useState<{ n: string; uf: string; v: number; x: number; y: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [dados, st, ...muns] = await Promise.all([
        fetch("/data/ativos_por_cidade.json").then((r) => r.json()),
        fetch(STATES_URL).then((r) => r.json()),
        ...UFS.map((uf) => fetch(munUrl(uf)).then((r) => r.json())),
      ]);
      const m: Record<string, number> = {};
      for (const d of dados as { cidade: string; uf: string; vidas: number }[])
        m[`${d.uf}|${norm(d.cidade)}`] = d.vidas;
      setVidas(m);
      setStates((st as FeatureCollection).features.filter((f) => NAME_TO_UF[(f.properties as any)?.name]));
      setFeats(
        muns.flatMap((fc: FeatureCollection, i) =>
          fc.features.map((f) => ({ ...f, properties: { ...(f.properties ?? {}), _uf: UFS[i] } })) as F[],
        ),
      );
    })().catch((e) => setErr(String(e?.message ?? e)));
  }, []);

  const W = 800, H = 640;
  const path = useMemo(() => {
    if (!feats) return null;
    return geoPath(geoMercator().fitSize([W, H], { type: "FeatureCollection", features: feats }));
  }, [feats]);

  const regiao = useMemo(() => {
    const out = new Set<number>();
    if (!feats) return out;
    const alvo = new Set(["UBERABA", "UBERLANDIA", "ARAGUARI", "ITUIUTABA"]);
    const pts = new Set<string>();
    const coords = (g: any): number[][] =>
      g.type === "Polygon" ? g.coordinates.flat() : g.type === "MultiPolygon" ? g.coordinates.flat(2) : [];
    const key = (c: number[]) => `${c[0].toFixed(4)},${c[1].toFixed(4)}`;
    feats.forEach((f, i) => {
      if (f.properties._uf !== "MG") return;
      const n = norm(f.properties.name ?? "");
      if (alvo.has(n)) out.add(i);
      if (alvo.has(n) || n === "FRUTAL") coords(f.geometry).forEach((c) => pts.add(key(c)));
    });
    feats.forEach((f, i) => {
      if (!out.has(i) && coords(f.geometry).some((c) => pts.has(key(c)))) out.add(i);
    });
    return out;
  }, [feats]);

  const destacadas = useMemo(() => Object.values(vidas).filter((v) => v > MIN_VIDAS).length, [vidas]);

  if (err) return <div className="text-destructive text-sm">Erro: {err}</div>;
  if (!feats || !path)
    return (
      <div className="h-full flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando mapa...
      </div>
    );

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col p-4">
      <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-4 rounded-sm" style={{ background: "color-mix(in hsl, hsl(var(--primary)) 55%, hsl(var(--foreground)))" }} /> Mais de 1.000 vidas
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-4 rounded-sm" style={{ background: "color-mix(in hsl, hsl(var(--primary)) 78%, hsl(var(--foreground)))" }} /> Mais de 100 vidas
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-4 rounded-sm bg-primary/30" /> Uberaba, Uberlândia, Araguari, Ituiutaba e limítrofes (e de Frutal)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-4 rounded-sm bg-primary" /> Mais de {MIN_VIDAS} vidas ({destacadas} cidades)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-4 rounded-sm bg-muted border border-border" /> Até {MIN_VIDAS} vidas / sem vidas
        </span>
      </div>
      <div className="relative flex-1 min-h-0">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {feats.map((f, i) => {
            const n = f.properties.name ?? "";
            const uf = f.properties._uf;
            const v = vidas[`${uf}|${norm(n)}`] ?? 0;
            return (
              <path
                key={i}
                d={path(f) ?? ""}
                fill={
                  v > 1000
                    ? "color-mix(in hsl, hsl(var(--primary)) 55%, hsl(var(--foreground)))"
                    : v > 100
                      ? "color-mix(in hsl, hsl(var(--primary)) 78%, hsl(var(--foreground)))"
                    : v > MIN_VIDAS
                      ? "hsl(var(--primary))"
                      : regiao.has(i)
                        ? "hsl(var(--primary) / 0.3)"
                        : "hsl(var(--muted))"
                }
                stroke="hsl(var(--background))"
                strokeWidth={0.4}
                onMouseMove={(e) => {
                  const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  setHover({ n, uf, v, x: e.clientX - r.left, y: e.clientY - r.top });
                }}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
          {states.map((f, i) => (
            <path key={`s${i}`} d={path(f) ?? ""} fill="none" stroke="hsl(var(--foreground))" strokeWidth={1.4} pointerEvents="none" />
          ))}
          {feats
            .filter((f) => f.properties._uf === "MG" && norm(f.properties.name ?? "") === "UBERABA")
            .map((f, i) => (
              <path key={`ub${i}`} d={path(f) ?? ""} fill="none" stroke="hsl(var(--destructive))" strokeWidth={2} pointerEvents="none" />
            ))}
        </svg>
        {hover && (
          <div
            className="pointer-events-none absolute z-10 rounded-md border border-border bg-popover px-2 py-1 text-xs shadow-md"
            style={{ left: hover.x + 12, top: hover.y + 12 }}
          >
            <div className="font-semibold text-foreground">{hover.n} / {hover.uf}</div>
            <div className="text-muted-foreground tabular-nums">{hover.v.toLocaleString("pt-BR")} vidas</div>
          </div>
        )}
      </div>
    </section>
  );
};

export default CarteiraMapa;
