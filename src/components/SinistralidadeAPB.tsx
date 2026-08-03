import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";
import FunLoader from "@/components/FunLoader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Raw = [string, string, string, string, string, number, number, number, number, number, number, number, number, number, number, number];

type Metrics = {
  rec_total: number;
  rec_tm: number;
  rec_cpa: number;
  vrdespesas: number;
  internacao: number;
  terapia: number;
  exame: number;
  consulta: number;
  emergencia: number;
  demais: number;
};

type Benef = Metrics & { codigo: string; nome: string };
type Plano = Metrics & { plano: string; vidas: number; benefs: Benef[] };
type Periodo = Metrics & { periodo: string; vidas: number; sin: number; planos: Plano[] };

type SortKey = "PLANO" | "vidas" | "rec_total" | "vrdespesas" | "SALDO" | "sin";

const fmtNum = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n: number) => n.toLocaleString("pt-BR");
const fmtPct = (n: number) =>
  Number.isFinite(n)
    ? `${(n * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
    : "-";
const fmtShare = (v: number, total: number) => {
  if (!total) return "0,00%";
  return `${((v / total) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};
const fmtComp = (mabas: string) =>
  mabas && mabas.length === 6 ? `${mabas.slice(4, 6)}/${mabas.slice(0, 4)}` : mabas;

const zero = (): Metrics => ({
  rec_total: 0, rec_tm: 0, rec_cpa: 0, vrdespesas: 0, internacao: 0, terapia: 0, exame: 0,
  consulta: 0, emergencia: 0, demais: 0,
});
const add = (t: Metrics, r: Raw) => {
  t.rec_total += r[5];
  t.vrdespesas += r[6];
  t.internacao += r[7];
  t.terapia += r[8];
  t.exame += r[9];
  t.consulta += r[10];
  t.emergencia += r[11];
  t.demais += r[12];
  t.rec_tm += r[14] ?? 0;
  t.rec_cpa += r[15] ?? 0;
};


const saldoOf = (m: Metrics) => m.rec_total - m.vrdespesas;
const sinOf = (m: Metrics) => (m.rec_total ? m.vrdespesas / m.rec_total : 0);

const DespTooltip = ({ title, m }: { title: string; m: Metrics }) => (
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
            {([
              ["Internação", m.internacao],
              ["Terapia", m.terapia],
              ["Exame", m.exame],
              ["Consulta", m.consulta],
              ["Emergência", m.emergencia],
              ["Demais", m.demais],
            ] as [string, number][]).map(([label, v]) => (
              <tr key={label}>
                <td className="pr-3 py-0.5">{label}</td>
                <td className="text-right tabular-nums">
                  {fmtNum(v)} <span className="text-muted-foreground">({fmtShare(v, m.vrdespesas)})</span>
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


const RecTooltip = ({ title, m }: { title: string; m: Metrics }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-2">
        {fmtNum(m.rec_total)}
      </span>
    </TooltipTrigger>
    <TooltipContent side="left" className="p-0">
      <div className="min-w-[200px] p-2">
        <div className="text-xs font-semibold mb-1.5 border-b border-border pb-1">{title}</div>
        <table className="text-[11px] w-full">
          <tbody>
            {([["TM", m.rec_tm], ["CPA", m.rec_cpa]] as [string, number][]).map(([label, v]) => (
              <tr key={label}>
                <td className="pr-3 py-0.5">{label}</td>
                <td className="text-right tabular-nums">
                  {fmtNum(v)} <span className="text-muted-foreground">({fmtShare(v, m.rec_total)})</span>
                </td>
              </tr>
            ))}
            <tr className="border-t border-border font-semibold">
              <td className="pr-3 pt-1">Total</td>
              <td className="text-right tabular-nums pt-1">{fmtNum(m.rec_total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </TooltipContent>
  </Tooltip>
);


export default function SinistralidadeAPB({ embedded = false }: { embedded?: boolean } = {}) {
  const [rows, setRows] = useState<Raw[]>([]);
  const [loading, setLoading] = useState(true);
  const [mIni, setMIni] = useState("202507");
  const [mFim, setMFim] = useState("202606");
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandedPlano, setExpandedPlano] = useState<Record<string, boolean>>({});
  const [sortKey, setSortKey] = useState<SortKey>("SALDO");
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
        p = { periodo: ciclo, vidas: 0, sin: 0, planos: [], ...zero() };
        byPeriodo.set(ciclo, p);
        plMaps.set(ciclo, new Map());
      }
      add(p, r);

      const pm = plMaps.get(ciclo)!;
      let pl = pm.get(r[1]);
      if (!pl) {
        pl = { plano: r[1], vidas: 0, benefs: [], ...zero() };
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
        pl.vidas += 1;
        p.vidas += 1;
      }
      add(b, r);
    }
    const arr = Array.from(byPeriodo.values());
    for (const p of arr) {
      p.sin = sinOf(p);
      for (const pl of p.planos) pl.benefs.sort((a, b) => saldoOf(a) - saldoOf(b));
    }
    arr.sort((a, b) => b.periodo.localeCompare(a.periodo));
    return arr;
  }, [rows, mIni, mFim, filter]);

  const fmtCiclo = (ciclo: string) => {
    const [a, b] = ciclo.split("-");
    return `${fmtComp(a)} a ${fmtComp(b)}`;
  };


  const maxSin = useMemo(() => periodos.reduce((m, t) => Math.max(m, t.sin), 0), [periodos]);


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
      if (sortKey === "sin") return (sinOf(a) - sinOf(b)) * dir;
      if (sortKey === "SALDO") return (saldoOf(a) - saldoOf(b)) * dir;
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
            <span className="shrink-0">APB · mabas de</span>
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
              {periodos.map((t) => {
                const pct = maxSin ? (t.sin / maxSin) * 100 : 0;
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
                        <div
                          className={`h-full ${t.sin >= 1 ? "bg-destructive/70" : "bg-primary/70"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-56 shrink-0 text-right text-xs tabular-nums text-foreground">
                        <span className="font-semibold">{fmtPct(t.sin)}</span>
                        <span className="text-muted-foreground">
                          {" "}· Saldo {fmtNum(saldoOf(t))} · {fmtInt(t.vidas)} vidas
                        </span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-border/60">
                        <div className="max-h-[60vh] overflow-auto">
                          <table className="w-full text-[11px]">
                            <thead className="sticky top-0 bg-muted/40 z-10">
                              <tr>
                                <th className="px-2 py-1.5 text-left font-semibold cursor-pointer select-none" onClick={() => onSort("PLANO")}>PLANO {arrow("PLANO")}</th>
                                <th className="px-2 py-1.5 text-right font-semibold cursor-pointer select-none" onClick={() => onSort("vidas")}>Vidas {arrow("vidas")}</th>
                                <th className="px-2 py-1.5 text-right font-semibold cursor-pointer select-none" onClick={() => onSort("rec_total")}>Total Receita {arrow("rec_total")}</th>
                                <th className="px-2 py-1.5 text-right font-semibold cursor-pointer select-none" onClick={() => onSort("vrdespesas")}>Total Despesa {arrow("vrdespesas")}</th>
                                <th className="px-2 py-1.5 text-right font-semibold cursor-pointer select-none" onClick={() => onSort("SALDO")}>Saldo {arrow("SALDO")}</th>
                                <th className="px-2 py-1.5 text-right font-semibold cursor-pointer select-none" onClick={() => onSort("sin")}>SIN. {arrow("sin")}</th>
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
                                      <td className="px-2 py-1 text-right tabular-nums">{fmtInt(pl.vidas)}</td>
                                      <td className="px-2 py-1 text-right tabular-nums"><RecTooltip title={pl.plano} m={pl} /></td>
                                      <td className="px-2 py-1 text-right tabular-nums"><DespTooltip title={pl.plano} m={pl} /></td>
                                      <td className="px-2 py-1 text-right tabular-nums">{fmtNum(saldoOf(pl))}</td>
                                      <td className="px-2 py-1 text-right tabular-nums">{fmtPct(sinOf(pl))}</td>
                                    </tr>
                                    {pOpen && pl.benefs.map((b, i) => (
                                      <tr key={`${pkey}::${b.codigo}::${i}`} className="border-b border-border/20 bg-muted/5">
                                        <td className="px-2 py-1 pl-8 truncate max-w-[360px]" title={`${b.nome} (${b.codigo})`}>
                                          {b.nome} <span className="text-muted-foreground">({b.codigo})</span>
                                        </td>
                                        <td className="px-2 py-1 text-right tabular-nums">-</td>
                                        <td className="px-2 py-1 text-right tabular-nums">{fmtNum(b.rec_total)}</td>
                                        <td className="px-2 py-1 text-right tabular-nums"><DespTooltip title={`${b.nome} (${b.codigo})`} m={b} /></td>
                                        <td className="px-2 py-1 text-right tabular-nums">{fmtNum(saldoOf(b))}</td>
                                        <td className="px-2 py-1 text-right tabular-nums">{fmtPct(sinOf(b))}</td>
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
    </TooltipProvider>
  );
}
