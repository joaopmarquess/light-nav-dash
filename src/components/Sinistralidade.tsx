import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Row = Record<string, any>;
type SortDir = "asc" | "desc";

const PERIOD_COL = "PERIODO";

const Sinistralidade = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState<string>("__all__");
  const [defaultPeriodo, setDefaultPeriodo] = useState<string>("__all__");
  const [defaultLimit, setDefaultLimit] = useState<number>(15);
  const [limit, setLimit] = useState<number>(15);
  const [fetchedLimit, setFetchedLimit] = useState<number>(15);
  const [metric, setMetric] = useState<"RECEITAS" | "DESPESAS" | "LUCROS" | "PREJUIZOS">("DESPESAS");
  const [tipo, setTipo] = useState<"todos" | "coletivos" | "individuais">("todos");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // load distinct periods once
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("Sinistralidade")
        .select("*")
        .limit(5000);
      if (error) {
        setError(error.message);
        return;
      }
      const uniq = Array.from(
        new Set((data ?? []).map((r: any) => r[PERIOD_COL]).filter((v) => v !== null && v !== undefined)),
      ).map(String);
      uniq.sort();
      setPeriodos(uniq);
      if (uniq.length > 0) setPeriodo(uniq[uniq.length - 1]);
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
    const n = Math.max(1, Math.min(limit || 1, 10000));
    const ascending = false;
    let q = supabase.from("Sinistralidade").select("*");
    if (periodo !== "__all__") {
      q = q.eq(`"${PERIOD_COL}"`, periodo).order(metric, { ascending, nullsFirst: false }).limit(n);
    } else {
      // Aggregate locally; fetch a wide window to cover all periods
      q = q.limit(10000);
    }
    const { data, error } = await q;
    if (error) setError(error.message);
    setRows(data ?? []);
    setFetchedLimit(n);
    setLoading(false);
  };


  const HIDDEN_COLS = new Set([PERIOD_COL, "ID"]);
  const SUM_COLS = ["MENSALIDADES", "COPARTICIPACOES", "RECEITAS", "DESPESAS", "SALDO"];

  const filteredRows = useMemo(() => {
    if (tipo === "todos") return rows;
    return rows.filter((r) => {
      const p = Number(r["PLANO"]);
      if (Number.isNaN(p)) return false;
      return tipo === "coletivos" ? p > 2000 : p <= 2000;
    });
  }, [rows, tipo]);

  const displayRows = useMemo(() => {
    if (periodo !== "__all__") return filteredRows;
    if (filteredRows.length === 0) return filteredRows;
    const periodCount = new Set(filteredRows.map((r) => r[PERIOD_COL])).size || 1;
    const groups = new Map<string, Row>();
    for (const r of filteredRows) {
      const key = String(r["PLANO"] ?? "");
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
    const n = Math.max(1, Math.min(limit || 1, 10000));
    out.sort((a, b) => {
      const va = Number(a[metric] || 0);
      const vb = Number(b[metric] || 0);
      return vb - va;
    });
    return out.slice(0, n);
  }, [filteredRows, periodo, metric, limit]);

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
            onChange={(e) => setMetric(e.target.value as "RECEITAS" | "DESPESAS")}
            className="h-9 min-w-40 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="DESPESAS">Maiores DESPESAS</option>
            <option value="RECEITAS">Maiores RECEITAS</option>
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

        {limit !== fetchedLimit && (
          <button
            onClick={fetchRows}
            disabled={loading}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Carregando..." : "Buscar"}
          </button>
        )}

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
            {sorted.map((r, i) => (
              <tr key={i} className="border-t border-border hover:bg-muted/30">
                {columns.map((c) => {
                  const v = r[c];
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
                  return (
                    <td
                      key={c}
                      title={c === "PLANO|EMPRESA" ? String(display) : undefined}
                      className={`px-3 py-2 ${isNum ? "text-right tabular-nums whitespace-nowrap" : c === "PLANO|EMPRESA" ? "max-w-[220px] truncate" : "whitespace-nowrap"}`}
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
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
