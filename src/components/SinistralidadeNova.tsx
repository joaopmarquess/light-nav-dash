import { useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { Search, ArrowUp, ArrowDown } from "lucide-react";
import FunLoader from "@/components/FunLoader";

type Mode = "empresa" | "beneficiario";

interface Props {
  mode: Mode;
}

type Agg = {
  grupo: string;
  rec_total: number;
  vrdespesas: number;
  saldo: number;
  vidas: number;
};

type SortKey = "GRUPO" | "rec_total" | "vrdespesas" | "SALDO" | "sin";

const fmtNum = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n: number) =>
  Number.isFinite(n)
    ? `${(n * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
    : "-";

export default function SinistralidadeNova({ mode: _mode }: Props) {
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState<string>("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [aggRows, setAggRows] = useState<Agg[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("SALDO");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data, error } = await hostinger.rpc("sin_periodos");
      if (!alive) return;
      if (error) {
        console.error("PERIODO load error", error);
        setPeriodos([]);
      } else {
        const uniq = Array.from(
          new Set(
            ((data ?? []) as any[])
              .map((r) => String(r.periodo ?? r.PERIODO ?? ""))
              .filter(Boolean),
          ),
        );
        uniq.sort().reverse();
        setPeriodos(uniq);
        setPeriodo(uniq[0] ?? "");
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!periodo) return;
    let alive = true;
    setLoadingRows(true);
    (async () => {
      const { data, error } = await hostinger.rpc("sin_por_grupo", {
        p_periodo: periodo,
      });
      if (!alive) return;
      if (error) {
        console.error("sin_por_grupo error", error);
        setAggRows([]);
      } else {
        const mapped: Agg[] = ((data ?? []) as any[]).map((r) => ({
          grupo: String(r.grupo ?? "(sem grupo)") || "(sem grupo)",
          rec_total: Number(r.rec_total) || 0,
          vrdespesas: Number(r.vrdespesas) || 0,
          saldo: Number(r.saldo) || 0,
          vidas: Number(r.vidas) || 0,
        }));
        setAggRows(mapped);
      }
      setLoadingRows(false);
    })();
    return () => {
      alive = false;
    };
  }, [periodo]);

  const aggregated = useMemo<Agg[]>(() => {
    const t = debouncedQ.toLowerCase();
    if (!t) return aggRows;
    return aggRows.filter((a) => a.grupo.toLowerCase().includes(t));
  }, [aggRows, debouncedQ]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...aggregated].sort((a, b) => {
      if (sortKey === "GRUPO") return a.grupo.localeCompare(b.grupo, "pt-BR") * dir;
      if (sortKey === "sin") {
        const av = a.rec_total ? a.vrdespesas / a.rec_total : 0;
        const bv = b.rec_total ? b.vrdespesas / b.rec_total : 0;
        return (av - bv) * dir;
      }
      const k = sortKey === "SALDO" ? "saldo" : sortKey;
      return ((a as any)[k] - (b as any)[k]) * dir;
    });
  }, [aggregated, sortKey, sortDir]);

  const totals = useMemo(() => {
    let rec = 0, desp = 0, sal = 0;
    for (const a of aggregated) {
      rec += a.rec_total;
      desp += a.vrdespesas;
      sal += a.saldo;
    }
    return { rec, desp, sal, sin: rec ? desp / rec : 0 };
  }, [aggregated]);

  const onSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "GRUPO" ? "asc" : "desc");
    }
  };

  const arrow = (k: SortKey) =>
    sortKey === k ? (
      sortDir === "asc" ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />
    ) : null;

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 p-3 border-b border-border flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Período</label>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            disabled={loading}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
          >
            {loading && <option>Carregando...</option>}
            {!loading && periodos.length === 0 && <option value="">—</option>}
            {periodos.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou código"
            className="h-9 w-72 pl-8 pr-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <span className="text-xs text-muted-foreground ml-auto">
          {sorted.length.toLocaleString("pt-BR")} grupos
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {loadingRows ? (
          <div className="h-full flex items-center justify-center">
            <FunLoader />
          </div>
        ) : sorted.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Sem dados.
          </div>
        ) : (
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border">
                <th
                  className="px-2 py-1.5 text-left font-semibold cursor-pointer select-none"
                  onClick={() => onSort("GRUPO")}
                >
                  GRUPO {arrow("GRUPO")}
                </th>
                <th
                  className="px-2 py-1.5 text-right font-semibold cursor-pointer select-none"
                  onClick={() => onSort("rec_total")}
                >
                  Total Receita {arrow("rec_total")}
                </th>
                <th
                  className="px-2 py-1.5 text-right font-semibold cursor-pointer select-none"
                  onClick={() => onSort("vrdespesas")}
                >
                  Total Despesa {arrow("vrdespesas")}
                </th>
                <th
                  className="px-2 py-1.5 text-right font-semibold cursor-pointer select-none"
                  onClick={() => onSort("SALDO")}
                >
                  Saldo {arrow("SALDO")}
                </th>
                <th
                  className="px-2 py-1.5 text-right font-semibold cursor-pointer select-none"
                  onClick={() => onSort("sin")}
                >
                  SIN. {arrow("sin")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => {
                const sin = a.rec_total ? a.vrdespesas / a.rec_total : 0;
                return (
                  <tr key={a.grupo} className="border-b border-border/40 hover:bg-accent/30">
                    <td className="px-2 py-1 truncate max-w-[320px]" title={a.grupo}>
                      {a.grupo}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">{fmtNum(a.rec_total)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{fmtNum(a.vrdespesas)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{fmtNum(a.saldo)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{fmtPct(sin)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 bg-card">
              <tr className="border-t-2 border-border font-bold">
                <td className="px-2 py-1.5">TOTAL</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{fmtNum(totals.rec)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{fmtNum(totals.desp)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{fmtNum(totals.sal)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{fmtPct(totals.sin)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </section>
  );
}
