import { Fragment, useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
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

export default function SinistralidadePeriodo() {
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [totals, setTotals] = useState<PeriodoTot[]>([]);
  const [aggByPeriodo, setAggByPeriodo] = useState<Record<string, Agg[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandedGrupo, setExpandedGrupo] = useState<Record<string, boolean>>({});
  const [children, setChildren] = useState<Record<string, ChildRow[]>>({});
  const [loadingChild, setLoadingChild] = useState<Record<string, boolean>>({});
  const [sortKey, setSortKey] = useState<SortKey>("SALDO");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedCdpln, setExpandedCdpln] = useState<Record<string, boolean>>({});
  const [benefs, setBenefs] = useState<Record<string, BenefRow[]>>({});
  const [loadingBenef, setLoadingBenef] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setProgress(0);
      const { data, error } = await hostinger.rpc("sin_periodos");
      if (!alive) return;
      if (error) {
        console.error("PERIODO load error", error);
        setLoading(false);
        return;
      }
      const uniq = Array.from(
        new Set(
          ((data ?? []) as any[])
            .map((r) => String(r.periodo ?? r.PERIODO ?? ""))
            .filter(Boolean),
        ),
      );
      uniq.sort().reverse();
      setPeriodos(uniq);

      // Fetch each period's aggregate (parallel, cached)
      const results: PeriodoTot[] = [];
      const cache: Record<string, Agg[]> = {};
      let done = 0;
      await Promise.all(
        uniq.map(async (p) => {
          const { data: d, error: e } = await hostinger.rpc("sin_por_grupo", { p_periodo: p });
          if (e) {
            console.error("sin_por_grupo error", p, e);
          }
          const agg = mapAgg((d ?? []) as any[]);
          cache[p] = agg;
          let rec = 0, desp = 0, sal = 0, vid = 0;
          for (const a of agg) {
            rec += a.rec_total;
            desp += a.vrdespesas;
            sal += a.saldo;
            vid += a.vidas;
          }
          results.push({
            periodo: p,
            rec_total: rec,
            vrdespesas: desp,
            saldo: sal,
            vidas: vid,
            sin: rec ? desp / rec : 0,
          });
          done += 1;
          if (alive) setProgress(done);
        }),
      );
      if (!alive) return;
      results.sort((a, b) => b.periodo.localeCompare(a.periodo));
      setTotals(results);
      setAggByPeriodo(cache);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

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

  const loadChildren = async (periodo: string, grupo: string) => {
    const key = `${periodo}::${grupo}`;
    if (children[key] || loadingChild[key]) return;
    setLoadingChild((s) => ({ ...s, [key]: true }));
    const chunk = 1000;
    let from = 0;
    const map = new Map<
      string,
      {
        rec_total: number;
        vrdespesas: number;
        internacao: number;
        terapia: number;
        exame: number;
        consulta: number;
        emergencia: number;
        demais: number;
        nmclis: Set<string>;
      }
    >();
    while (true) {
      const { data, error } = await hostinger
        .from("sinistralidade")
        .select('cdpln,nmcli,rec_total,vrdespesas,internacao,terapia,exame,consulta,emergencia,"DEMAIS"')
        .eq("PERIODO", periodo)
        .eq("GRUPO", grupo)
        .range(from, from + chunk - 1);
      if (error) {
        console.error("children fetch error", error);
        break;
      }
      const rows = (data ?? []) as any[];
      for (const r of rows) {
        const cd = String(r.cdpln ?? "");
        if (!cd) continue;
        const cur = map.get(cd) ?? {
          rec_total: 0, vrdespesas: 0, internacao: 0, terapia: 0, exame: 0,
          consulta: 0, emergencia: 0, demais: 0, nmclis: new Set<string>(),
        };
        cur.rec_total += Number(r.rec_total) || 0;
        cur.vrdespesas += Number(r.vrdespesas) || 0;
        cur.internacao += Number(r.internacao) || 0;
        cur.terapia += Number(r.terapia) || 0;
        cur.exame += Number(r.exame) || 0;
        cur.consulta += Number(r.consulta) || 0;
        cur.emergencia += Number(r.emergencia) || 0;
        cur.demais += Number(r.DEMAIS) || 0;
        const nm = String(r.nmcli ?? "");
        if (nm) cur.nmclis.add(nm);
        map.set(cd, cur);
      }
      if (rows.length < chunk) break;
      from += chunk;
    }
    const arr: ChildRow[] = Array.from(map.entries())
      .map(([cdpln, v]) => ({
        cdpln,
        vidas: v.nmclis.size,
        rec_total: v.rec_total,
        vrdespesas: v.vrdespesas,
        saldo: v.rec_total - v.vrdespesas,
        internacao: v.internacao,
        terapia: v.terapia,
        exame: v.exame,
        consulta: v.consulta,
        emergencia: v.emergencia,
        demais: v.demais,
      }))
      .sort((a, b) => b.saldo - a.saldo);
    setChildren((s) => ({ ...s, [key]: arr }));
    setLoadingChild((s) => ({ ...s, [key]: false }));
  };

  const toggleGrupo = (periodo: string, grupo: string) => {
    const key = `${periodo}::${grupo}`;
    setExpandedGrupo((s) => {
      const next = { ...s, [key]: !s[key] };
      if (next[key]) void loadChildren(periodo, grupo);
      return next;
    });
  };

  const loadBenefs = async (periodo: string, grupo: string, cdpln: string) => {
    const key = `${periodo}::${grupo}::${cdpln}`;
    if (benefs[key] || loadingBenef[key]) return;
    setLoadingBenef((s) => ({ ...s, [key]: true }));
    const chunk = 1000;
    let from = 0;
    const map = new Map<string, { nmcli: string; rec_total: number; vrdespesas: number }>();
    while (true) {
      const { data, error } = await hostinger
        .from("sinistralidade")
        .select("codigo,nmcli,rec_total,vrdespesas")
        .eq("PERIODO", periodo)
        .eq("GRUPO", grupo)
        .eq("cdpln", cdpln)
        .range(from, from + chunk - 1);
      if (error) {
        console.error("benef fetch error", error);
        break;
      }
      const rows = (data ?? []) as any[];
      for (const r of rows) {
        const cd = String(r.codigo ?? "");
        if (!cd) continue;
        const cur = map.get(cd) ?? { nmcli: String(r.nmcli ?? ""), rec_total: 0, vrdespesas: 0 };
        cur.rec_total += Number(r.rec_total) || 0;
        cur.vrdespesas += Number(r.vrdespesas) || 0;
        if (!cur.nmcli && r.nmcli) cur.nmcli = String(r.nmcli);
        map.set(cd, cur);
      }
      if (rows.length < chunk) break;
      from += chunk;
    }
    const arr: BenefRow[] = Array.from(map.entries())
      .map(([codigo, v]) => ({
        codigo,
        nmcli: v.nmcli,
        rec_total: v.rec_total,
        vrdespesas: v.vrdespesas,
        saldo: v.rec_total - v.vrdespesas,
      }))
      .sort((a, b) => b.saldo - a.saldo);
    setBenefs((s) => ({ ...s, [key]: arr }));
    setLoadingBenef((s) => ({ ...s, [key]: false }));
  };

  const toggleCdpln = (periodo: string, grupo: string, cdpln: string) => {
    const key = `${periodo}::${grupo}::${cdpln}`;
    setExpandedCdpln((s) => {
      const next = { ...s, [key]: !s[key] };
      if (next[key]) void loadBenefs(periodo, grupo, cdpln);
      return next;
    });
  };

  return (
    <TooltipProvider delayDuration={100}>
      <section className="bg-card rounded-xl border border-border shadow-sm p-6 h-[calc(100vh-9rem)] flex flex-col">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span>
            Comparativo por PERÍODO · métrica: <span className="text-foreground font-medium">Sinistralidade (%)</span>
          </span>
          <span>
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> {fmtInt(progress)}/{fmtInt(periodos.length)} períodos
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
                const isOpen = !!expanded[t.periodo];
                const agg = aggByPeriodo[t.periodo] ?? [];
                const sorted = sortAgg(agg);
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
                                {sorted.map((a) => {
                                  const sin = a.rec_total ? a.vrdespesas / a.rec_total : 0;
                                  const gkey = `${t.periodo}::${a.grupo}`;
                                  const gOpen = !!expandedGrupo[gkey];
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
                                      {gOpen && !isLoadingKids && kids && kids.map((c) => {
                                        const csin = c.rec_total ? c.vrdespesas / c.rec_total : 0;
                                        const ckey = `${t.periodo}::${a.grupo}::${c.cdpln}`;
                                        const cOpen = !!expandedCdpln[ckey];
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
                                            <td className="px-2 py-1 text-right tabular-nums">{fmtNum(c.vrdespesas)}</td>
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
                                          {cOpen && !bLoading && bRows && bRows.map((b) => {
                                            const bsin = b.rec_total ? b.vrdespesas / b.rec_total : 0;
                                            return (
                                              <tr key={`${ckey}::${b.codigo}`} className="border-b border-border/20 bg-muted/5">
                                                <td className="px-2 py-1 pl-14 truncate max-w-[360px]" title={`${b.nmcli} (${b.codigo})`}>
                                                  {b.nmcli} <span className="text-muted-foreground">({b.codigo})</span>
                                                </td>
                                                <td className="px-2 py-1 text-right tabular-nums">-</td>
                                                <td className="px-2 py-1 text-right tabular-nums">{fmtNum(b.rec_total)}</td>
                                                <td className="px-2 py-1 text-right tabular-nums">{fmtNum(b.vrdespesas)}</td>
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
