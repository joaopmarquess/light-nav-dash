import { useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { Loader2, Search } from "lucide-react";

const COLS = [
  "dspln",
  "rec_tm",
  "rec_cpa",
  "rec_total",
  "consulta",
  "emergencia",
  "fisioterap",
  "exame",
  "terapia",
  "internacao",
  "outros",
  "vrdespesas",
] as const;

type Row = Record<(typeof COLS)[number], unknown>;

const fmt = (v: unknown, col: string): string => {
  if (v === null || v === undefined || v === "") return "";
  if (col === "dspln") return String(v);
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtPeriodo = (mabas: number) => {
  const s = String(mabas);
  return `${s.slice(4, 6)}/${s.slice(0, 4)}`;
};

const SinistralidadeConsulta = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [periodos, setPeriodos] = useState<number[]>([]);
  const [periodo, setPeriodo] = useState<number | null>(null);

  // Load available periods (min/max mabas) and default to latest
  useEffect(() => {
    (async () => {
      const [{ data: maxRow }, { data: minRow }] = await Promise.all([
        hostinger.from("sinistralidade").select("mabas").order("mabas", { ascending: false }).limit(1),
        hostinger.from("sinistralidade").select("mabas").order("mabas", { ascending: true }).limit(1),
      ]);
      const max = (maxRow?.[0]?.mabas as number) ?? null;
      const min = (minRow?.[0]?.mabas as number) ?? max;
      if (!max || !min) return;
      const list: number[] = [];
      let y = Math.floor(min / 100);
      let m = min % 100;
      const ymEnd = max;
      while (y * 100 + m <= ymEnd) {
        list.push(y * 100 + m);
        m += 1;
        if (m > 12) { m = 1; y += 1; }
      }
      list.reverse();
      setPeriodos(list);
      setPeriodo(max);
    })();
  }, []);

  // Load rows for selected period
  useEffect(() => {
    if (!periodo) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await hostinger
        .from("sinistralidade")
        .select(COLS.join(","))
        .eq("mabas", periodo)
        .limit(10000);
      if (cancel) return;
      if (error) setError(error.message);
      else setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [periodo]);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const s = q.toLowerCase();
    return rows.filter((r) => COLS.some((c) => String(r[c] ?? "").toLowerCase().includes(s)));
  }, [rows, q]);

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Período</label>
          <select
            value={periodo ?? ""}
            onChange={(e) => setPeriodo(Number(e.target.value))}
            className="h-9 px-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {periodos.map((p) => (
              <option key={p} value={p}>{fmtPeriodo(p)}</option>
            ))}
          </select>
          <div className="text-sm text-muted-foreground">
            {loading ? "Carregando..." : `${filtered.length.toLocaleString("pt-BR")} registro(s)`}
          </div>
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

      <div className="flex-1 overflow-auto">
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
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card border-b border-border">
              <tr>
                {COLS.map((c) => (
                  <th
                    key={c}
                    className={`font-medium text-muted-foreground px-3 py-2 whitespace-nowrap ${c === "dspln" ? "text-left" : "text-right"}`}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i} className="border-b border-border/60 hover:bg-accent/40">
                  {COLS.map((c) => (
                    <td
                      key={c}
                      className={`px-3 py-1.5 whitespace-nowrap ${c === "dspln" ? "text-left" : "text-right tabular-nums"}`}
                    >
                      {fmt(r[c], c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

export default SinistralidadeConsulta;
