import { Fragment, useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
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
  if (!total) return "0%";
  return `${Math.round((v / total) * 100)}%`;
};

export default function SinistralidadeNova({ mode: _mode }: Props) {
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState<string>("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [aggRows, setAggRows] = useState<Agg[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("SALDO");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [children, setChildren] = useState<Record<string, ChildRow[]>>({});
  const [loadingChild, setLoadingChild] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data, error } = await hostinger.rpc("sin_periodos");
      if (!alive) return;
      if (error) {
        console.error("PERIODO load error", error);
        setPeriodos([]);
      } else {
        const uniq = Array.from(
          new Set(
            ((data ?? []) as any[])
              .map((r) => String(r.periodo ?? r.PERIODO ?? ""))
              .filter(Boolean),
          ),
        );
        uniq.sort().reverse();
        setPeriodos(uniq);
        setPeriodo(uniq[0] ?? "");
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!periodo) return;
    let alive = true;
    setLoadingRows(true);
    setExpanded({});
    setChildren({});
    (async () => {
      const { data, error } = await hostinger.rpc("sin_por_grupo", {
        p_periodo: periodo,
      });
      if (!alive) return;
      if (error) {
        console.error("sin_por_grupo error", error);
        setAggRows([]);
      } else {
        const mapped: Agg[] = ((data ?? []) as any[]).map((r) => ({
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
        setAggRows(mapped);
      }
      setLoadingRows(false);
    })();
    return () => {
      alive = false;
    };
  }, [periodo]);

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

  const loadChildren = async (grupo: string) => {
    if (children[grupo] || loadingChild[grupo]) return;
    setLoadingChild((s) => ({ ...s, [grupo]: true }));
    const chunk = 1000;
    let from = 0;
    const map = new Map<string, { rec_total: number; vrdespesas: number; internacao: number; terapia: number; exame: number; consulta: number; emergencia: number; demais: number; nmclis: Set<string> }>();
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
        const cur = map.get(cd) ?? { rec_total: 0, vrdespesas: 0, internacao: 0, terapia: 0, exame: 0, consulta: 0, emergencia: 0, demais: 0, nmclis: new Set<string>() };
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

    setChildren((s) => ({ ...s, [grupo]: arr }));
    setLoadingChild((s) => ({ ...s, [grupo]: false }));
  };

  const toggle = (grupo: string) => {
    setExpanded((s) => {
      const next = { ...s, [grupo]: !s[grupo] };
      if (next[grupo]) void loadChildren(grupo);
      return next;
    });
  };

  return (
    <TooltipProvider delayDuration={100}>
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 p-3 border-b border-border flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Período</label>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            disabled={loading}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
          >
            {loading && <option>Carregando...</option>}
            {!loading && periodos.length === 0 && <option value="">—</option>}
            {periodos.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
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
