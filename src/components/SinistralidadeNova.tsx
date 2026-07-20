import { Fragment, useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { Search, ArrowUp, ArrowDown, ChevronRight, ChevronDown, ChevronLeft, ChevronsLeft, ChevronsRight } from "lucide-react";
import FunLoader from "@/components/FunLoader";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

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

const PAGE_SIZE = 200;

export default function SinistralidadeNova({ mode }: Props) {
  const table = TABLE[mode];
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sortKey, setSortKey] = useState<ColDef["key"] | "NAME">("NAME");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [aggRows, setAggRows] = useState<Row[]>([]);
  const [cidadeRows, setCidadeRows] = useState<Row[]>([]);


  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(0);
  }, [periodo, debouncedQ, sortKey, sortDir, mode]);

  // Load distinct PERIODOs via RPC
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
  }, [table]);

  // Load aggregation source (empresa table) filtered by periodo — feeds matrices in both modes
  useEffect(() => {
    if (periodo === null) return;
    let alive = true;
    (async () => {
      const all: Row[] = [];
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        let qb = hostinger
          .from("sinistralidade_empresa")
          .select("Recuperacao,Tipo_Plano_Contratacao,Contratacao,VIDAS,SALDO")
          .range(from, from + pageSize - 1);
        if (periodo !== "__ALL__") qb = qb.eq("PERIODO", periodo);
        const { data, error } = await qb;
        if (error || !data || data.length === 0) break;
        all.push(...(data as Row[]));
        if (data.length < pageSize) break;
      }
      if (!alive) return;
      setAggRows(all);
    })();
    return () => {
      alive = false;
    };
  }, [periodo]);

  // Load CIDADE_OFICIAL aggregation for beneficiario mode
  useEffect(() => {
    if (mode !== "beneficiario" || periodo === null) return;
    let alive = true;
    (async () => {
      const all: Row[] = [];
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        let qb = hostinger
          .from("sinistralidade_beneficiario")
          .select("CIDADE_OFICIAL,VIDAS")
          .range(from, from + pageSize - 1);
        if (periodo !== "__ALL__") qb = qb.eq("PERIODO", periodo);
        const { data, error } = await qb;
        if (error || !data || data.length === 0) break;
        all.push(...(data as Row[]));
        if (data.length < pageSize) break;
      }
      if (!alive) return;
      setCidadeRows(all);
    })();
    return () => {
      alive = false;
    };
  }, [periodo, mode]);


  useEffect(() => {
    if (periodo === null) return;
    let alive = true;
    setLoading(true);
    (async () => {
      if (mode === "empresa") {
        // Full load: ~2k rows total, per period much less
        const all: Row[] = [];
        const pageSize = 1000;
        for (let from = 0; ; from += pageSize) {
          let qb = hostinger.from(table).select("*").range(from, from + pageSize - 1);
          if (periodo !== "__ALL__") qb = qb.eq("PERIODO", periodo);
          const { data, error } = await qb;
          if (error || !data || data.length === 0) break;
          all.push(...(data as Row[]));
          if (data.length < pageSize) break;
        }
        if (!alive) return;
        setRows(all);
        setTotalCount(all.length);
        setLoading(false);
      } else {
        // Load ALL rows for beneficiario (client-side scroll, no pagination)
        const all: Row[] = [];
        const pageSize = 1000;
        for (let from = 0; ; from += pageSize) {
          let qb = hostinger.from(table).select("*").range(from, from + pageSize - 1);
          if (periodo !== "__ALL__") qb = qb.eq("PERIODO", periodo);
          if (debouncedQ) {
            const like = `%${debouncedQ}%`;
            qb = qb.or(`nmcli.ilike.${like},codigo.ilike.${like},cdpln::text.ilike.${like}`);
          }
          const { data, error } = await qb;
          if (!alive) return;
          if (error) break;
          all.push(...((data ?? []) as Row[]));
          if (!data || data.length < pageSize) break;
        }
        if (!alive) return;
        setRows(all);
        setTotalCount(all.length);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [periodo, table, mode, page, sortKey, sortDir, debouncedQ]);

  // Empresa: aggregate by GRUPO (parent) with cdpln children
  const groups = useMemo(() => {
    if (mode !== "empresa") return [];
    const map = new Map<string, Agg & { children: Map<string, Agg & { dspln: string }> }>();
    for (const r of rows) {
      const g = String(r.GRUPO ?? "(sem grupo)");
      const cd = String(r.cdpln ?? "");
      const vidas = Number(r.VIDAS) || 0;
      let parent = map.get(g);
      if (!parent) {
        parent = { name: g, key: g, vida: 0, nums: {}, children: new Map() };
        for (const c of NUM_COLS) parent.nums[c] = 0;
        map.set(g, parent);
      }
      parent.vida += vidas;
      for (const c of NUM_COLS) parent.nums[c] += Number(r[c]) || 0;
      let child = parent.children.get(cd);
      if (!child) {
        child = { name: cd, key: `${g}||${cd}`, vida: 0, nums: {}, dspln: String(r.dspln ?? "") };
        for (const c of NUM_COLS) child.nums[c] = 0;
        parent.children.set(cd, child);
      }
      child.vida += vidas;
      for (const c of NUM_COLS) child.nums[c] += Number(r[c]) || 0;
    }
    return Array.from(map.values());
  }, [rows, mode]);

  const term = debouncedQ.toLowerCase();

  const filteredGroups = useMemo(() => {
    if (mode !== "empresa") return [];
    if (!term) return groups;
    return groups.filter((g) => {
      if (g.name.toLowerCase().includes(term)) return true;
      for (const c of g.children.values()) {
        if (c.name.toLowerCase().includes(term) || c.dspln.toLowerCase().includes(term)) return true;
      }
      return false;
    });
  }, [groups, term, mode]);

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
    if (mode === "empresa") {
      for (const g of filteredGroups) {
        t.vida += g.vida;
        for (const c of NUM_COLS) t[c] += g.nums[c] || 0;
      }
    } else {
      for (const r of rows) {
        for (const c of NUM_COLS) t[c] += Number(r[c]) || 0;
      }
      t.vida = totalCount;
    }
    return t;
  }, [filteredGroups, rows, mode, totalCount]);

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
  const rowCount = mode === "empresa" ? sortedGroups.length : totalCount;
  const totalPages = mode === "beneficiario" ? Math.max(1, Math.ceil(totalCount / PAGE_SIZE)) : 1;

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

  // Aggregations for bar charts (empresa mode)
  const chartData = useMemo(() => {
    const source = aggRows;

    const agg = (field: string) => {
      const m = new Map<string, { name: string; VIDAS: number; SALDO: number }>();
      for (const r of source) {

        const key = String((r as any)[field] ?? "(N/D)") || "(N/D)";
        let e = m.get(key);
        if (!e) {
          e = { name: key, VIDAS: 0, SALDO: 0 };
          m.set(key, e);
        }
        e.VIDAS += Number(r.VIDAS) || 0;
        e.SALDO += Number(r.SALDO) || 0;
      }
      return Array.from(m.values());
    };
    const recuperacao = agg("Recuperacao").sort((a, b) => b.VIDAS - a.VIDAS);
    const tipo = agg("Tipo_Plano_Contratacao").sort((a, b) => b.VIDAS - a.VIDAS);
    const contratacao = agg("Contratacao").sort((a, b) => b.VIDAS - a.VIDAS);
    return { recuperacao, tipo, contratacao };
  }, [aggRows]);



  const containerCls =
    mode === "empresa"
      ? "bg-card rounded-xl border border-border shadow-sm h-[55vh] flex flex-col overflow-hidden"
      : "bg-card rounded-xl border border-border shadow-sm h-[48vh] flex flex-col overflow-hidden";

  const mainSection = (
    <section className={containerCls}>
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
        <span className="text-xs text-muted-foreground ml-auto">
          {rowCount.toLocaleString("pt-BR")} {mode === "empresa" ? "grupos" : "linhas"}
        </span>
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
                  className="px-2 py-1.5 text-left font-semibold cursor-pointer select-none w-[220px] max-w-[220px]"
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
                          className="border-b border-border/50 hover:bg-accent/40 cursor-pointer font-semibold"
                          onClick={() => toggle(g.key)}
                        >
                          <td className="px-2 py-1 truncate w-[220px] max-w-[220px]" title={g.name}>
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
                                <td className="px-2 py-1 truncate w-[220px] max-w-[220px] pl-8" title={label}>
                                  {label}
                                </td>
                                {renderMetrics(c.nums, c.vida)}
                              </tr>
                            );
                          })}
                      </Fragment>
                    );
                  })
                : rows.map((r, i) => {
                    const nums: Record<string, number> = {};
                    for (const c of NUM_COLS) nums[c] = Number(r[c]) || 0;
                    const name = `${r.codigo ?? ""} — ${r.nmcli ?? ""}`;
                    return (
                      <tr key={i} className="border-b border-border/50 hover:bg-accent/40">
                        <td className="px-2 py-1 truncate w-[220px] max-w-[220px]" title={name}>
                          {name}
                        </td>
                        {renderMetrics(nums, Number(r.VIDAS) || 0)}
                      </tr>
                    );
                  })}
            </tbody>
            <tfoot className="sticky bottom-0 bg-card">
              <tr className="border-t-2 border-border font-bold">
                <td className="px-2 py-1.5">
                  TOTAL
                </td>
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

  const cidadeData = useMemo(() => {
    const m = new Map<string, { name: string; VIDAS: number }>();
    for (const r of cidadeRows) {
      const key = String((r as any).CIDADE_OFICIAL ?? "(N/D)") || "(N/D)";
      let e = m.get(key);
      if (!e) {
        e = { name: key, VIDAS: 0 };
        m.set(key, e);
      }
      e.VIDAS += Number((r as any).VIDAS) || 0;
    }
    const arr = Array.from(m.values()).sort((a, b) => b.VIDAS - a.VIDAS);
    const top = arr.slice(0, 5);
    const rest = arr.slice(5);
    if (rest.length > 0) {
      top.push({ name: "DEMAIS", VIDAS: rest.reduce((s, r) => s + r.VIDAS, 0) });
    }
    return top;
  }, [cidadeRows]);

  const fmtCompact = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
    return String(Math.round(n));
  };

  const MatrixCard = ({
    title,
    data,
  }: {
    title: string;
    data: { name: string; VIDAS: number; SALDO: number }[];
  }) => {
    const totalVidas = data.reduce((s, r) => s + (r.VIDAS || 0), 0);
    const totalSaldo = data.reduce((s, r) => s + (r.SALDO || 0), 0);
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm flex flex-col overflow-hidden">
        <div className="px-3 py-2 border-b border-border text-xs font-semibold">{title}</div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left px-2 py-1 font-semibold">Categoria</th>
                <th className="text-right px-2 py-1 font-semibold">Vidas</th>
                <th className="text-right px-2 py-1 font-semibold">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.name} className="border-t border-border/50 hover:bg-muted/30">
                  <td className="px-2 py-1 truncate max-w-[140px]" title={r.name}>{r.name}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{fmtInt(r.VIDAS)}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{fmtNum(r.SALDO)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/70 sticky bottom-0">
              <tr className="font-semibold">
                <td className="px-2 py-1">Total</td>
                <td className="px-2 py-1 text-right tabular-nums">{fmtInt(totalVidas)}</td>
                <td className="px-2 py-1 text-right tabular-nums">{fmtNum(totalSaldo)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  const CidadeCard = () => {
    const total = cidadeData.reduce((s, r) => s + r.VIDAS, 0);
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm flex flex-col overflow-hidden">
        <div className="px-3 py-2 border-b border-border text-xs font-semibold">CIDADE / UF</div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left px-2 py-1 font-semibold">Cidade</th>
                <th className="text-right px-2 py-1 font-semibold">Vidas</th>
              </tr>
            </thead>
            <tbody>
              {cidadeData.map((r) => (
                <tr key={r.name} className="border-t border-border/50 hover:bg-muted/30">
                  <td className="px-2 py-1 truncate max-w-[240px]" title={r.name}>{r.name}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{fmtInt(r.VIDAS)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/70 sticky bottom-0">
              <tr className="font-semibold">
                <td className="px-2 py-1">Total</td>
                <td className="px-2 py-1 text-right tabular-nums">{fmtInt(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  if (mode === "beneficiario") {
    return (
      <div className="flex flex-col gap-3 h-[calc(100vh-9rem)]">
        {mainSection}
        <div className="flex-1 min-h-0">
          <CidadeCard />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-9rem)]">
      {mainSection}
      <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
        <MatrixCard title="Recuperação" data={chartData.recuperacao} />
        <MatrixCard title="Tipo Plano Contratação" data={chartData.tipo} />
        <MatrixCard title="Contratação" data={chartData.contratacao} />
      </div>

    </div>
  );
}
