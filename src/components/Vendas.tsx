import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { dw } from "@/lib/dwClient";

type Grouped = { agente: string; vidas: number };
type CheckRow = { agente: string; data_ocorrencia: string | null };

const fmtInt = (n: number) => n.toLocaleString("pt-BR");

const Vendas = () => {
  const [grouped, setGrouped] = useState<Grouped[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [check, setCheck] = useState<CheckRow[] | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);

  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await dw.rpc("fn_vendas_por_agente");
      if (abort) return;
      if (error) { setError(error.message); setLoading(false); return; }
      const list = ((data ?? []) as { agente: string; vidas: number }[])
        .map((r) => ({ agente: r.agente, vidas: Number(r.vidas) }))
        .sort((a, b) => b.vidas - a.vidas);
      setGrouped(list);
      setLoading(false);
    })();
    return () => { abort = true; };
  }, []);

  const loadCheck = async () => {
    setCheckLoading(true);
    const { data, error } = await dw.rpc("fn_vendas_ultima_por_agente", { _limit: 100 });
    if (error) { setError(error.message); setCheckLoading(false); return; }
    setCheck((data ?? []) as CheckRow[]);
    setCheckLoading(false);
  };

  const total = (grouped ?? []).reduce((s, g) => s + g.vidas, 0);
  const max = grouped?.[0]?.vidas ?? 0;
  const list = grouped ?? [];

  const total = useMemo(() => grouped.reduce((s, g) => s + g.vidas, 0), [grouped]);
  const max = grouped[0]?.vidas ?? 0;

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Vendas por tipo de agente</h2>
          <p className="text-xs text-muted-foreground">
            Todas as ocorrências de <code>ENTRADA</code> em <code>sv_ecarteira</code>.
          </p>
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
              <span className="font-semibold text-foreground tabular-nums">{fmtInt(total)}</span> venda(s) ·{" "}
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

          <div className="mt-4 border border-border rounded-lg">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
              <span className="text-xs font-semibold text-foreground">Verificação · top 100 entradas (AGENTE × Data_Ocorrencia)</span>
              <button
                onClick={loadCheck}
                disabled={checkLoading}
                className="h-7 px-3 rounded-md border border-border bg-background text-xs hover:bg-accent disabled:opacity-50"
              >
                {checkLoading ? "Carregando…" : check ? "Recarregar" : "Carregar"}
              </button>
            </div>
            {check && (
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr>
                      <th className="px-3 py-1.5 text-left w-10">#</th>
                      <th className="px-3 py-1.5 text-left">AGENTE</th>
                      <th className="px-3 py-1.5 text-left">Data_Ocorrencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {check.map((r, i) => (
                      <tr key={i} className="border-t border-border/60">
                        <td className="px-3 py-1 tabular-nums text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-1">{(r.agente ?? "SEM AGENTE").toString().trim() || "SEM AGENTE"}</td>
                        <td className="px-3 py-1 tabular-nums">{r.Data_ocorrencia ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
};

export default Vendas;
