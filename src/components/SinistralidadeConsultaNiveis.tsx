import { Fragment, useEffect, useMemo, useState } from "react";
import { fetchISinRows, type ISinRow } from "@/lib/isinistralidadeData";
import { useSinPeriodo, fullRange, periodoLabelOf, sortPeriodos } from "@/lib/sinistralidadePeriodoStore";
import { Search, ChevronRight, ChevronDown, X } from "lucide-react";
import FunLoader from "@/components/FunLoader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type DimKey = "periodo" | "regional" | "grupo" | "cidade" | "dspln" | "cdpln" | "beneficiario";

const DIMS: { key: DimKey; label: string; get: (r: ISinRow) => string }[] = [
  { key: "periodo", label: "Período", get: () => "" },
  { key: "regional", label: "Regional", get: (r) => r.REGIONAL },
  { key: "grupo", label: "Grupo", get: (r) => r.GRUPO },
  { key: "cidade", label: "Cidade/UF", get: (r) => r.CIDADE },
  { key: "dspln", label: "Plano (dspln)", get: (r) => r.dspln },
  { key: "cdpln", label: "cdpln", get: (r) => r.cdpln },
  { key: "beneficiario", label: "Beneficiário", get: (r) => `${r.nmcli} (${r.codigo})` },
];

const dimOf = (k: DimKey) => DIMS.find((d) => d.key === k)!;

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
  const periodos = cfg?.periodos ?? [];
  const [periodo, setPeriodo] = useState<string>("__all__");
  const sel = periodos.find((p) => p.label === periodo);

  const [levels, setLevels] = useState<DimKey[]>([
    "periodo", "regional", "grupo", "dspln", "cdpln", "beneficiario",
  ]);
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
    setExpanded({});
    const range = sel ? { mIni: sel.mIni, mFim: sel.mFim } : fullRange(cfg);
    (async () => {
      const data = await fetchISinRows(range.mIni, range.mFim);
      if (!alive) return;
      setRows(data);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [cfg?.baseFim, cfg?.meses, sel?.mIni, sel?.mFim]);

  useEffect(() => setExpanded({}), [levels]);

  const addLevel = (k: DimKey) => setLevels((s) => (s.includes(k) ? s : [...s, k]));
  const removeLevel = (k: DimKey) => setLevels((s) => s.filter((x) => x !== k));

  const tree = useMemo<Node[]>(() => {
    if (!cfg || levels.length === 0) return [];
    const roots = new Map<string, Node>();
    for (const r of rows) {
      const per = periodoLabelOf(r.mabas, cfg);
      if (!per) continue;
      let parent: Node | null = null;
      for (let i = 0; i < levels.length; i++) {
        const dim = dimOf(levels[i]);
        const label = (levels[i] === "periodo" ? per : dim.get(r)) || "(sem informação)";
        if (i === 0) {
          let node = roots.get(label);
          if (!node) { node = newNode(label, label, 0); roots.set(label, node); }
          acc(node, r);
          parent = node;
        } else {
          const key = `${parent!.key}||${label}`;
          let child = parent!.children.get(key);
          if (!child) { child = newNode(key, label, i); parent!.children.set(key, child); }
          acc(child, r);
          parent = child;
        }
      }
    }
    const keys = Array.from(roots.keys());
    const order = levels[0] === "periodo" ? sortPeriodos(keys, cfg) : keys.sort();
    return order.map((k) => roots.get(k)!);
  }, [rows, cfg, levels]);

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

  const disponiveis = DIMS.filter((d) => !levels.includes(d.key));

  return (
    <TooltipProvider delayDuration={100}>
      <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col overflow-hidden">
        <div className="flex items-start gap-4 p-3 border-b border-border flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Período</label>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="h-9 px-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="__all__">Todos os períodos</option>
              {periodos.map((p) => (
                <option key={p.idx} value={p.label}>Período {p.idx} — {p.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[320px]">
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Agrupar por</label>
            <div className="min-h-9 flex items-center gap-1.5 flex-wrap px-2 py-1 rounded-md border border-border bg-background">
              {levels.map((k, i) => (
                <span key={k} className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded bg-muted text-xs text-foreground">
                  <span className="text-muted-foreground">{i + 1})</span> {dimOf(k).label}
                  <button onClick={() => removeLevel(k)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {disponiveis.length > 0 && (
                <select
                  value=""
                  onChange={(e) => e.target.value && addLevel(e.target.value as DimKey)}
                  className="h-6 text-xs bg-transparent text-muted-foreground focus:outline-none"
                >
                  <option value="">+ nível</option>
                  {disponiveis.map((d) => (
                    <option key={d.key} value={d.key}>{d.label}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Filtrar</label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filtrar por nome, agente, plano..."
                className="h-9 w-64 pl-8 pr-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <span className="text-xs text-muted-foreground ml-auto self-end pb-2">
            {tree.length.toLocaleString("pt-BR")} linhas no nível 1
          </span>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="h-full flex items-center justify-center"><FunLoader /></div>
          ) : tree.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              {levels.length === 0 ? "Escolha ao menos um nível em Agrupar por." : "Sem dados."}
            </div>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border">
                  <th className="px-2 py-1.5 text-left font-semibold">
                    {levels.map((k) => dimOf(k).label).join(" › ").toUpperCase()}
                  </th>
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
