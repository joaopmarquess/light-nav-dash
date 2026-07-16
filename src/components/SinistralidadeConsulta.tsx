import { Fragment, useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { Loader2, Search, ArrowUp, ArrowDown, ChevronRight, ChevronDown, RefreshCw } from "lucide-react";

const NUM_COLS = [
  "rec_tm",
  "rec_cpa",
  "rec_total",
  "consulta",
  "emergencia",
  "exame",
  "terapia",
  "internacao",
  "DEMAIS",
  "vrdespesas",
  "SALDO",
] as const;

type NumCol = (typeof NUM_COLS)[number];
type Row = { PERIODO: string; GRUPO: string | null; cdpln: number | string; codigo: string | null; nmcli: string | null } & Record<NumCol, number | string | null>;
type SubGroup = { cdpln: string; children: Row[]; vida: number } & Record<NumCol, number>;
type Group = { GRUPO: string; subgroups: SubGroup[]; vida: number } & Record<NumCol, number>;
type CellSrc = Record<NumCol, number> & { vida: number };

type SortKey = "GRUPO" | NumCol | "SIN" | "VIDA";
type ViewMode = "curta" | "completa";

type ColDef = { key: NumCol | "SIN" | "VIDA"; label: string; kind?: "ratio" | "int" };

const COLS_COMPLETA: ColDef[] = [
  { key: "VIDA", label: "Vidas", kind: "int" },
  { key: "rec_tm", label: "TMM" },
  { key: "rec_cpa", label: "Copart." },
  { key: "rec_total", label: "Total Receita" },
  { key: "consulta", label: "Consulta" },
  { key: "emergencia", label: "Emergência" },
  { key: "exame", label: "Exame" },
  { key: "terapia", label: "Terapia" },
  { key: "internacao", label: "Internação" },
  { key: "DEMAIS", label: "Demais" },
  { key: "vrdespesas", label: "Total Despesa" },
  { key: "SALDO", label: "Saldo" },
  { key: "SIN", label: "SIN.", kind: "ratio" },
];

const COLS_CURTA: ColDef[] = [
  { key: "VIDA", label: "Vidas", kind: "int" },
  { key: "rec_tm", label: "TMM" },
  { key: "rec_cpa", label: "Copart." },
  { key: "rec_total", label: "Total Receita" },
  { key: "vrdespesas", label: "Total Despesa" },
  { key: "SALDO", label: "Saldo" },
  { key: "SIN", label: "SIN.", kind: "ratio" },
];

const fmtPct = (n: number) =>
  Number.isFinite(n) ? `${(n * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : "-";

const fmtInt = (n: number) => Math.round(n).toLocaleString("pt-BR");

const cellValue = (src: CellSrc, col: ColDef): number => {
  if (col.key === "SIN") {
    const rt = src.rec_total || 0;
    return rt ? (src.vrdespesas || 0) / rt : 0;
  }
  if (col.key === "VIDA") return src.vida || 0;
  return src[col.key] || 0;
};

const fmtCell = (src: CellSrc, col: ColDef): string => {
  const v = cellValue(src, col);
  if (col.kind === "ratio") return fmtPct(v);
  if (col.kind === "int") return fmtInt(v);
  return fmtNum(v);
};

const fmtNum = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SELECT = ["PERIODO", "cdpln", "GRUPO", "codigo", "nmcli", ...NUM_COLS].join(",");

const SinistralidadeConsulta = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("GRUPO");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ViewMode>("curta");
  const displayCols = view === "curta" ? COLS_CURTA : COLS_COMPLETA;
  const nameColCls = view === "curta" ? "w-[30ch] max-w-[30ch]" : "w-[18ch] max-w-[18ch]";
  const numCellCls = view === "curta" ? "px-0.5 py-0.5 w-[8ch] whitespace-nowrap text-right tabular-nums" : "px-0.5 py-0.5 w-[7ch] whitespace-nowrap text-right tabular-nums";

  // Load distinct PERIODO values
  useEffect(() => {
    (async () => {
      const pageSize = 1000;
      const set = new Set<string>();
      let from = 0;
      for (let i = 0; i < 200; i++) {
        const { data, error } = await hostinger
          .from("mv_sinistralidade")
          .select("PERIODO")
          .range(from, from + pageSize - 1);
        if (error) { setError(error.message); return; }
        const batch = (data as { PERIODO: string }[]) ?? [];
        for (const r of batch) if (r.PERIODO) set.add(r.PERIODO);
        if (batch.length < pageSize) break;
        from += pageSize;
      }
      const list = Array.from(set).sort((a, b) => {
        const endA = a.split(" a ")[1] ?? a;
        const endB = b.split(" a ")[1] ?? b;
        const [ma, ya] = endA.split("/").map(Number);
        const [mb, yb] = endB.split("/").map(Number);
        return (yb * 100 + mb) - (ya * 100 + ma);
      });
      setPeriodos(list);
      setPeriodo(list[0] ?? null);
    })();
  }, []);

  // Load rows for selected PERIODO
  useEffect(() => {
    if (!periodo) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      setError(null);
      setExpanded(new Set());
      const pageSize = 1000;
      const all: Row[] = [];
      let from = 0;
      for (let i = 0; i < 2000; i++) {
        const { data, error } = await hostinger
          .from("mv_sinistralidade")
          .select(SELECT)
          .eq("PERIODO", periodo)
          .order("cdpln", { ascending: true })
          .order("codigo", { ascending: true, nullsFirst: false })
          .range(from, from + pageSize - 1);
        if (cancel) return;
        if (error) { setError(error.message); break; }
        const batch = (data as unknown as Row[]) ?? [];
        all.push(...batch);
        if (batch.length < pageSize) break;
        from += pageSize;
      }
      if (cancel) return;
      // Dedupe por (cdpln, codigo) — mesma pessoa pode aparecer com nomes diferentes.
      // Verdade: código distinto. Mantemos a primeira ocorrência.
      const seen = new Set<string>();
      const deduped: Row[] = [];
      for (const r of all) {
        const k = `${r.cdpln ?? ""}||${r.codigo ?? ""}`;
        if (r.codigo != null && seen.has(k)) continue;
        if (r.codigo != null) seen.add(k);
        deduped.push(r);
      }
      setRows(deduped);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [periodo]);

  // Group by dspln, then by cdpln
  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    const groupCodes = new Map<string, Set<string>>();
    for (const r of rows) {
      const key = (r.GRUPO ?? "").trim();
      let g = map.get(key);
      if (!g) {
        g = { GRUPO: key, subgroups: [], vida: 0 } as Group;
        for (const c of NUM_COLS) g[c] = 0;
        map.set(key, g);
        groupCodes.set(key, new Set());
      }
      if (r.codigo != null) groupCodes.get(key)!.add(String(r.codigo));
      for (const c of NUM_COLS) {
        const n = Number(r[c]);
        if (Number.isFinite(n)) g[c] += n;
      }
    }
    for (const [k, s] of groupCodes) {
      const g = map.get(k);
      if (g) g.vida = s.size;
    }
    // build subgroups per dspln
    const subMap = new Map<string, Map<string, SubGroup>>();
    const subCodes = new Map<string, Set<string>>();
    for (const r of rows) {
      const dk = (r.GRUPO ?? "").trim();
      const ck = String(r.cdpln ?? "");
      let inner = subMap.get(dk);
      if (!inner) { inner = new Map(); subMap.set(dk, inner); }
      let sg = inner.get(ck);
      if (!sg) {
        sg = { cdpln: ck, children: [], vida: 0 } as SubGroup;
        for (const c of NUM_COLS) sg[c] = 0;
        inner.set(ck, sg);
        subCodes.set(`${dk}||${ck}`, new Set());
      }
      if (r.codigo != null) subCodes.get(`${dk}||${ck}`)!.add(String(r.codigo));
      sg.children.push(r);
      for (const c of NUM_COLS) {
        const n = Number(r[c]);
        if (Number.isFinite(n)) sg[c] += n;
      }
    }
    for (const [dk, inner] of subMap) {
      for (const [ck, sg] of inner) sg.vida = subCodes.get(`${dk}||${ck}`)?.size ?? 0;
      const g = map.get(dk);
      if (g) g.subgroups = Array.from(inner.values());
    }
    return Array.from(map.values());
  }, [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = !term
      ? groups
      : groups.filter((g) =>
          g.GRUPO.toLowerCase().includes(term) ||
          g.subgroups.some((s) =>
            String(s.cdpln).toLowerCase().includes(term) ||
            s.children.some((r) =>
              String(r.codigo ?? "").toLowerCase().includes(term) ||
              String(r.nmcli ?? "").toLowerCase().includes(term)
            )
          )
        );
    const sinOf = (g: Group) => (g.rec_total ? g.vrdespesas / g.rec_total : 0);
    const sorted = [...base].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "GRUPO") cmp = a.GRUPO.localeCompare(b.GRUPO, "pt-BR");
      else if (sortKey === "SIN") cmp = sinOf(a) - sinOf(b);
      else if (sortKey === "VIDA") cmp = a.vida - b.vida;
      else cmp = (a[sortKey] || 0) - (b[sortKey] || 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [groups, q, sortKey, sortDir]);

  const totals = useMemo(() => {
    const t = { vida: 0 } as CellSrc;
    for (const c of NUM_COLS) t[c] = 0;
    const codes = new Set<string>();
    for (const g of filtered) {
      for (const c of NUM_COLS) t[c] += g[c];
      for (const sg of g.subgroups) for (const r of sg.children) if (r.codigo != null) codes.add(String(r.codigo));
    }
    t.vida = codes.size;
    return t;
  }, [filtered]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "GRUPO" ? "asc" : "desc");
    }
  };

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === "asc" ? <ArrowUp className="inline h-3 w-3 ml-0.5" /> : <ArrowDown className="inline h-3 w-3 ml-0.5" />
    ) : null;

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Base</label>
          <select
            value={periodo ?? ""}
            onChange={(e) => setPeriodo(e.target.value)}
            className="h-9 px-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {periodos.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <div className="text-sm text-muted-foreground">
            {loading ? "Carregando..." : `${filtered.length.toLocaleString("pt-BR")} plano(s)`}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-md border border-border overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => setView("curta")}
              className={`px-3 h-9 ${view === "curta" ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-accent/40"}`}
            >
              Curta
            </button>
            <button
              type="button"
              onClick={() => setView("completa")}
              className={`px-3 h-9 border-l border-border ${view === "completa" ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-accent/40"}`}
            >
              Completa
            </button>
          </div>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filtrar..."
              className="h-9 w-64 pl-8 pr-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </div>



      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-destructive">Erro: {error}</div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Sem dados.
          </div>
        ) : (
          <table className="w-full table-fixed text-[11px] leading-tight">
            <thead className="sticky top-0 bg-card border-b border-border">
              <tr>
                <th
                  onClick={() => toggleSort("GRUPO")}
                  className={`font-medium text-muted-foreground px-1 py-0.5 text-left ${nameColCls} truncate cursor-pointer select-none`}
                >
                  Nome Plano|Empresa<SortIcon k="GRUPO" />
                </th>
                {displayCols.map((c) => (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c.key)}
                    className={`font-medium text-muted-foreground cursor-pointer select-none ${numCellCls}`}
                  >
                    {c.label}<SortIcon k={c.key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => {
                const isOpen = expanded.has(g.GRUPO);
                const hasSubs = g.subgroups.length > 1 || (g.subgroups[0]?.children.length ?? 0) > 0;
                return (
                  <Fragment key={g.GRUPO}>
                    <tr
                      onClick={() => hasSubs && toggleExpand(g.GRUPO)}
                      className={`border-b border-border/60 hover:bg-accent/40 ${hasSubs ? "cursor-pointer" : ""}`}
                    >
                      <td className={`px-1 py-0.5 text-left ${nameColCls} truncate`} title={g.GRUPO}>
                        <span className="inline-flex items-center gap-1">
                          {hasSubs ? (
                            isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
                          ) : (
                            <span className="w-3.5" />
                          )}
                          <span className="truncate">{g.GRUPO}</span>
                        </span>
                      </td>
                      {displayCols.map((c) => (
                        <td key={c.key} className={numCellCls}>
                          {fmtCell(g, c)}
                        </td>
                      ))}
                    </tr>
                    {isOpen && g.subgroups.map((sg) => {
                      const subKey = `${g.GRUPO}||${sg.cdpln}`;
                      const subOpen = expanded.has(subKey);
                      const subHasChildren = sg.children.length > 0;
                      const sgSrc = { vida: sg.vida } as CellSrc;
                      for (const c of NUM_COLS) sgSrc[c] = sg[c];
                      return (
                        <Fragment key={subKey}>
                          <tr
                            onClick={() => subHasChildren && toggleExpand(subKey)}
                            className={`border-b border-border/50 bg-accent/20 hover:bg-accent/40 ${subHasChildren ? "cursor-pointer" : ""}`}
                          >
                            <td className={`px-1 py-0.5 text-left ${nameColCls} truncate pl-6`} title={sg.cdpln}>
                              <span className="inline-flex items-center gap-1">
                                {subHasChildren ? (
                                  subOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
                                ) : (
                                  <span className="w-3.5" />
                                )}
                                <span className="truncate">{sg.cdpln}</span>
                              </span>
                            </td>
                            {displayCols.map((c) => (
                              <td key={c.key} className={numCellCls}>
                                {fmtCell(sgSrc, c)}
                              </td>
                            ))}
                          </tr>
                          {subOpen && sg.children.map((r, i) => {
                            const rSrc = { vida: 1 } as CellSrc;
                            for (const c of NUM_COLS) rSrc[c] = Number(r[c]) || 0;
                            const label = `${r.codigo ?? ""}${r.codigo && r.nmcli ? " " : ""}${r.nmcli ?? ""}`.trim();
                            return (
                              <tr key={`${subKey}-${r.codigo ?? ""}-${i}`} className="border-b border-border/40 bg-accent/10 text-[0.92em]">
                                <td className={`px-1 py-0.5 text-left ${nameColCls} truncate pl-12 text-muted-foreground`} title={label}>
                                  {label}
                                </td>
                                {displayCols.map((c) => (
                                  <td key={c.key} className={`${numCellCls} text-muted-foreground`}>
                                    {fmtCell(rSrc, c)}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 bg-card border-t border-border font-semibold">
              <tr>
                <td className="px-1 py-0.5 text-left">Total</td>
                {displayCols.map((c) => (
                  <td key={c.key} className={numCellCls}>
                    {fmtCell(totals, c)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </section>
  );
};

export default SinistralidadeConsulta;
