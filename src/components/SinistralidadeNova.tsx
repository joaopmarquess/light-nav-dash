import { Fragment, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_MABAS_FIM,
  DEFAULT_MABAS_INI,
  cicloOf,
  fetchISinRows,
  fmtCiclo,
  type ISinRow,
} from "@/lib/isinistralidadeData";
import { Search, ArrowUp, ArrowDown, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import FunLoader from "@/components/FunLoader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


type Mode = "empresa" | "beneficiario";

interface Props {
  mode: Mode;
}

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

type SortKey = "GRUPO" | "vidas" | "rec_total" | "vrdespesas" | "SALDO" | "sin";

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

export default function SinistralidadeNova({ mode: _mode }: Props) {
  const [mIni, setMIni] = useState(DEFAULT_MABAS_INI);
  const [mFim, setMFim] = useState(DEFAULT_MABAS_FIM);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [rows, setRows] = useState<ISinRow[]>([]);
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
      const data = await fetchISinRows(mIni, mFim);
      if (!alive) return;
      setRows(data);
      setLoadingRows(false);
    })();
    return () => {
      alive = false;
    };
  }, [mIni, mFim]);

  // PERIODO derivado (ciclos móveis de 12 meses) presente no intervalo selecionado
  const periodosDerivados = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.mabas) set.add(cicloOf(r.mabas));
    return Array.from(set).sort().reverse().map(fmtCiclo);
  }, [rows]);

  const aggRows = useMemo<Agg[]>(() => {
    const map = new Map<string, Agg & { codigos: Set<string> }>();
    for (const r of rows) {
      const key = r.GRUPO || "(sem grupo)";
      let cur = map.get(key);
      if (!cur) {
        cur = {
          grupo: key, rec_total: 0, vrdespesas: 0, saldo: 0, vidas: 0,
          internacao: 0, terapia: 0, exame: 0, consulta: 0, emergencia: 0, demais: 0,
          codigos: new Set<string>(),
        };
        map.set(key, cur);
      }
      cur.rec_total += r.rec_total;
      cur.vrdespesas += r.vrdespesas;
      cur.internacao += r.internacao;
      cur.terapia += r.terapia;
      cur.exame += r.exame;
      cur.consulta += r.consulta;
      cur.emergencia += r.emergencia;
      cur.demais += r.demais;
      const id = r.codigo || r.nmcli;
      if (id) cur.codigos.add(id);
    }
    return Array.from(map.values()).map((a) => ({
      ...a,
      saldo: a.rec_total - a.vrdespesas,
      vidas: a.codigos.size,
    }));
  }, [rows]);

  const children = useMemo<Record<string, ChildRow[]>>(() => {
    const byGrupo = new Map<string, Map<string, ChildRow & { codigos: Set<string> }>>();
    for (const r of rows) {
      const g = r.GRUPO || "(sem grupo)";
      let inner = byGrupo.get(g);
      if (!inner) { inner = new Map(); byGrupo.set(g, inner); }
      const cd = r.cdpln || "(sem plano)";
      let cur = inner.get(cd);
      if (!cur) {
        cur = {
          cdpln: r.dspln ? `${cd} · ${r.dspln}` : cd,
          vidas: 0, rec_total: 0, vrdespesas: 0, saldo: 0,
          internacao: 0, terapia: 0, exame: 0, consulta: 0, emergencia: 0, demais: 0,
          codigos: new Set<string>(),
        };
        inner.set(cd, cur);
      }
      cur.rec_total += r.rec_total;
      cur.vrdespesas += r.vrdespesas;
      cur.internacao += r.internacao;
      cur.terapia += r.terapia;
      cur.exame += r.exame;
      cur.consulta += r.consulta;
      cur.emergencia += r.emergencia;
      cur.demais += r.demais;
      const id = r.codigo || r.nmcli;
      if (id) cur.codigos.add(id);
    }
    const out: Record<string, ChildRow[]> = {};
    for (const [g, inner] of byGrupo.entries()) {
      out[g] = Array.from(inner.values())
        .map((c) => ({ ...c, vidas: c.codigos.size, saldo: c.rec_total - c.vrdespesas }))
        .sort((a, b) => b.saldo - a.saldo);
    }
    return out;
  }, [rows]);

  const loadingChild: Record<string, boolean> = {};



  const aggregated = useMemo<Agg[]>(() => {
    const t = debouncedQ.toLowerCase();
    if (!t) return aggRows;
    return aggRows.filter((a) => a.grupo.toLowerCase().includes(t));
  }, [aggRows, debouncedQ]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...aggregated].sort((a, b) => {
      if (sortKey === "GRUPO") return a.grupo.localeCompare(b.grupo, "pt-BR") * dir;
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
      setSortDir(k === "GRUPO" ? "asc" : "desc");
    }
  };

  const arrow = (k: SortKey) =>
    sortKey === k ? (
      sortDir === "asc" ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />
    ) : null;

  const toggle = (grupo: string) => {
    setExpanded((s) => ({ ...s, [grupo]: !s[grupo] }));
  };

  const inputCls =
    "h-9 w-24 px-2 rounded-md border border-border bg-background text-sm text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30";

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
            className={inputCls}
          />
          <span className="text-sm text-muted-foreground">até</span>
          <input
            type="text"
            inputMode="numeric"
            value={mFim}
            onChange={(e) => setMFim(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="202606"
            className={inputCls}
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
            placeholder="Buscar por nome ou código"
            className="h-9 w-72 pl-8 pr-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <span className="text-xs text-muted-foreground ml-auto">
          {sorted.length.toLocaleString("pt-BR")} grupos
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
                const isOpen = !!expanded[a.grupo];
                const kids = children[a.grupo];
                const isLoadingKids = !!loadingChild[a.grupo];
                return (
                  <Fragment key={a.grupo}>
                    <tr className={`border-b border-border/40 hover:bg-accent/30 ${isOpen ? "font-bold" : ""}`}>
                      <td className="px-2 py-1 truncate max-w-[320px]" title={a.grupo}>
                        <button
                          onClick={() => toggle(a.grupo)}
                          className="inline-flex items-center gap-1 hover:text-primary"
                        >
                          {isOpen ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                          <span>{a.grupo}</span>
                        </button>
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">{a.vidas.toLocaleString("pt-BR")}</td>
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
                    {isOpen && isLoadingKids && (
                      <tr className="bg-muted/20">
                        <td colSpan={6} className="px-8 py-2 text-muted-foreground">
                          <Loader2 className="inline h-3 w-3 animate-spin mr-2" />
                          Carregando planos...
                        </td>
                      </tr>
                    )}
                    {isOpen && !isLoadingKids && kids && kids.length === 0 && (
                      <tr className="bg-muted/20">
                        <td colSpan={6} className="px-8 py-2 text-muted-foreground">
                          Sem planos.
                        </td>
                      </tr>
                    )}
                    {isOpen && !isLoadingKids && kids && kids.map((c) => {
                      const csin = c.rec_total ? c.vrdespesas / c.rec_total : 0;
                      return (
                        <tr
                          key={`${a.grupo}::${c.cdpln}`}
                          className="border-b border-border/30 bg-muted/10"
                        >
                          <td className="px-2 py-1 pl-8 truncate max-w-[320px]" title={c.cdpln}>
                            {c.cdpln}
                          </td>
                          <td className="px-2 py-1 text-right tabular-nums">{c.vidas.toLocaleString("pt-BR")}</td>
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
                                  <div className="text-xs font-semibold mb-1.5 border-b border-border pb-1">
                                    {c.cdpln}
                                  </div>
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
