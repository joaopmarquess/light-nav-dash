import { Fragment, useEffect, useMemo, useState } from "react";
import { fetchISinRows, type ISinRow } from "@/lib/isinistralidadeData";
import { useSinPeriodo, fullRange, periodoLabelOf, sortPeriodos } from "@/lib/sinistralidadePeriodoStore";
import { Search, ChevronRight, ChevronDown } from "lucide-react";
import FunLoader from "@/components/FunLoader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Mode = "grupo" | "regional" | "periodo";

const MODES: { key: Mode; label: string; hint: string }[] = [
  { key: "grupo", label: "Por Grupo", hint: "Período › Grupo › Plano (dspln) › cdpln › Beneficiário" },
  { key: "regional", label: "Por Regional", hint: "Período › Regional › Cidade/UF › Plano (dspln) › cdpln › Beneficiário" },
  { key: "periodo", label: "Apenas por Período", hint: "Período › Plano (dspln) › cdpln › Beneficiário" },
];

const LEVELS: Record<Mode, ((r: ISinRow) => string)[]> = {
  grupo: [
    (r) => r.GRUPO,
    (r) => r.dspln,
    (r) => r.cdpln,
    (r) => `${r.nmcli} (${r.codigo})`,
  ],
  regional: [
    (r) => r.REGIONAL,
    (r) => r.CIDADE,
    (r) => r.dspln,
    (r) => r.cdpln,
    (r) => `${r.nmcli} (${r.codigo})`,
  ],
  periodo: [
    (r) => r.dspln,
    (r) => r.cdpln,
    (r) => `${r.nmcli} (${r.codigo})`,
  ],
};

type Node = {
  key: string;
  label: string;
  depth: number;
  rec_total: number;
  vrdespesas: number;
  internacao: number;
  terapia: number;
  exame: number;
  consulta: number;
  emergencia: number;
  demais: number;
  vidas: Set<string>;
  children: Map<string, Node>;
};

const newNode = (key: string, label: string, depth: number): Node => ({
  key, label, depth,
  rec_total: 0, vrdespesas: 0, internacao: 0, terapia: 0, exame: 0,
  consulta: 0, emergencia: 0, demais: 0,
  vidas: new Set<string>(), children: new Map(),
});

const acc = (n: Node, r: ISinRow) => {
  n.rec_total += r.rec_total; n.vrdespesas += r.vrdespesas;
  n.internacao += r.internacao; n.terapia += r.terapia; n.exame += r.exame;
  n.consulta += r.consulta; n.emergencia += r.emergencia; n.demais += r.demais;
  const nm = r.codigo || r.nmcli;
  if (nm) n.vidas.add(nm);
};

const fmtNum = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n: number) =>
  Number.isFinite(n)
    ? `${(n * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
    : "-";
const fmtShare = (v: number, total: number) =>
  !total ? "0,00%" : `${((v / total) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

export default function SinistralidadeConsultaNiveis() {
  const cfg = useSinPeriodo();
  const [mode, setMode] = useState<Mode>("grupo");
  const [rows, setRows] = useState<ISinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!cfg) return;
    let alive = true;
    setLoading(true);
    const { mIni, mFim } = fullRange(cfg);
    (async () => {
      const data = await fetchISinRows(mIni, mFim);
      if (!alive) return;
      setRows(data);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [cfg?.baseFim, cfg?.meses]);

  useEffect(() => setExpanded({}), [mode]);

  const tree = useMemo<Node[]>(() => {
    if (!cfg) return [];
    const roots = new Map<string, Node>();
    const getters = LEVELS[mode];
    for (const r of rows) {
      const per = periodoLabelOf(r.mabas, cfg);
      if (!per) continue;
      let node = roots.get(per);
      if (!node) { node = newNode(per, per, 0); roots.set(per, node); }
      acc(node, r);
      let parent = node;
      for (let i = 0; i < getters.length; i++) {
        const label = getters[i](r) || "(sem informação)";
        const key = `${parent.key}||${label}`;
        let child = parent.children.get(key);
        if (!child) { child = newNode(key, label, i + 1); parent.children.set(key, child); }
        acc(child, r);
        parent = child;
      }
    }
    const order = sortPeriodos(Array.from(roots.keys()), cfg);
    return order.map((k) => roots.get(k)!);
  }, [rows, cfg, mode]);

  const matches = (n: Node): boolean => {
    if (!debouncedQ) return true;
    if (n.label.toLowerCase().includes(debouncedQ)) return true;
    for (const c of n.children.values()) if (matches(c)) return true;
    return false;
  };

  const toggle = (k: string) => setExpanded((s) => ({ ...s, [k]: !s[k] }));

  const totals = useMemo(() => {
    let rec = 0, desp = 0, vid = 0;
    for (const n of tree) {
      if (!matches(n)) continue;
      rec += n.rec_total; desp += n.vrdespesas; vid += n.vidas.size;
    }
    return { rec, desp, sal: rec - desp, vid, sin: rec ? desp / rec : 0 };
  }, [tree, debouncedQ]);

  const despesaTooltip = (n: Node) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-2">
          {fmtNum(n.vrdespesas)}
        </span>
      </TooltipTrigger>
      <TooltipContent side="left" className="p-0">
        <div className="min-w-[220px] p-2">
          <div className="text-xs font-semibold mb-1.5 border-b border-border pb-1">{n.label}</div>
          <table className="text-[11px] w-full">
            <tbody>
              {([["Internação", n.internacao], ["Terapia", n.terapia], ["Exame", n.exame],
                 ["Consulta", n.consulta], ["Emergência", n.emergencia], ["Demais", n.demais]] as [string, number][])
                .map(([lb, v]) => (
                  <tr key={lb}>
                    <td className="pr-3 py-0.5">{lb}</td>
                    <td className="text-right tabular-nums">
                      {fmtNum(v)} <span className="text-muted-foreground">({fmtShare(v, n.vrdespesas)})</span>
                    </td>
                  </tr>
                ))}
              <tr className="border-t border-border font-semibold">
                <td className="pr-3 pt-1">Total</td>
                <td className="text-right tabular-nums pt-1">{fmtNum(n.vrdespesas)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </TooltipContent>
    </Tooltip>
  );

  const renderNode = (n: Node): JSX.Element | null => {
    if (!matches(n)) return null;
    const isOpen = !!expanded[n.key];
    const hasKids = n.children.size > 0;
    const sin = n.rec_total ? n.vrdespesas / n.rec_total : 0;
    const kids = isOpen
      ? Array.from(n.children.values()).sort((a, b) => b.vrdespesas - a.vrdespesas)
      : [];
    return (
      <Fragment key={n.key}>
        <tr className={`border-b border-border/40 hover:bg-accent/30 ${n.depth === 0 ? "font-semibold" : ""} ${n.depth > 1 ? "bg-muted/10" : ""}`}>
          <td className="px-2 py-1 truncate max-w-[420px]" title={n.label} style={{ paddingLeft: 8 + n.depth * 16 }}>
            {hasKids ? (
              <button onClick={() => toggle(n.key)} className="inline-flex items-center gap-1 hover:text-primary text-left">
                {isOpen ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                <span>{n.label}</span>
              </button>
            ) : (
              <span className="pl-4">{n.label}</span>
            )}
          </td>
          <td className="px-2 py-1 text-right tabular-nums">{n.vidas.size.toLocaleString("pt-BR")}</td>
          <td className="px-2 py-1 text-right tabular-nums">{fmtNum(n.rec_total)}</td>
          <td className="px-2 py-1 text-right tabular-nums">{despesaTooltip(n)}</td>
          <td className="px-2 py-1 text-right tabular-nums">{fmtNum(n.rec_total - n.vrdespesas)}</td>
          <td className="px-2 py-1 text-right tabular-nums">{fmtPct(sin)}</td>
        </tr>
        {kids.map((c) => renderNode(c))}
      </Fragment>
    );
  };

  return (
    <TooltipProvider delayDuration={100}>
      <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 p-3 border-b border-border flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Níveis</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              className="h-9 px-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {MODES.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>

          <span className="text-xs text-muted-foreground">
            {MODES.find((m) => m.key === mode)?.hint}
          </span>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar em qualquer nível"
              className="h-9 w-64 pl-8 pr-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <span className="text-xs text-muted-foreground ml-auto">
            {tree.length.toLocaleString("pt-BR")} períodos
          </span>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="h-full flex items-center justify-center"><FunLoader /></div>
          ) : tree.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem dados.</div>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border">
                  <th className="px-2 py-1.5 text-left font-semibold">PERÍODO / NÍVEIS</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Vidas</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Total Receita</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Total Despesa</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Saldo</th>
                  <th className="px-2 py-1.5 text-right font-semibold">SIN.</th>
                </tr>
              </thead>
              <tbody>{tree.map((n) => renderNode(n))}</tbody>
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
