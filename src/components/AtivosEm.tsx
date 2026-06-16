import { Fragment, useEffect, useMemo, useState } from "react";
import { Search, Loader2, ArrowUp, ArrowDown, ArrowUpDown, Plus, X } from "lucide-react";
import plansData from "@/data/plans.json";

type MoneyKey = "mens" | "copart" | "receita" | "despesa" | "saldo";
type SortKey = "plano" | "nome" | "vidas" | MoneyKey;
type SortDir = "asc" | "desc";

type Dataset = { p: number[]; v: number[]; r: number[]; c: number[] };
type Plan = { p: string; n: string };
type PlanoMoney = { mens: number; copart: number; receita: number; despesa: number; saldo: number };
type Receitas = Record<string, PlanoMoney>;

const EPOCH = Date.UTC(1970, 0, 1);
const DAY = 86400000;
const ZERO: PlanoMoney = { mens: 0, copart: 0, receita: 0, despesa: 0, saldo: 0 };

const MONEY_COLS: { k: MoneyKey; label: string }[] = [
  { k: "mens", label: "R$ MENSALIDADE" },
  { k: "copart", label: "R$ COPART." },
  { k: "receita", label: "R$ RECEITAS" },
  { k: "despesa", label: "R$ DESPESAS" },
  { k: "saldo", label: "R$ SALDO" },
];

function parseBR(s: string): Date | null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  return isNaN(d.getTime()) ? null : d;
}

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  dateValue: string;
}

const AtivosEm = ({ dateValue }: Props) => {
  const [data, setData] = useState<Dataset | null>(null);
  const [receitas, setReceitas] = useState<Receitas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDraft, setFilterDraft] = useState("");
  const [pendingTerms, setPendingTerms] = useState<string[]>([]);
  const [appliedTerms, setAppliedTerms] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("vidas");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showSubtotals, setShowSubtotals] = useState(true);
  const [summarize, setSummarize] = useState(false);
  const [drillNome, setDrillNome] = useState<string | null>(null);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "plano" || k === "nome" ? "asc" : "desc");
    }
  };

  useEffect(() => {
    let abort = false;
    setLoading(true);
    Promise.all([
      fetch("/data/ativos.json").then((r) => r.json()),
      fetch("/data/receitas.json").then((r) => r.json()).catch(() => ({})),
    ])
      .then(([j, rec]) => {
        if (!abort) {
          setData(j);
          setReceitas(rec);
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

  const plans = plansData as Plan[];
  const refDate = parseBR(dateValue);
  const moneyByPlano = receitas || {};

  const results = useMemo(() => {
    if (!data || !refDate) return [];
    const todayDays = Math.floor((Date.now() - EPOCH) / DAY);
    const refRaw = Math.floor((refDate.getTime() - EPOCH) / DAY);
    const ref = Math.min(refRaw, todayDays);
    const refYear = new Date(EPOCH + ref * DAY).getUTCFullYear();
    const yearEnd = Math.floor((Date.UTC(refYear, 11, 31) - EPOCH) / DAY);
    const totals = new Map<number, number>();
    const { p, v, r, c } = data;
    for (let i = 0; i < p.length; i++) {
      const vig = v[i];
      const reat = r[i];
      const canc = c[i];
      const end = canc >= 0 && canc > reat ? canc : yearEnd;
      if (ref < end && vig >= 0 && ref >= vig) {
        totals.set(p[i], (totals.get(p[i]) || 0) + 1);
      }
    }
    const terms = appliedTerms.map((t) => t.toLowerCase()).filter(Boolean);
    const list: ({ plano: string; nome: string; vidas: number } & PlanoMoney)[] = [];
    for (const [idx, vidas] of totals) {
      const pl = plans[idx];
      if (!pl) continue;
      const n = pl.n.toLowerCase();
      const p2 = pl.p.toLowerCase();
      if (terms.length === 0 || terms.some((q) => n.includes(q) || p2.includes(q))) {
        const code = pl.p || "";
        const m = moneyByPlano[code] || ZERO;
        list.push({
          plano: code || "(sem código)",
          nome: pl.n || "(sem nome)",
          vidas,
          mens: m.mens || 0,
          copart: m.copart || 0,
          receita: m.receita || 0,
          despesa: m.despesa || 0,
          saldo: m.saldo || 0,
        });
      }
    }
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (sortKey === "vidas" || sortKey === "mens" || sortKey === "copart" || sortKey === "receita" || sortKey === "despesa" || sortKey === "saldo") {
        return ((a[sortKey] as number) - (b[sortKey] as number)) * dir;
      }
      const av = (a[sortKey] as string).toLowerCase();
      const bv = (b[sortKey] as string).toLowerCase();
      return av < bv ? -dir : av > bv ? dir : 0;
    });
    return list;
  }, [data, refDate?.getTime(), appliedTerms, plans, sortKey, sortDir, moneyByPlano]);

  const grouped = useMemo(() => {
    const map = new Map<string, { nome: string; rows: typeof results; subtotal: number } & PlanoMoney>();
    for (const r of results) {
      let g = map.get(r.nome);
      if (!g) {
        g = { nome: r.nome, rows: [], subtotal: 0, mens: 0, copart: 0, receita: 0, despesa: 0, saldo: 0 };
        map.set(r.nome, g);
      }
      g.rows.push(r);
      g.subtotal += r.vidas;
      g.mens += r.mens;
      g.copart += r.copart;
      g.receita += r.receita;
      g.despesa += r.despesa;
      g.saldo += r.saldo;
    }
    return Array.from(map.values());
  }, [results]);

  const visibleGroups = useMemo(
    () => (drillNome ? grouped.filter((g) => g.nome === drillNome) : grouped),
    [grouped, drillNome],
  );
  const totalVidas = useMemo(() => visibleGroups.reduce((s, g) => s + g.subtotal, 0), [visibleGroups]);
  const totalPlanos = useMemo(() => visibleGroups.reduce((s, g) => s + g.rows.length, 0), [visibleGroups]);
  const totals = useMemo(() => {
    const t: PlanoMoney = { mens: 0, copart: 0, receita: 0, despesa: 0, saldo: 0 };
    for (const g of visibleGroups) {
      t.mens += g.mens; t.copart += g.copart; t.receita += g.receita; t.despesa += g.despesa; t.saldo += g.saldo;
    }
    return t;
  }, [visibleGroups]);

  const colCount = (summarize && !drillNome ? 3 : 3) + MONEY_COLS.length;

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Vidas ativas por plano</h2>
          <p className="text-xs text-muted-foreground">
            {refDate ? `Data de referência: ${dateValue}` : "Informe a data no formato dd/mm/aaaa no campo acima"}
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
            <button
              type="button"
              onClick={() => {
                const t = filterDraft.trim();
                if (!t) return;
                setPendingTerms((p) => [...p, t]);
                setFilterDraft("");
              }}
              title="Adicionar trecho"
              aria-label="Adicionar trecho"
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
              title="Pesquisar"
              aria-label="Pesquisar"
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
                  <button type="button" onClick={() => setPendingTerms((p) => p.filter((_, j) => j !== i))} className="h-4 w-4 inline-flex items-center justify-center rounded-full hover:bg-background/60" aria-label={`Remover ${t}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {appliedTerms.length > 0 && pendingTerms.length === 0 && (
                <span className="text-[11px] text-muted-foreground self-center">Aplicados:</span>
              )}
              {pendingTerms.length === 0 &&
                appliedTerms.map((t, i) => (
                  <span key={`a-${i}`} className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-full bg-primary/10 text-xs text-foreground">
                    {t}
                    <button type="button" onClick={() => setAppliedTerms((p) => p.filter((_, j) => j !== i))} className="h-4 w-4 inline-flex items-center justify-center rounded-full hover:bg-background/60" aria-label={`Remover ${t}`}>
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
      {error && <div className="flex-1 flex items-center justify-center text-destructive text-sm">Erro ao carregar: {error}</div>}
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
              <button type="button" onClick={() => setDrillNome(null)} className="text-primary hover:underline">
                ← Voltar ao resumo
              </button>
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
            <div className="flex items-center gap-2">
              <span>
                <span className="font-semibold text-foreground tabular-nums">{totalPlanos.toLocaleString("pt-BR")}</span> plano{totalPlanos === 1 ? "" : "s"} ·{" "}
                <span className="font-semibold text-foreground tabular-nums">{totalVidas.toLocaleString("pt-BR")}</span> vidas
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-auto border border-border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 sticky top-0">
                <tr>
                  {(() => {
                    const baseCols: { k: SortKey; label: string; align: "left" | "right"; w: string }[] =
                      summarize && !drillNome
                        ? [
                            { k: "nome", label: "NOME PLANO", align: "left", w: "" },
                            { k: "plano", label: "PLANOS", align: "right", w: "w-24" },
                            { k: "vidas", label: "VIDAS", align: "right", w: "w-24" },
                          ]
                        : [
                            { k: "plano", label: "PLANO", align: "left", w: "w-24" },
                            { k: "nome", label: "NOME PLANO", align: "left", w: "" },
                            { k: "vidas", label: "VIDAS", align: "right", w: "w-20" },
                          ];
                    const cols = [
                      ...baseCols,
                      ...MONEY_COLS.map((c) => ({ k: c.k as SortKey, label: c.label, align: "right" as const, w: "w-32" })),
                    ];
                    return cols.map((col) => {
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
                    });
                  })()}
                </tr>
              </thead>
              <tbody>
                {results.length === 0 && (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum plano encontrado.
                    </td>
                  </tr>
                )}
                {summarize && !drillNome
                  ? [...grouped]
                      .sort((a, b) => {
                        const dir = sortDir === "asc" ? 1 : -1;
                        if (sortKey === "vidas") return (a.subtotal - b.subtotal) * dir;
                        if (sortKey === "plano") return (a.rows.length - b.rows.length) * dir;
                        if (sortKey === "mens" || sortKey === "copart" || sortKey === "receita" || sortKey === "despesa" || sortKey === "saldo") {
                          return (a[sortKey] - b[sortKey]) * dir;
                        }
                        const an = a.nome.toLowerCase();
                        const bn = b.nome.toLowerCase();
                        return an < bn ? -dir : an > bn ? dir : 0;
                      })
                      .map((g) => (
                        <tr key={`s-${g.nome}`} className="border-t border-border hover:bg-accent/40 text-xs">
                          <td className="px-3 py-2 text-primary underline-offset-2 hover:underline cursor-pointer" onClick={() => setDrillNome(g.nome)} title="Ver detalhe dos planos">
                            {g.nome}
                          </td>
                          <td className="px-3 py-2 text-right text-foreground tabular-nums">{g.rows.length.toLocaleString("pt-BR")}</td>
                          <td className="px-3 py-2 text-right font-medium text-foreground tabular-nums">{g.subtotal.toLocaleString("pt-BR")}</td>
                          {MONEY_COLS.map((c) => (
                            <td key={c.k} className="px-3 py-2 text-right text-foreground tabular-nums">{fmtBRL(g[c.k])}</td>
                          ))}
                        </tr>
                      ))
                  : (drillNome ? grouped.filter((g) => g.nome === drillNome) : grouped).map((g) => (
                      <Fragment key={`g-${g.nome}`}>
                        {g.rows.map((row) => (
                          <tr key={`${row.plano}-${row.nome}`} className="border-t border-border hover:bg-accent/40">
                            <td className="px-3 py-2 text-foreground tabular-nums">{row.plano}</td>
                            <td className="px-3 py-2 text-foreground">{row.nome}</td>
                            <td className="px-3 py-2 text-right font-medium text-foreground tabular-nums">{row.vidas.toLocaleString("pt-BR")}</td>
                            {MONEY_COLS.map((c) => (
                              <td key={c.k} className="px-3 py-2 text-right text-foreground tabular-nums">{fmtBRL(row[c.k])}</td>
                            ))}
                          </tr>
                        ))}
                        {showSubtotals && !drillNome && (
                          <tr key={`sub-${g.nome}`} className="border-t border-border bg-muted/30">
                            <td className="px-3 py-1.5"></td>
                            <td className="px-3 py-1.5 text-xs italic text-muted-foreground">
                              Subtotal {g.nome}
                              {g.rows.length > 1 ? ` (${g.rows.length} planos)` : ""}
                            </td>
                            <td className="px-3 py-1.5 text-right text-xs font-semibold text-foreground tabular-nums">{g.subtotal.toLocaleString("pt-BR")}</td>
                            {MONEY_COLS.map((c) => (
                              <td key={c.k} className="px-3 py-1.5 text-right text-xs font-semibold text-foreground tabular-nums">{fmtBRL(g[c.k])}</td>
                            ))}
                          </tr>
                        )}
                      </Fragment>
                    ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-muted">
                <tr className="border-t border-border">
                  <td className="px-3 py-2 text-xs font-semibold text-foreground" colSpan={summarize && !drillNome ? 1 : 2}>
                    Total
                  </td>
                  {summarize && !drillNome && (
                    <td className="px-3 py-2 text-right text-xs font-semibold text-foreground tabular-nums">{totalPlanos.toLocaleString("pt-BR")}</td>
                  )}
                  <td className="px-3 py-2 text-right text-xs font-semibold text-foreground tabular-nums">{totalVidas.toLocaleString("pt-BR")}</td>
                  {MONEY_COLS.map((c) => (
                    <td key={c.k} className="px-3 py-2 text-right text-xs font-semibold text-foreground tabular-nums">{fmtBRL(totals[c.k])}</td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </section>
  );
};

export default AtivosEm;
