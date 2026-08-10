import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

type Row = Record<string, string>;

const COLS = [
  "cdpln",
  "mabas",
  "codfamilia",
  "Colaborador",
  "Beneficiario",
  "Mensalidade",
  "Coparticipacao",
  "Taxas_Adesao",
  "Odonto",
  "Outros",
  "Total",
];

const NUM = new Set(["Mensalidade", "Coparticipacao", "Taxas_Adesao", "Odonto", "Outros", "Total"]);

const toNum = (v: string) => Number(String(v ?? "").replace(/\./g, "").replace(",", ".")) || 0;
const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SinistralidadeAPBFaturas = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/data/apb_faturas.json")
      .then((r) => r.json())
      .then((d: Row[]) => setRows(d))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => COLS.some((c) => String(r[c] ?? "").toLowerCase().includes(t)));
  }, [rows, q]);

  const totals = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const r of filtered) for (const c of NUM) acc[c] = (acc[c] ?? 0) + toNum(r[c]);
    return acc;
  }, [filtered]);

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar (plano, competência, colaborador, beneficiário...)"
          className="h-9 w-96 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <span className="text-xs text-muted-foreground">
          {filtered.length.toLocaleString("pt-BR")} linhas
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-accent text-primary">
              <tr>
                {COLS.map((c) => (
                  <th key={c} className={`px-2 py-1.5 font-semibold whitespace-nowrap ${NUM.has(c) ? "text-right" : "text-left"}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 3000).map((r, i) => (
                <tr key={i} className="border-b border-border/60 hover:bg-accent/40">
                  {COLS.map((c) => (
                    <td key={c} className={`px-2 py-1 whitespace-nowrap ${NUM.has(c) ? "text-right tabular-nums" : "text-left"}`}>
                      {NUM.has(c) ? fmt(toNum(r[c])) : r[c]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 bg-card border-t border-border">
              <tr className="font-semibold">
                {COLS.map((c) => (
                  <td key={c} className={`px-2 py-1.5 ${NUM.has(c) ? "text-right tabular-nums" : "text-left"}`}>
                    {c === "cdpln" ? "TOTAL" : NUM.has(c) ? fmt(totals[c] ?? 0) : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        )}
      </div>
      {!loading && filtered.length > 3000 && (
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
          Exibindo as 3.000 primeiras linhas (provisório).
        </div>
      )}
    </section>
  );
};

export default SinistralidadeAPBFaturas;
