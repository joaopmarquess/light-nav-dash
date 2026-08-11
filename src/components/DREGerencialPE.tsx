import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Row = { g1: string; g2: string; g3: string; g4: string; valor: number; mes: number };

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

const DREGerencialPE = () => {
  const [allRows, setAllRows] = useState<(Row & { ano: number })[] | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [ano, setAno] = useState<number | null>(null);
  const [mesDe, setMesDe] = useState<number>(1);
  const [mesAte, setMesAte] = useState<number>(12);

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
            .select("nr_ano,nr_mes,g1,g2,g3,g4,valor")
            .range(from, from + PAGE - 1);
          if (error) throw error;
          const arr = (chunk || []) as any[];
          data.push(...arr);
          if (arr.length < PAGE) break;
          from += PAGE;
        }
        const parsed = data
          .filter((r) => r.g1)
          .map((r) => ({
            ano: Number(r.nr_ano) || 0,
            mes: Number(r.nr_mes) || 0,
            g1: r.g1 || "",
            g2: r.g2 || "",
            g3: r.g3 || "",
            g4: r.g4 || "",
            valor: Number(r.valor) || 0,
          }));
        setAllRows(parsed);
        const anos = Array.from(new Set(parsed.map((r) => r.ano))).sort((a, b) => b - a);
        if (anos.length) setAno((p) => p ?? anos[0]);
      } catch (e: any) {
        setError(e?.message || String(e));
        setAllRows([]);
      }
    })();
  }, []);

  const anos = useMemo(
    () => Array.from(new Set((allRows || []).map((r) => r.ano))).sort((a, b) => b - a),
    [allRows]
  );

  const MONTHS = useMemo(() => {
    const yearRows = (allRows || []).filter((r) => r.ano === ano);
    const present = Array.from(new Set(yearRows.map((r) => r.mes))).sort((a, b) => a - b);
    return present
      .filter((m) => m >= mesDe && m <= mesAte)
      .map((m) => ({ n: m, label: `${MES_LABEL[m - 1]}/${String(ano ?? "").slice(2)}` }));
  }, [allRows, ano, mesDe, mesAte]);

  const rows = useMemo<Row[]>(() => {
    if (!allRows || ano === null) return [];
    const ms = new Set(MONTHS.map((m) => m.n));
    return allRows.filter((r) => r.ano === ano && ms.has(r.mes));
  }, [allRows, ano, MONTHS]);

  const tree = useMemo<Node[]>(() => {
    const roots: Node[] = [];
    const m1 = new Map<string, Node>();
    for (const r of rows) {
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
        addValue(n4, r.mes, r.valor);
      }
      addValue(n3, r.mes, r.valor);
      addValue(n2, r.mes, r.valor);
      addValue(n1, r.mes, r.valor);
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
          <h2 className="text-base font-semibold text-foreground">DRE Gerencial PE</h2>
          <p className="text-xs text-muted-foreground">
            {MONTHS.length ? `${MONTHS[0].label} a ${MONTHS[MONTHS.length - 1].label}` : "Selecione o período"} — valores em R${error ? ` — erro: ${error}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1">
            <span className="text-muted-foreground">Ano</span>
            <select
              value={ano ?? ""}
              onChange={(e) => setAno(Number(e.target.value))}
              className="px-2 py-1.5 rounded-md border border-border bg-background"
            >
              {anos.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            <span className="text-muted-foreground">De</span>
            <select
              value={mesDe}
              onChange={(e) => {
                const v = Number(e.target.value);
                setMesDe(v);
                if (v > mesAte) setMesAte(v);
              }}
              className="px-2 py-1.5 rounded-md border border-border bg-background"
            >
              {MES_LABEL.map((l, i) => (
                <option key={i + 1} value={i + 1}>{l}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            <span className="text-muted-foreground">Até</span>
            <select
              value={mesAte}
              onChange={(e) => {
                const v = Number(e.target.value);
                setMesAte(v);
                if (v < mesDe) setMesDe(v);
              }}
              className="px-2 py-1.5 rounded-md border border-border bg-background"
            >
              {MES_LABEL.map((l, i) => (
                <option key={i + 1} value={i + 1}>{l}</option>
              ))}
            </select>
          </label>
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

export default DREGerencialPE;
