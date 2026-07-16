import { Fragment, useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { Loader2, Search, ArrowUp, ArrowDown, ChevronRight, ChevronDown } from "lucide-react";

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
type Row = { PERIODO: string; cdpln: number | string; dspln: string } & Record<NumCol, number | string | null>;
type Group = { dspln: string; children: Row[] } & Record<NumCol, number>;

type SortKey = "dspln" | NumCol | "SIN";
type ViewMode = "curta" | "completa";

type ColDef = { key: NumCol | "SIN"; label: string; kind?: "ratio" };

const COLS_COMPLETA: ColDef[] = [
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
  { key: "rec_tm", label: "TMM" },
  { key: "rec_cpa", label: "Copart." },
  { key: "rec_total", label: "Total Receita" },
  { key: "vrdespesas", label: "Total Despesa" },
  { key: "SALDO", label: "Saldo" },
  { key: "SIN", label: "SIN.", kind: "ratio" },
];

const fmtPct = (n: number) =>
  Number.isFinite(n) ? `${(n * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : "-";

const cellValue = (src: Record<NumCol, number>, col: ColDef): number => {
  if (col.key === "SIN") {
    const rt = src.rec_total || 0;
    return rt ? (src.vrdespesas || 0) / rt : 0;
  }
  return src[col.key] || 0;
};

const fmtCell = (src: Record<NumCol, number>, col: ColDef): string => {
  const v = cellValue(src, col);
  return col.kind === "ratio" ? fmtPct(v) : fmtNum(v);
};

const fmtNum = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SELECT = ["PERIODO", "cdpln", "dspln", ...NUM_COLS].join(",");

const SinistralidadeConsulta = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("dspln");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ViewMode>("curta");
  const displayCols = view === "curta" ? COLS_CURTA : COLS_COMPLETA;
  const nameColCls = view === "curta" ? "w-[40ch] max-w-[40ch]" : "w-[22ch] max-w-[22ch]";
  const numColCls = view === "curta" ? "px-0.5 py-0.5 w-[10ch]" : "px-0.5 py-0.5";

  // Load distinct PERIODO values
  useEffect(() => {
    (async () => {
      const pageSize = 1000;
      const set = new Set<string>();
      let from = 0;
      for (let i = 0; i < 200; i++) {
        const { data, error } = await hostinger
          .from("vw_sinistralidade")
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
          .from("vw_sinistralidade")
          .select(SELECT)
          .eq("PERIODO", periodo)
          .range(from, from + pageSize - 1);
        if (cancel) return;
        if (error) { setError(error.message); break; }
        const batch = (data as unknown as Row[]) ?? [];
        all.push(...batch);
        if (batch.length < pageSize) break;
        from += pageSize;
      }
      if (cancel) return;
      setRows(all);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [periodo]);

  // Group by dspln
  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const r of rows) {
      const key = (r.dspln ?? "").trim();
      let g = map.get(key);
      if (!g) {
        g = { dspln: key, children: [] } as Group;
        for (const c of NUM_COLS) g[c] = 0;
        map.set(key, g);
      }
      g.children.push(r);
      for (const c of NUM_COLS) {
        const n = Number(r[c]);
        if (Number.isFinite(n)) g[c] += n;
      }
    }
    return Array.from(map.values());
  }, [rows]);

  const filtered = useMemo(() => {
    const base = !q.trim()
      ? groups
      : groups.filter((g) => g.dspln.toLowerCase().includes(q.toLowerCase()));
    const sinOf = (g: Group) => (g.rec_total ? g.vrdespesas / g.rec_total : 0);
    const sorted = [...base].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "dspln") cmp = a.dspln.localeCompare(b.dspln, "pt-BR");
      else if (sortKey === "SIN") cmp = sinOf(a) - sinOf(b);
      else cmp = (a[sortKey] || 0) - (b[sortKey] || 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [groups, q, sortKey, sortDir]);

  const totals = useMemo(() => {
    const t = {} as Record<NumCol, number>;
    for (const c of NUM_COLS) t[c] = 0;
    for (const g of filtered) for (const c of NUM_COLS) t[c] += g[c];
    return t;
  }, [filtered]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "dspln" ? "asc" : "desc");
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
                  onClick={() => toggleSort("dspln")}
                  className={`font-medium text-muted-foreground px-1 py-0.5 text-left ${nameColCls} truncate cursor-pointer select-none`}
                >
                  Nome Plano|Empresa<SortIcon k="dspln" />
                </th>
                {displayCols.map((c) => (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c.key)}
                    className="font-medium text-muted-foreground px-0.5 py-0.5 whitespace-nowrap text-right cursor-pointer select-none"
                  >
                    {c.label}<SortIcon k={c.key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => {
                const isOpen = expanded.has(g.dspln);
                return (
                  <Fragment key={g.dspln}>
                    <tr
                      onClick={() => g.children.length > 1 && toggleExpand(g.dspln)}
                      className={`border-b border-border/60 hover:bg-accent/40 ${g.children.length > 1 ? "cursor-pointer" : ""}`}
                    >
                      <td className={`px-1 py-0.5 text-left ${nameColCls} truncate`} title={g.dspln}>
                        <span className="inline-flex items-center gap-1">
                          {g.children.length > 1 ? (
                            isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
                          ) : (
                            <span className="w-3.5" />
                          )}
                          <span className="truncate">{g.dspln}</span>
                        </span>
                      </td>
                      {displayCols.map((c) => (
                        <td key={c.key} className="px-0.5 py-0.5 whitespace-nowrap text-right tabular-nums">
                          {fmtCell(g, c)}
                        </td>
                      ))}
                    </tr>
                    {isOpen && g.children.map((r, i) => {
                      const rSrc = {} as Record<NumCol, number>;
                      for (const c of NUM_COLS) rSrc[c] = Number(r[c]) || 0;
                      return (
                        <tr key={`${g.dspln}-${r.cdpln}-${i}`} className="border-b border-border/40 bg-accent/20 text-[0.92em]">
                          <td className={`px-1 py-0.5 text-left ${nameColCls} truncate pl-8 text-muted-foreground`} title={String(r.cdpln)}>
                            {String(r.cdpln)}
                          </td>
                          {displayCols.map((c) => (
                            <td key={c.key} className="px-0.5 py-0.5 whitespace-nowrap text-right tabular-nums text-muted-foreground">
                              {fmtCell(rSrc, c)}
                            </td>
                          ))}
                        </tr>
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
                  <td key={c.key} className="px-0.5 py-0.5 text-right tabular-nums">
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
