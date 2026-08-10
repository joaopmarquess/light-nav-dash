import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown, LineChart as LineChartIcon } from "lucide-react";
import FunLoader from "@/components/FunLoader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  Tooltip as RTooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

type Raw = [string, string, string, string, string, number, number, number, number, number, number, number, number, number, number, number];

type Desp = {
  vrdespesas: number;
  internacao: number;
  terapia: number;
  exame: number;
  consulta: number;
  emergencia: number;
  demais: number;
};

type Benef = Desp & { codigo: string; nome: string; outros?: number };
type Plano = Desp & { plano: string; benefs: Benef[] };
type Periodo = Desp & { periodo: string; planos: Plano[] };

type SortKey = "PLANO" | "vrdespesas" | "internacao" | "terapia" | "exame" | "consulta" | "emergencia" | "demais";

const TOP_N = 10;

const fmtNum = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n: number) => n.toLocaleString("pt-BR");
const fmtShare = (v: number, total: number) => {
  if (!total) return "0,00%";
  return `${((v / total) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};
const fmtComp = (mabas: string) =>
  mabas && mabas.length === 6 ? `${mabas.slice(4, 6)}/${mabas.slice(0, 4)}` : mabas;

const zero = (): Desp => ({
  vrdespesas: 0, internacao: 0, terapia: 0, exame: 0, consulta: 0, emergencia: 0, demais: 0,
});
const add = (t: Desp, r: Raw) => {
  t.vrdespesas += r[6];
  t.internacao += r[7];
  t.terapia += r[8];
  t.exame += r[9];
  t.consulta += r[10];
  t.emergencia += r[11];
  t.demais += r[12];
};
const addDesp = (t: Desp, s: Desp) => {
  t.vrdespesas += s.vrdespesas;
  t.internacao += s.internacao;
  t.terapia += s.terapia;
  t.exame += s.exame;
  t.consulta += s.consulta;
  t.emergencia += s.emergencia;
  t.demais += s.demais;
};

const DESP_COLS: { key: keyof Desp; label: string }[] = [
  { key: "internacao", label: "Internação" },
  { key: "terapia", label: "Terapia" },
  { key: "exame", label: "Exame" },
  { key: "consulta", label: "Consulta" },
  { key: "emergencia", label: "Emergência" },
  { key: "demais", label: "Demais" },
];

const DespTooltip = ({ title, m }: { title: string; m: Desp }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-2">
        {fmtNum(m.vrdespesas)}
      </span>
    </TooltipTrigger>
    <TooltipContent side="left" className="p-0">
      <div className="min-w-[220px] p-2">
        <div className="text-xs font-semibold mb-1.5 border-b border-border pb-1">{title}</div>
        <table className="text-[11px] w-full">
          <tbody>
            {DESP_COLS.map(({ key, label }) => (
              <tr key={label}>
                <td className="pr-3 py-0.5">{label}</td>
                <td className="text-right tabular-nums">
                  {fmtNum(m[key])} <span className="text-muted-foreground">({fmtShare(m[key], m.vrdespesas)})</span>
                </td>
              </tr>
            ))}
            <tr className="border-t border-border font-semibold">
              <td className="pr-3 pt-1">Total</td>
              <td className="text-right tabular-nums pt-1">{fmtNum(m.vrdespesas)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </TooltipContent>
  </Tooltip>
);

export default function SinistralidadeAPBTop10({ embedded = false }: { embedded?: boolean } = {}) {
  const [rows, setRows] = useState<Raw[]>([]);
  const [loading, setLoading] = useState(true);
  const [mIni, setMIni] = useState("202507");
  const [mFim, setMFim] = useState("202606");
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandedPlano, setExpandedPlano] = useState<Record<string, boolean>>({});
  const [sortKey, setSortKey] = useState<SortKey>("vrdespesas");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/data/apb_sinistralidade.json");
        const json = await res.json();
        if (!alive) return;
        setRows((json.rows ?? []) as Raw[]);
      } catch (e) {
        console.error("APB load error", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const periodos = useMemo<Periodo[]>(() => {
    const ini = mIni.trim();
    const fim = mFim.trim();
    const fq = filter.trim().toLowerCase();
    const byPeriodo = new Map<string, Periodo>();
    const plMaps = new Map<string, Map<string, Plano>>();
    const bMaps = new Map<string, Map<string, Benef>>();

    for (const r of rows) {
      const mabas = r[0];
      if (ini && mabas < ini) continue;
      if (fim && mabas > fim) continue;
      if (fq && !(
        r[1].toLowerCase().includes(fq) ||
        r[2].toLowerCase().includes(fq) ||
        r[3].toLowerCase().includes(fq) ||
        r[4].toLowerCase().includes(fq)
      )) continue;

      const y = Number(mabas.slice(0, 4));
      const m = Number(mabas.slice(4, 6));
      const base = m >= 7 ? y : y - 1;
      const ciclo = `${base}07-${base + 1}06`;

      let p = byPeriodo.get(ciclo);
      if (!p) {
        p = { periodo: ciclo, planos: [], ...zero() };
        byPeriodo.set(ciclo, p);
        plMaps.set(ciclo, new Map());
      }
      add(p, r);

      const pm = plMaps.get(ciclo)!;
      let pl = pm.get(r[1]);
      if (!pl) {
        pl = { plano: r[1], benefs: [], ...zero() };
        pm.set(r[1], pl);
        p.planos.push(pl);
        bMaps.set(`${ciclo}|${r[1]}`, new Map());
      }
      add(pl, r);

      const bm = bMaps.get(`${ciclo}|${r[1]}`)!;
      let b = bm.get(r[3]);
      if (!b) {
        b = { codigo: r[3], nome: r[4], ...zero() };
        bm.set(r[3], b);
        pl.benefs.push(b);
      }
      add(b, r);
    }

    const arr = Array.from(byPeriodo.values());
    for (const p of arr) {
      for (const pl of p.planos) {
        pl.benefs.sort((a, b) => b.vrdespesas - a.vrdespesas);
        if (pl.benefs.length > TOP_N) {
          const resto = pl.benefs.slice(TOP_N);
          const outros: Benef = {
            codigo: "",
            nome: `OUTROS (${resto.length} beneficiários)`,
            outros: resto.length,
            ...zero(),
          };
          for (const b of resto) addDesp(outros, b);
          pl.benefs = [...pl.benefs.slice(0, TOP_N), outros];
        }
      }
    }
    arr.sort((a, b) => b.periodo.localeCompare(a.periodo));
    return arr;
  }, [rows, mIni, mFim, filter]);

  const fmtCiclo = (ciclo: string) => {
    const [a, b] = ciclo.split("-");
    return `${fmtComp(a)} a ${fmtComp(b)}`;
  };

  const maxDesp = useMemo(
    () => periodos.reduce((m, t) => Math.max(m, t.vrdespesas), 0),
    [periodos]
  );

  const totais = useMemo(() => {
    const t = zero();
    for (const p of periodos) addDesp(t, p);
    return t;
  }, [periodos]);

  const [showChart, setShowChart] = useState(false);

  const chart = useMemo(() => {
    const ini = mIni.trim();
    const fim = mFim.trim();
    const fq = filter.trim().toLowerCase();
    const meses = new Set<string>();
    const acc = new Map<string, Map<string, number>>();
    const planoTot = new Map<string, number>();

    for (const r of rows) {
      const mabas = r[0];
      if (ini && mabas < ini) continue;
      if (fim && mabas > fim) continue;
      if (fq && !(
        r[1].toLowerCase().includes(fq) ||
        r[2].toLowerCase().includes(fq) ||
        r[3].toLowerCase().includes(fq) ||
        r[4].toLowerCase().includes(fq)
      )) continue;
      meses.add(mabas);
      let pm = acc.get(r[1]);
      if (!pm) { pm = new Map(); acc.set(r[1], pm); }
      pm.set(mabas, (pm.get(mabas) ?? 0) + r[6]);
      planoTot.set(r[1], (planoTot.get(r[1]) ?? 0) + r[6]);
    }

    const mesesArr = Array.from(meses).sort();
    const planos = Array.from(planoTot.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([p]) => p);

    const data = mesesArr.map((mb) => {
      const row: Record<string, any> = { mes: fmtComp(mb) };
      for (const p of planos) row[p] = acc.get(p)?.get(mb) ?? null;
      return row;
    });
    return { data, planos };
  }, [rows, mIni, mFim, filter]);

  const CHART_COLORS = [
    "#f97316", "#a855f7", "#d4af37",
    "#fb923c", "#c084fc", "#eab308",
    "#ea580c", "#7e22ce", "#b8860b",
    "#fdba74", "#d8b4fe", "#facc15",
  ];

  const onSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "PLANO" ? "asc" : "desc");
    }
  };
  const arrow = (k: SortKey) =>
    sortKey === k ? (
      sortDir === "asc" ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />
    ) : null;

  const sortPlanos = (list: Plano[]) => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === "PLANO") return a.plano.localeCompare(b.plano, "pt-BR") * dir;
      return ((a as any)[sortKey] - (b as any)[sortKey]) * dir;
    });
  };

  const inputCls =
    "h-8 w-24 px-2 rounded border border-border bg-background text-xs text-foreground tabular-nums focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <TooltipProvider delayDuration={100}>
      <section className={`bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col ${embedded ? "h-full" : "h-[calc(100vh-9rem)]"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-2">
            <span className="shrink-0">APB Top10 · mabas de</span>
            <input
              type="text"
              inputMode="numeric"
              value={mIni}
              onChange={(e) => setMIni(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="202507"
              className={inputCls}
            />
            <span>até</span>
            <input
              type="text"
              inputMode="numeric"
              value={mFim}
              onChange={(e) => setMFim(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="202606"
              className={inputCls}
            />
            <button
              onClick={() => setShowChart(true)}
              className="h-8 px-3 inline-flex items-center gap-1.5 rounded border border-border bg-background text-xs text-foreground hover:bg-accent"
              title="Gráfico de despesas por plano"
            >
              <LineChartIcon className="h-3.5 w-3.5" /> Gráfico
            </button>
          </div>

          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar por Grupo, Contrato, Código ou Beneficiário"
            className="flex-1 min-w-[220px] max-w-md h-8 px-2 rounded border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="shrink-0">
            <span className="font-semibold text-foreground tabular-nums">{fmtInt(periodos.length)}</span> período(s)
          </span>
        </div>

        <div className="flex-1 overflow-auto border border-border rounded-lg p-4">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <FunLoader />
            </div>
          ) : periodos.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Sem dados para o intervalo informado.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/60 border border-border text-xs font-semibold text-foreground">
                <div className="w-6 shrink-0" />
                <div className="w-40 shrink-0 text-left">TOTAL GERAL</div>
                <div className="flex-1 grid grid-cols-6 gap-2 text-right tabular-nums">
                  {DESP_COLS.map(({ key, label }) => (
                    <span key={key} title={label}>{fmtNum(totais[key])}</span>
                  ))}
                </div>
                <div className="w-40 shrink-0 text-right tabular-nums">
                  <DespTooltip title="TOTAL GERAL · Despesa" m={totais} />
                </div>
              </div>

              {periodos.map((t) => {
                const pct = maxDesp ? (t.vrdespesas / maxDesp) * 100 : 0;
                const isOpen = !!expanded[t.periodo];
                const planos = sortPlanos(t.planos);
                return (
                  <div key={t.periodo} className="border border-border/60 rounded-md">
                    <button
                      onClick={() => setExpanded((p) => ({ ...p, [t.periodo]: !p[t.periodo] }))}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent/40 rounded-md"
                    >
                      <div className="w-6 shrink-0 text-muted-foreground">
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                      <div className="w-40 shrink-0 text-xs font-medium text-foreground text-left">
                        {fmtCiclo(t.periodo)}
                      </div>
                      <div className="flex-1 h-5 bg-muted/40 rounded overflow-hidden">
                        <div className="h-full bg-primary/70" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-56 shrink-0 text-right text-xs tabular-nums text-foreground">
                        <span className="font-semibold">{fmtNum(t.vrdespesas)}</span>
                        <span className="text-muted-foreground"> · despesa total</span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-border/60">
                        <div className="max-h-[60vh] overflow-auto">
                          <table className="w-full text-[11px]">
                            <thead className="sticky top-0 bg-muted/40 z-10">
                              <tr>
                                <th className="px-2 py-1.5 text-left font-semibold cursor-pointer select-none" onClick={() => onSort("PLANO")}>PLANO {arrow("PLANO")}</th>
                                {DESP_COLS.map(({ key, label }) => (
                                  <th
                                    key={key}
                                    className="px-2 py-1.5 text-right font-semibold cursor-pointer select-none"
                                    onClick={() => onSort(key as SortKey)}
                                  >
                                    {label} {arrow(key as SortKey)}
                                  </th>
                                ))}
                                <th className="px-2 py-1.5 text-right font-semibold cursor-pointer select-none" onClick={() => onSort("vrdespesas")}>Total Despesa {arrow("vrdespesas")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {planos.map((pl) => {
                                const pkey = `${t.periodo}::${pl.plano}`;
                                const pOpen = !!expandedPlano[pkey];
                                return (
                                  <Fragment key={pkey}>
                                    <tr className={`border-b border-border/40 hover:bg-accent/30 ${pOpen ? "font-bold" : ""}`}>
                                      <td className="px-2 py-1 truncate max-w-[320px]" title={pl.plano}>
                                        <button
                                          onClick={() => setExpandedPlano((s) => ({ ...s, [pkey]: !s[pkey] }))}
                                          className="inline-flex items-center gap-1 hover:text-primary"
                                        >
                                          {pOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                          <span>{pl.plano}</span>
                                        </button>
                                      </td>
                                      {DESP_COLS.map(({ key }) => (
                                        <td key={key} className="px-2 py-1 text-right tabular-nums">{fmtNum(pl[key])}</td>
                                      ))}
                                      <td className="px-2 py-1 text-right tabular-nums"><DespTooltip title={pl.plano} m={pl} /></td>
                                    </tr>
                                    {pOpen && pl.benefs.map((b, i) => (
                                      <tr
                                        key={`${pkey}::${b.codigo}::${i}`}
                                        className={`border-b border-border/20 ${b.outros ? "bg-muted/20 italic" : "bg-muted/5"}`}
                                      >
                                        <td className="px-2 py-1 pl-8 truncate max-w-[360px]" title={b.outros ? b.nome : `${b.nome} (${b.codigo})`}>
                                          {b.outros ? (
                                            <span className="text-muted-foreground">{b.nome}</span>
                                          ) : (
                                            <>
                                              <span className="text-muted-foreground mr-1 tabular-nums">{i + 1}.</span>
                                              {b.nome} <span className="text-muted-foreground">({b.codigo})</span>
                                            </>
                                          )}
                                        </td>
                                        {DESP_COLS.map(({ key }) => (
                                          <td key={key} className="px-2 py-1 text-right tabular-nums">{fmtNum(b[key])}</td>
                                        ))}
                                        <td className="px-2 py-1 text-right tabular-nums"><DespTooltip title={b.outros ? b.nome : `${b.nome} (${b.codigo})`} m={b} /></td>
                                      </tr>
                                    ))}
                                  </Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Dialog open={showChart} onOpenChange={setShowChart}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Despesa por Plano · {fmtComp(mIni)} a {fmtComp(mFim)}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[60vh]">
            {chart.data.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Sem dados para o intervalo informado.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart.data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v) => fmtInt(Math.round(Number(v)))}
                  />
                  <RTooltip
                    formatter={(v: any, n: any) => [v == null ? "-" : fmtNum(Number(v)), n]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {chart.planos.map((p, i) => (
                    <Line
                      key={p}
                      type="monotone"
                      dataKey={p}
                      name={p}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
