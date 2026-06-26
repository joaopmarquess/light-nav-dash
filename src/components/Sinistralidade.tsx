import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Row = Record<string, any>;
type SortDir = "asc" | "desc";

const PERIOD_COL = "PERIODO";

const Sinistralidade = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState<string>("__all__");
  const [limit, setLimit] = useState<number>(100);
  const [metric, setMetric] = useState<"TOTAL FATURA" | "UTILIZAÇÃO">("UTILIZAÇÃO");
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
    })();
  }, []);

  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    const n = Math.max(1, Math.min(limit || 1, 10000));
    // UTILIZAÇÃO costuma ser negativa → maior módulo = ordem ascendente.
    // TOTAL FATURA → maiores = ordem descendente.
    const ascending = metric === "UTILIZAÇÃO";
    let q = supabase
      .from("Sinistralidade")
      .select("*")
      .order(metric, { ascending, nullsFirst: false })
      .limit(n);
    if (periodo !== "__all__") {
      q = q.eq(`"${PERIOD_COL}"`, periodo);
    }
    const { data, error } = await q;
    if (error) setError(error.message);
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo(
    () => (rows[0] ? Object.keys(rows[0]).filter((c) => c !== PERIOD_COL) : []),
    [rows],
  );


  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const copy = [...rows];
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
  }, [rows, sortKey, sortDir]);

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
          <label className="text-xs font-medium text-muted-foreground">!Período U12</label>
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
            onChange={(e) => setMetric(e.target.value as "TOTAL FATURA" | "UTILIZAÇÃO")}
            className="h-9 min-w-40 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="UTILIZAÇÃO">Maiores UTILIZAÇÃO</option>
            <option value="TOTAL FATURA">Maiores TOTAL FATURA</option>
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

        <button
          onClick={fetchRows}
          disabled={loading}
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Carregando..." : "Buscar"}
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
                    className="text-left font-medium px-3 py-2 whitespace-nowrap cursor-pointer select-none hover:bg-muted"
                  >
                    <span className="inline-flex items-center gap-1">
                      {c}
                      {active ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
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
                  const intCol = c === "VIDAS";
                  const plainCol = c === "N.PLANO";
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
                      className={`px-3 py-2 whitespace-nowrap ${isNum ? "text-right tabular-nums" : ""}`}
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
