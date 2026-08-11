import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Row = { g1: string; g2: string; g3: string; g4: string; valor: number; mes: number; ano: number; tri: number };

const MES_LABEL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const fmt = (v: number) => {
  if (Math.abs(v) < 0.005) return "-";
  const s = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(v));
  return v < 0 ? `(${s})` : s;
};

const ACRONYMS = ["EBITDA", "TI"];
const toSentence = (s: string) => {
  if (!s) return s;
  let r = s.toLowerCase();
  r = r.charAt(0).toUpperCase() + r.slice(1);
  for (const a of ACRONYMS) r = r.replace(new RegExp(`\\b${a.toLowerCase()}\\b`, "gi"), a);
  return r;
};
const stripPrefix = (s: string) => toSentence((s || "").replace(/^\d+\|/, ""));

type Node = {
  key: string;
  label: string;
  level: number;
  values: Record<string, number>;
  children: Node[];
};

type Col = {
  key: string;
  label: string;
  kind: "ano" | "tri" | "mes";
  cells: string[]; // "ano-mes" keys
  toggleKey?: string;
  open?: boolean;
  isGroupEdge?: boolean;
};

const cellKey = (ano: number, mes: number) => `${ano}-${mes}`;

function ensure(map: Map<string, Node>, key: string, label: string, level: number, parentChildren: Node[]): Node {
  let n = map.get(key);
  if (!n) {
    n = { key, label, level, values: {}, children: [] };
    map.set(key, n);
    parentChildren.push(n);
  }
  return n;
}

function addValue(n: Node, k: string, v: number) {
  n.values[k] = (n.values[k] ?? 0) + v;
}

const sumCells = (n: Node, cells: string[]) => cells.reduce((a, c) => a + (n.values[c] ?? 0), 0);

const DREGerencialPE = () => {
  const [allRows, setAllRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [openCols, setOpenCols] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [ano, setAno] = useState<number | "todos">("todos");

  useEffect(() => {
    (async () => {
      try {
        const PAGE = 1000;
        let from = 0;
        const data: any[] = [];
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data: chunk, error } = await supabase
            .from("dre_gerencial_2t2026")
            .select("nr_ano,nr_mes,nr_trimestre,g1,g2,g3,g4,valor")
            .range(from, from + PAGE - 1);
          if (error) throw error;
          const arr = (chunk || []) as any[];
          data.push(...arr);
          if (arr.length < PAGE) break;
          from += PAGE;
        }
        const parsed: Row[] = data
          .filter((r) => r.g1)
          .map((r) => {
            const mes = Number(r.nr_mes) || 0;
            return {
              ano: Number(r.nr_ano) || 0,
              mes,
              tri: Number(r.nr_trimestre) || Math.ceil(mes / 3),
              g1: r.g1 || "",
              g2: r.g2 || "",
              g3: r.g3 || "",
              g4: r.g4 || "",
              valor: Number(r.valor) || 0,
            };
          });
        setAllRows(parsed);
      } catch (e: any) {
        setError(e?.message || String(e));
        setAllRows([]);
      }
    })();
  }, []);

  const anos = useMemo(
    () => Array.from(new Set((allRows || []).map((r) => r.ano))).sort((a, b) => a - b),
    [allRows]
  );

const FIXED_YEARS = [2025, 2024];

  /** linhas usadas nas colunas hierárquicas (exclui os anos fixos) */
  const rows = useMemo<Row[]>(
    () =>
      (allRows || []).filter(
        (r) => !FIXED_YEARS.includes(r.ano) && (ano === "todos" ? true : r.ano === ano)
      ),
    [allRows, ano]
  );

  /** linhas usadas para montar a árvore (inclui os anos fixos) */
  const treeRows = useMemo<Row[]>(
    () => (allRows || []).filter((r) => FIXED_YEARS.includes(r.ano) || (ano === "todos" ? true : r.ano === ano)),
    [allRows, ano]
  );


  /** Estrutura ano > trimestre > mes presente nos dados */
  const structure = useMemo(() => {
    const m = new Map<number, Map<number, Set<number>>>();
    for (const r of rows) {
      if (!m.has(r.ano)) m.set(r.ano, new Map());
      const t = m.get(r.ano)!;
      if (!t.has(r.tri)) t.set(r.tri, new Set());
      t.get(r.tri)!.add(r.mes);
    }
    return Array.from(m.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([y, tris]) => ({
        ano: y,
        tris: Array.from(tris.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([t, meses]) => ({ tri: t, meses: Array.from(meses).sort((a, b) => a - b) })),
      }));
  }, [rows]);

  const COLS = useMemo<Col[]>(() => {
    const out: Col[] = [];
    for (const y of structure) {
      const yKey = `y:${y.ano}`;
      const yOpen = !!openCols[yKey];
      const allCells = y.tris.flatMap((t) => t.meses.map((m) => cellKey(y.ano, m)));
      if (!yOpen) {
        out.push({ key: yKey, label: String(y.ano), kind: "ano", cells: allCells, toggleKey: yKey, open: false, isGroupEdge: true });
        continue;
      }
      for (const t of y.tris) {
        const tKey = `t:${y.ano}:${t.tri}`;
        const tOpen = !!openCols[tKey];
        const tCells = t.meses.map((m) => cellKey(y.ano, m));
        if (!tOpen) {
          out.push({ key: tKey, label: `${t.tri}ºT/${String(y.ano).slice(2)}`, kind: "tri", cells: tCells, toggleKey: tKey, open: false });
          continue;
        }
        for (const m of t.meses) {
          out.push({ key: `m:${y.ano}:${m}`, label: `${MES_LABEL[m - 1]}/${String(y.ano).slice(2)}`, kind: "mes", cells: [cellKey(y.ano, m)] });
        }
        out.push({ key: `t:${y.ano}:${t.tri}:tot`, label: `${t.tri}ºT/${String(y.ano).slice(2)}`, kind: "tri", cells: tCells, toggleKey: tKey, open: true });
      }
      out.push({ key: `${yKey}:tot`, label: String(y.ano), kind: "ano", cells: allCells, toggleKey: yKey, open: true, isGroupEdge: true });
    }

    for (const fy of FIXED_YEARS) {
      const meses = Array.from(new Set((allRows || []).filter((r) => r.ano === fy).map((r) => r.mes)));
      if (!meses.length) continue;
      out.push({
        key: `fx:${fy}`,
        label: String(fy),
        kind: "fixo",
        cells: meses.map((m) => cellKey(fy, m)),
        isGroupEdge: true,
      });
    }
    return out;
  }, [structure, openCols, allRows]);

  const tree = useMemo<Node[]>(() => {
    const roots: Node[] = [];
    const m1 = new Map<string, Node>();
    for (const r of treeRows) {

      const ck = cellKey(r.ano, r.mes);
      const k1 = r.g1;
      const n1 = ensure(m1, k1, stripPrefix(r.g1), 0, roots);
      const k2 = `${k1}>${r.g2}`;
      const m2 = (n1 as any)._m ?? ((n1 as any)._m = new Map<string, Node>());
      const n2 = ensure(m2, k2, stripPrefix(r.g2), 1, n1.children);
      const k3 = `${k2}>${r.g3}`;
      const m3 = (n2 as any)._m ?? ((n2 as any)._m = new Map<string, Node>());
      const n3 = ensure(m3, k3, stripPrefix(r.g3), 2, n2.children);

      if (r.g4) {
        const k4 = `${k3}>${r.g4}`;
        const m4 = (n3 as any)._m ?? ((n3 as any)._m = new Map<string, Node>());
        const n4 = ensure(m4, k4, stripPrefix(r.g4), 3, n3.children);
        addValue(n4, ck, r.valor);
      }
      addValue(n3, ck, r.valor);
      addValue(n2, ck, r.valor);
      addValue(n1, ck, r.valor);
    }
    const sortRec = (nodes: Node[]) => {
      nodes.sort((a, b) => a.key.localeCompare(b.key, "pt-BR", { numeric: true }));
      nodes.forEach((n) => sortRec(n.children));
    };
    sortRec(roots);
    return roots;
  }, [rows]);

  useEffect(() => {
    if (tree.length) {
      const init: Record<string, boolean> = {};
      tree.forEach((n) => (init[n.key] = true));
      setOpen((p) => ({ ...init, ...p }));
    }
  }, [tree]);

  const rowsOut: { node: Node; visible: boolean }[] = [];
  const walk = (nodes: Node[], parentOpen: boolean) => {
    for (const n of nodes) {
      rowsOut.push({ node: n, visible: parentOpen });
      const isOpen = !!open[n.key];
      if (n.children.length) walk(n.children, parentOpen && isOpen);
    }
  };
  walk(tree, true);

  const grandByCol: Record<string, number> = {};
  tree.forEach((n) => {
    COLS.forEach((c) => (grandByCol[c.key] = (grandByCol[c.key] ?? 0) + sumCells(n, c.cells)));
  });


  const toggle = (k: string) => setOpen((p) => ({ ...p, [k]: !p[k] }));
  const toggleCol = (k: string) => setOpenCols((p) => ({ ...p, [k]: !p[k] }));

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-foreground">DRE Gerencial PE</h2>
          <p className="text-xs text-muted-foreground">
            Colunas por ano → trimestre → mês — valores em R${error ? ` — erro: ${error}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1">
            <span className="text-muted-foreground">Ano</span>
            <select
              value={ano}
              onChange={(e) => setAno(e.target.value === "todos" ? "todos" : Number(e.target.value))}
              className="px-2 py-1.5 rounded-md border border-border bg-background"
            >
              <option value="todos">Todos</option>
              {anos.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
          <button
            onClick={() => {
              const all: Record<string, boolean> = {};
              structure.forEach((y) => {
                all[`y:${y.ano}`] = true;
                y.tris.forEach((t) => (all[`t:${y.ano}:${t.tri}`] = true));
              });
              setOpenCols(all);
            }}
            className="px-3 py-1.5 rounded-md border border-border hover:bg-accent hover:text-primary"
          >
            Expandir períodos
          </button>
          <button
            onClick={() => setOpenCols({})}
            className="px-3 py-1.5 rounded-md border border-border hover:bg-accent hover:text-primary"
          >
            Recolher períodos
          </button>
          <button
            onClick={() => {
              const all: Record<string, boolean> = {};
              const collect = (ns: Node[]) => ns.forEach((n) => { all[n.key] = true; collect(n.children); });
              collect(tree);
              setOpen(all);
            }}
            className="px-3 py-1.5 rounded-md border border-border hover:bg-accent hover:text-primary"
          >
            Expandir contas
          </button>
          <button
            onClick={() => setOpen({})}
            className="px-3 py-1.5 rounded-md border border-border hover:bg-accent hover:text-primary"
          >
            Recolher contas
          </button>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-6 py-3 sticky left-0 bg-muted/50">Conta</th>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  className={`text-right font-medium px-3 py-3 whitespace-nowrap ${headClass(c.kind)} ${c.isGroupEdge ? "border-l border-border" : ""}`}
                >
                  {c.toggleKey ? (
                    <button
                      onClick={() => toggleCol(c.toggleKey!)}
                      className="inline-flex items-center gap-1 hover:text-primary"
                      aria-label={c.open ? "Recolher período" : "Expandir período"}
                      title={c.open ? "Recolher período" : "Expandir período"}
                    >
                      <ChevronRight className={`h-3.5 w-3.5 transition-transform ${c.open ? "rotate-90" : ""}`} />
                      {c.label}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
              <th className="text-right font-medium px-6 py-3 whitespace-nowrap border-l border-border">Total</th>
            </tr>
          </thead>
          <tbody>
            {rowsOut.filter((r) => r.visible).map(({ node }) => {
              const hasChildren = node.children.length > 0;
              const isOpen = !!open[node.key];
              const isTopLevel = node.level === 0;
              const isLeaf = node.level === 3;
              
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
                  {COLS.map((c) => {
                    const v = sumCells(node, c.cells);
                    return (
                      <td
                        key={c.key}
                        className={`px-3 py-2 text-right tabular-nums ${bodyClass(c.kind)} ${c.isGroupEdge ? "border-l border-border" : ""} ${v < 0 ? "text-destructive" : "text-foreground"}`}
                      >
                        {fmt(v)}
                      </td>
                    );
                  })}
                </tr>

              );
            })}
            <tr className="border-t-2 border-border bg-primary/5 font-semibold">
              <td className="px-6 py-3 sticky left-0 bg-primary/5">Resultado do Período</td>
              {COLS.map((c) => {
                const v = grandByCol[c.key] ?? 0;
                return (
                  <td key={c.key} className={`px-3 py-3 text-right tabular-nums ${bodyClass(c.kind)} ${c.isGroupEdge ? "border-l border-border" : ""} ${v < 0 ? "text-destructive" : "text-foreground"}`}>
                    {fmt(v)}
                  </td>
                );
              })}
            </tr>

          </tbody>
        </table>
      </div>
    </section>
  );
};

export default DREGerencialPE;
