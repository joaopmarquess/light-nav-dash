import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Malhas municipais do IBGE (base oficial) — MG e SP
const SRC: Record<string, string> = {
  MG: "https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-31-mun.json",
  SP: "https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-35-mun.json",
};
const COR = { g0: "#1597D4", g1: "#75C4EA", g2: "#C4E6F5", out: "#E5E7E9" };
const W = 1600, H = 900; // 16:9

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
      (grid.get(k) ?? grid.set(k, new Set()).get(k)!).add(i);
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

const UberabaMapa = () => {
  const [feats, setFeats] = useState<F[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    Promise.all(Object.entries(SRC).map(([uf, u]) => fetch(u).then((r) => r.json()).then((fc: FeatureCollection) =>
      fc.features.map((f) => ({ ...f, properties: { name: (f.properties as any)?.name ?? "", _uf: uf } })) as F[])))
      .then((r) => {
        // recorte de trabalho em torno de Uberaba (só para desempenho; a vizinhança é geométrica)
        const box = (f: F) => pts(f.geometry).some(([x, y]) => x > -51.5 && x < -45.5 && y > -21.8 && y < -17.8);
        setFeats(r.flat().filter(box));
      })
      .catch((e) => setErr(String(e?.message ?? e)));
  }, []);

  const calc = useMemo(() => {
    if (!feats) return null;
    const nb = vizinhanca(feats);
    const u = feats.findIndex((f) => f.properties._uf === "MG" && norm(f.properties.name) === "UBERABA");
    const g1 = new Set(nb[u]);
    const g2 = new Set<number>();
    g1.forEach((i) => nb[i].forEach((j) => j !== u && !g1.has(j) && g2.add(j)));
    const foco = [u, ...g1, ...g2].map((i) => feats[i]);
    const proj = geoMercator().fitExtent([[60, 90], [W - 60, H - 40]], { type: "FeatureCollection", features: foco });
    const path = geoPath(proj);
    const grupo = (i: number) => (i === u ? 0 : g1.has(i) ? 1 : g2.has(i) ? 2 : 3);
    console.info("[Mapa Uberaba] 1º anel:", [...g1].map((i) => feats[i].properties.name).sort().join(", "));
    console.info("[Mapa Uberaba] 2º anel:", [...g2].map((i) => `${feats[i].properties.name}/${feats[i].properties._uf}`).sort().join(", "));
    return { u, g1, g2, path, proj, grupo };
  }, [feats]);

  // Divisa MG/SP = trechos compartilhados entre municípios dos dois estados (desenho = contorno estadual)
  const ufOutline = useMemo(() => {
    if (!feats || !calc) return [];
    return ["MG", "SP"].map((uf) => feats.filter((f) => f.properties._uf === uf));
  }, [feats, calc]);

  const labels = useMemo(() => {
    if (!feats || !calc) return [];
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const out: { x: number; y: number; t: string; g: number; lx?: number; ly?: number }[] = [];
    const order = feats.map((_, i) => i).sort((a, b) => calc.grupo(a) - calc.grupo(b));
    for (const i of order) {
      const g = calc.grupo(i);
      const [cx, cy] = calc.path.centroid(feats[i]);
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
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 3840; c.height = 2160;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const a = document.createElement("a");
      a.download = "Bensaude_Uberaba_Onde_Queremos_Atuar.png";
      a.href = c.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  };

  if (err) return <div className="text-sm text-destructive">Erro ao carregar a malha municipal: {err}</div>;
  if (!feats || !calc)
    return <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando malha municipal…</div>;

  const fill = [COR.g0, COR.g1, COR.g2, COR.out];
  const [mgX, mgY] = calc.proj([-47.2, -18.6]) ?? [0, 0];
  const [spX, spY] = calc.proj([-48.6, -20.9]) ?? [0, 0];

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={exportar}><Download className="mr-2 h-4 w-4" />Exportar PNG 16:9 (4K)</Button>
      </div>
      <div className="w-full overflow-hidden rounded-xl border border-border bg-card" style={{ aspectRatio: "16 / 9" }}>
        <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} className="h-full w-full" fontFamily="Arial, Helvetica, sans-serif">
          <rect width={W} height={H} fill="#FAFBFC" />
          {feats.map((f, i) => calc.grupo(i) === 3 && (
            <path key={i} d={calc.path(f) ?? ""} fill={COR.out} stroke="#9AA0A6" strokeWidth={0.5} />
          ))}
          {[...calc.g2].map((i) => <path key={i} d={calc.path(feats[i]) ?? ""} fill={COR.g2} stroke="#3C4043" strokeWidth={1} />)}
          {ufOutline.map((fs, k) => fs.map((f, i) => (
            <path key={`uf${k}-${i}`} d={calc.path(f) ?? ""} fill="none" stroke="none" />
          )))}
          {[...calc.g1].map((i) => <path key={i} d={calc.path(feats[i]) ?? ""} fill={COR.g1} stroke="#FFFFFF" strokeWidth={2} />)}
          <path d={calc.path(feats[calc.u]) ?? ""} fill={COR.g0} stroke="#FFFFFF" strokeWidth={2.5} />
          <DivisaUF feats={feats} path={calc.path} />
          {labels.map((l, k) => (
            <g key={k} pointerEvents="none">
              {l.lx != null && <line x1={l.lx} y1={l.ly} x2={l.x} y2={l.y} stroke="#5F6368" strokeWidth={0.7} />}
              <text x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle"
                fontSize={l.g === 0 ? 22 : l.g === 1 ? 14 : l.g === 2 ? 11 : 9}
                fontWeight={l.g === 0 ? 800 : l.g === 1 ? 700 : l.g === 2 ? 600 : 400}
                fill={l.g === 0 ? "#0B2E4A" : l.g === 3 ? "#5F6368" : "#1F2933"}
                stroke="#FFFFFF" strokeWidth={l.g === 0 ? 4 : 2.5} paintOrder="stroke">{l.t}</text>
            </g>
          ))}
          <text x={mgX} y={mgY} fontSize={34} fontWeight={700} fill="#80868B" opacity={0.55}>MG</text>
          <text x={spX} y={spY} fontSize={34} fontWeight={700} fill="#80868B" opacity={0.55}>SP</text>
          <rect x={0} y={0} width={W} height={72} fill="#FFFFFF" opacity={0.92} />
          <text x={60} y={48} fontSize={34} fontWeight={800} fill="#0B2E4A" letterSpacing={1}>ONDE QUEREMOS ATUAR</text>
          <text x={W - 60} y={48} textAnchor="end" fontSize={14} fill="#5F6368">Bensaúde · Uberaba/MG e área de influência</text>
          <g transform={`translate(40, ${H - 150})`}>
            <rect width={300} height={130} rx={6} fill="#FFFFFF" stroke="#DADCE0" />
            {[["Uberaba", COR.g0], ["Municípios limítrofes de Uberaba", COR.g1], ["Municípios do segundo anel", COR.g2], ["Demais municípios", COR.out]].map(([t, c], k) => (
              <g key={t} transform={`translate(14, ${18 + k * 27})`}>
                <rect width={20} height={16} fill={c} stroke="#5F6368" strokeWidth={0.6} />
                <text x={30} y={13} fontSize={13} fill="#3C4043">{t}</text>
              </g>
            ))}
          </g>
          <text x={W - 20} y={H - 12} textAnchor="end" fontSize={10} fill="#80868B">Fonte: malha municipal IBGE · anéis calculados por contiguidade dos polígonos</text>
        </svg>
      </div>
      <div className="text-xs text-muted-foreground">
        <b>1º anel ({calc.g1.size}):</b> {[...calc.g1].map((i) => feats[i].properties.name).sort().join(", ")}
        <br />
        <b>2º anel ({calc.g2.size}):</b> {[...calc.g2].map((i) => `${feats[i].properties.name}/${feats[i].properties._uf}`).sort().join(", ")}
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

export default UberabaMapa;
