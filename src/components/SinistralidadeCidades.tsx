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

type Agg = {
  name: string;
  key: string;
  vida: number;
  nums: Record<string, number>;
};

export default function SinistralidadeCidades() {
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sortKey, setSortKey] = useState<ColDef["key"] | "NAME">("VIDA");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Load PERIODOs
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await hostinger.rpc("sinistralidade_periodos");
      if (!alive) return;
      const uniq: string[] = Array.from(
        new Set(((data ?? []) as any[]).map((r) => String(r.PERIODO ?? "")).filter(Boolean)),
      );
      uniq.sort().reverse();
      setPeriodos(uniq);
      setPeriodo(uniq[0] ?? "__ALL__");
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Load rows (chunked) from sinistralidade, selecting only needed columns
  useEffect(() => {
    if (periodo === null) return;
    let alive = true;
    setLoading(true);
    (async () => {
      const cols =
        'PERIODO,REGIONAL,CIDADE_OFICIAL,UF_CIDADE_OFICIAL,nmcli,VIDAS,rec_tm,rec_cpa,rec_total,consulta,emergencia,exame,terapia,internacao,"DEMAIS",vrdespesas,"SALDO"';
      const all: Row[] = [];
      const chunk = 1000;
      for (let from = 0; ; from += chunk) {
        let qb = hostinger
          .from("sinistralidade")
          .select(cols)
          .range(from, from + chunk - 1);
        if (periodo !== "__ALL__") qb = qb.eq("PERIODO", periodo);
        const { data, error } = await qb;
        if (error || !data || data.length === 0) break;
        all.push(...(data as Row[]));
        if (data.length < chunk) break;
      }
      if (!alive) return;
      setRows(all);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [periodo]);

  // Aggregate by REGIONAL -> CIDADE_OFICIAL/UF_CIDADE_OFICIAL
  const groups = useMemo(() => {
    const map = new Map<
      string,
      Agg & { children: Map<string, Agg>; vidaSet: Set<string>; childVidaSets: Map<string, Set<string>> }
    >();
    for (const r of rows) {
      const reg = String(r.REGIONAL ?? "(sem regional)") || "(sem regional)";
      const cid = String(r.CIDADE_OFICIAL ?? "(sem cidade)") || "(sem cidade)";
      const uf = String(r.UF_CIDADE_OFICIAL ?? "").trim();
      const childKey = `${cid}/${uf}`;
      const nm = String(r.nmcli ?? "");
      let parent = map.get(reg);
      if (!parent) {
        parent = {
          name: reg,
          key: reg,
          vida: 0,
          nums: {},
          children: new Map(),
          vidaSet: new Set(),
          childVidaSets: new Map(),
        };
        for (const c of NUM_COLS) parent.nums[c] = 0;
        map.set(reg, parent);
      }
      if (nm) parent.vidaSet.add(nm);
      for (const c of NUM_COLS) parent.nums[c] += Number(r[c]) || 0;
      let child = parent.children.get(childKey);
      if (!child) {
        child = {
          name: `${cid}${uf ? " / " + uf : ""}`,
          key: `${reg}||${childKey}`,
          vida: 0,
          nums: {},
        };
        for (const c of NUM_COLS) child.nums[c] = 0;
        parent.children.set(childKey, child);
        parent.childVidaSets.set(childKey, new Set());
      }
      const cs = parent.childVidaSets.get(childKey)!;
      if (nm) cs.add(nm);
      for (const c of NUM_COLS) child.nums[c] += Number(r[c]) || 0;
    }
    // finalize vidas as distinct counts
    const out: (Agg & { children: Map<string, Agg> })[] = [];
    for (const p of map.values()) {
      p.vida = p.vidaSet.size;
      for (const [k, ch] of p.children) {
        ch.vida = p.childVidaSets.get(k)?.size ?? 0;
      }
      out.push(p);
    }
    return out;
  }, [rows]);

  const term = debouncedQ.toLowerCase();
  const filteredGroups = useMemo(() => {
    if (!term) return groups;
    return groups.filter((g) => {
      if (g.name.toLowerCase().includes(term)) return true;
      for (const c of g.children.values()) {
        if (c.name.toLowerCase().includes(term)) return true;
      }
      return false;
    });
  }, [groups, term]);

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

  const sortedGroups = useMemo(
    () => [...filteredGroups].sort(cmpAgg),
    [filteredGroups, sortKey, sortDir],
  );

  const totals = useMemo(() => {
    const t: Record<string, number> = { vida: 0 };
    for (const c of NUM_COLS) t[c] = 0;
    const vidaSet = new Set<string>();
    for (const r of rows) {
      const nm = String(r.nmcli ?? "");
      if (nm) vidaSet.add(nm);
      for (const c of NUM_COLS) t[c] += Number(r[c]) || 0;
    }
    t.vida = vidaSet.size;
    return t;
  }, [rows]);

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
            placeholder="Filtrar por REGIONAL, CIDADE ou UF..."
            className="h-9 w-full pl-8 pr-3 rounded-md border border-border bg-background text-sm"
          />
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          {sortedGroups.length.toLocaleString("pt-BR")} regionais
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <FunLoader />
          </div>
        ) : sortedGroups.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Sem dados.
          </div>
        ) : (
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border">
                <th
                  className="px-2 py-1.5 text-left font-semibold cursor-pointer select-none w-[220px] max-w-[220px]"
                  onClick={() => onSort("NAME")}
                >
                  REGIONAL / Cidade {arrow("NAME")}
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
              {sortedGroups.map((g) => {
                const isOpen = expanded.has(g.key);
                const children = Array.from(g.children.values());
                const sortedChildren = [...children].sort(cmpAgg);
                return (
                  <Fragment key={g.key}>
                    <tr
                      className="border-b border-border/50 hover:bg-accent/40 cursor-pointer font-semibold"
                      onClick={() => toggle(g.key)}
                    >
                      <td
                        className="px-2 py-1 truncate w-[220px] max-w-[220px]"
                        title={g.name}
                      >
                        <span className="inline-flex items-center gap-1">
                          {isOpen ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                          {g.name}
                        </span>
                      </td>
                      {renderMetrics(g.nums, g.vida)}
                    </tr>
                    {isOpen &&
                      sortedChildren.map((c) => (
                        <tr
                          key={c.key}
                          className="border-b border-border/30 hover:bg-accent/30 bg-muted/20"
                        >
                          <td
                            className="px-2 py-1 truncate w-[220px] max-w-[220px] pl-8"
                            title={c.name}
                          >
                            {c.name}
                          </td>
                          {renderMetrics(c.nums, c.vida)}
                        </tr>
                      ))}
                  </Fragment>
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
