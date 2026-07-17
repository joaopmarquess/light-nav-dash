import { Fragment, useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { Search, ArrowUp, ArrowDown, ChevronRight, ChevronDown } from "lucide-react";
import FunLoader from "@/components/FunLoader";

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

type Mode = "empresa" | "beneficiario";

type ColDef = { key: NumCol | "SIN" | "VIDA"; label: string; kind?: "ratio" | "int" };

const METRIC_COLS: ColDef[] = [
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

const fmtNum = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n: number) => Math.round(n).toLocaleString("pt-BR");
const fmtPct = (n: number) =>
  Number.isFinite(n)
    ? `${(n * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
    : "-";

type Row = Record<string, unknown>;

interface Props {
  mode: Mode;
}

const TABLE: Record<Mode, string> = {
  empresa: "sinistralidade_empresa",
  beneficiario: "sinistralidade_beneficiario",
};

type Agg = { name: string; key: string; vida: number; nums: Record<string, number> };

export default function SinistralidadeNova({ mode }: Props) {
  const table = TABLE[mode];
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<ColDef["key"] | "NAME">("NAME");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Load distinct PERIODOs
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await hostinger
        .from(table)
        .select("PERIODO")
        .not("PERIODO", "is", null)
        .limit(5000);
      if (!alive) return;
      const uniq = Array.from(new Set((data ?? []).map((r: any) => r.PERIODO as string))).sort().reverse();
      setPeriodos(uniq);
      setPeriodo(uniq[0] ?? "__ALL__");
    })();
    return () => {
      alive = false;
    };
  }, [table]);

  // Load rows for period
  useEffect(() => {
    if (periodo === null) return;
    let alive = true;
    setLoading(true);
    (async () => {
      const all: Row[] = [];
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        let q = hostinger.from(table).select("*").range(from, from + pageSize - 1);
        if (periodo !== "__ALL__") q = q.eq("PERIODO", periodo);
        const { data, error } = await q;
        if (error || !data || data.length === 0) break;
        all.push(...(data as Row[]));
        if (data.length < pageSize) break;
      }
      if (!alive) return;
      setRows(all);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [periodo, table]);

  // For empresa mode: aggregate by GRUPO (parent) with cdpln children
  const groups = useMemo(() => {
    if (mode !== "empresa") return [];
    const map = new Map<string, Agg & { children: Map<string, Agg & { dspln: string }> }>();
    for (const r of rows) {
      const g = String(r.GRUPO ?? "(sem grupo)");
      const cd = String(r.cdpln ?? "");
      let parent = map.get(g);
      if (!parent) {
        parent = { name: g, key: g, vida: 0, nums: {}, children: new Map() };
        for (const c of NUM_COLS) parent.nums[c] = 0;
        map.set(g, parent);
      }
      parent.vida += 1;
      for (const c of NUM_COLS) parent.nums[c] += Number(r[c]) || 0;
      let child = parent.children.get(cd);
      if (!child) {
        child = { name: cd, key: `${g}||${cd}`, vida: 0, nums: {}, dspln: String(r.dspln ?? "") };
        for (const c of NUM_COLS) child.nums[c] = 0;
        parent.children.set(cd, child);
      }
      child.vida += 1;
      for (const c of NUM_COLS) child.nums[c] += Number(r[c]) || 0;
    }
    return Array.from(map.values());
  }, [rows, mode]);

  // For beneficiario: flat rows
  const flat = useMemo(() => {
    if (mode !== "beneficiario") return [];
    return rows;
  }, [rows, mode]);

  const term = q.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (mode !== "empresa") return [];
    const arr = groups.filter((g) => {
      if (!term) return true;
      if (g.name.toLowerCase().includes(term)) return true;
      for (const c of g.children.values()) {
        if (c.name.toLowerCase().includes(term) || c.dspln.toLowerCase().includes(term)) return true;
      }
      return false;
    });
    return arr;
  }, [groups, term, mode]);

  const filteredFlat = useMemo(() => {
    if (mode !== "beneficiario") return [];
    if (!term) return flat;
    return flat.filter(
      (r) =>
        String(r.cdpln ?? "").toLowerCase().includes(term) ||
        String(r.codigo ?? "").toLowerCase().includes(term) ||
        String(r.nmcli ?? "").toLowerCase().includes(term),
    );
  }, [flat, term, mode]);

  const dir = sortDir === "asc" ? 1 : -1;

  const cmpAgg = (a: Agg, b: Agg): number => {
    if (sortKey === "NAME") return a.name.localeCompare(b.name, "pt-BR") * dir;
    if (sortKey === "VIDA") return (a.vida - b.vida) * dir;
    if (sortKey === "SIN") {
      const av = a.nums.rec_total ? a.nums.vrdespesas / a.nums.rec_total : 0;
      const bv = b.nums.rec_total ? b.nums.vrdespesas / b.nums.rec_total : 0;
      return (av - bv) * dir;
    }
    return ((a.nums[sortKey] || 0) - (b.nums[sortKey] || 0)) * dir;
  };

  const sortedGroups = useMemo(() => [...filteredGroups].sort(cmpAgg), [filteredGroups, sortKey, sortDir]);

  const sortedFlat = useMemo(() => {
    const arr = [...filteredFlat];
    arr.sort((a, b) => {
      if (sortKey === "NAME") {
        return String(a.nmcli ?? "").localeCompare(String(b.nmcli ?? ""), "pt-BR") * dir;
      }
      if (sortKey === "VIDA") return 0;
      if (sortKey === "SIN") {
        const av = Number(a.rec_total) ? Number(a.vrdespesas) / Number(a.rec_total) : 0;
        const bv = Number(b.rec_total) ? Number(b.vrdespesas) / Number(b.rec_total) : 0;
        return (av - bv) * dir;
      }
      return ((Number(a[sortKey as string]) || 0) - (Number(b[sortKey as string]) || 0)) * dir;
    });
    return arr;
  }, [filteredFlat, sortKey, sortDir]);

  const totals = useMemo(() => {
    const t: Record<string, number> = { vida: 0 };
    for (const c of NUM_COLS) t[c] = 0;
    if (mode === "empresa") {
      for (const g of filteredGroups) {
        t.vida += g.vida;
        for (const c of NUM_COLS) t[c] += g.nums[c] || 0;
      }
    } else {
      t.vida = filteredFlat.length;
      for (const r of filteredFlat) for (const c of NUM_COLS) t[c] += Number(r[c]) || 0;
    }
    return t;
  }, [filteredGroups, filteredFlat, mode]);

  const onSort = (k: ColDef["key"] | "NAME") => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "NAME" ? "asc" : "desc");
    }
  };

  const arrow = (k: ColDef["key"] | "NAME") =>
    sortKey === k ? (
      sortDir === "asc" ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />
    ) : null;

  const toggle = (k: string) => {
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  };

  const firstColLabel = mode === "empresa" ? "GRUPO / Plano" : "Beneficiário";
  const rowCount = mode === "empresa" ? sortedGroups.length : sortedFlat.length;

  const renderMetrics = (nums: Record<string, number>, vida: number) => {
    const rt = nums.rec_total || 0;
    const sin = rt ? (nums.vrdespesas || 0) / rt : 0;
    return METRIC_COLS.map((c) => {
      let v: number;
      if (c.key === "VIDA") v = vida;
      else if (c.key === "SIN") v = sin;
      else v = nums[c.key] || 0;
      return (
        <td
          key={c.key}
          className={`px-1.5 py-1 text-right tabular-nums ${
            c.key === "rec_total" || c.key === "vrdespesas" ? "font-bold" : ""
          }`}
        >
          {c.kind === "ratio" ? fmtPct(v) : c.kind === "int" ? fmtInt(v) : fmtNum(v)}
        </td>
      );
    });
  };

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 p-3 border-b border-border">
        <select
          value={periodo ?? ""}
          onChange={(e) => setPeriodo(e.target.value)}
          className="h-9 px-2 rounded-md border border-border bg-background text-sm"
        >
          {periodos.length === 0 && <option value="__ALL__">(todos)</option>}
          {periodos.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={mode === "empresa" ? "Filtrar por GRUPO ou cdpln..." : "Filtrar por cdpln, código ou nome..."}
            className="h-9 w-full pl-8 pr-3 rounded-md border border-border bg-background text-sm"
          />
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{rowCount.toLocaleString("pt-BR")} linhas</span>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <FunLoader />
          </div>
        ) : rowCount === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados.</div>
        ) : (
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border">
                <th
                  className="px-2 py-1.5 text-left font-semibold cursor-pointer select-none"
                  onClick={() => onSort("NAME")}
                >
                  {firstColLabel} {arrow("NAME")}
                </th>
                {METRIC_COLS.map((c) => (
                  <th
                    key={c.key}
                    className={`px-1.5 py-1.5 text-right font-semibold cursor-pointer select-none ${
                      c.key === "rec_total" || c.key === "vrdespesas" ? "font-bold" : ""
                    }`}
                    onClick={() => onSort(c.key)}
                  >
                    {c.label} {arrow(c.key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mode === "empresa"
                ? sortedGroups.map((g) => {
                    const isOpen = expanded.has(g.key);
                    const children = Array.from(g.children.values());
                    const sortedChildren = [...children].sort((a, b) => cmpAgg(a, b));
                    return (
                      <Fragment key={g.key}>
                        <tr
                          key={g.key}
                          className="border-b border-border/50 hover:bg-accent/40 cursor-pointer font-semibold"
                          onClick={() => toggle(g.key)}
                        >
                          <td className="px-2 py-1 truncate max-w-[420px]" title={g.name}>
                            <span className="inline-flex items-center gap-1">
                              {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              {g.name}
                            </span>
                          </td>
                          {renderMetrics(g.nums, g.vida)}
                        </tr>
                        {isOpen &&
                          sortedChildren.map((c) => {
                            const label = `${c.name} — ${(c as any).dspln}`;
                            return (
                              <tr key={c.key} className="border-b border-border/30 hover:bg-accent/30 bg-muted/20">
                                <td className="px-2 py-1 truncate max-w-[420px] pl-8" title={label}>
                                  {label}
                                </td>
                                {renderMetrics(c.nums, c.vida)}
                              </tr>
                            );
                          })}
                      </Fragment>
                    );
                  })
                : sortedFlat.map((r, i) => {
                    const nums: Record<string, number> = {};
                    for (const c of NUM_COLS) nums[c] = Number(r[c]) || 0;
                    const name = `${r.codigo ?? ""} — ${r.nmcli ?? ""}`;
                    return (
                      <tr key={i} className="border-b border-border/50 hover:bg-accent/40">
                        <td className="px-2 py-1 truncate max-w-[420px]" title={name}>
                          {name}
                        </td>
                        {renderMetrics(nums, 1)}
                      </tr>
                    );
                  })}
            </tbody>
            <tfoot className="sticky bottom-0 bg-card">
              <tr className="border-t-2 border-border font-bold">
                <td className="px-2 py-1.5">TOTAL</td>
                {METRIC_COLS.map((c) => {
                  let v: number;
                  if (c.key === "VIDA") v = totals.vida;
                  else if (c.key === "SIN")
                    v = totals.rec_total ? totals.vrdespesas / totals.rec_total : 0;
                  else v = totals[c.key] || 0;
                  return (
                    <td key={c.key} className="px-1.5 py-1.5 text-right tabular-nums">
                      {c.kind === "ratio" ? fmtPct(v) : c.kind === "int" ? fmtInt(v) : fmtNum(v)}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </section>
  );
}
