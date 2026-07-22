import { useEffect, useRef, useState } from "react";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { hostinger } from "@/lib/hostingerClient";

type Row = {
  CDREGUSR: number | string | null;
  NOME_BENEFICIARIO: string | null;
  Ds_Agente_Comercial: string | null;
  VENDEDOR: string | null;
  Data_ocorrencia: string | null;
  Plano_de: string | null;
  TIPO_LINHA: string | null;
  Ocorrencia: string | null;
};

const fmtInt = (n: number) => n.toLocaleString("pt-BR");

const toISO = (br: string): string | null => {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const yyyy = parseInt(m[3], 10);
  if (mm < 1 || mm > 12 || dd < 1 || yyyy < 1900) return null;
  // Último dia válido do mês
  const lastDay = new Date(yyyy, mm, 0).getDate();
  const day = Math.min(dd, lastDay);
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const firstOfYearBR = () => {
  const d = new Date();
  return `01/01/${d.getFullYear()}`;
};
const todayBR = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const PAGE = 1000;

const Entradas = () => {
  const [de, setDe] = useState(firstOfYearBR());
  const [ate, setAte] = useState(todayBR());
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const isoToBR = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  const consultar = async () => {
    const deISO = toISO(de);
    const ateISO = toISO(ate);
    if (!deISO || !ateISO) {
      setError("Datas inválidas. Use dd/mm/aaaa.");
      return;
    }
    const deBR = isoToBR(deISO);
    const ateBR = isoToBR(ateISO);
    if (deBR !== de) setDe(deBR);
    if (ateBR !== ate) setAte(ateBR);
    setError(null);
    setLoading(true);
    setRows(null);
    setProgress(0);
    setExpanded({});

    const all: Row[] = [];
    let from = 0;
    // paginação
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await dw
        .from("sv_ecarteira_movimentacao")
        .select(
          'CDREGUSR,NOME_BENEFICIARIO,AGENTE,Data_ocorrencia,Plano_de,TIPO_LINHA,Ocorrencia'
        )
        .like("Ocorrencia", "ENTRADA%")
        .eq("Plano_de", "Saúde")
        .eq("TIPO_LINHA", "E")
        .gte("Data_ocorrencia", deISO)
        .lte("Data_ocorrencia", ateISO)
        .order("Data_ocorrencia", { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      const batch = (data ?? []) as Row[];
      all.push(...batch);
      setProgress(all.length);
      if (batch.length < PAGE) break;
      from += PAGE;
    }

    setRows(all);
    setLoading(false);
  };

  const didAutoRun = useRef(false);
  useEffect(() => {
    if (didAutoRun.current) return;
    didAutoRun.current = true;
    consultar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = (() => {
    if (!rows) return [] as { agente: string; vidas: number; itens: Row[] }[];
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      const key = (r.AGENTE ?? "").toString().trim() || "SEM AGENTE";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries())
      .map(([agente, itens]) => ({ agente, vidas: itens.length, itens }))
      .sort((a, b) => b.vidas - a.vidas);
  })();

  const total = rows?.length ?? 0;
  const max = grouped[0]?.vidas ?? 0;

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-6 h-[calc(100vh-9rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Entradas</h2>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1">De</label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={de}
                onChange={(e) => setDe(e.target.value)}
                onBlur={(e) => { const iso = toISO(e.target.value); if (iso) setDe(isoToBR(iso)); }}
                placeholder="dd/mm/aaaa"
                className="h-9 w-40 pl-9 pr-3 rounded-md border border-border bg-background text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Até</label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={ate}
                onChange={(e) => setAte(e.target.value)}
                onBlur={(e) => { const iso = toISO(e.target.value); if (iso) setAte(isoToBR(iso)); }}
                placeholder="dd/mm/aaaa"
                className="h-9 w-40 pl-9 pr-3 rounded-md border border-border bg-background text-sm"
              />
            </div>
          </div>
          <button
            onClick={consultar}
            disabled={loading}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> {fmtInt(progress)}…
              </span>
            ) : (
              "Consultar"
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 text-sm text-destructive">Erro: {error}</div>
      )}

      {!rows && !loading && !error && (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Escolha um intervalo de datas e clique em <span className="mx-1 font-medium text-foreground">Consultar</span>.
        </div>
      )}

      {rows && (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <span>
              Período: <span className="text-foreground font-medium">{de}</span> a{" "}
              <span className="text-foreground font-medium">{ate}</span>
            </span>
            <span>
              <span className="font-semibold text-foreground tabular-nums">{fmtInt(total)}</span> entrada(s) ·{" "}
              <span className="font-semibold text-foreground tabular-nums">{fmtInt(grouped.length)}</span> agente(s)
            </span>
          </div>

          <div className="flex-1 overflow-auto border border-border rounded-lg p-4">
            {grouped.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Nenhuma entrada no período.
              </div>
            ) : (
              <div className="space-y-2">
                {grouped.map((g) => {
                  const pct = max ? (g.vidas / max) * 100 : 0;
                  const share = total ? (g.vidas / total) * 100 : 0;
                  const isOpen = !!expanded[g.agente];
                  return (
                    <div key={g.agente} className="border border-border/60 rounded-md">
                      <button
                        onClick={() => setExpanded((p) => ({ ...p, [g.agente]: !p[g.agente] }))}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent/40 rounded-md"
                      >
                        <div className="w-56 shrink-0 text-xs font-medium text-foreground truncate text-left" title={g.agente}>
                          {g.agente}
                        </div>
                        <div className="flex-1 h-5 bg-muted/40 rounded overflow-hidden">
                          <div className="h-full bg-primary/80" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="w-32 shrink-0 text-right text-xs tabular-nums text-foreground">
                          {fmtInt(g.vidas)}{" "}
                          <span className="text-muted-foreground">({share.toFixed(1)}%)</span>
                        </div>
                      </button>
                      {isOpen && (
                        <div className="max-h-72 overflow-auto border-t border-border/60">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/40 sticky top-0">
                              <tr>
                                <th className="px-3 py-1.5 text-left">CDREGUSR</th>
                                <th className="px-3 py-1.5 text-left">NOME</th>
                                <th className="px-3 py-1.5 text-left">Data_ocorrencia</th>
                              </tr>
                            </thead>
                            <tbody>
                              {g.itens.map((r, i) => (
                                <tr key={i} className="border-t border-border/60">
                                  <td className="px-3 py-1 tabular-nums">{r.CDREGUSR ?? "—"}</td>
                                  <td className="px-3 py-1">{r.NOME_BENEFICIARIO ?? "—"}</td>
                                  <td className="px-3 py-1 tabular-nums">{r.Data_ocorrencia ?? "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
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

export default Entradas;
