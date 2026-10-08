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

const DRETrial = () => {
  const [rows, setRows] = useState<DreHRow[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadDreHostinger(ANO, ATE).then(setRows).catch((e) => { setErro(e?.message || String(e)); setRows([]); });
  }, []);

  const tree = useMemo(() => buildTree(rows || []), [rows]);
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

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-full flex flex-col min-h-0">
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
  );
};

export default DRETrial;
