import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";

type Row = { g1: string; g2: string; g3: string; g4: string; valor: number; mes: number };

const MONTHS = [
  { n: 1, label: "Jan/26" },
  { n: 2, label: "Fev/26" },
  { n: 3, label: "Mar/26" },
  { n: 4, label: "Abr/26" },
];

const fmt = (v: number) => {
  if (Math.abs(v) < 0.005) return "-";
  const s = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(v));
  return v < 0 ? `(${s})` : s;
};

const stripPrefix = (s: string) => s.replace(/^\d+\|/, "");

type Node = {
  key: string;
  label: string;
  level: number;
  values: Record<number, number>;
  total: number;
  children: Node[];
};

function ensure(map: Map<string, Node>, key: string, label: string, level: number, parentChildren: Node[]): Node {
  let n = map.get(key);
  if (!n) {
    n = { key, label, level, values: {}, total: 0, children: [] };
    map.set(key, n);
    parentChildren.push(n);
  }
  return n;
}

function addValue(n: Node, mes: number, v: number) {
  n.values[mes] = (n.values[mes] ?? 0) + v;
  n.total += v;
}

const DRE = () => {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/data/dre.json")
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  const tree = useMemo<Node[]>(() => {
    if (!rows) return [];
    const roots: Node[] = [];
    const m1 = new Map<string, Node>();
    for (const r of rows) {
      const k1 = r.g1;
      const n1 = ensure(m1, k1, stripPrefix(r.g1), 0, roots);
      const k2 = `${k1}>${r.g2}`;
      const m2key = `m2:${k1}`;
      const m2 = (n1 as any)._m ?? ((n1 as any)._m = new Map<string, Node>());
      const n2 = ensure(m2, k2, stripPrefix(r.g2), 1, n1.children);
      const k3 = `${k2}>${r.g3}`;
      const m3 = (n2 as any)._m ?? ((n2 as any)._m = new Map<string, Node>());
      const n3 = ensure(m3, k3, stripPrefix(r.g3), 2, n2.children);

      if (r.g4) {
        const k4 = `${k3}>${r.g4}`;
        const m4 = (n3 as any)._m ?? ((n3 as any)._m = new Map<string, Node>());
        const n4 = ensure(m4, k4, stripPrefix(r.g4), 3, n3.children);
        addValue(n4, r.mes, r.valor);
      }
      addValue(n3, r.mes, r.valor);
      addValue(n2, r.mes, r.valor);
      addValue(n1, r.mes, r.valor);
      void m2key;
    }
    // sort by original numeric prefix already in key ordering
    const sortRec = (nodes: Node[]) => {
      nodes.sort((a, b) => a.key.localeCompare(b.key, "pt-BR", { numeric: true }));
      nodes.forEach((n) => sortRec(n.children));
    };
    sortRec(roots);
    return roots;
  }, [rows]);

  // Auto-open level 0 on first load
  useEffect(() => {
    if (tree.length) {
      const init: Record<string, boolean> = {};
      tree.forEach((n) => (init[n.key] = true));
      setOpen((p) => ({ ...init, ...p }));
    }
  }, [tree]);

  const grandTotalByMes: Record<number, number> = {};
  let grandTotal = 0;
  tree.forEach((n) => {
    MONTHS.forEach((m) => (grandTotalByMes[m.n] = (grandTotalByMes[m.n] ?? 0) + (n.values[m.n] ?? 0)));
    grandTotal += n.total;
  });

  const rowsOut: { node: Node; visible: boolean }[] = [];
  const walk = (nodes: Node[], parentOpen: boolean) => {
    for (const n of nodes) {
      rowsOut.push({ node: n, visible: parentOpen });
      const isOpen = !!open[n.key];
      if (n.children.length) walk(n.children, parentOpen && isOpen);
    }
  };
  walk(tree, true);

  const toggle = (k: string) => setOpen((p) => ({ ...p, [k]: !p[k] }));

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Demonstrativo de Resultado (DRE)</h2>
          <p className="text-xs text-muted-foreground">Janeiro a Abril de 2026 — valores em R$</p>
        </div>
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => {
              const all: Record<string, boolean> = {};
              const collect = (ns: Node[]) => ns.forEach((n) => { all[n.key] = true; collect(n.children); });
              collect(tree);
              setOpen(all);
            }}
            className="px-3 py-1.5 rounded-md border border-border hover:bg-accent hover:text-primary"
          >
            Expandir tudo
          </button>
          <button
            onClick={() => setOpen({})}
            className="px-3 py-1.5 rounded-md border border-border hover:bg-accent hover:text-primary"
          >
            Recolher tudo
          </button>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-6 py-3 sticky left-0 bg-muted/50">Conta</th>
              {MONTHS.map((m) => (
                <th key={m.n} className="text-right font-medium px-4 py-3 whitespace-nowrap">{m.label}</th>
              ))}
              <th className="text-right font-medium px-6 py-3 whitespace-nowrap">Total</th>
            </tr>
          </thead>
          <tbody>
            {rowsOut.filter((r) => r.visible).map(({ node }) => {
              const hasChildren = node.children.length > 0;
              const isOpen = !!open[node.key];
              const isTopLevel = node.level === 0;
              const isLeaf = node.level === 3;
              const neg = node.total < 0;
              return (
                <tr
                  key={node.key}
                  className={`border-t border-border ${isTopLevel ? "bg-accent/40 font-semibold" : node.level === 1 ? "bg-muted/20 font-medium" : ""} hover:bg-accent/30`}
                >
                  <td
                    className="px-6 py-2 sticky left-0 bg-inherit"
                    style={{ paddingLeft: 16 + node.level * 20 }}
                  >
                    <div className="flex items-center gap-1.5">
                      {hasChildren ? (
                        <button
                          onClick={() => toggle(node.key)}
                          className="h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-primary"
                          aria-label={isOpen ? "Recolher" : "Expandir"}
                        >
                          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                        </button>
                      ) : (
                        <span className="h-4 w-4 inline-block" />
                      )}
                      <span className={isLeaf ? "text-foreground/80" : ""}>{node.label}</span>
                    </div>
                  </td>
                  {MONTHS.map((m) => {
                    const v = node.values[m.n] ?? 0;
                    return (
                      <td key={m.n} className={`px-4 py-2 text-right tabular-nums ${v < 0 ? "text-destructive" : "text-foreground"}`}>
                        {fmt(v)}
                      </td>
                    );
                  })}
                  <td className={`px-6 py-2 text-right tabular-nums font-medium ${neg ? "text-destructive" : "text-foreground"}`}>
                    {fmt(node.total)}
                  </td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-border bg-primary/5 font-semibold">
              <td className="px-6 py-3 sticky left-0 bg-primary/5">Resultado do Período</td>
              {MONTHS.map((m) => {
                const v = grandTotalByMes[m.n] ?? 0;
                return (
                  <td key={m.n} className={`px-4 py-3 text-right tabular-nums ${v < 0 ? "text-destructive" : "text-foreground"}`}>
                    {fmt(v)}
                  </td>
                );
              })}
              <td className={`px-6 py-3 text-right tabular-nums ${grandTotal < 0 ? "text-destructive" : "text-foreground"}`}>
                {fmt(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default DRE;
