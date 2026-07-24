import { Fragment, useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { ChevronDown, ChevronRight, Loader2, ArrowUp, ArrowDown } from "lucide-react";
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

type RegionalRow = {
  regional: string;
  vidas: number;
  rec_total: number;
  vrdespesas: number;
  saldo: number;
} & Despesa;

type CidadeRow = {
  cidade: string;
  uf: string;
  vidas: number;
  rec_total: number;
  vrdespesas: number;
  saldo: number;
} & Despesa;

type PeriodoTot = {
  periodo: string;
  rec_total: number;
  vrdespesas: number;
  saldo: number;
  vidas: number;
  sin: number;
};

type SortKey = "REGIONAL" | "vidas" | "rec_total" | "vrdespesas" | "SALDO" | "sin";

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

const emptyDesp = (): Despesa => ({
  internacao: 0, terapia: 0, exame: 0, consulta: 0, emergencia: 0, demais: 0,
});

// Client-side aggregation for a single PERIODO: fetches sinistralidade rows in
// chunks and groups by REGIONAL -> CIDADE|UF, counting distinct nmcli as vidas.
async function loadPeriodoAgg(periodo: string): Promise<{
  regionais: RegionalRow[];
  cidadesByRegional: Record<string, CidadeRow[]>;
  total: PeriodoTot;
}> {
  const chunk = 1000;
  let from = 0;
  const regMap = new Map<string, {
    rec_total: number; vrdespesas: number;
    internacao: number; terapia: number; exame: number;
    consulta: number; emergencia: number; demais: number;
    nmclis: Set<string>;
  }>();
  const citMap = new Map<string, Map<string, {
    cidade: string; uf: string;
    rec_total: number; vrdespesas: number;
    internacao: number; terapia: number; exame: number;
    consulta: number; emergencia: number; demais: number;
    nmclis: Set<string>;
  }>>();

  while (true) {
    const { data, error } = await hostinger
      .from("sinistralidade")
      .select('nmcli,REGIONAL,CIDADE_OFICIAL,UF_CIDADE_OFICIAL,rec_total,vrdespesas,internacao,terapia,exame,consulta,emergencia,"DEMAIS"')
      .eq("PERIODO", periodo)
      .range(from, from + chunk - 1);
    if (error) {
      console.error("cidade fetch error", error);
      break;
    }
    const rows = (data ?? []) as any[];
    for (const r of rows) {
      const reg = String(r.REGIONAL ?? "(sem regional)") || "(sem regional)";
      const cidNome = String(r.CIDADE_OFICIAL ?? "(sem cidade)") || "(sem cidade)";
      const uf = String(r.UF_CIDADE_OFICIAL ?? "");
      const cidKey = `${cidNome}|${uf}`;
      const nm = String(r.nmcli ?? "");

      const rec = Number(r.rec_total) || 0;
      const desp = Number(r.vrdespesas) || 0;
      const intern = Number(r.internacao) || 0;
      const ter = Number(r.terapia) || 0;
      const exa = Number(r.exame) || 0;
      const con = Number(r.consulta) || 0;
      const eme = Number(r.emergencia) || 0;
      const dem = Number(r.DEMAIS) || 0;

      const cur = regMap.get(reg) ?? {
        rec_total: 0, vrdespesas: 0,
        internacao: 0, terapia: 0, exame: 0, consulta: 0, emergencia: 0, demais: 0,
        nmclis: new Set<string>(),
      };
      cur.rec_total += rec; cur.vrdespesas += desp;
      cur.internacao += intern; cur.terapia += ter; cur.exame += exa;
      cur.consulta += con; cur.emergencia += eme; cur.demais += dem;
      if (nm) cur.nmclis.add(nm);
      regMap.set(reg, cur);

      let cmap = citMap.get(reg);
      if (!cmap) { cmap = new Map(); citMap.set(reg, cmap); }
      const ccur = cmap.get(cidKey) ?? {
        cidade: cidNome, uf,
        rec_total: 0, vrdespesas: 0,
        internacao: 0, terapia: 0, exame: 0, consulta: 0, emergencia: 0, demais: 0,
        nmclis: new Set<string>(),
      };
      ccur.rec_total += rec; ccur.vrdespesas += desp;
      ccur.internacao += intern; ccur.terapia += ter; ccur.exame += exa;
      ccur.consulta += con; ccur.emergencia += eme; ccur.demais += dem;
      if (nm) ccur.nmclis.add(nm);
      cmap.set(cidKey, ccur);
    }
    if (rows.length < chunk) break;
    from += chunk;
  }

  const regionais: RegionalRow[] = Array.from(regMap.entries()).map(([regional, v]) => ({
    regional,
    vidas: v.nmclis.size,
    rec_total: v.rec_total,
    vrdespesas: v.vrdespesas,
    saldo: v.rec_total - v.vrdespesas,
    internacao: v.internacao, terapia: v.terapia, exame: v.exame,
    consulta: v.consulta, emergencia: v.emergencia, demais: v.demais,
  }));

  const cidadesByRegional: Record<string, CidadeRow[]> = {};
  for (const [reg, cmap] of citMap.entries()) {
    cidadesByRegional[reg] = Array.from(cmap.values())
      .map((v) => ({
        cidade: v.cidade,
        uf: v.uf,
        vidas: v.nmclis.size,
        rec_total: v.rec_total,
        vrdespesas: v.vrdespesas,
        saldo: v.rec_total - v.vrdespesas,
        internacao: v.internacao, terapia: v.terapia, exame: v.exame,
        consulta: v.consulta, emergencia: v.emergencia, demais: v.demais,
      }))
      .sort((a, b) => b.saldo - a.saldo);
  }

  let rec = 0, desp = 0, sal = 0;
  const allNm = new Set<string>();
  for (const [reg, v] of regMap.entries()) {
    rec += v.rec_total; desp += v.vrdespesas; sal += (v.rec_total - v.vrdespesas);
    v.nmclis.forEach((n) => allNm.add(n));
  }
  const total: PeriodoTot = {
    periodo,
    rec_total: rec,
    vrdespesas: desp,
    saldo: sal,
    vidas: allNm.size,
    sin: rec ? desp / rec : 0,
  };

  return { regionais, cidadesByRegional, total };
}

export default function SinistralidadeCidade({ embedded = false }: { embedded?: boolean } = {}) {
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [totals, setTotals] = useState<PeriodoTot[]>([]);
  const [regByPeriodo, setRegByPeriodo] = useState<Record<string, RegionalRow[]>>({});
  const [cidByPeriodoReg, setCidByPeriodoReg] = useState<Record<string, CidadeRow[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandedReg, setExpandedReg] = useState<Record<string, boolean>>({});
  const [sortKey, setSortKey] = useState<SortKey>("SALDO");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState("");

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

      const results: PeriodoTot[] = [];
      const regCache: Record<string, RegionalRow[]> = {};
      const cidCache: Record<string, CidadeRow[]> = {};
      let done = 0;
      // Sequential fetches to keep the DB happy — each period pulls all rows.
      for (const p of uniq) {
        if (!alive) return;
        const { regionais, cidadesByRegional, total } = await loadPeriodoAgg(p);
        regCache[p] = regionais;
        for (const [reg, arr] of Object.entries(cidadesByRegional)) {
          cidCache[`${p}::${reg}`] = arr;
        }
        results.push(total);
        done += 1;
        if (alive) {
          setProgress(done);
          setRegByPeriodo({ ...regCache });
          setCidByPeriodoReg({ ...cidCache });
          setTotals(
            [...results].sort((a, b) => b.periodo.localeCompare(a.periodo)),
          );
        }
      }
      if (!alive) return;
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
      setSortDir(k === "REGIONAL" ? "asc" : "desc");
    }
  };

  const arrow = (k: SortKey) =>
    sortKey === k ? (
      sortDir === "asc" ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />
    ) : null;

  const sortReg = (rows: RegionalRow[]): RegionalRow[] => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortKey === "REGIONAL") return a.regional.localeCompare(b.regional, "pt-BR") * dir;
      if (sortKey === "sin") {
        const av = a.rec_total ? a.vrdespesas / a.rec_total : 0;
        const bv = b.rec_total ? b.vrdespesas / b.rec_total : 0;
        return (av - bv) * dir;
      }
      const k = sortKey === "SALDO" ? "saldo" : sortKey;
      return ((a as any)[k] - (b as any)[k]) * dir;
    });
  };

  const toggleReg = (periodo: string, regional: string) => {
    const key = `${periodo}::${regional}`;
    setExpandedReg((s) => ({ ...s, [key]: !s[key] }));
  };

  return (
    <TooltipProvider delayDuration={100}>
      <section className={`bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col ${embedded ? "h-full" : "h-[calc(100vh-9rem)]"}`}>
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground mb-3">
          <span className="shrink-0">
            Comparativo por PERÍODO · agrupado por <span className="text-foreground font-medium">Regional → Cidade</span>
          </span>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar por Regional, Cidade ou UF"
            className="flex-1 max-w-md h-8 px-2 rounded border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="shrink-0">
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
                const reg = regByPeriodo[t.periodo] ?? [];
                const sorted = sortReg(reg);
                const fq = filter.trim().toLowerCase();
                const regInfo = (regName: string) => {
                  if (!fq) return { visible: true };
                  if (regName.toLowerCase().includes(fq)) return { visible: true };
                  const kids = cidByPeriodoReg[`${t.periodo}::${regName}`] ?? [];
                  for (const c of kids) {
                    if (
                      c.cidade.toLowerCase().includes(fq) ||
                      c.uf.toLowerCase().includes(fq)
                    ) return { visible: true };
                  }
                  return { visible: false };
                };
                const cidInfo = (regName: string, c: CidadeRow) => {
                  if (!fq) return { visible: true };
                  if (
                    regName.toLowerCase().includes(fq) ||
                    c.cidade.toLowerCase().includes(fq) ||
                    c.uf.toLowerCase().includes(fq)
                  ) return { visible: true };
                  return { visible: false };
                };
                const visibleSorted = fq ? sorted.filter((r) => regInfo(r.regional).visible) : sorted;
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
                        {reg.length === 0 ? (
                          <div className="px-6 py-3 text-xs text-muted-foreground">Sem dados.</div>
                        ) : (
                          <div className="max-h-[60vh] overflow-auto">
                            <table className="w-full text-[11px]">
                              <thead className="sticky top-0 bg-muted/40 z-10">
                                <tr>
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
                                {visibleSorted.map((a) => {
                                  const sin = a.rec_total ? a.vrdespesas / a.rec_total : 0;
                                  const rkey = `${t.periodo}::${a.regional}`;
                                  const rOpen = fq ? true : !!expandedReg[rkey];
                                  const kids = cidByPeriodoReg[rkey] ?? [];
                                  return (
                                    <Fragment key={rkey}>
                                      <tr className={`border-b border-border/40 hover:bg-accent/30 ${rOpen ? "font-bold" : ""}`}>
                                        <td className="px-2 py-1 truncate max-w-[320px]" title={a.regional}>
                                          <button onClick={() => toggleReg(t.periodo, a.regional)} className="inline-flex items-center gap-1 hover:text-primary">
                                            {rOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                            <span>{a.regional}</span>
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
                                                <div className="text-xs font-semibold mb-1.5 border-b border-border pb-1">{a.regional}</div>
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
                                      {rOpen && kids.filter((c) => cidInfo(a.regional, c).visible).map((c) => {
                                        const csin = c.rec_total ? c.vrdespesas / c.rec_total : 0;
                                        const ckey = `${rkey}::${c.cidade}|${c.uf}`;
                                        const label = c.uf ? `${c.cidade} / ${c.uf}` : c.cidade;
                                        return (
                                          <tr key={ckey} className="border-b border-border/30 bg-muted/10">
                                            <td className="px-2 py-1 pl-8 truncate max-w-[320px]" title={label}>
                                              <span>{label}</span>
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
                                                    <div className="text-xs font-semibold mb-1.5 border-b border-border pb-1">{label}</div>
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
