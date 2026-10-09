import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { loadDreHostinger, type DreHRow } from "@/control/dreHostinger";

// DRE (Trial): reconstruído do zero, só com o balancete MV + plano 9D (ver src/lib/dreHostinger.ts).
const ANO = 2026;
const NOMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
type Col = { label: string; meses: number[]; kind: "mes" | "ano" };
// Até Ago/2026, sem subtotais de trimestre; última coluna = total Jan–Ago
const ULTIMO_MES = 8;
const ATE = Array.from({ length: ULTIMO_MES }, (_, i) => i + 1);
const COLS: Col[] = [
  ...ATE.map((m): Col => ({ label: `${NOMES[m - 1]}/${ANO}`, meses: [m], kind: "mes" })),
  { label: `Jan–Ago/${ANO}`, meses: ATE, kind: "ano" },
];
const colCls = (c: Col) => (c.kind === "ano" ? "bg-accent font-bold" : "");
const novo = () => COLS.map(() => 0);
const somar = (arr: number[], r: DreHRow) => COLS.forEach((c, i) => { if (c.meses.includes(r.mes)) arr[i] += r.valor; });

type Node = { key: string; label: string; valores: number[]; children: Node[] };

const strip = (s: string) => s.replace(/^\d+\|/, "").replace(/custas judiciais/i, "DESPESAS JUDICIAIS");
const fmt = (v: number) => {
  const s = Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v < 0 ? `(${s})` : s;
};

function buildTree(rows: DreHRow[]): Node[] {
  const roots: Node[] = [];
  const map = new Map<string, Node>();
  for (const r of rows) {
    let list = roots;
    let path = "";
    for (const g of [r.g1, r.g2, r.g3, r.g4]) {
      if (!g) break;
      path += "~" + g;
      let n = map.get(path);
      if (!n) {
        n = { key: path, label: strip(g), valores: novo(), children: [] };
        map.set(path, n);
        list.push(n);
        list.sort((a, b) => a.key.localeCompare(b.key, "pt-BR", { numeric: true }));
      }
      somar(n.valores, r);
      list = n.children;
    }
  }
  return roots;
}

function itemDe(r: DreHRow): string | null {
  if (/FINANCEIRO/i.test(r.g1)) return "fin";
  if (/PRINCIPAL/i.test(r.g3)) return /FATUR|COPART/i.test(r.g4) ? "ent" : "desp";
  if (/SECUND|COMERCIAL|IMPOSTOS DIRETOS|PROVIS/i.test(r.g3)) return "demais";
  if (/ADMINISTRATIVO/i.test(r.g2)) return "adm";
  return null; // demais linhas (Impostos Federais)
}
const pctFmt = (v: number) => `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v)}%`;

const Barra = ({ ativa, onAba }: { ativa: "Painel" | "DRE"; onAba?: (a: "Painel" | "DRE") => void }) =>
  onAba ? (
    <div className="sticky bottom-0 z-20 shrink-0 bg-background py-4 flex justify-center">
      <div className="inline-flex gap-0.5 rounded-full bg-card/90 backdrop-blur p-1.5 border border-border shadow-[0_0_16px_2px_hsl(var(--foreground)/0.18)]">
        {(["Painel", "DRE"] as const).map((a) => (
          <button key={a} onClick={() => a !== ativa && onAba(a)}
            className={`rounded-full px-3 py-1 text-[13px] font-medium transition-all duration-200 ${a === ativa ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" : "text-foreground/70 hover:text-primary hover:bg-card hover:shadow-sm hover:-translate-y-0.5"}`}>{a}</button>
        ))}
      </div>
    </div>
  ) : null;

const DRETrial = ({ painel = false, onAba }: { painel?: boolean; onAba?: (a: "Painel" | "DRE") => void } = {}) => {
  const [rows, setRows] = useState<DreHRow[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadDreHostinger(ANO, ATE).then(setRows).catch((e) => { setErro(e?.message || String(e)); setRows([]); });
  }, []);

  const tree = useMemo(() => buildTree(rows || []), [rows]);
  useEffect(() => {
    const o: Record<string, boolean> = {};
    const walk = (ns: Node[]) => ns.forEach((n) => {
      if (n.children.length && !/ADMINISTRATIVO|FINANCEIRO/i.test(n.label)) { o[n.key] = true; walk(n.children); }
    });
    walk(tree);
    setOpen(o);
  }, [tree]);
  const total = useMemo(() => { const t = novo(); for (const r of rows || []) somar(t, r); return t; }, [rows]);

  const render = (nodes: Node[], depth: number): JSX.Element[] =>
    nodes.flatMap((n) => {
      const has = n.children.length > 0;
      const isOpen = open[n.key];
      return [
        <tr key={n.key} className={`border-b border-border ${depth === 0 ? "bg-accent/50 font-semibold" : ""}`}>
          <td className="py-2 pr-4 whitespace-nowrap sticky left-0 bg-card" style={{ paddingLeft: `${0.75 + depth * 1.25}rem` }}>
            <button type="button" disabled={!has} onClick={() => setOpen((p) => ({ ...p, [n.key]: !p[n.key] }))}
              className="flex items-center gap-1.5 text-left text-foreground disabled:cursor-default">
              <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${has ? "" : "invisible"} ${isOpen ? "rotate-90" : ""}`} />
              {n.label}
            </button>
          </td>
          {n.valores.map((v, i) => (
            <td key={i} className={`py-2 px-4 text-right tabular-nums whitespace-nowrap ${colCls(COLS[i])} ${depth === 0 && v < 0 ? "text-destructive" : "text-foreground"}`}>{fmt(v)}</td>
          ))}
        </tr>,
        ...(has && isOpen ? render(n.children, depth + 1) : []),
      ];
    });

  if (painel) {
    if (!rows) return <section className="bg-card rounded-xl border border-border p-6 text-sm text-muted-foreground">Carregando…</section>;
    const b: Record<string, number> = { ent: 0, desp: 0, demais: 0, adm: 0, fin: 0, imp: 0 };
    let fat = 0;
    for (const r of rows) {
      const k = itemDe(r) ?? "imp";
      b[k] += r.valor;
      if (k === "ent" && /FATUR/i.test(r.g4)) fat += r.valor;
    }
    const prim = b.ent + b.desp, tot = prim + b.demais, ebitda = tot + b.adm, rai = ebitda + b.fin, liq = rai + b.imp;
    const pf = (x: number) => (fat ? pctFmt((x / fat) * 100) : "-");
    const cards: [string, number, string, boolean?][] = [
      ["Operacionais Primários", prim, "Entradas − Despesas Assistenciais"],
      ["Operacionais Secundários", b.demais, "Demais operacionais"],
      ["Operacionais Totais", tot, "Primários + Secundários"],
      ["EBITDA", ebitda, "Operacionais Totais + Despesas Administrativas"],
      ["Financeiro", b.fin, "Resultado financeiro"],
      ["Resultado antes dos Impostos", rai, "EBITDA + Financeiro"],
      ["Impostos Federais", b.imp, "Lançados no balancete", true],
    ];
    const linhas: [string, number, 0 | 1 | 2][] = [
      ["Entradas Operacionais", b.ent, 0],
      ["(−) Despesas Assistenciais", b.desp, 0],
      ["(−) Demais Operacionais", b.demais, 0],
      ["(=) Operacionais Totais", tot, 1],
      ["(−) Despesas Administrativas", b.adm, 0],
      ["(=) EBITDA", ebitda, 1],
      ["(+) Financeiro", b.fin, 0],
      ["(=) Resultado antes dos Impostos", rai, 1],
      ["(−) Impostos Federais", b.imp, 0],
      ["(=) Resultado Líquido", liq, 2],
    ];
    return (
      <div className="flex flex-col gap-3 h-[calc(100vh-9rem)] overflow-y-auto">
        <div className="rounded-xl bg-primary text-primary-foreground shadow-md px-4 py-1.5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-80">Resultado Líquido Jan–Ago/{ANO}</div>
            <div className="text-xl font-bold tabular-nums leading-tight">R$ {fmt(liq)}</div>
          </div>
          <div className="text-right text-xs leading-tight">
            <div><span className="opacity-80">Margem líquida </span><span className="text-base font-semibold tabular-nums">{pf(liq)}</span></div>
            <div className="opacity-80">Faturamento R$ {fmt(fat)} · Realizado do balancete</div>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {cards.map(([t, x, h, naoRes]) => (
            <div key={t} title={h} className="rounded-xl border border-border bg-card overflow-hidden cursor-help hover:shadow-md transition-shadow">
              <div className={`h-1 ${x < 0 ? "bg-destructive" : "bg-primary"}`} />
              <div className="px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-tight min-h-[1.6rem]">{t}</div>
                <div className={`text-base font-bold tabular-nums ${x < 0 && !naoRes ? "text-destructive" : "text-foreground"}`}>R$ {fmt(x)}</div>
                <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${x < 0 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${Math.min(100, fat ? Math.abs(x / fat) * 100 : 0)}%` }} />
                </div>
                <div className="text-[10px] text-muted-foreground">{pf(x)} do faturamento</div>
              </div>
            </div>
          ))}
        </div>
        <section className="rounded-2xl border border-border bg-card shadow-sm px-3 py-2 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-semibold text-foreground">DRE simplificado Jan–Ago/{ANO}</h3>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">R$ · % fat.</span>
          </div>
          <div className="flex-1 flex flex-col justify-between gap-0.5">
            {linhas.map(([t, x, k]) => (
              <div key={t} className={`flex items-center justify-between rounded-lg border px-3 py-1 text-[17px] ${k === 2 ? "border-primary bg-primary text-primary-foreground font-bold" : k === 1 ? "border-primary/20 bg-primary/10 font-semibold text-foreground" : "border-border/60 text-foreground"}`}>
                <span>{t}</span>
                <span className="flex gap-6 tabular-nums">
                  <span className={k === 1 && x < 0 ? "text-destructive" : ""}>{fmt(x)}</span>
                  <span className={`w-20 text-right ${k === 2 ? "" : "text-muted-foreground"}`}>{pf(x)}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
        <Barra ativa="Painel" onAba={onAba} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] min-h-0">
    <section className="bg-card rounded-xl border border-border shadow-sm flex-1 flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-auto">
        {!rows ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
        ) : erro ? (
          <div className="p-6 text-sm text-destructive">Erro ao carregar: {erro}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 px-4 text-left font-medium">Item</th>
                {COLS.map((c) => (
                  <th key={c.label} className={`py-2 px-4 text-right font-medium whitespace-nowrap ${c.kind === "ano" ? "bg-accent/40 text-foreground" : ""}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {render(tree, 0)}
              <tr className="bg-accent font-bold">
                <td className="py-2.5 px-4">RESULTADO</td>
                {total.map((v, i) => (
                  <td key={i} className={`py-2.5 px-4 text-right tabular-nums whitespace-nowrap ${v < 0 ? "text-destructive" : "text-foreground"}`}>{fmt(v)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </section>
    <Barra ativa="DRE" onAba={onAba} />
    </div>
  );
};

export default DRETrial;
