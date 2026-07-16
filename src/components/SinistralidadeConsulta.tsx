import { useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { Loader2, Search, ArrowUp, ArrowDown } from "lucide-react";

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
type Row = { PERIODO: string; dspln: string } & Record<NumCol, number | string | null>;

type SortKey = "dspln" | NumCol;

const DISPLAY_COLS: { key: NumCol; label: string }[] = [
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
];

const fmtNum = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SELECT = ["PERIODO", "dspln", ...NUM_COLS].join(",");

const SinistralidadeConsulta = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("dspln");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

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
        // sort by end date "MM/AAAA a MM/AAAA" -> use second date desc
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

  const filtered = useMemo(() => {
    const base = !q.trim()
      ? rows
      : rows.filter((r) => (r.dspln ?? "").toLowerCase().includes(q.toLowerCase()));
    const sorted = [...base].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "dspln") {
        cmp = String(a.dspln ?? "").localeCompare(String(b.dspln ?? ""), "pt-BR");
      } else {
        cmp = (Number(a[sortKey]) || 0) - (Number(b[sortKey]) || 0);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [rows, q, sortKey, sortDir]);

  const totals = useMemo(() => {
    const t = {} as Record<NumCol, number>;
    for (const c of NUM_COLS) t[c] = 0;
    for (const r of filtered) {
      for (const c of NUM_COLS) {
        const n = Number(r[c]);
        if (Number.isFinite(n)) t[c] += n;
      }
    }
    return t;
  }, [filtered]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "dspln" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === "asc" ? (
        <ArrowUp className="inline h-3 w-3 ml-0.5" />
      ) : (
        <ArrowDown className="inline h-3 w-3 ml-0.5" />
      )
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
                <th
                  onClick={() => toggleSort("dspln")}
                  className="font-medium text-muted-foreground px-1.5 py-1 text-left w-[30ch] max-w-[30ch] truncate cursor-pointer select-none"
                >
                  Nome Plano|Empresa<SortIcon k="dspln" />
                </th>
                {DISPLAY_COLS.map((c) => (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c.key)}
                    className="font-medium text-muted-foreground px-1 py-1 whitespace-nowrap text-right cursor-pointer select-none"
                  >
                    {c.label}<SortIcon k={c.key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i} className="border-b border-border/60 hover:bg-accent/40">
                  <td className="px-1.5 py-1 text-left w-[30ch] max-w-[30ch] truncate" title={(r.dspln ?? "").trim()}>
                    {(r.dspln ?? "").trim()}
                  </td>
                  {DISPLAY_COLS.map((c) => (
                    <td key={c.key} className="px-1 py-1 whitespace-nowrap text-right tabular-nums">
                      {fmtNum(Number(r[c.key]) || 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 bg-card border-t border-border font-semibold">
              <tr>
                <td className="px-1.5 py-1 text-left">Total</td>
                {DISPLAY_COLS.map((c) => (
                  <td key={c.key} className="px-1 py-1 text-right tabular-nums">
                    {fmtNum(totals[c.key])}
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
