import { Fragment, useEffect, useMemo, useState } from "react";
import { Search, Loader2, ArrowUp, ArrowDown, ArrowUpDown, Plus, X } from "lucide-react";
import { dw } from "@/lib/dwClient";

type SortKey = "plano" | "nome" | "vidas";
type SortDir = "asc" | "desc";

type Row = {
  PLANO: string | number | null;
  NOME_PLANO: string | null;
  VIGENCIA_BENEFICIARIO: string | null;
  REATIVACAO: string | null;
  CANCELAMENTO: string | null;
};

function parseBR(s: string): Date | null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  return isNaN(d.getTime()) ? null : d;
}
// Accepts ISO 'YYYY-MM-DD' or timestamp; returns ms since epoch or null
function parseISO(s: string | null): number | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  return isNaN(t) ? null : t;
}

interface Props {
  dateValue: string;
  initialDrillNome?: string | null;
}

const AtivosEm = ({ dateValue, initialDrillNome = null }: Props) => {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDraft, setFilterDraft] = useState("");
  const [pendingTerms, setPendingTerms] = useState<string[]>([]);
  const [appliedTerms, setAppliedTerms] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("vidas");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showSubtotals, setShowSubtotals] = useState(true);
  const [summarize, setSummarize] = useState(!!initialDrillNome);
  const [drillNome, setDrillNome] = useState<string | null>(initialDrillNome);

  useEffect(() => {
    if (initialDrillNome) {
      setDrillNome(initialDrillNome);
      setSummarize(true);
    }
  }, [initialDrillNome]);

  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      const pageSize = 1000;
      let from = 0;
      const all: Row[] = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await dw
          .from("sv_ecarteira_lovable")
          .select('"PLANO","NOME_PLANO","VIGENCIA_BENEFICIARIO","ULTIMA_REATIVACAO","ULTIMO_CANCELAMENTO"')
          .eq("Plano_de", "Saúde")
          .range(from, from + pageSize - 1);
        if (error) {
          if (!abort) { setError(error.message); setLoading(false); }
          return;
        }
        const batch = (data ?? []) as Row[];
        all.push(...batch);
        if (batch.length < pageSize) break;
        from += pageSize;
        if (from > 500000) break;
      }
      if (!abort) { setRows(all); setLoading(false); }
    })();
    return () => { abort = true; };
  }, []);

  const refDate = parseBR(dateValue);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "plano" || k === "nome" ? "asc" : "desc"); }
  };

  const results = useMemo(() => {
    if (!rows || !refDate) return [];
    const ref = refDate.getTime();
    const terms = appliedTerms.map((t) => t.toLowerCase()).filter(Boolean);
    const totals = new Map<string, { plano: string; nome: string; vidas: number }>();
    for (const r of rows) {
      const vig = parseISO(r.VIGENCIA_BENEFICIARIO);
      if (vig === null || ref < vig) continue;
      const reat = parseISO(r.REATIVACAO);
      const canc = parseISO(r.CANCELAMENTO);
      const active = canc === null || (reat !== null && reat > canc) || ref < canc;
      if (!active) continue;
      const plano = (r.PLANO ?? "").toString();
      const nome = (r.NOME_PLANO ?? "(sem nome)").toString();
      if (terms.length && !terms.some((q) => plano.toLowerCase().includes(q) || nome.toLowerCase().includes(q))) continue;
      const key = `${plano}|${nome}`;
      let t = totals.get(key);
      if (!t) { t = { plano: plano || "(sem código)", nome, vidas: 0 }; totals.set(key, t); }
      t.vidas += 1;
    }
    const list = Array.from(totals.values());
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (sortKey === "vidas") return (a.vidas - b.vidas) * dir;
      const av = String(a[sortKey]).toLowerCase();
      const bv = String(b[sortKey]).toLowerCase();
      return av < bv ? -dir : av > bv ? dir : 0;
    });
    return list;
  }, [rows, refDate?.getTime(), appliedTerms, sortKey, sortDir]);

  const grouped = useMemo(() => {
    const map = new Map<string, { nome: string; rows: typeof results; subtotal: number }>();
    for (const r of results) {
      let g = map.get(r.nome);
      if (!g) { g = { nome: r.nome, rows: [], subtotal: 0 }; map.set(r.nome, g); }
      g.rows.push(r);
      g.subtotal += r.vidas;
    }
    return Array.from(map.values());
  }, [results]);

  const visibleGroups = useMemo(
    () => (drillNome ? grouped.filter((g) => g.nome === drillNome) : grouped),
    [grouped, drillNome],
  );
  const totalVidas = useMemo(() => visibleGroups.reduce((s, g) => s + g.subtotal, 0), [visibleGroups]);
  const totalPlanos = useMemo(() => visibleGroups.reduce((s, g) => s + g.rows.length, 0), [visibleGroups]);

  const sortIcon = (k: SortKey) =>
    sortKey === k ? (sortDir === "asc" ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />) : <ArrowUpDown className="inline h-3 w-3 opacity-40" />;

  const fmtInt = (n: number) => n.toLocaleString("pt-BR");

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Vidas ativas por plano</h2>
          <p className="text-xs text-muted-foreground">
            {refDate ? `Data de referência: ${dateValue}` : "Informe a data no formato dd/mm/aaaa no campo acima"} · fonte: <code>sv_ecarteira</code>
          </p>
        </div>
        <div className="w-full sm:w-[28rem] flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={filterDraft}
                onChange={(e) => setFilterDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const next = [...pendingTerms];
                    if (filterDraft.trim()) next.push(filterDraft.trim());
                    setPendingTerms([]);
                    setFilterDraft("");
                    setAppliedTerms(next);
                  }
                }}
                placeholder="Trecho do PLANO ou NOME_PLANO…"
                className="h-9 w-full pl-3 pr-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <button type="button" onClick={() => { const t = filterDraft.trim(); if (!t) return; setPendingTerms((p) => [...p, t]); setFilterDraft(""); }} className="h-9 w-9 flex items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-primary transition-colors" aria-label="Adicionar trecho">
              <Plus className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => { const next = [...pendingTerms]; if (filterDraft.trim()) next.push(filterDraft.trim()); setPendingTerms([]); setFilterDraft(""); setAppliedTerms(next); }} className="h-9 w-9 flex items-center justify-center rounded-md border border-border bg-primary text-primary-foreground hover:opacity-90 transition-opacity" aria-label="Pesquisar">
              <Search className="h-4 w-4" />
            </button>
          </div>
          {(pendingTerms.length > 0 || appliedTerms.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {pendingTerms.map((t, i) => (
                <span key={`p-${i}`} className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-full bg-accent text-xs text-foreground">
                  {t}
                  <button type="button" onClick={() => setPendingTerms((p) => p.filter((_, j) => j !== i))} className="h-4 w-4 inline-flex items-center justify-center rounded-full hover:bg-background/60"><X className="h-3 w-3" /></button>
                </span>
              ))}
              {pendingTerms.length === 0 && appliedTerms.map((t, i) => (
                <span key={`a-${i}`} className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-full bg-primary/10 text-xs text-foreground">
                  {t}
                  <button type="button" onClick={() => setAppliedTerms((p) => p.filter((_, j) => j !== i))} className="h-4 w-4 inline-flex items-center justify-center rounded-full hover:bg-background/60"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando dados do DW…
        </div>
      )}
      {error && <div className="flex-1 flex items-center justify-center text-destructive text-sm">Erro: {error}</div>}
      {!loading && !error && !refDate && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Digite uma data válida para ver os resultados.</div>
      )}
      {!loading && !error && refDate && (
        <>
          {drillNome && (
            <div className="mb-2 flex items-center justify-between text-xs px-1">
              <span className="text-muted-foreground">
                Detalhe de: <span className="font-semibold text-foreground">{drillNome}</span>
              </span>
              <button type="button" onClick={() => setDrillNome(null)} className="text-primary hover:underline">← Voltar ao resumo</button>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 gap-3 flex-wrap">
            <div className="flex items-center gap-4 pl-1">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" checked={summarize} onChange={(e) => setSummarize(e.target.checked)} className="h-3.5 w-3.5 accent-gray-500 cursor-pointer" />
                Resumir
              </label>
              <label className={`flex items-center gap-1.5 select-none ${summarize ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                <input type="checkbox" checked={showSubtotals} disabled={summarize} onChange={(e) => setShowSubtotals(e.target.checked)} className="h-3.5 w-3.5 accent-gray-500 cursor-pointer disabled:cursor-not-allowed" />
                Mostrar subtotais por NOME_PLANO
              </label>
            </div>
            <div>
              <span className="font-semibold text-foreground tabular-nums">{fmtInt(totalPlanos)}</span> plano(s) ·{" "}
              <span className="font-semibold text-foreground tabular-nums">{fmtInt(totalVidas)}</span> vidas
            </div>
          </div>
          <div className="flex-1 overflow-auto border border-border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 sticky top-0">
                <tr>
                  {summarize ? (
                    <>
                      <th className="px-3 py-2 text-left cursor-pointer" onClick={() => toggleSort("nome")}>NOME_PLANO {sortIcon("nome")}</th>
                      <th className="px-3 py-2 text-right cursor-pointer" onClick={() => toggleSort("vidas")}>VIDAS {sortIcon("vidas")}</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2 text-left cursor-pointer" onClick={() => toggleSort("plano")}>PLANO {sortIcon("plano")}</th>
                      <th className="px-3 py-2 text-left cursor-pointer" onClick={() => toggleSort("nome")}>NOME_PLANO {sortIcon("nome")}</th>
                      <th className="px-3 py-2 text-right cursor-pointer" onClick={() => toggleSort("vidas")}>VIDAS {sortIcon("vidas")}</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {summarize
                  ? visibleGroups.map((g) => (
                      <tr key={g.nome} className="border-t border-border hover:bg-accent/40 cursor-pointer" onClick={() => { setDrillNome(g.nome); setSummarize(false); }}>
                        <td className="px-3 py-2 font-medium">{g.nome}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtInt(g.subtotal)}</td>
                      </tr>
                    ))
                  : visibleGroups.map((g) => (
                      <Fragment key={g.nome}>
                        {g.rows.map((r) => (
                          <tr key={`${g.nome}-${r.plano}`} className="border-t border-border hover:bg-accent/40">
                            <td className="px-3 py-2 tabular-nums">{r.plano}</td>
                            <td className="px-3 py-2">{r.nome}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{fmtInt(r.vidas)}</td>
                          </tr>
                        ))}
                        {showSubtotals && g.rows.length > 1 && (
                          <tr className="bg-muted/30 border-t border-border font-semibold">
                            <td className="px-3 py-1.5" />
                            <td className="px-3 py-1.5 text-right text-muted-foreground">Subtotal {g.nome}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{fmtInt(g.subtotal)}</td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                {visibleGroups.length === 0 && (
                  <tr><td colSpan={summarize ? 2 : 3} className="px-3 py-8 text-center text-muted-foreground">Nenhum resultado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
};

export default AtivosEm;
