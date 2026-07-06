import { Fragment, useEffect, useMemo, useState } from "react";
import { Search, Loader2, ArrowUp, ArrowDown, ArrowUpDown, Plus, X } from "lucide-react";
import { dw } from "@/lib/dwClient";

type Row = { VENDEDOR: string | null; PLANO: string | number | null; NOME_PLANO: string | null };
type SortKey = "vendedor" | "vidas" | "planos" | "plano" | "nome";
type SortDir = "asc" | "desc";

const fmtInt = (n: number) => n.toLocaleString("pt-BR");

const Vendas = () => {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDraft, setFilterDraft] = useState("");
  const [pendingTerms, setPendingTerms] = useState<string[]>([]);
  const [appliedTerms, setAppliedTerms] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("vidas");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
          .from("sv_ecarteira")
          .select('"VENDEDOR","PLANO","NOME_PLANO"')
          .eq("TIPO_LINHA", "E")
          .eq("STATUS", "A")
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

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "vidas" || k === "planos" ? "desc" : "asc");
    }
  };

  const grouped = useMemo(() => {
    if (!rows) return [];
    const terms = appliedTerms.map((t) => t.toLowerCase()).filter(Boolean);
    const map = new Map<string, { vendedor: string; vidas: number; planos: Map<string, { plano: string; nome: string; vidas: number }> }>();
    for (const r of rows) {
      const vendedor = (r.VENDEDOR ?? "(sem vendedor)").toString();
      const plano = (r.PLANO ?? "").toString();
      const nome = (r.NOME_PLANO ?? "(sem nome)").toString();
      if (terms.length) {
        const hay = `${vendedor} ${plano} ${nome}`.toLowerCase();
        if (!terms.some((q) => hay.includes(q))) continue;
      }
      let g = map.get(vendedor);
      if (!g) { g = { vendedor, vidas: 0, planos: new Map() }; map.set(vendedor, g); }
      g.vidas += 1;
      const key = `${plano}|${nome}`;
      let p = g.planos.get(key);
      if (!p) { p = { plano, nome, vidas: 0 }; g.planos.set(key, p); }
      p.vidas += 1;
    }
    const list = Array.from(map.values()).map((g) => ({
      vendedor: g.vendedor,
      vidas: g.vidas,
      planos: g.planos.size,
      rows: Array.from(g.planos.values()).sort((a, b) => b.vidas - a.vidas),
    }));
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (sortKey === "vidas" || sortKey === "planos") return (a[sortKey] - b[sortKey]) * dir;
      const av = String(a.vendedor).toLowerCase();
      const bv = String(b.vendedor).toLowerCase();
      return av < bv ? -dir : av > bv ? dir : 0;
    });
    return list;
  }, [rows, appliedTerms, sortKey, sortDir]);

  const totalVidas = useMemo(() => grouped.reduce((s, g) => s + g.vidas, 0), [grouped]);
  const totalPlanos = useMemo(() => grouped.reduce((s, g) => s + g.planos, 0), [grouped]);

  const sortIcon = (k: SortKey) =>
    sortKey === k ? (sortDir === "asc" ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />) : <ArrowUpDown className="inline h-3 w-3 opacity-40" />;

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Vendas por Vendedor</h2>
          <p className="text-xs text-muted-foreground">
            Baseado em <code>sv_ecarteira</code> (vidas ativas, plano de Saúde).
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
                placeholder="Trecho do VENDEDOR, PLANO ou NOME_PLANO…"
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
              aria-label="Adicionar trecho"
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
              aria-label="Pesquisar"
            >
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

      {!loading && !error && (
        <>
          <div className="flex items-center justify-end text-xs text-muted-foreground mb-2">
            <span>
              <span className="font-semibold text-foreground tabular-nums">{fmtInt(grouped.length)}</span> vendedor(es) ·{" "}
              <span className="font-semibold text-foreground tabular-nums">{fmtInt(totalPlanos)}</span> planos ·{" "}
              <span className="font-semibold text-foreground tabular-nums">{fmtInt(totalVidas)}</span> vidas
            </span>
          </div>
          <div className="flex-1 overflow-auto border border-border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left w-8"></th>
                  <th className="px-3 py-2 text-left cursor-pointer" onClick={() => toggleSort("vendedor")}>VENDEDOR {sortIcon("vendedor")}</th>
                  <th className="px-3 py-2 text-right cursor-pointer" onClick={() => toggleSort("planos")}># PLANOS {sortIcon("planos")}</th>
                  <th className="px-3 py-2 text-right cursor-pointer" onClick={() => toggleSort("vidas")}>VIDAS {sortIcon("vidas")}</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((g) => (
                  <Fragment key={g.vendedor}>
                    <tr className="border-t border-border hover:bg-accent/40 cursor-pointer" onClick={() => setExpanded((e) => ({ ...e, [g.vendedor]: !e[g.vendedor] }))}>
                      <td className="px-3 py-2 text-center">{expanded[g.vendedor] ? "▾" : "▸"}</td>
                      <td className="px-3 py-2 font-medium">{g.vendedor}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtInt(g.planos)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtInt(g.vidas)}</td>
                    </tr>
                    {expanded[g.vendedor] && g.rows.map((r, i) => (
                      <tr key={`${g.vendedor}-${i}`} className="bg-muted/20 border-t border-border/50 text-muted-foreground">
                        <td></td>
                        <td className="px-3 py-1.5 pl-8">
                          <span className="tabular-nums text-foreground">{r.plano || "—"}</span>
                          <span className="ml-2">{r.nome}</span>
                        </td>
                        <td></td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{fmtInt(r.vidas)}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
                {grouped.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">Nenhum resultado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
};

export default Vendas;
