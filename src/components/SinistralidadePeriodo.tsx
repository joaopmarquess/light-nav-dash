import { Fragment, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_MABAS_FIM,
  DEFAULT_MABAS_INI,
  cicloOf,
  fetchISinRows,
  fmtCiclo,
  type ISinRow,
} from "@/lib/isinistralidadeData";
import { ChevronDown, ChevronRight, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import FunLoader from "@/components/FunLoader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


type Agg = {
  grupo: string;
  rec_total: number;
  vrdespesas: number;
  saldo: number;
  vidas: number;
  internacao: number;
  terapia: number;
  exame: number;
  consulta: number;
  emergencia: number;
  demais: number;
};

type ChildRow = {
  cdpln: string;
  dspln: string;
  vidas: number;
  rec_total: number;
  vrdespesas: number;
  saldo: number;
  internacao: number;
  terapia: number;
  exame: number;
  consulta: number;
  emergencia: number;
  demais: number;
};

type BenefRow = {
  codigo: string;
  nmcli: string;
  rec_total: number;
  vrdespesas: number;
  saldo: number;
  internacao: number;
  terapia: number;
  exame: number;
  consulta: number;
  emergencia: number;
  demais: number;
};

type PeriodoTot = {
  periodo: string;
  rec_total: number;
  vrdespesas: number;
  saldo: number;
  vidas: number;
  sin: number;
};

type SortKey = "GRUPO" | "vidas" | "rec_total" | "vrdespesas" | "SALDO" | "sin";

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

const mapAgg = (data: any[]): Agg[] =>
  (data ?? []).map((r) => ({
    grupo: String(r.grupo ?? "(sem grupo)") || "(sem grupo)",
    rec_total: Number(r.rec_total) || 0,
    vrdespesas: Number(r.vrdespesas) || 0,
    saldo: Number(r.saldo) || 0,
    vidas: Number(r.vidas) || 0,
    internacao: Number(r.internacao) || 0,
    terapia: Number(r.terapia) || 0,
    exame: Number(r.exame) || 0,
    consulta: Number(r.consulta) || 0,
    emergencia: Number(r.emergencia) || 0,
    demais: Number(r.demais) || 0,
  }));

export default function SinistralidadePeriodo({ embedded = false }: { embedded?: boolean } = {}) {
  const [mIni, setMIni] = useState(DEFAULT_MABAS_INI);
  const [mFim, setMFim] = useState(DEFAULT_MABAS_FIM);
  const [rows, setRows] = useState<ISinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandedGrupo, setExpandedGrupo] = useState<Record<string, boolean>>({});
  const [sortKey, setSortKey] = useState<SortKey>("SALDO");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedCdpln, setExpandedCdpln] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (mIni.length !== 6 || mFim.length !== 6) return;
    let alive = true;
    setLoading(true);
    setExpanded({});
    setExpandedGrupo({});
    setExpandedCdpln({});
    (async () => {
      const data = await fetchISinRows(mIni, mFim);
      if (!alive) return;
      setRows(data);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [mIni, mFim]);

  /**
   * PERIODO é derivado: ciclo móvel de 12 meses (jul→jun) calculado a partir de `mabas`.
   * Toda a hierarquia (Período > Grupo > Plano > Beneficiário) é agregada na aplicação.
   */
  const derived = useMemo(() => {
    type GAcc = Agg & { codigos: Set<string> };
    type CAcc = ChildRow & { codigos: Set<string> };
    const gMaps = new Map<string, Map<string, GAcc>>();
    const cMaps = new Map<string, Map<string, CAcc>>();
    const bMaps = new Map<string, Map<string, BenefRow>>();

    for (const r of rows) {
      if (!r.mabas) continue;
      const periodo = fmtCiclo(cicloOf(r.mabas));
      const grupo = r.GRUPO || "(sem grupo)";
      const cd = r.cdpln || "(sem plano)";
      const id = r.codigo || r.nmcli;

      let gm = gMaps.get(periodo);
      if (!gm) { gm = new Map(); gMaps.set(periodo, gm); }
      let g = gm.get(grupo);
      if (!g) {
        g = {
          grupo, rec_total: 0, vrdespesas: 0, saldo: 0, vidas: 0,
          internacao: 0, terapia: 0, exame: 0, consulta: 0, emergencia: 0, demais: 0,
          codigos: new Set<string>(),
        };
        gm.set(grupo, g);
      }

      const gkey = `${periodo}::${grupo}`;
      let cm = cMaps.get(gkey);
      if (!cm) { cm = new Map(); cMaps.set(gkey, cm); }
      let c = cm.get(cd);
      if (!c) {
        c = {
          cdpln: cd, dspln: r.dspln, vidas: 0, rec_total: 0, vrdespesas: 0, saldo: 0,
          internacao: 0, terapia: 0, exame: 0, consulta: 0, emergencia: 0, demais: 0,
          codigos: new Set<string>(),
        };
        cm.set(cd, c);
      }
      if (!c.dspln && r.dspln) c.dspln = r.dspln;

      const ckey = `${periodo}::${grupo}::${cd}`;
      let bm = bMaps.get(ckey);
      if (!bm) { bm = new Map(); bMaps.set(ckey, bm); }
      let b = bm.get(id || "(sem código)");
      if (!b) {
        b = {
          codigo: id || "(sem código)", nmcli: r.nmcli, rec_total: 0, vrdespesas: 0, saldo: 0,
          internacao: 0, terapia: 0, exame: 0, consulta: 0, emergencia: 0, demais: 0,
        };
        bm.set(b.codigo, b);
      }
      if (!b.nmcli && r.nmcli) b.nmcli = r.nmcli;

      for (const t of [g, c, b] as (Agg | ChildRow | BenefRow)[]) {
        t.rec_total += r.rec_total;
        t.vrdespesas += r.vrdespesas;
        t.internacao += r.internacao;
        t.terapia += r.terapia;
        t.exame += r.exame;
        t.consulta += r.consulta;
        t.emergencia += r.emergencia;
        t.demais += r.demais;
      }
      if (id) {
        g.codigos.add(id);
        c.codigos.add(id);
      }
    }

    const aggByPeriodo: Record<string, Agg[]> = {};
    const totals: PeriodoTot[] = [];
    for (const [periodo, gm] of gMaps.entries()) {
      const aggs = Array.from(gm.values()).map((g) => ({
        ...g,
        vidas: g.codigos.size,
        saldo: g.rec_total - g.vrdespesas,
      }));
      aggByPeriodo[periodo] = aggs;
      let rec = 0, desp = 0, sal = 0, vid = 0;
      for (const a of aggs) {
        rec += a.rec_total;
        desp += a.vrdespesas;
        sal += a.saldo;
        vid += a.vidas;
      }
      totals.push({ periodo, rec_total: rec, vrdespesas: desp, saldo: sal, vidas: vid, sin: rec ? desp / rec : 0 });
    }
    totals.sort((a, b) => b.periodo.localeCompare(a.periodo));

    const children: Record<string, ChildRow[]> = {};
    for (const [k, cm] of cMaps.entries()) {
      children[k] = Array.from(cm.values())
        .map((c) => ({ ...c, vidas: c.codigos.size, saldo: c.rec_total - c.vrdespesas }))
        .sort((a, b) => b.saldo - a.saldo);
    }
    const benefs: Record<string, BenefRow[]> = {};
    for (const [k, bm] of bMaps.entries()) {
      benefs[k] = Array.from(bm.values())
        .map((b) => ({ ...b, saldo: b.rec_total - b.vrdespesas }))
        .sort((a, b) => b.saldo - a.saldo);
    }
    return { totals, aggByPeriodo, children, benefs };
  }, [rows]);

  const { totals, aggByPeriodo, children, benefs } = derived;
  const loadingChild: Record<string, boolean> = {};
  const loadingBenef: Record<string, boolean> = {};
  const periodos = totals.map((t) => t.periodo);
  const progress = totals.length;


  const maxSin = useMemo(() => totals.reduce((m, t) => Math.max(m, t.sin), 0), [totals]);

  const onSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "GRUPO" ? "asc" : "desc");
    }
  };

  const arrow = (k: SortKey) =>
    sortKey === k ? (
      sortDir === "asc" ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />
    ) : null;

  const sortAgg = (rows: Agg[]): Agg[] => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortKey === "GRUPO") return a.grupo.localeCompare(b.grupo, "pt-BR") * dir;
      if (sortKey === "sin") {
        const av = a.rec_total ? a.vrdespesas / a.rec_total : 0;
        const bv = b.rec_total ? b.vrdespesas / b.rec_total : 0;
        return (av - bv) * dir;
      }
      const k = sortKey === "SALDO" ? "saldo" : sortKey;
      return ((a as any)[k] - (b as any)[k]) * dir;
    });
  };

  const toggleGrupo = (periodo: string, grupo: string) => {
    const key = `${periodo}::${grupo}`;
    setExpandedGrupo((s) => ({ ...s, [key]: !s[key] }));
  };

  const toggleCdpln = (periodo: string, grupo: string, cdpln: string) => {
    const key = `${periodo}::${grupo}::${cdpln}`;
    setExpandedCdpln((s) => ({ ...s, [key]: !s[key] }));
  };

  const inputCls =
    "h-8 w-24 px-2 rounded border border-border bg-background text-xs text-foreground tabular-nums focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <TooltipProvider delayDuration={100}>
      <section className={`bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col ${embedded ? "h-full" : "h-[calc(100vh-9rem)]"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-2">
            <span className="shrink-0">mabas de</span>
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
            placeholder="Filtrar por Grupo, Plano (cdpln) ou Descrição do Plano (dspln)"
            className="flex-1 max-w-md h-8 px-2 rounded border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="shrink-0">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> carregando...
              </span>
            ) : (
              <>
                <span className="font-semibold text-foreground tabular-nums">{fmtInt(totals.length)}</span> período(s)
              </>
            )}
          </span>
        </div>


        <div className="flex-1 overflow-auto border border-border rounded-lg p-4">
          {loading && totals.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <FunLoader />
            </div>
          ) : totals.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Sem dados.
            </div>
          ) : (
            <div className="space-y-2">
              {totals.map((t) => {
                const pct = maxSin ? (t.sin / maxSin) * 100 : 0;
                const agg = aggByPeriodo[t.periodo] ?? [];
                const sorted = sortAgg(agg);
                const fq = filter.trim().toLowerCase();
                const grupoInfo = (grupoName: string) => {
                  if (!fq) return { visible: true, allChildren: true };
                  if (grupoName.toLowerCase().includes(fq)) return { visible: true, allChildren: true };
                  const kk = children[`${t.periodo}::${grupoName}`];
                  if (!kk) return { visible: false, allChildren: false };
                  for (const c of kk) {
                    if (
                      c.cdpln.toLowerCase().includes(fq) ||
                      (c.dspln ?? "").toLowerCase().includes(fq)
                    )
                      return { visible: true, allChildren: false };
                  }
                  return { visible: false, allChildren: false };
                };
                const cdplnInfo = (grupoName: string, c: ChildRow) => {
                  if (!fq) return { visible: true, allBenefs: true };
                  if (
                    grupoName.toLowerCase().includes(fq) ||
                    c.cdpln.toLowerCase().includes(fq) ||
                    (c.dspln ?? "").toLowerCase().includes(fq)
                  )
                    return { visible: true, allBenefs: true };
                  return { visible: false, allBenefs: false };
                };
                const benefMatches = (_grupoName: string, _cdpln: string, _b: BenefRow) => true;
                const visibleSorted = fq ? sorted.filter((a) => grupoInfo(a.grupo).visible) : sorted;
                if (fq && visibleSorted.length === 0) return null;
                const isOpen = fq ? true : !!expanded[t.periodo];
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
                        {t.periodo}
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
                          {" "}· Saldo {fmtNum(t.saldo)} · {fmtInt(t.vidas)} vidas
                        </span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-border/60">
                        {agg.length === 0 ? (
                          <div className="px-6 py-3 text-xs text-muted-foreground">Sem dados.</div>
                        ) : (
                          <div className="max-h-[60vh] overflow-auto">
                            <table className="w-full text-[11px]">
                              <thead className="sticky top-0 bg-muted/40 z-10">
                                <tr>
                                  <th
                                    className="px-2 py-1.5 text-left font-semibold cursor-pointer select-none"
                                    onClick={() => onSort("GRUPO")}
                                  >
                                    GRUPO {arrow("GRUPO")}
                                  </th>
                                  <th
                                    className="px-2 py-1.5 text-right font-semibold cursor-pointer select-none"
                                    onClick={() => onSort("vidas")}
                                  >
                                    Vidas {arrow("vidas")}
                                  </th>
                                  <th
                                    className="px-2 py-1.5 text-right font-semibold cursor-pointer select-none"
                                    onClick={() => onSort("rec_total")}
                                  >
                                    Total Receita {arrow("rec_total")}
                                  </th>
                                  <th
                                    className="px-2 py-1.5 text-right font-semibold cursor-pointer select-none"
                                    onClick={() => onSort("vrdespesas")}
                                  >
                                    Total Despesa {arrow("vrdespesas")}
                                  </th>
                                  <th
                                    className="px-2 py-1.5 text-right font-semibold cursor-pointer select-none"
                                    onClick={() => onSort("SALDO")}
                                  >
                                    Saldo {arrow("SALDO")}
                                  </th>
                                  <th
                                    className="px-2 py-1.5 text-right font-semibold cursor-pointer select-none"
                                    onClick={() => onSort("sin")}
                                  >
                                    SIN. {arrow("sin")}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {visibleSorted.map((a) => {
                                  const sin = a.rec_total ? a.vrdespesas / a.rec_total : 0;
                                  const gkey = `${t.periodo}::${a.grupo}`;
                                  const gOpen = fq ? true : !!expandedGrupo[gkey];
                                  const kids = children[gkey];
                                  const isLoadingKids = !!loadingChild[gkey];
                                  return (
                                    <Fragment key={gkey}>
                                      <tr className={`border-b border-border/40 hover:bg-accent/30 ${gOpen ? "font-bold" : ""}`}>
                                        <td className="px-2 py-1 truncate max-w-[320px]" title={a.grupo}>
                                          <button
                                            onClick={() => toggleGrupo(t.periodo, a.grupo)}
                                            className="inline-flex items-center gap-1 hover:text-primary"
                                          >
                                            {gOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                            <span>{a.grupo}</span>
                                          </button>
                                        </td>
                                        <td className="px-2 py-1 text-right tabular-nums">{fmtInt(a.vidas)}</td>
                                        <td className="px-2 py-1 text-right tabular-nums">{fmtNum(a.rec_total)}</td>
                                        <td className="px-2 py-1 text-right tabular-nums">
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-2">
                                                {fmtNum(a.vrdespesas)}
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="left" className="p-0">
                                              <div className="min-w-[220px] p-2">
                                                <div className="text-xs font-semibold mb-1.5 border-b border-border pb-1">
                                                  {a.grupo}
                                                </div>
                                                <table className="text-[11px] w-full">
                                                  <tbody>
                                                    <tr><td className="pr-3 py-0.5">Internação</td><td className="text-right tabular-nums">{fmtNum(a.internacao)} <span className="text-muted-foreground">({fmtShare(a.internacao, a.vrdespesas)})</span></td></tr>
                                                    <tr><td className="pr-3 py-0.5">Terapia</td><td className="text-right tabular-nums">{fmtNum(a.terapia)} <span className="text-muted-foreground">({fmtShare(a.terapia, a.vrdespesas)})</span></td></tr>
                                                    <tr><td className="pr-3 py-0.5">Exame</td><td className="text-right tabular-nums">{fmtNum(a.exame)} <span className="text-muted-foreground">({fmtShare(a.exame, a.vrdespesas)})</span></td></tr>
                                                    <tr><td className="pr-3 py-0.5">Consulta</td><td className="text-right tabular-nums">{fmtNum(a.consulta)} <span className="text-muted-foreground">({fmtShare(a.consulta, a.vrdespesas)})</span></td></tr>
                                                    <tr><td className="pr-3 py-0.5">Emergência</td><td className="text-right tabular-nums">{fmtNum(a.emergencia)} <span className="text-muted-foreground">({fmtShare(a.emergencia, a.vrdespesas)})</span></td></tr>
                                                    <tr><td className="pr-3 py-0.5">Demais</td><td className="text-right tabular-nums">{fmtNum(a.demais)} <span className="text-muted-foreground">({fmtShare(a.demais, a.vrdespesas)})</span></td></tr>
                                                    <tr className="border-t border-border font-semibold"><td className="pr-3 pt-1">Total</td><td className="text-right tabular-nums pt-1">{fmtNum(a.vrdespesas)}</td></tr>
                                                  </tbody>
                                                </table>
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        </td>
                                        <td className="px-2 py-1 text-right tabular-nums">{fmtNum(a.saldo)}</td>
                                        <td className="px-2 py-1 text-right tabular-nums">{fmtPct(sin)}</td>
                                      </tr>
                                      {gOpen && isLoadingKids && (
                                        <tr className="bg-muted/20">
                                          <td colSpan={6} className="px-8 py-2 text-muted-foreground">
                                            <Loader2 className="inline h-3 w-3 animate-spin mr-2" />
                                            Carregando planos...
                                          </td>
                                        </tr>
                                      )}
                                      {gOpen && !isLoadingKids && kids && kids.length === 0 && (
                                        <tr className="bg-muted/20">
                                          <td colSpan={6} className="px-8 py-2 text-muted-foreground">
                                            Sem planos.
                                          </td>
                                        </tr>
                                      )}
                                      {gOpen && !isLoadingKids && kids && kids.filter((c) => cdplnInfo(a.grupo, c).visible).map((c) => {
                                        const csin = c.rec_total ? c.vrdespesas / c.rec_total : 0;
                                        const ckey = `${t.periodo}::${a.grupo}::${c.cdpln}`;
                                        const cOpen = fq ? true : !!expandedCdpln[ckey];
                                        const bRows = benefs[ckey];
                                        const bLoading = !!loadingBenef[ckey];
                                        return (
                                          <Fragment key={ckey}>
                                          <tr className={`border-b border-border/30 bg-muted/10 ${cOpen ? "font-semibold" : ""}`}>
                                            <td className="px-2 py-1 pl-8 truncate max-w-[320px]" title={c.cdpln}>
                                              <button
                                                onClick={() => toggleCdpln(t.periodo, a.grupo, c.cdpln)}
                                                className="inline-flex items-center gap-1 hover:text-primary"
                                              >
                                                {cOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                                <span>{c.cdpln}</span>
                                              </button>
                                            </td>
                                            <td className="px-2 py-1 text-right tabular-nums">{fmtInt(c.vidas)}</td>
                                            <td className="px-2 py-1 text-right tabular-nums">{fmtNum(c.rec_total)}</td>
                                            <td className="px-2 py-1 text-right tabular-nums">
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <span className="cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-2">
                                                    {fmtNum(c.vrdespesas)}
                                                  </span>
                                                </TooltipTrigger>
                                                <TooltipContent side="left" className="p-0">
                                                  <div className="min-w-[220px] p-2">
                                                    <div className="text-xs font-semibold mb-1.5 border-b border-border pb-1">{c.cdpln}</div>
                                                    <table className="text-[11px] w-full">
                                                      <tbody>
                                                        <tr><td className="pr-3 py-0.5">Internação</td><td className="text-right tabular-nums">{fmtNum(c.internacao)} <span className="text-muted-foreground">({fmtShare(c.internacao, c.vrdespesas)})</span></td></tr>
                                                        <tr><td className="pr-3 py-0.5">Terapia</td><td className="text-right tabular-nums">{fmtNum(c.terapia)} <span className="text-muted-foreground">({fmtShare(c.terapia, c.vrdespesas)})</span></td></tr>
                                                        <tr><td className="pr-3 py-0.5">Exame</td><td className="text-right tabular-nums">{fmtNum(c.exame)} <span className="text-muted-foreground">({fmtShare(c.exame, c.vrdespesas)})</span></td></tr>
                                                        <tr><td className="pr-3 py-0.5">Consulta</td><td className="text-right tabular-nums">{fmtNum(c.consulta)} <span className="text-muted-foreground">({fmtShare(c.consulta, c.vrdespesas)})</span></td></tr>
                                                        <tr><td className="pr-3 py-0.5">Emergência</td><td className="text-right tabular-nums">{fmtNum(c.emergencia)} <span className="text-muted-foreground">({fmtShare(c.emergencia, c.vrdespesas)})</span></td></tr>
                                                        <tr><td className="pr-3 py-0.5">Demais</td><td className="text-right tabular-nums">{fmtNum(c.demais)} <span className="text-muted-foreground">({fmtShare(c.demais, c.vrdespesas)})</span></td></tr>
                                                        <tr className="border-t border-border font-semibold"><td className="pr-3 pt-1">Total</td><td className="text-right tabular-nums pt-1">{fmtNum(c.vrdespesas)}</td></tr>
                                                      </tbody>
                                                    </table>
                                                  </div>
                                                </TooltipContent>
                                              </Tooltip>
                                            </td>
                                            <td className="px-2 py-1 text-right tabular-nums">{fmtNum(c.saldo)}</td>
                                            <td className="px-2 py-1 text-right tabular-nums">{fmtPct(csin)}</td>
                                          </tr>
                                          {cOpen && bLoading && (
                                            <tr className="bg-muted/5">
                                              <td colSpan={6} className="px-14 py-2 text-muted-foreground">
                                                <Loader2 className="inline h-3 w-3 animate-spin mr-2" />
                                                Carregando beneficiários...
                                              </td>
                                            </tr>
                                          )}
                                          {cOpen && !bLoading && bRows && bRows.length === 0 && (
                                            <tr className="bg-muted/5">
                                              <td colSpan={6} className="px-14 py-2 text-muted-foreground">Sem beneficiários.</td>
                                            </tr>
                                          )}
                                          {cOpen && !bLoading && bRows && bRows.filter((b) => benefMatches(a.grupo, c.cdpln, b)).map((b) => {
                                            const bsin = b.rec_total ? b.vrdespesas / b.rec_total : 0;
                                            return (
                                              <tr key={`${ckey}::${b.codigo}`} className="border-b border-border/20 bg-muted/5">
                                                <td className="px-2 py-1 pl-14 truncate max-w-[360px]" title={`${b.nmcli} (${b.codigo})`}>
                                                  {b.nmcli} <span className="text-muted-foreground">({b.codigo})</span>
                                                </td>
                                                <td className="px-2 py-1 text-right tabular-nums">-</td>
                                                <td className="px-2 py-1 text-right tabular-nums">{fmtNum(b.rec_total)}</td>
                                                <td className="px-2 py-1 text-right tabular-nums">
                                                  <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <span className="cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-2">
                                                        {fmtNum(b.vrdespesas)}
                                                      </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="left" className="p-0">
                                                      <div className="min-w-[220px] p-2">
                                                        <div className="text-xs font-semibold mb-1.5 border-b border-border pb-1">{b.nmcli} ({b.codigo})</div>
                                                        <table className="text-[11px] w-full">
                                                          <tbody>
                                                            <tr><td className="pr-3 py-0.5">Internação</td><td className="text-right tabular-nums">{fmtNum(b.internacao)} <span className="text-muted-foreground">({fmtShare(b.internacao, b.vrdespesas)})</span></td></tr>
                                                            <tr><td className="pr-3 py-0.5">Terapia</td><td className="text-right tabular-nums">{fmtNum(b.terapia)} <span className="text-muted-foreground">({fmtShare(b.terapia, b.vrdespesas)})</span></td></tr>
                                                            <tr><td className="pr-3 py-0.5">Exame</td><td className="text-right tabular-nums">{fmtNum(b.exame)} <span className="text-muted-foreground">({fmtShare(b.exame, b.vrdespesas)})</span></td></tr>
                                                            <tr><td className="pr-3 py-0.5">Consulta</td><td className="text-right tabular-nums">{fmtNum(b.consulta)} <span className="text-muted-foreground">({fmtShare(b.consulta, b.vrdespesas)})</span></td></tr>
                                                            <tr><td className="pr-3 py-0.5">Emergência</td><td className="text-right tabular-nums">{fmtNum(b.emergencia)} <span className="text-muted-foreground">({fmtShare(b.emergencia, b.vrdespesas)})</span></td></tr>
                                                            <tr><td className="pr-3 py-0.5">Demais</td><td className="text-right tabular-nums">{fmtNum(b.demais)} <span className="text-muted-foreground">({fmtShare(b.demais, b.vrdespesas)})</span></td></tr>
                                                            <tr className="border-t border-border font-semibold"><td className="pr-3 pt-1">Total</td><td className="text-right tabular-nums pt-1">{fmtNum(b.vrdespesas)}</td></tr>
                                                          </tbody>
                                                        </table>
                                                      </div>
                                                    </TooltipContent>
                                                  </Tooltip>
                                                </td>
                                                <td className="px-2 py-1 text-right tabular-nums">{fmtNum(b.saldo)}</td>
                                                <td className="px-2 py-1 text-right tabular-nums">{fmtPct(bsin)}</td>
                                              </tr>
                                            );
                                          })}
                                          </Fragment>
                                        );
                                      })}
                                    </Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
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
