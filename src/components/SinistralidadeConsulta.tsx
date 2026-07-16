import { useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { Loader2, Search, ArrowUp, ArrowDown } from "lucide-react";

const NUM_COLS = [
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

const COLS = ["dspln", ...NUM_COLS] as const;

type NumCol = (typeof NUM_COLS)[number];
type Row = Record<(typeof COLS)[number], unknown>;
type Grouped = { dspln: string; vidas: number } & Record<NumCol, number>;

// Derived columns shown in the grid (fisioterap merged into "Demais", plus "Saldo")
type DerivedCol = "demais" | "saldo";
type SortKey = "dspln" | "vidas" | Exclude<NumCol, "fisioterap" | "outros"> | DerivedCol;

const DISPLAY_COLS: { key: SortKey; label: string }[] = [
  { key: "vidas", label: "Vidas" },
  { key: "rec_tm", label: "TMM" },
  { key: "rec_cpa", label: "Copart." },
  { key: "rec_total", label: "Total Receita" },
  { key: "consulta", label: "Consulta" },
  { key: "emergencia", label: "Emergência" },
  { key: "exame", label: "Exame" },
  { key: "terapia", label: "Terapia" },
  { key: "internacao", label: "Internação" },
  { key: "demais", label: "Demais" },
  { key: "vrdespesas", label: "Total Despesa" },
  { key: "saldo", label: "Saldo" },
];

const getVal = (r: Grouped, key: SortKey): number | string => {
  if (key === "dspln") return r.dspln;
  if (key === "vidas") return r.vidas;
  if (key === "demais") return (r.fisioterap ?? 0) + (r.outros ?? 0);
  if (key === "saldo") return (r.rec_total ?? 0) - (r.vrdespesas ?? 0);
  return r[key as NumCol];
};

const fmtNum = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPeriodo = (mabas: number) => {
  const s = String(mabas);
  return `${s.slice(4, 6)}/${s.slice(0, 4)}`;
};

const SinistralidadeConsulta = () => {
  const [rows, setRows] = useState<Grouped[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [periodos, setPeriodos] = useState<number[]>([]);
  const [periodo, setPeriodo] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("dspln");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    (async () => {
      const [{ data: maxRow }, { data: minRow }] = await Promise.all([
        hostinger.from("vw_sinistralidade").select("Periodo2").order("Periodo2", { ascending: false }).limit(1),
        hostinger.from("vw_sinistralidade").select("Periodo2").order("Periodo2", { ascending: true }).limit(1),
      ]);
      const max = (maxRow?.[0]?.Periodo2 as number) ?? null;
      const min = (minRow?.[0]?.Periodo2 as number) ?? max;
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

  useEffect(() => {
    if (!periodo) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      setError(null);
      const pageSize = 1000;
      const maxPages = 2000;
      const acc = new Map<string, Grouped>();
      let from = 0;
      for (let i = 0; i < maxPages; i++) {
        const { data, error } = await hostinger
          .from("vw_sinistralidade")
          .select(COLS.join(","))
          .eq("Periodo2", periodo)
          .range(from, from + pageSize - 1);
        if (cancel) return;
        if (error) { setError(error.message); break; }
        const batch = (data as unknown as Row[]) ?? [];
        for (const r of batch) {
          const key = String(r.dspln ?? "");
          let g = acc.get(key);
          if (!g) {
            g = { dspln: key, vidas: 0 } as Grouped;
            for (const c of NUM_COLS) g[c] = 0;
            acc.set(key, g);
          }
          g.vidas += 1;
          for (const c of NUM_COLS) {
            const n = Number(r[c]);
            if (Number.isFinite(n)) g[c] += n;
          }
        }
        if (batch.length < pageSize) break;
        from += pageSize;
      }
      if (cancel) return;
      const list = Array.from(acc.values());
      setRows(list);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [periodo]);

  const filtered = useMemo(() => {
    const base = !q.trim()
      ? rows
      : rows.filter((r) => r.dspln.toLowerCase().includes(q.toLowerCase()));
    const sorted = [...base].sort((a, b) => {
      const va = getVal(a, sortKey);
      const vb = getVal(b, sortKey);
      let cmp = 0;
      if (typeof va === "string" || typeof vb === "string") {
        cmp = String(va).localeCompare(String(vb), "pt-BR");
      } else {
        cmp = (va as number) - (vb as number);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [rows, q, sortKey, sortDir]);

  const totals = useMemo(() => {
    const t: { vidas: number } & Record<NumCol, number> = { vidas: 0 } as { vidas: number } & Record<NumCol, number>;
    for (const c of NUM_COLS) t[c] = 0;
    for (const r of filtered) {
      t.vidas += r.vidas;
      for (const c of NUM_COLS) t[c] += r[c];
    }
    return t;
  }, [filtered]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
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
                  <td className="px-1.5 py-1 text-left w-[30ch] max-w-[30ch] truncate" title={r.dspln.trim()}>{r.dspln.trim()}</td>
                  {DISPLAY_COLS.map((c) => {
                    const v = getVal(r, c.key);
                    return (
                      <td key={c.key} className="px-1 py-1 whitespace-nowrap text-right tabular-nums">
                        {c.key === "vidas" ? (v as number).toLocaleString("pt-BR") : fmtNum(v as number)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 bg-card border-t border-border font-semibold">
              <tr>
                <td className="px-1.5 py-1 text-left">Total</td>
                {DISPLAY_COLS.map((c) => {
                  let v: number;
                  if (c.key === "vidas") v = totals.vidas;
                  else if (c.key === "demais") v = totals.fisioterap + totals.outros;
                  else if (c.key === "saldo") v = totals.rec_total - totals.vrdespesas;
                  else v = totals[c.key as NumCol];
                  return (
                    <td key={c.key} className="px-1 py-1 text-right tabular-nums">
                      {c.key === "vidas" ? v.toLocaleString("pt-BR") : fmtNum(v)}
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
};

export default SinistralidadeConsulta;
