import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { dw } from "@/lib/dwClient";

type Row = { agente: string | null; Data_ocorrencia: string | null };

const fmtInt = (n: number) => n.toLocaleString("pt-BR");
const today = () => new Date().toISOString().slice(0, 10);

const Vendas = () => {
  const [data, setData] = useState<string>(today());
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      setError(null);
      const pageSize = 1000;
      let from = 0;
      const all: Row[] = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data: batch, error } = await dw
          .from("sv_ecarteira")
          .select('"agente"')
          .like("Ocorrencia", "ENTRADA%")
          .eq("Data_ocorrencia", data)
          .range(from, from + pageSize - 1);
        if (error) {
          if (!abort) { setError(error.message); setLoading(false); }
          return;
        }
        const b = (batch ?? []) as Row[];
        all.push(...b);
        if (b.length < pageSize) break;
        from += pageSize;
        if (from > 200000) break;
      }
      if (!abort) { setRows(all); setLoading(false); }
    })();
    return () => { abort = true; };
  }, [data]);

  const grouped = useMemo(() => {
    if (!rows) return [];
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = (r.agente ?? "SEM AGENTE").toString().trim() || "SEM AGENTE";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .map(([agente, vidas]) => ({ agente, vidas }))
      .sort((a, b) => b.vidas - a.vidas);
  }, [rows]);

  const total = useMemo(() => grouped.reduce((s, g) => s + g.vidas, 0), [grouped]);
  const max = grouped[0]?.vidas ?? 0;

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Vendas por tipo de agente</h2>
          <p className="text-xs text-muted-foreground">
            Ocorrências de <code>ENTRADA</code> em <code>sv_ecarteira</code> por <code>Data_ocorrencia</code>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Data da venda</label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="h-9 px-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Consultando DW…
        </div>
      )}
      {error && <div className="flex-1 flex items-center justify-center text-destructive text-sm">Erro: {error}</div>}

      {!loading && !error && (
        <>
          <div className="flex items-center justify-end text-xs text-muted-foreground mb-3">
            <span>
              <span className="font-semibold text-foreground tabular-nums">{fmtInt(total)}</span> venda(s) em{" "}
              <span className="font-semibold text-foreground">{data.split("-").reverse().join("/")}</span> ·{" "}
              <span className="font-semibold text-foreground tabular-nums">{fmtInt(grouped.length)}</span> tipo(s) de agente
            </span>
          </div>

          <div className="flex-1 overflow-auto border border-border rounded-lg p-4">
            {grouped.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Nenhuma venda nesta data.
              </div>
            ) : (
              <div className="space-y-3">
                {grouped.map((g) => {
                  const pct = max ? (g.vidas / max) * 100 : 0;
                  const share = total ? (g.vidas / total) * 100 : 0;
                  return (
                    <div key={g.agente} className="flex items-center gap-3">
                      <div className="w-56 shrink-0 text-xs font-medium text-foreground truncate" title={g.agente}>
                        {g.agente}
                      </div>
                      <div className="flex-1 h-6 bg-muted/40 rounded overflow-hidden">
                        <div
                          className="h-full bg-primary/80 rounded transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-28 shrink-0 text-right text-xs tabular-nums text-foreground">
                        {fmtInt(g.vidas)}{" "}
                        <span className="text-muted-foreground">({share.toFixed(1)}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
};

export default Vendas;
