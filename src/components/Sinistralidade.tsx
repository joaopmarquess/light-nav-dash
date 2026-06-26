import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Row = Record<string, any>;
type SortDir = "asc" | "desc";

const PERIOD_COL = "PERIODO";

const Sinistralidade = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState<string>("__all__");
  const [defaultPeriodo, setDefaultPeriodo] = useState<string>("__all__");
  const DEFAULT_LIMIT = 15;
  const [limit, setLimit] = useState<number>(15);
  const [fetchedLimit, setFetchedLimit] = useState<number>(15);
  const [metric, setMetric] = useState<"TODOS" | "RECEITAS" | "DESPESAS" | "LUCROS" | "PREJUIZOS">("TODOS");
  const [tipo, setTipo] = useState<"todos" | "coletivos" | "individuais">("todos");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // helper: fetch all rows paginated (bypasses Supabase 1000-row cap)
  const fetchAll = async (build: (q: any) => any): Promise<{ data: any[]; error: any }> => {
    const pageSize = 1000;
    let from = 0;
    const all: any[] = [];
    while (true) {
      const q = build(supabase.from("Sinistralidade").select("*")).range(from, from + pageSize - 1);
      const { data, error } = await q;
      if (error) return { data: all, error };
      const chunk = data ?? [];
      all.push(...chunk);
      if (chunk.length < pageSize) break;
      from += pageSize;
    }
    return { data: all, error: null };
  };

  // load distinct periods once
  useEffect(() => {
    (async () => {
      const { data, error } = await fetchAll((q) => q);
      if (error) {
        setError(error.message);
        return;
      }
      const uniq = Array.from(
        new Set((data ?? []).map((r: any) => r[PERIOD_COL]).filter((v) => v !== null && v !== undefined)),
      ).map(String);
      uniq.sort();
      setPeriodos(uniq);
      if (uniq.length > 0) {
        const recent = uniq[uniq.length - 1];
        setDefaultPeriodo(recent);
        setPeriodo(recent);
      }
    })();
  }, []);

  // refetch when periodo or metric changes
  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, metric]);

  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    const noLimit = metric === "TODOS";
    const n = noLimit ? 10000 : Math.max(1, Math.min(limit || 1, 10000));
    let result: { data: any[]; error: any };
    if (periodo !== "__all__") {
      result = await fetchAll((q) => {
        let qq = q.eq(`"${PERIOD_COL}"`, periodo);
        if (metric === "LUCROS") {
          qq = qq.gte("SALDO", 0).order("SALDO", { ascending: false, nullsFirst: false });
        } else if (metric === "PREJUIZOS") {
          qq = qq.lt("SALDO", 0).order("SALDO", { ascending: true, nullsFirst: false });
        } else if (metric === "TODOS") {
          qq = qq.order("VIDA", { ascending: false, nullsFirst: false });
        } else {
          qq = qq.order(metric, { ascending: false, nullsFirst: false });
        }
        return qq;
      });
      if (!noLimit && result.data.length > n) result.data = result.data.slice(0, n);
    } else {
      result = await fetchAll((q) => q);
    }
    if (result.error) setError(result.error.message);
    setRows(result.data ?? []);
    setFetchedLimit(n);
    setLoading(false);
  };


  const resetFilters = () => {
    setPeriodo(defaultPeriodo);
    setMetric("TODOS");
    setTipo("todos");
    setLimit(DEFAULT_LIMIT);
    setFetchedLimit(DEFAULT_LIMIT);
    setSortKey(null);
    setSortDir("asc");
  };

  const handleMetricChange = (value: "TODOS" | "RECEITAS" | "DESPESAS" | "LUCROS" | "PREJUIZOS") => {
    setMetric(value);
    setLimit(DEFAULT_LIMIT);
    setFetchedLimit(DEFAULT_LIMIT);
  };


  const HIDDEN_COLS = new Set([PERIOD_COL, "ID", "PLANO"]);
  const SUM_COLS = ["MENSALIDADES", "COPARTICIPACOES", "RECEITAS", "DESPESAS", "SALDO"];

  const filteredRows = useMemo(() => {
    if (tipo === "todos") return rows;
    return rows.filter((r) => {
      const p = Number(r["PLANO"]);
      if (Number.isNaN(p)) return false;
      return tipo === "coletivos" ? p > 2000 : p <= 2000;
    });
  }, [rows, tipo]);

  const aggregate = (list: Row[], keyFn: (r: Row) => string, periodCount: number) => {
    const groups = new Map<string, Row>();
    for (const r of list) {
      const key = keyFn(r);
      let g = groups.get(key);
      if (!g) {
        g = { ...r };
        for (const c of SUM_COLS) g[c] = 0;
        g["VIDA"] = 0;
        g["__vidaSum"] = 0;
        groups.set(key, g);
      }
      for (const c of SUM_COLS) g[c] = Number(g[c] || 0) + Number(r[c] || 0);
      g["__vidaSum"] = Number(g["__vidaSum"] || 0) + Number(r["VIDA"] || 0);
    }
    const out: Row[] = [];
    for (const g of groups.values()) {
      g["VIDA"] = Number(g["__vidaSum"]) / periodCount;
      const rec = Number(g["RECEITAS"] || 0);
      g["%SIN"] = rec !== 0 ? (Number(g["DESPESAS"] || 0) / rec) * 100 : 0;
      delete g["__vidaSum"];
      out.push(g);
    }
    return out;
  };

  const periodCount = useMemo(() => {
    if (filteredRows.length === 0) return 1;
    return new Set(filteredRows.map((r) => r[PERIOD_COL])).size || 1;
  }, [filteredRows]);

  const childrenMap = useMemo(() => {
    const map = new Map<string, Row[]>();
    const byParent = new Map<string, Row[]>();
    for (const r of filteredRows) {
      const k = String(r["PLANO|EMPRESA"] ?? "");
      const arr = byParent.get(k) ?? [];
      arr.push(r);
      byParent.set(k, arr);
    }
    for (const [k, list] of byParent.entries()) {
      const kids = aggregate(list, (r) => String(r["PLANO"] ?? ""), periodCount);
      kids.sort((a, b) => Number(b["VIDA"] || 0) - Number(a["VIDA"] || 0));
      map.set(k, kids);
    }
    return map;
  }, [filteredRows, periodCount]);

  const displayRows = useMemo(() => {
    if (filteredRows.length === 0) return filteredRows;
    const out = aggregate(filteredRows, (r) => String(r["PLANO|EMPRESA"] ?? ""), periodCount);
    const noLimit = metric === "TODOS";
    const n = noLimit ? out.length : Math.max(1, Math.min(limit || 1, 10000));
    let filtered = out;
    if (metric === "LUCROS") filtered = out.filter((r) => Number(r["SALDO"] || 0) >= 0);
    else if (metric === "PREJUIZOS") filtered = out.filter((r) => Number(r["SALDO"] || 0) < 0);
    filtered.sort((a, b) => {
      if (metric === "LUCROS") return Number(b["SALDO"] || 0) - Number(a["SALDO"] || 0);
      if (metric === "PREJUIZOS") return Number(a["SALDO"] || 0) - Number(b["SALDO"] || 0);
      if (metric === "TODOS") return Number(b["VIDA"] || 0) - Number(a["VIDA"] || 0);
      return Number(b[metric] || 0) - Number(a[metric] || 0);
    });
    return filtered.slice(0, n);
  }, [filteredRows, periodCount, metric, limit]);

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set<string>();
      if (!prev.has(key)) next.add(key);
      return next;
    });
  };

  const columns = useMemo(
    () => (displayRows[0] ? Object.keys(displayRows[0]).filter((c) => !HIDDEN_COLS.has(c)) : []),
    [displayRows],
  );

  const sorted = useMemo(() => {
    if (!sortKey) return displayRows;
    const copy = [...displayRows];
    copy.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const na = Number(va);
      const nb = Number(vb);
      const bothNum = !Number.isNaN(na) && !Number.isNaN(nb) && va !== "" && vb !== "";
      const cmp = bothNum ? na - nb : String(va).localeCompare(String(vb), "pt-BR", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [displayRows, sortKey, sortDir]);

  const toggleSort = (k: string) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">PERIODO</label>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="h-9 min-w-48 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="__all__">Todos</option>
            {periodos.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Ordenar por</label>
          <select
            value={metric}
            onChange={(e) =>
              handleMetricChange(e.target.value as "TODOS" | "RECEITAS" | "DESPESAS" | "LUCROS" | "PREJUIZOS")
            }
            className="h-9 min-w-40 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="TODOS">Todos</option>
            <option value="DESPESAS">Maiores DESPESAS</option>
            <option value="RECEITAS">Maiores RECEITAS</option>
            <option value="LUCROS">Maiores LUCROS</option>
            <option value="PREJUIZOS">Maiores PREJUÍZOS</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Tipo de plano</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as "todos" | "coletivos" | "individuais")}
            className="h-9 min-w-48 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="todos">Todos</option>
            <option value="coletivos">Planos Coletivos</option>
            <option value="individuais">Planos Ind/Familiares</option>
          </select>
        </div>





        {metric !== "TODOS" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Linhas</label>
            <input
              type="number"
              min={1}
              max={10000}
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value || "0", 10))}
              className="h-9 w-28 rounded-md border border-border bg-background px-3 text-sm"
            />
          </div>
        )}

        {metric !== "TODOS" && limit !== fetchedLimit && (
          <button
            onClick={fetchRows}
            disabled={loading}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Carregando..." : "Buscar"}
          </button>
        )}

        <button
          onClick={resetFilters}
          title="Zerar filtros"
          aria-label="Zerar filtros"
          className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border bg-background hover:bg-muted"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <span className="text-xs text-muted-foreground ml-auto">{sorted.length} registro(s)</span>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm p-3">
          {error}
        </div>
      )}

      <div className="overflow-auto max-h-[calc(100vh-18rem)] border border-border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              {columns.map((c) => {
                const active = sortKey === c;
                return (
                  <th
                    key={c}
                    onClick={() => toggleSort(c)}
                    className={`text-left font-medium px-3 py-2 cursor-pointer select-none hover:bg-muted ${c === "PLANO|EMPRESA" ? "max-w-[220px]" : "whitespace-nowrap"}`}
                  >
                    <span className="inline-flex items-center gap-1 truncate align-middle max-w-full">
                      <span className="truncate">{c}</span>
                      {active ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="h-3 w-3 shrink-0" />
                        ) : (
                          <ArrowDown className="h-3 w-3 shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40 shrink-0" />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {(() => {
              const anyExpanded = expanded.size > 0;
              return sorted.map((r, i) => {
              const parentKey = String(r["PLANO|EMPRESA"] ?? "");
              const kids = childrenMap.get(parentKey) ?? [];
              const isOpen = expanded.has(parentKey);
              const hasKids = kids.length > 1;
              const parentDim = anyExpanded && !isOpen;
              const renderRow = (row: Row, opts: { isChild?: boolean; rowKey: string }) => (
                <tr
                  key={opts.rowKey}
                  className={`border-t border-border hover:bg-muted/30 ${
                    opts.isChild
                      ? "bg-muted/20 text-blue-900 dark:text-blue-300"
                      : isOpen
                      ? "font-semibold text-blue-900 dark:text-blue-300"
                      : parentDim
                      ? "text-muted-foreground/60"
                      : "text-foreground"
                  }`}
                >
                  {columns.map((c, ci) => {
                    const v = row[c];
                    const isNum =
                      typeof v === "number" ||
                      (typeof v === "string" && v !== "" && !Number.isNaN(Number(v)));
                    const intCol = c === "VIDA";
                    const plainCol = c === "PLANO" || c === "ID";
                    const display =
                      v === null || v === undefined
                        ? ""
                        : plainCol
                        ? String(v)
                        : isNum
                        ? new Intl.NumberFormat("pt-BR", {
                            minimumFractionDigits: intCol ? 0 : 2,
                            maximumFractionDigits: intCol ? 0 : 2,
                          }).format(Number(v))
                        : String(v);
                    const isPlanoEmp = c === "PLANO|EMPRESA";
                    return (
                      <td
                        key={c}
                        title={isPlanoEmp ? String(display) : undefined}
                        className={`px-3 py-2 ${isNum ? "text-right tabular-nums whitespace-nowrap" : isPlanoEmp ? "max-w-[260px]" : "whitespace-nowrap"}`}
                      >
                        {isPlanoEmp && !opts.isChild ? (
                          <span className="inline-flex items-center gap-1 max-w-full">
                            {hasKids ? (
                              <button
                                onClick={() => toggleExpand(parentKey)}
                                aria-label={isOpen ? "Recolher" : "Expandir"}
                                className="inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
                              >
                                {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              </button>
                            ) : (
                              <span className="inline-block h-4 w-4 shrink-0" />
                            )}
                            <span className="truncate">{display}</span>
                          </span>
                        ) : isPlanoEmp && opts.isChild ? (
                          <span className="pl-6 text-xs">↳ PLANO {String(row["PLANO"] ?? "")}</span>
                        ) : (
                          display
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
              const out = [renderRow(r, { rowKey: `p-${i}` })];
              if (isOpen) {
                kids.forEach((kr, ki) => out.push(renderRow(kr, { isChild: true, rowKey: `p-${i}-c-${ki}` })));
              }
              return out;
            });
            })()}
            {!loading && sorted.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={Math.max(columns.length, 1)}>
                  Sem dados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Sinistralidade;
