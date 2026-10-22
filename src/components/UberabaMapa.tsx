import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { Download, Layers, Loader2, Maximize, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { geographicToday, useCarteiraTrialGeo } from "@/hooks/useCarteiraTrialGeo";
import { municipalHeatFill, municipalHeatNeighbors, normalizedMunicipalTotals } from "@/lib/municipalHeatColors";
import { isAdditionalUberabaStudyMember } from "@/lib/uberabaStudyArea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Malhas municipais do IBGE (base oficial)
const SRC: Record<string, string> = {
  MG: "https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-31-mun.json",
  SP: "https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-35-mun.json",
  GO: "https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-52-mun.json",
  MS: "https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-50-mun.json",
};
const COR = { g0: "hsl(var(--uberaba-map-center))", g1: "hsl(var(--uberaba-map-ring-one))", g2: "hsl(var(--uberaba-map-ring-two))", g3: "hsl(var(--uberaba-map-ring-three))", out: "hsl(var(--uberaba-map-background))" };
const W = 1600, H = 900; // 16:9
const DEFAULT_ZOOM = { k: 1 / 1.5, x: (W / 2) * (1 - 1 / 1.5), y: (H / 2) * (1 - 1 / 1.5) };

type F = Feature<Geometry, { name: string; _uf: string }>;
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
const pts = (g: any): number[][] =>
  g.type === "Polygon" ? g.coordinates.flat() : g.type === "MultiPolygon" ? g.coordinates.flat(2) : [];

// Contiguidade: dois municípios são vizinhos se compartilham vértices de fronteira (tolerância ~150 m)
const TOL = 0.0015;
function vizinhanca(feats: F[]) {
  const cell = (x: number) => Math.floor(x / TOL);
  const grid = new Map<string, Set<number>>();
  const all = feats.map((f) => pts(f.geometry));
  all.forEach((ps, i) =>
    ps.forEach(([x, y]) => {
      const k = `${cell(x)},${cell(y)}`;
      const members = grid.get(k) ?? new Set<number>();
      members.add(i);
      grid.set(k, members);
    }),
  );
  const nb = feats.map(() => new Map<number, number>());
  all.forEach((ps, i) =>
    ps.forEach(([x, y]) => {
      const cx = cell(x), cy = cell(y);
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          grid.get(`${cx + dx},${cy + dy}`)?.forEach((j) => j !== i && nb[i].set(j, (nb[i].get(j) ?? 0) + 1));
    }),
  );
  // exige ≥3 pontos de contato para excluir toques em um único vértice
  return nb.map((m) => new Set([...m].filter(([, c]) => c >= 3).map(([j]) => j)));
}

const UberabaMapa = ({ embedded = false, selectedDate, toolbarTarget }: { embedded?: boolean; selectedDate?: string; toolbarTarget?: HTMLElement | null }) => {
  const [geographic, setGeographic] = useState(false);
  const { data: rows, isLoading: loadingColors, error: colorsError } = useCarteiraTrialGeo(selectedDate ?? geographicToday());
  const [feats, setFeats] = useState<F[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [br, setBr] = useState<Feature<Geometry>[]>([]);
  const [tip, setTip] = useState<{ t: string; x: number; y: number } | null>(null);
  const [z, setZ] = useState(DEFAULT_ZOOM);
  const zRef = useRef(z); zRef.current = z;
  const drag = useRef<{ x: number; y: number } | null>(null);
  const toSvg = (cx: number, cy: number) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return [0, 0];
    const s = Math.min(r.width / W, r.height / H);
    return [(cx - r.left - (r.width - W * s) / 2) / s, (cy - r.top - (r.height - H * s) / 2) / s];
  };
  const zoomAt = (px: number, py: number, f: number) => {
    const o = zRef.current;
    const k = Math.min(40, Math.max(0.08, o.k * f));
    const q = k / o.k;
    setZ({ k, x: px - (px - o.x) * q, y: py - (py - o.y) * q });
  };
  useEffect(() => {
    fetch("https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/brazil-states.geojson")
      .then((r) => r.json()).then((fc: FeatureCollection) => setBr(fc.features)).catch(() => {});
  }, []);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const h = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const [px, py] = toSvg(e.clientX, e.clientY);
      zoomAt(px, py, Math.exp(-dy * 0.0015));
    };
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  });

  useEffect(() => {
    Promise.all(Object.entries(SRC).map(([uf, u]) => fetch(u).then((r) => r.json()).then((fc: FeatureCollection) =>
      fc.features.map((f) => ({ ...f, properties: { name: (f.properties as any)?.name ?? "", _uf: uf } })) as F[])))
      .then((r) => {
        setFeats(r.flat());
      })
      .catch((e) => setErr(String(e?.message ?? e)));
  }, []);

  const calc = useMemo(() => {
    if (!feats) return null;
    // Preserve the original MG/SP study rings and framing; added geometry only supplies color context.
    const regional = feats.flatMap((f, i) => ["MG", "SP"].includes(f.properties._uf) && pts(f.geometry).some(([x, y]) => x > -51.5 && x < -45.5 && y > -21.8 && y < -17.8) ? [i] : []);
    const regionalNeighbors = vizinhanca(regional.map((i) => feats[i]));
    const nb = feats.map(() => new Set<number>());
    regional.forEach((index, i) => { nb[index] = new Set([...regionalNeighbors[i]].map((j) => regional[j])); });
    const u = feats.findIndex((f) => f.properties._uf === "MG" && norm(f.properties.name) === "UBERABA");
    const g1 = new Set(nb[u]);
    const g2 = new Set<number>();
    g1.forEach((i) => nb[i].forEach((j) => j !== u && !g1.has(j) && g2.add(j)));
    // 3º anel: limítrofes do 2º anel situados a oeste de Uberaba (centroide com longitude menor)
    const lon = (i: number) => { const p = pts(feats[i].geometry); return p.reduce((a, c) => a + c[0], 0) / p.length; };
    const uLon = lon(u);
    const g3 = new Set<number>();
    g2.forEach((i) => nb[i].forEach((j) => j !== u && !g1.has(j) && !g2.has(j) && lon(j) < uLon && g3.add(j)));
    // ajustes pedidos: tira Barretos e Morro Agudo; inclui Catalão e São Simão (GO)
    const EXC = ["SP|BARRETOS", "SP|MORRO AGUDO"], INC = ["GO|CATALAO", "GO|SAO SIMAO"];
    const kf = (i: number) => `${feats[i].properties._uf}|${norm(feats[i].properties.name)}`;
    [...g3].forEach((i) => EXC.includes(kf(i)) && g3.delete(i));
    [...g3].forEach((i) => feats[i].properties._uf === "GO" && !INC.includes(kf(i)) && g3.delete(i));
    feats.forEach((_, i) => INC.includes(kf(i)) && !g1.has(i) && !g2.has(i) && g3.add(i));
    const foco = [...[u, ...g1, ...g2, ...g3].map((i) => feats[i]), ...feats.filter((f) => f.properties._uf === "SP" && norm(f.properties.name) === "SAO JOSE DO RIO PRETO")];
    const proj = geoMercator().fitExtent([[30, 30], [W - 30, H - 30]], { type: "FeatureCollection", features: foco });
    const path = geoPath(proj);
    // Explicit green-area additions do not change the existing projection or study rings.
    feats.forEach((f, i) => {
      if (isAdditionalUberabaStudyMember(f.properties._uf, f.properties.name) && !g1.has(i) && !g2.has(i)) g3.add(i);
    });
    const grupo = (i: number) => (i === u ? 0 : g1.has(i) ? 1 : g2.has(i) ? 2 : g3.has(i) ? 4 : 3);
    console.info("[Mapa Uberaba] 1º anel:", [...g1].map((i) => feats[i].properties.name).sort().join(", "));
    console.info("[Mapa Uberaba] 2º anel:", [...g2].map((i) => `${feats[i].properties.name}/${feats[i].properties._uf}`).sort().join(", "));
    return { u, g1, g2, g3, path, proj, grupo };
  }, [feats]);

  const heatTotals = useMemo(() => {
    const totals: Record<string, Record<string, number>> = {};
    for (const row of rows ?? []) {
      const cities = totals[row.uf] ?? (totals[row.uf] = {});
      cities[row.cidade] = (cities[row.cidade] ?? 0) + row.ativos;
    }
    return normalizedMunicipalTotals(totals);
  }, [rows]);
  const heatNeighbors = useMemo(() => feats ? municipalHeatNeighbors(feats, heatTotals) : new Set<number>(), [feats, heatTotals]);

  // Divisa MG/SP = trechos compartilhados entre municípios dos dois estados (desenho = contorno estadual)
  const ufOutline = useMemo(() => {
    if (!feats || !calc) return [];
    return ["MG", "SP"].map((uf) => feats.filter((f) => f.properties._uf === uf));
  }, [feats, calc]);

  const labels = useMemo(() => {
    if (!feats || !calc) return [];
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const out: { x: number; y: number; t: string; g: number; lx?: number; ly?: number }[] = [];
    const order = feats.map((_, i) => i).sort((a, b) => (calc.grupo(a) % 4 + (calc.grupo(a) === 4 ? 2.5 : 0)) - (calc.grupo(b) % 4 + (calc.grupo(b) === 4 ? 2.5 : 0)));
    for (const i of order) {
      const g0 = calc.grupo(i); const g = g0 === 4 ? 2 : g0;
      if (g === 3) continue;
      const [cx, cy0] = calc.path.centroid(feats[i]); const cy = g === 0 ? cy0 + 22 : cy0;
      if (!isFinite(cx) || cx < 10 || cx > W - 10 || cy < 70 || cy > H - 10) continue;
      const t = g === 0 ? "UBERABA" : feats[i].properties.name;
      const fs = g === 0 ? 22 : g === 1 ? 14 : g === 2 ? 11 : 9;
      const w = t.length * fs * 0.58, h = fs + 2;
      const hit = (x: number, y: number) => placed.some((p) => Math.abs(p.x - x) < (p.w + w) / 2 && Math.abs(p.y - y) < (p.h + h) / 2);
      let pos: [number, number] | null = null;
      for (const [dx, dy] of [[0, 0], [0, -h], [0, h], [w / 2 + 6, 0], [-w / 2 - 6, 0], [0, -2 * h], [0, 2 * h]]) {
        if (!hit(cx + dx, cy + dy)) { pos = [cx + dx, cy + dy]; break; }
      }
      if (!pos) { if (g < 3) pos = [cx, cy]; else continue; }
      placed.push({ x: pos[0], y: pos[1], w, h });
      const moved = Math.hypot(pos[0] - cx, pos[1] - cy) > h * 1.5;
      out.push({ x: pos[0], y: pos[1], t, g, ...(moved && g < 3 ? { lx: cx, ly: cy } : {}) });
    }
    return out;
  }, [feats, calc]);

  const exportar = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const copy = svg.cloneNode(true) as SVGSVGElement;
    const originals = svg.querySelectorAll("[fill], [stroke]");
    copy.querySelectorAll("[fill], [stroke]").forEach((element, index) => {
      const original = originals[index];
      if (!original) return;
      const computed = getComputedStyle(original);
      if (element.hasAttribute("fill")) element.setAttribute("fill", computed.fill);
      if (element.hasAttribute("stroke")) element.setAttribute("stroke", computed.stroke);
    });
    const xml = new XMLSerializer().serializeToString(copy);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 3840; c.height = 2160;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = `hsl(${getComputedStyle(document.documentElement).getPropertyValue("--card").trim()})`;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const a = document.createElement("a");
      a.download = "Bensaude_Uberaba_Onde_Queremos_Atuar.png";
      a.href = c.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  };

  const viewToggle = <TooltipProvider><Tooltip><TooltipTrigger asChild>
    <Button size="icon" variant={geographic ? "secondary" : "outline"} aria-label="Alternar cores do mapa" aria-pressed={geographic} disabled={loadingColors || Boolean(colorsError)} onClick={() => setGeographic((value) => !value)} className="h-12 w-12 [&_svg]:size-6">
      <Layers />
    </Button>
  </TooltipTrigger><TooltipContent>Alternar cores do mapa</TooltipContent></Tooltip></TooltipProvider>;

  if (err) return <div className="text-sm text-destructive">Erro ao carregar a malha municipal: {err}</div>;
  if (!feats || !calc)
    return <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando malha municipal…</div>;

  const [mgX, mgY] = calc.proj([-47.2, -18.6]) ?? [0, 0];
  const [spX, spY] = calc.proj([-48.6, -20.9]) ?? [0, 0];
  const toolbar = <div className="flex shrink-0 flex-wrap items-center gap-2">
        {viewToggle}
        {colorsError && <span className="text-sm text-destructive">Não foi possível carregar as cores municipais.</span>}
        <div className="ml-auto flex flex-wrap gap-2">
        <Button size="icon" variant="outline" title="Aproximar" onClick={() => zoomAt(W / 2, H / 2, 1.5)}><Plus className="h-4 w-4" /></Button>
        <Button size="icon" variant="outline" title="Afastar" onClick={() => zoomAt(W / 2, H / 2, 1 / 1.5)}><Minus className="h-4 w-4" /></Button>
        <Button size="icon" variant="outline" title="Voltar ao recorte" onClick={() => setZ(DEFAULT_ZOOM)}><Maximize className="h-4 w-4" /></Button>
        <Button size="sm" variant="outline" onClick={exportar}><Download className="mr-2 h-4 w-4" />Exportar PNG 16:9 (4K)</Button>
        </div>
      </div>;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {toolbarTarget ? createPortal(toolbar, toolbarTarget) : toolbar}
      <div className={`relative w-full overflow-hidden rounded-lg border border-border bg-card ${embedded ? "min-h-0 flex-1" : "aspect-video"}`}>
        <svg ref={svgRef} role="img" aria-label="Mapa Uberaba" xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} className="h-full w-full cursor-grab touch-none active:cursor-grabbing" fontFamily="Arial, Helvetica, sans-serif"
          onPointerDown={(e) => { (e.currentTarget as Element).setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY }; }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const [ax, ay] = toSvg(drag.current.x, drag.current.y), [bx, by] = toSvg(e.clientX, e.clientY);
            drag.current = { x: e.clientX, y: e.clientY };
            setZ((o) => ({ ...o, x: o.x + bx - ax, y: o.y + by - ay }));
          }}
          onPointerUp={() => (drag.current = null)}>
          <rect width={W} height={H} fill="hsl(var(--background))" />
          <g transform={`translate(${z.x},${z.y}) scale(${z.k})`}>
          {br.map((f, i) => <path key={`br${i}`} d={calc.path(f) ?? ""} fill={COR.out} stroke="none" />)}
          {!geographic && feats.map((f, i) => calc.grupo(i) === 3 && (
            <path key={i} data-background-municipality={`${f.properties._uf}|${norm(f.properties.name)}`} d={calc.path(f) ?? ""} fill={COR.out} stroke="hsl(var(--uberaba-map-background-border))" strokeWidth={0.6}
              onMouseMove={(e) => { const r = svgRef.current?.parentElement?.getBoundingClientRect(); if (r) setTip({ t: f.properties.name, x: e.clientX - r.left, y: e.clientY - r.top }); }}
              onMouseLeave={() => setTip(null)} />
          ))}
          {!geographic && [...calc.g2].map((i) => <path key={i} d={calc.path(feats[i]) ?? ""} fill={COR.g2} stroke="#3C4043" strokeWidth={1} />)}
          {ufOutline.map((fs, k) => fs.map((f, i) => (
            <path key={`uf${k}-${i}`} d={calc.path(f) ?? ""} fill="none" stroke="none" />
          )))}
          {!geographic && [...calc.g3].map((i) => <path key={`g3${i}`} data-study-municipality={`${feats[i].properties._uf}|${norm(feats[i].properties.name)}`} d={calc.path(feats[i]) ?? ""} fill={COR.g3} stroke="#3C4043" strokeWidth={0.8} strokeDasharray="3 2" />)}
          {!geographic && [...calc.g1].map((i) => <path key={i} d={calc.path(feats[i]) ?? ""} fill={COR.g1} stroke="#FFFFFF" strokeWidth={2} />)}
          {!geographic && <path d={calc.path(feats[calc.u]) ?? ""} fill={COR.g0} stroke="#FFFFFF" strokeWidth={2.5} />}
          {geographic && feats.map((f, i) => {
            const total = heatTotals[f.properties._uf]?.[norm(f.properties.name)] ?? 0;
            return <path key={`heat-${i}`} data-background-municipality={total <= 0 ? `${f.properties._uf}|${norm(f.properties.name)}` : undefined} data-municipality={`${f.properties._uf}|${norm(f.properties.name)}`} d={calc.path(f) ?? ""} fill={total > 0 ? municipalHeatFill(total, heatNeighbors.has(i)) : COR.out} stroke={total <= 0 ? "hsl(var(--uberaba-map-background-border))" : total > 70 ? "hsl(var(--background))" : "hsl(var(--border))"} strokeWidth={total <= 0 ? 0.6 : total > 70 ? 0.8 : 0.3}
              onMouseMove={(e) => { const r = svgRef.current?.parentElement?.getBoundingClientRect(); if (r) setTip({ t: `${f.properties.name}/${f.properties._uf}`, x: e.clientX - r.left, y: e.clientY - r.top }); }} onMouseLeave={() => setTip(null)} />;
          })}
          {!geographic && (() => {
            const rp = feats.find((f) => f.properties._uf === "SP" && norm(f.properties.name) === "SAO JOSE DO RIO PRETO");
            return rp && <path d={calc.path(rp) ?? ""} fill="hsl(var(--uberaba-map-reference))" stroke="hsl(var(--map-municipal-border))" strokeWidth={2.5} />;
          })()}
          <DivisaUF feats={feats} path={calc.path} />
          <DivisaMGOutros feats={feats} path={calc.path} />
          {labels.map((l, k) => (
            <g key={k} pointerEvents="none">
              {l.lx != null && <line x1={l.lx} y1={l.ly} x2={l.x} y2={l.y} stroke="#5F6368" strokeWidth={0.7} />}
              <text x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle"
                fontSize={l.g === 0 ? 22 : l.g === 1 ? 14 : l.g === 2 ? 11 : 9}
                fontWeight={l.g === 0 ? 800 : 700}
                fill="#000000">{l.t}</text>
            </g>
          ))}
          {[
            { uf: "MG", n: "UBERABA", t: null },
            { uf: "SP", n: "SAO JOSE DO RIO PRETO", t: "São José do Rio Preto" },
          ].map((p) => {
            const f = feats.find((x) => x.properties._uf === p.uf && norm(x.properties.name) === p.n);
            if (!f) return null;
            const [x, y] = calc.path.centroid(f);
            return (
              <g key={p.n} transform={`translate(${x},${y})`} pointerEvents="none">
                <path d="M0 0 C-3 -9 -12 -13 -12 -22 A12 12 0 1 1 12 -22 C12 -13 3 -9 0 0Z" fill="#D93025" stroke="#FFFFFF" strokeWidth={1.5} />
                <circle cx={0} cy={-22} r={4.5} fill="#FFFFFF" />
                {p.t && <text x={16} y={-20} fontSize={15} fontWeight={800} fill="#000000">{p.t}</text>}
              </g>
            );
          })}
          <text x={mgX} y={mgY} fontSize={34} fontWeight={700} fill="#80868B" opacity={0.55}>MG</text>
          <text x={spX} y={spY} fontSize={34} fontWeight={700} fill="#80868B" opacity={0.55}>SP</text>
          {br.map((f, i) => <path key={`bro${i}`} d={calc.path(f) ?? ""} fill="none" stroke="#202124" strokeWidth={1.2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" pointerEvents="none" />)}
          </g>
        </svg>
        {tip && <div className="pointer-events-none absolute text-xs font-bold text-foreground" style={{ left: tip.x + 10, top: tip.y - 18 }}>{tip.t}</div>}
      </div>
    </div>
  );
};

// Divisa MG/SP: arestas de municípios de MG que coincidem com arestas de municípios de SP
function DivisaUF({ feats, path }: { feats: F[]; path: ReturnType<typeof geoPath> }) {
  const d = useMemo(() => {
    const k = (c: number[]) => `${c[0].toFixed(3)},${c[1].toFixed(3)}`;
    const sp = new Set<string>();
    feats.forEach((f) => f.properties._uf === "SP" && pts(f.geometry).forEach((c) => sp.add(k(c))));
    const lines: number[][][] = [];
    const rings = (g: any): number[][][] => (g.type === "Polygon" ? g.coordinates : g.type === "MultiPolygon" ? g.coordinates.flat() : []);
    feats.forEach((f) => {
      if (f.properties._uf !== "MG") return;
      rings(f.geometry).forEach((r) => {
        let cur: number[][] = [];
        r.forEach((c) => {
          if (sp.has(k(c))) cur.push(c);
          else { if (cur.length > 1) lines.push(cur); cur = []; }
        });
        if (cur.length > 1) lines.push(cur);
      });
    });
    return path({ type: "MultiLineString", coordinates: lines } as any) ?? "";
  }, [feats, path]);
  return <path d={d} fill="none" stroke="#202124" strokeWidth={2.2} strokeLinejoin="round" pointerEvents="none" />;
}

// Divisa de MG com GO/MS (oeste e norte): arestas de MG que não são compartilhadas com outro município de MG nem com SP
function DivisaMGOutros({ feats, path }: { feats: F[]; path: ReturnType<typeof geoPath> }) {
  const d = useMemo(() => {
    const k = (c: number[]) => `${c[0].toFixed(3)},${c[1].toFixed(3)}`;
    const rings = (g: any): number[][][] => (g.type === "Polygon" ? g.coordinates : g.type === "MultiPolygon" ? g.coordinates.flat() : []);
    const sp = new Set<string>();
    feats.forEach((f) => f.properties._uf === "SP" && pts(f.geometry).forEach((c) => sp.add(k(c))));
    const cnt = new Map<string, number>();
    const seg = (a: number[], b: number[]) => [k(a), k(b)].sort().join("|");
    const mg = feats.filter((f) => f.properties._uf === "MG");
    mg.forEach((f) => rings(f.geometry).forEach((r) => r.slice(1).forEach((c, i) => { const s = seg(r[i], c); cnt.set(s, (cnt.get(s) ?? 0) + 1); })));
    const lines: number[][][] = [];
    mg.forEach((f) => rings(f.geometry).forEach((r) => {
      let cur: number[][] = [];
      r.slice(1).forEach((c, i) => {
        const a = r[i];
        const ext = cnt.get(seg(a, c)) === 1 && !(sp.has(k(a)) && sp.has(k(c)));
        if (ext) { if (!cur.length) cur.push(a); cur.push(c); }
        else { if (cur.length > 1) lines.push(cur); cur = []; }
      });
      if (cur.length > 1) lines.push(cur);
    }));
    return path({ type: "MultiLineString", coordinates: lines } as any) ?? "";
  }, [feats, path]);
  return <path d={d} fill="none" stroke="#202124" strokeWidth={2.2} strokeLinejoin="round" pointerEvents="none" />;
}

export default UberabaMapa;
