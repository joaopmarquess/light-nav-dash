import { Fragment, useEffect, useMemo, useState } from "react";
import { Search, Loader2, ArrowUp, ArrowDown, ArrowUpDown, Plus, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer } from "recharts";

const VEND_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
  "#06b6d4", "#a855f7", "#eab308", "#22c55e", "#f43f5e",
];

type Row = {
  agente: string;
  vendedor: string;
  plano: string;
  nome: string;
  vidas: number;
  producao: number;
};
type VendasFile = { rows: Row[] };
type SortKey = "agente" | "vendedor" | "vidas" | "producao" | "plano" | "nome" | "planos" | "vendedores";
type SortDir = "asc" | "desc";

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n: number) => n.toLocaleString("pt-BR");

const Vendas = () => {
  const [data, setData] = useState<VendasFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agente, setAgente] = useState<string>("__ALL__");
  const [filterDraft, setFilterDraft] = useState("");
  const [pendingTerms, setPendingTerms] = useState<string[]>([]);
  const [appliedTerms, setAppliedTerms] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("vidas");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showSubtotals, setShowSubtotals] = useState(true);
  const [summarize, setSummarize] = useState(false);
  const [summarizeAgent, setSummarizeAgent] = useState(false);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "vidas" || k === "producao" ? "desc" : "asc");
    }
  };

  useEffect(() => {
    let abort = false;
    setLoading(true);
    fetch("/data/vendas.json")
      .then((r) => r.json())
      .then((v) => {
        if (!abort) {
          setData(v);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!abort) {
          setError(String(e));
          setLoading(false);
        }
      });
    return () => {
      abort = true;
    };
  }, []);

  const agentesList = useMemo(
    () => (data ? Array.from(new Set(data.rows.map((r) => r.agente))).sort() : []),
    [data],
  );

  const results = useMemo(() => {
    if (!data) return [] as Row[];
    const terms = appliedTerms.map((t) => t.toLowerCase()).filter(Boolean);
    const list = data.rows.filter((r) => {
      if (agente !== "__ALL__" && r.agente !== agente) return false;
      if (terms.length === 0) return true;
      const hay = `${r.plano} ${r.nome} ${r.vendedor} ${r.agente}`.toLowerCase();
      return terms.some((q) => hay.includes(q));
    });
    const dir = sortDir === "asc" ? 1 : -1;
    const sorted = [...list].sort((a, b) => {
      if (sortKey === "vidas" || sortKey === "producao") {
        return (a[sortKey] - b[sortKey]) * dir;
      }
      const av = String(a[sortKey]).toLowerCase();
      const bv = String(b[sortKey]).toLowerCase();
      return av < bv ? -dir : av > bv ? dir : 0;
    });
    return sorted;
  }, [data, agente, appliedTerms, sortKey, sortDir]);

  // Group by VENDEDOR for subtotals
  const grouped = useMemo(() => {
    const map = new Map<string, { vendedor: string; rows: Row[]; vidas: number; producao: number; planos: Set<string> }>();
    for (const r of results) {
      let g = map.get(r.vendedor);
      if (!g) {
        g = { vendedor: r.vendedor, rows: [], vidas: 0, producao: 0, planos: new Set() };
        map.set(r.vendedor, g);
      }
      g.rows.push(r);
      g.vidas += r.vidas;
      g.producao += r.producao;
      g.planos.add(r.plano);
    }
    return Array.from(map.values());
  }, [results]);

  const totals = useMemo(() => {
    let vidas = 0, producao = 0;
    const planos = new Set<string>();
    for (const r of results) {
      vidas += r.vidas;
      producao += r.producao;
      planos.add(r.plano);
    }
    return { vidas, producao, count: results.length, planos: planos.size };
  }, [results]);

  const summary = useMemo(() => {
    const map = new Map<string, { agente: string; vendedor: string; vidas: number; producao: number; planosSet: Set<string> }>();
    for (const r of results) {
      const k = `${r.agente}||${r.vendedor}`;
      let g = map.get(k);
      if (!g) { g = { agente: r.agente, vendedor: r.vendedor, vidas: 0, producao: 0, planosSet: new Set() }; map.set(k, g); }
      g.vidas += r.vidas;
      g.producao += r.producao;
      g.planosSet.add(r.plano);
    }
    const arr = Array.from(map.values()).map((g) => ({ ...g, planos: g.planosSet.size }));
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      if (sortKey === "vidas" || sortKey === "producao" || sortKey === "planos") return (a[sortKey] - b[sortKey]) * dir;
      const k = sortKey === "agente" || sortKey === "vendedor" ? sortKey : "vendedor";
      const av = a[k as "agente" | "vendedor"].toLowerCase();
      const bv = b[k as "agente" | "vendedor"].toLowerCase();
      return av < bv ? -dir : av > bv ? dir : 0;
    });
    return arr;
  }, [results, sortKey, sortDir]);

  const singleAgent = agente !== "__ALL__";

  const agentSummary = useMemo(() => {
    const map = new Map<string, { agente: string; vendedoresSet: Set<string>; planosSet: Set<string>; vidas: number; producao: number }>();
    for (const r of results) {
      let g = map.get(r.agente);
      if (!g) { g = { agente: r.agente, vendedoresSet: new Set(), planosSet: new Set(), vidas: 0, producao: 0 }; map.set(r.agente, g); }
      g.vendedoresSet.add(r.vendedor);
      g.planosSet.add(r.plano);
      g.vidas += r.vidas;
      g.producao += r.producao;
    }
    const arr = Array.from(map.values()).map((g) => ({ agente: g.agente, vendedores: g.vendedoresSet.size, planos: g.planosSet.size, vidas: g.vidas, producao: g.producao }));
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      if (sortKey === "vidas" || sortKey === "producao" || sortKey === "planos" || sortKey === "vendedores") return (a[sortKey] - b[sortKey]) * dir;
      const av = a.agente.toLowerCase();
      const bv = b.agente.toLowerCase();
      return av < bv ? -dir : av > bv ? dir : 0;
    });
    return arr;
  }, [results, sortKey, sortDir]);

  // Color per vendedor (stable per agent selection)
  const vendedorColors = useMemo(() => {
    const names = Array.from(new Set(summary.map((s) => s.vendedor))).sort();
    const m: Record<string, string> = {};
    names.forEach((n, i) => { m[n] = VEND_COLORS[i % VEND_COLORS.length]; });
    return m;
  }, [summary]);

  const chartData = useMemo(
    () => [...summary].sort((a, b) => b.vidas - a.vidas),
    [summary],
  );

  const baseCols: { k: SortKey; label: string; align: "left" | "right"; w: string }[] = summarizeAgent
    ? [
        { k: "agente", label: "AGENTE", align: "left", w: "" },
        { k: "vendedores", label: "VENDEDORES", align: "right", w: "w-32" },
        { k: "planos", label: "PLANOS", align: "right", w: "w-24" },
        { k: "vidas", label: "VIDAS", align: "right", w: "w-32" },
        { k: "producao", label: "PRODUÇÃO", align: "right", w: "w-40" },
      ]
    : summarize
    ? [
        { k: "agente", label: "AGENTE", align: "left", w: "w-56" },
        { k: "vendedor", label: "VENDEDOR", align: "left", w: "" },
        { k: "planos", label: "PLANOS", align: "right", w: "w-24" },
        { k: "vidas", label: "VIDAS", align: "right", w: "w-32" },
        { k: "producao", label: "PRODUÇÃO", align: "right", w: "w-40" },
      ]
    : [
        { k: "agente", label: "AGENTE", align: "left", w: "w-44" },
        { k: "vendedor", label: "VENDEDOR", align: "left", w: "w-56" },
        { k: "vidas", label: "VIDAS", align: "right", w: "w-24" },
        { k: "producao", label: "PRODUÇÃO", align: "right", w: "w-32" },
        { k: "nome", label: "NOME PLANO", align: "left", w: "" },
      ];
  const cols = singleAgent && !summarizeAgent ? baseCols.filter((c) => c.k !== "agente") : baseCols;
  const colCount = cols.length;

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="shrink-0">
          <h2 className="text-lg font-semibold text-foreground">Vendas</h2>
          <p className="text-xs text-muted-foreground">Filtro por AGENTE — vidas vendidas e produção</p>
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <select
              value={agente}
              onChange={(e) => setAgente(e.target.value)}
              className="h-9 rounded-md border border-border bg-background text-sm text-foreground px-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="__ALL__">Todos os AGENTES</option>
              {agentesList.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
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
                placeholder="Trecho de VENDEDOR, PLANO ou NOME_PLANO…"
                className="h-9 w-full pl-3 pr-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const t = filterDraft.trim();
                if (!t) return;
                setPendingTerms((p) => [...p, t]);
                setFilterDraft("");
              }}
              className="h-9 w-9 flex items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-primary transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const next = [...pendingTerms];
                if (filterDraft.trim()) next.push(filterDraft.trim());
                setPendingTerms([]);
                setFilterDraft("");
                setAppliedTerms(next);
              }}
              className="h-9 w-9 flex items-center justify-center rounded-md border border-border bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
          {(pendingTerms.length > 0 || appliedTerms.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {pendingTerms.map((t, i) => (
                <span key={`p-${i}`} className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-full bg-accent text-xs text-foreground">
                  {t}
                  <button type="button" onClick={() => setPendingTerms((p) => p.filter((_, j) => j !== i))} className="h-4 w-4 inline-flex items-center justify-center rounded-full hover:bg-background/60">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {pendingTerms.length === 0 &&
                appliedTerms.map((t, i) => (
                  <span key={`a-${i}`} className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-full bg-primary/10 text-xs text-foreground">
                    {t}
                    <button type="button" onClick={() => setAppliedTerms((p) => p.filter((_, j) => j !== i))} className="h-4 w-4 inline-flex items-center justify-center rounded-full hover:bg-background/60">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando dados…
        </div>
      )}
      {error && <div className="flex-1 flex items-center justify-center text-destructive text-sm">Erro: {error}</div>}
      {!loading && !error && (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 gap-3 flex-wrap">
            <div className="flex items-center gap-4 pl-1 flex-wrap">
              <label className={`flex items-center gap-1.5 select-none ${summarizeAgent ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                <input type="checkbox" checked={summarize} disabled={summarizeAgent} onChange={(e) => setSummarize(e.target.checked)} className="h-3.5 w-3.5 accent-gray-500 cursor-pointer disabled:cursor-not-allowed" />
                Resumir
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" checked={summarizeAgent} onChange={(e) => setSummarizeAgent(e.target.checked)} className="h-3.5 w-3.5 accent-gray-500 cursor-pointer" />
                Resumir por Agente
              </label>
              <label className={`flex items-center gap-1.5 select-none ${summarize || summarizeAgent ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                <input type="checkbox" checked={showSubtotals} disabled={summarize || summarizeAgent} onChange={(e) => setShowSubtotals(e.target.checked)} className="h-3.5 w-3.5 accent-gray-500 cursor-pointer disabled:cursor-not-allowed" />
                Mostrar subtotais por VENDEDOR
              </label>
            </div>
            <div className="flex items-center gap-2">
              <span>
                <span className="font-semibold text-foreground tabular-nums">{fmtInt(totals.count)}</span> registro{totals.count === 1 ? "" : "s"} ·{" "}
                <span className="font-semibold text-foreground tabular-nums">{fmtInt(totals.vidas)}</span> vidas
              </span>
            </div>
          </div>

          {singleAgent && summarize && !summarizeAgent && chartData.length > 0 && (
            <div className="mb-2 border border-border rounded-lg bg-muted/20 px-3 pt-2 pb-1 shrink-0">
              <div className="text-[11px] font-semibold text-foreground mb-1">
                VIDAS por VENDEDOR — {agente}
              </div>
              <div style={{ width: "100%", height: 140 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <XAxis
                      type="category"
                      dataKey="vendedor"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      tickFormatter={(v: string) => v.split(" ")[0]}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis type="number" tick={{ fontSize: 10 }} width={40} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ fontSize: 11, padding: "4px 8px", borderRadius: 6 }}
                      formatter={(v: number) => [fmtInt(v), "VIDAS"]}
                    />
                    <Bar dataKey="vidas" radius={[4, 4, 0, 0]}>
                      {chartData.map((d, i) => (
                        <Cell key={i} fill={vendedorColors[d.vendedor] || "#3b82f6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-auto border border-border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 sticky top-0">
                <tr>
                  {cols.map((col) => {
                    const active = sortKey === col.k;
                    const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
                    return (
                      <th
                        key={col.k}
                        onClick={() => toggleSort(col.k)}
                        className={`font-medium px-3 py-2 cursor-pointer select-none ${col.w} ${col.align === "right" ? "text-right" : "text-left"} ${active ? "text-foreground" : "text-muted-foreground"} hover:text-foreground whitespace-nowrap`}
                      >
                        <span className={`inline-flex items-center gap-1 ${col.align === "right" ? "justify-end" : ""}`}>
                          {col.label}
                          <Icon className="h-3 w-3 opacity-70" />
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {results.length === 0 && (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                )}
                {summarizeAgent
                  ? agentSummary.map((s, i) => (
                      <tr key={`as-${i}`} className="border-t border-border hover:bg-accent/40">
                        <td className="px-3 py-2 text-foreground">{s.agente}</td>
                        <td className="px-3 py-2 text-right text-foreground tabular-nums">{fmtInt(s.vendedores)}</td>
                        <td className="px-3 py-2 text-right text-foreground tabular-nums">{fmtInt(s.planos)}</td>
                        <td className="px-3 py-2 text-right font-medium text-foreground tabular-nums">{fmtInt(s.vidas)}</td>
                        <td className="px-3 py-2 text-right text-foreground tabular-nums">{fmtBRL(s.producao)}</td>
                      </tr>
                    ))
                  : summarize
                  ? summary.map((s, i) => (
                      <tr key={`sum-${i}`} className="border-t border-border hover:bg-accent/40">
                        {!singleAgent && <td className="px-3 py-2 text-foreground">{s.agente}</td>}
                        <td className="px-3 py-2 text-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            {singleAgent && (
                              <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: vendedorColors[s.vendedor] }} />
                            )}
                            {s.vendedor}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-foreground tabular-nums">{fmtInt(s.planos)}</td>
                        <td className="px-3 py-2 text-right font-medium text-foreground tabular-nums">{fmtInt(s.vidas)}</td>
                        <td className="px-3 py-2 text-right text-foreground tabular-nums">{fmtBRL(s.producao)}</td>
                      </tr>
                    ))
                  : showSubtotals
                  ? grouped.map((g) => (
                      <Fragment key={`g-${g.vendedor}`}>
                        {g.rows.map((row, i) => (
                          <tr key={`${g.vendedor}-${row.plano}-${i}`} className="border-t border-border hover:bg-accent/40">
                            {!singleAgent && <td className="px-3 py-2 text-foreground">{row.agente}</td>}
                            <td className="px-3 py-2 text-foreground">
                              <span className="inline-flex items-center gap-1.5">
                                {singleAgent && (
                                  <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: vendedorColors[row.vendedor] }} />
                                )}
                                {row.vendedor}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-foreground tabular-nums">{fmtInt(row.vidas)}</td>
                            <td className="px-3 py-2 text-right text-foreground tabular-nums">{fmtBRL(row.producao)}</td>
                            <td className="px-3 py-2 text-foreground">{row.nome}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-border bg-muted/30">
                          {!singleAgent && <td className="px-3 py-1.5"></td>}
                          <td className="px-3 py-1.5 text-xs italic text-muted-foreground">
                            Subtotal {g.vendedor}
                            {g.rows.length > 1 ? ` (${g.rows.length} registros)` : ""}
                          </td>
                          <td className="px-3 py-1.5 text-right text-xs font-semibold text-foreground tabular-nums">{fmtInt(g.vidas)}</td>
                          <td className="px-3 py-1.5 text-right text-xs font-semibold text-foreground tabular-nums">{fmtBRL(g.producao)}</td>
                          <td className="px-3 py-1.5"></td>
                        </tr>
                      </Fragment>
                    ))
                  : results.map((row, i) => (
                      <tr key={`r-${i}`} className="border-t border-border hover:bg-accent/40">
                        {!singleAgent && <td className="px-3 py-2 text-foreground">{row.agente}</td>}
                        <td className="px-3 py-2 text-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            {singleAgent && (
                              <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: vendedorColors[row.vendedor] }} />
                            )}
                            {row.vendedor}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-foreground tabular-nums">{fmtInt(row.vidas)}</td>
                        <td className="px-3 py-2 text-right text-foreground tabular-nums">{fmtBRL(row.producao)}</td>
                        <td className="px-3 py-2 text-foreground">{row.nome}</td>
                      </tr>
                    ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-muted">
                {summarizeAgent ? (
                  <tr className="border-t border-border">
                    <td className="px-3 py-2 text-xs font-semibold text-foreground">Total</td>
                    <td className="px-3 py-2 text-right text-xs font-semibold text-foreground tabular-nums">{fmtInt(agentSummary.reduce((s, r) => s + r.vendedores, 0))}</td>
                    <td className="px-3 py-2 text-right text-xs font-semibold text-foreground tabular-nums">{fmtInt(totals.planos)}</td>
                    <td className="px-3 py-2 text-right text-xs font-semibold text-foreground tabular-nums">{fmtInt(totals.vidas)}</td>
                    <td className="px-3 py-2 text-right text-xs font-semibold text-foreground tabular-nums">{fmtBRL(totals.producao)}</td>
                  </tr>
                ) : (
                  <tr className="border-t border-border">
                    <td className="px-3 py-2 text-xs font-semibold text-foreground" colSpan={singleAgent ? 1 : 2}>Total</td>
                    {summarize && (
                      <td className="px-3 py-2 text-right text-xs font-semibold text-foreground tabular-nums">{fmtInt(totals.planos)}</td>
                    )}
                    <td className="px-3 py-2 text-right text-xs font-semibold text-foreground tabular-nums">{fmtInt(totals.vidas)}</td>
                    <td className="px-3 py-2 text-right text-xs font-semibold text-foreground tabular-nums">{fmtBRL(totals.producao)}</td>
                    {!summarize && <td className="px-3 py-2"></td>}
                  </tr>
                )}
              </tfoot>
            </table>
          </div>

        </>
      )}
    </section>
  );
};

export default Vendas;
