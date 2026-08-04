import { Fragment, useEffect, useMemo, useState } from "react";
import { fetchISinRows, type ISinRow } from "@/lib/isinistralidadeData";
import { useSinPeriodo } from "@/lib/sinistralidadePeriodoStore";
import { Search, ArrowUp, ArrowDown, ChevronRight, ChevronDown } from "lucide-react";
import FunLoader from "@/components/FunLoader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


type Despesa = {
  internacao: number;
  terapia: number;
  exame: number;
  consulta: number;
  emergencia: number;
  demais: number;
};

type Agg = {
  regional: string;
  vidas: number;
  rec_total: number;
  vrdespesas: number;
  saldo: number;
} & Despesa;

type ChildRow = {
  cidade: string;
  vidas: number;
  rec_total: number;
  vrdespesas: number;
  saldo: number;
} & Despesa;

type SortKey = "REGIONAL" | "vidas" | "rec_total" | "vrdespesas" | "SALDO" | "sin";

const fmtNum = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n: number) =>
  Number.isFinite(n)
    ? `${(n * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
    : "-";
const fmtShare = (v: number, total: number) => {
  if (!total) return "0,00%";
  return `${((v / total) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};

type RawAcc = {
  rec_total: number; vrdespesas: number;
  internacao: number; terapia: number; exame: number;
  consulta: number; emergencia: number; demais: number;
  nmclis: Set<string>;
};
const emptyAcc = (): RawAcc => ({
  rec_total: 0, vrdespesas: 0,
  internacao: 0, terapia: 0, exame: 0, consulta: 0, emergencia: 0, demais: 0,
  nmclis: new Set<string>(),
});

// Agrega linhas de public.isinistralidade por REGIONAL e REGIONAL::CIDADE.
// PERIODO é derivado de `mabas` (ciclo móvel de 12 meses), não vem da tabela.
function aggregate(rows: ISinRow[]): {
  regionais: Agg[];
  cidadesByReg: Record<string, ChildRow[]>;
} {
  const regMap = new Map<string, RawAcc>();
  const citMap = new Map<string, Map<string, { cidade: string } & RawAcc>>();

  for (const r of rows) {
    const reg = r.REGIONAL || "(sem regional)";
    const cid = r.CIDADE || "(sem cidade)";
    const nm = r.codigo || r.nmcli;

    const cur = regMap.get(reg) ?? emptyAcc();
    cur.rec_total += r.rec_total; cur.vrdespesas += r.vrdespesas;
    cur.internacao += r.internacao; cur.terapia += r.terapia; cur.exame += r.exame;
    cur.consulta += r.consulta; cur.emergencia += r.emergencia; cur.demais += r.demais;
    if (nm) cur.nmclis.add(nm);
    regMap.set(reg, cur);

    let cmap = citMap.get(reg);
    if (!cmap) { cmap = new Map(); citMap.set(reg, cmap); }
    const ccur = cmap.get(cid) ?? { cidade: cid, ...emptyAcc() };
    ccur.rec_total += r.rec_total; ccur.vrdespesas += r.vrdespesas;
    ccur.internacao += r.internacao; ccur.terapia += r.terapia; ccur.exame += r.exame;
    ccur.consulta += r.consulta; ccur.emergencia += r.emergencia; ccur.demais += r.demais;
    if (nm) ccur.nmclis.add(nm);
    cmap.set(cid, ccur);
  }

  return finalize(regMap, citMap);
}

function finalize(
  regMap: Map<string, RawAcc>,
  citMap: Map<string, Map<string, { cidade: string } & RawAcc>>,
): {
  regionais: Agg[];
  cidadesByReg: Record<string, ChildRow[]>;
} {



  const regionais: Agg[] = Array.from(regMap.entries()).map(([regional, v]) => ({
    regional,
    vidas: v.nmclis.size,
    rec_total: v.rec_total,
    vrdespesas: v.vrdespesas,
    saldo: v.rec_total - v.vrdespesas,
    internacao: v.internacao, terapia: v.terapia, exame: v.exame,
    consulta: v.consulta, emergencia: v.emergencia, demais: v.demais,
  }));

  const cidadesByReg: Record<string, ChildRow[]> = {};
  for (const [reg, cmap] of citMap.entries()) {
    cidadesByReg[reg] = Array.from(cmap.values())
      .map((v) => ({
        cidade: v.cidade,
        vidas: v.nmclis.size,
        rec_total: v.rec_total,
        vrdespesas: v.vrdespesas,
        saldo: v.rec_total - v.vrdespesas,
        internacao: v.internacao, terapia: v.terapia, exame: v.exame,
        consulta: v.consulta, emergencia: v.emergencia, demais: v.demais,
      }))
      .sort((a, b) => b.saldo - a.saldo);
  }

  return { regionais, cidadesByReg };
}

export default function SinistralidadeCidade() {
  const [mIni, setMIni] = useState(DEFAULT_MABAS_INI);
  const [mFim, setMFim] = useState(DEFAULT_MABAS_FIM);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [aggRows, setAggRows] = useState<Agg[]>([]);
  const [cidByReg, setCidByReg] = useState<Record<string, ChildRow[]>>({});
  const [periodosDerivados, setPeriodosDerivados] = useState<string[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("SALDO");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (mIni.length !== 6 || mFim.length !== 6) return;
    let alive = true;
    setLoadingRows(true);
    setExpanded({});
    (async () => {
      const rows = await fetchISinRows(mIni, mFim);
      if (!alive) return;
      const { regionais, cidadesByReg } = aggregate(rows);
      const ciclos = Array.from(new Set(rows.map((r) => cicloOf(r.mabas)).filter(Boolean)))
        .sort()
        .reverse()
        .map(fmtCiclo);
      setAggRows(regionais);
      setCidByReg(cidadesByReg);
      setPeriodosDerivados(ciclos);
      setLoadingRows(false);
    })();
    return () => { alive = false; };
  }, [mIni, mFim]);


  const aggregated = useMemo<Agg[]>(() => {
    const t = debouncedQ.toLowerCase();
    if (!t) return aggRows;
    return aggRows.filter((a) => {
      if (a.regional.toLowerCase().includes(t)) return true;
      const kids = cidByReg[a.regional] ?? [];
      return kids.some((c) => c.cidade.toLowerCase().includes(t));
    });
  }, [aggRows, cidByReg, debouncedQ]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...aggregated].sort((a, b) => {
      if (sortKey === "REGIONAL") return a.regional.localeCompare(b.regional, "pt-BR") * dir;
      if (sortKey === "sin") {
        const av = a.rec_total ? a.vrdespesas / a.rec_total : 0;
        const bv = b.rec_total ? b.vrdespesas / b.rec_total : 0;
        return (av - bv) * dir;
      }
      const k = sortKey === "SALDO" ? "saldo" : sortKey;
      return ((a as any)[k] - (b as any)[k]) * dir;
    });
  }, [aggregated, sortKey, sortDir]);

  const totals = useMemo(() => {
    let rec = 0, desp = 0, sal = 0, vid = 0;
    for (const a of aggregated) {
      rec += a.rec_total;
      desp += a.vrdespesas;
      sal += a.saldo;
      vid += a.vidas;
    }
    return { rec, desp, sal, vid, sin: rec ? desp / rec : 0 };
  }, [aggregated]);

  const onSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "REGIONAL" ? "asc" : "desc");
    }
  };

  const arrow = (k: SortKey) =>
    sortKey === k ? (
      sortDir === "asc" ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />
    ) : null;

  const toggle = (regional: string) => {
    setExpanded((s) => ({ ...s, [regional]: !s[regional] }));
  };

  const renderDespesaTooltip = (title: string, x: Despesa & { vrdespesas: number }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-2">
          {fmtNum(x.vrdespesas)}
        </span>
      </TooltipTrigger>
      <TooltipContent side="left" className="p-0">
        <div className="min-w-[220px] p-2">
          <div className="text-xs font-semibold mb-1.5 border-b border-border pb-1">{title}</div>
          <table className="text-[11px] w-full">
            <tbody>
              <tr><td className="pr-3 py-0.5">Internação</td><td className="text-right tabular-nums">{fmtNum(x.internacao)} <span className="text-muted-foreground">({fmtShare(x.internacao, x.vrdespesas)})</span></td></tr>
              <tr><td className="pr-3 py-0.5">Terapia</td><td className="text-right tabular-nums">{fmtNum(x.terapia)} <span className="text-muted-foreground">({fmtShare(x.terapia, x.vrdespesas)})</span></td></tr>
              <tr><td className="pr-3 py-0.5">Exame</td><td className="text-right tabular-nums">{fmtNum(x.exame)} <span className="text-muted-foreground">({fmtShare(x.exame, x.vrdespesas)})</span></td></tr>
              <tr><td className="pr-3 py-0.5">Consulta</td><td className="text-right tabular-nums">{fmtNum(x.consulta)} <span className="text-muted-foreground">({fmtShare(x.consulta, x.vrdespesas)})</span></td></tr>
              <tr><td className="pr-3 py-0.5">Emergência</td><td className="text-right tabular-nums">{fmtNum(x.emergencia)} <span className="text-muted-foreground">({fmtShare(x.emergencia, x.vrdespesas)})</span></td></tr>
              <tr><td className="pr-3 py-0.5">Demais</td><td className="text-right tabular-nums">{fmtNum(x.demais)} <span className="text-muted-foreground">({fmtShare(x.demais, x.vrdespesas)})</span></td></tr>
              <tr className="border-t border-border font-semibold"><td className="pr-3 pt-1">Total</td><td className="text-right tabular-nums pt-1">{fmtNum(x.vrdespesas)}</td></tr>
            </tbody>
          </table>
        </div>
      </TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider delayDuration={100}>
      <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 p-3 border-b border-border flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">mabas de</label>
            <input
              type="text"
              inputMode="numeric"
              value={mIni}
              onChange={(e) => setMIni(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="202507"
              className="h-9 w-24 px-2 rounded-md border border-border bg-background text-sm text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <span className="text-sm text-muted-foreground">até</span>
            <input
              type="text"
              inputMode="numeric"
              value={mFim}
              onChange={(e) => setMFim(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="202606"
              className="h-9 w-24 px-2 rounded-md border border-border bg-background text-sm text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {periodosDerivados.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Período: {periodosDerivados.join(" · ")}
              </span>
            )}
          </div>


          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por Regional ou Cidade"
              className="h-9 w-72 pl-8 pr-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <span className="text-xs text-muted-foreground ml-auto">
            {sorted.length.toLocaleString("pt-BR")} regionais
          </span>
        </div>

        <div className="flex-1 overflow-auto">
          {loadingRows ? (
            <div className="h-full flex items-center justify-center">
              <FunLoader />
            </div>
          ) : sorted.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Sem dados.
            </div>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border">
                  <th className="px-2 py-1.5 text-left font-semibold cursor-pointer select-none" onClick={() => onSort("REGIONAL")}>
                    REGIONAL / CIDADE {arrow("REGIONAL")}
                  </th>
                  <th className="px-2 py-1.5 text-right font-semibold cursor-pointer select-none" onClick={() => onSort("vidas")}>
                    Vidas {arrow("vidas")}
                  </th>
                  <th className="px-2 py-1.5 text-right font-semibold cursor-pointer select-none" onClick={() => onSort("rec_total")}>
                    Total Receita {arrow("rec_total")}
                  </th>
                  <th className="px-2 py-1.5 text-right font-semibold cursor-pointer select-none" onClick={() => onSort("vrdespesas")}>
                    Total Despesa {arrow("vrdespesas")}
                  </th>
                  <th className="px-2 py-1.5 text-right font-semibold cursor-pointer select-none" onClick={() => onSort("SALDO")}>
                    Saldo {arrow("SALDO")}
                  </th>
                  <th className="px-2 py-1.5 text-right font-semibold cursor-pointer select-none" onClick={() => onSort("sin")}>
                    SIN. {arrow("sin")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((a) => {
                  const sin = a.rec_total ? a.vrdespesas / a.rec_total : 0;
                  const isOpen = !!expanded[a.regional];
                  const kids = cidByReg[a.regional] ?? [];
                  const fq = debouncedQ.toLowerCase();
                  const visibleKids = fq && !a.regional.toLowerCase().includes(fq)
                    ? kids.filter((c) => c.cidade.toLowerCase().includes(fq))
                    : kids;
                  return (
                    <Fragment key={a.regional}>
                      <tr className={`border-b border-border/40 hover:bg-accent/30 ${isOpen ? "font-bold" : ""}`}>
                        <td className="px-2 py-1 truncate max-w-[320px]" title={a.regional}>
                          <button
                            onClick={() => toggle(a.regional)}
                            className="inline-flex items-center gap-1 hover:text-primary"
                          >
                            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            <span>{a.regional}</span>
                          </button>
                        </td>
                        <td className="px-2 py-1 text-right tabular-nums">{a.vidas.toLocaleString("pt-BR")}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{fmtNum(a.rec_total)}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{renderDespesaTooltip(a.regional, a)}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{fmtNum(a.saldo)}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{fmtPct(sin)}</td>
                      </tr>
                      {isOpen && visibleKids.length === 0 && (
                        <tr className="bg-muted/20">
                          <td colSpan={6} className="px-8 py-2 text-muted-foreground">Sem cidades.</td>
                        </tr>
                      )}
                      {isOpen && visibleKids.map((c) => {
                        const csin = c.rec_total ? c.vrdespesas / c.rec_total : 0;
                        return (
                          <tr key={`${a.regional}::${c.cidade}`} className="border-b border-border/30 bg-muted/10">
                            <td className="px-2 py-1 pl-8 truncate max-w-[320px]" title={c.cidade}>{c.cidade}</td>
                            <td className="px-2 py-1 text-right tabular-nums">{c.vidas.toLocaleString("pt-BR")}</td>
                            <td className="px-2 py-1 text-right tabular-nums">{fmtNum(c.rec_total)}</td>
                            <td className="px-2 py-1 text-right tabular-nums">{renderDespesaTooltip(c.cidade, c)}</td>
                            <td className="px-2 py-1 text-right tabular-nums">{fmtNum(c.saldo)}</td>
                            <td className="px-2 py-1 text-right tabular-nums">{fmtPct(csin)}</td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot className="sticky bottom-0 bg-card">
                <tr className="border-t-2 border-border font-bold">
                  <td className="px-2 py-1.5">TOTAL</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{totals.vid.toLocaleString("pt-BR")}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmtNum(totals.rec)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmtNum(totals.desp)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmtNum(totals.sal)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmtPct(totals.sin)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </section>
    </TooltipProvider>
  );
}
