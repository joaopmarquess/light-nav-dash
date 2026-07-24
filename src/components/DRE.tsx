import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { hostinger } from "@/lib/hostingerClient";

const fmt = (v: number) => {
  if (Math.abs(v) < 0.5) return "-";
  const s = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(v));
  return v < 0 ? `(${s})` : s;
};

type Node = {
  key: string;
  label: string;
  level: number;
  values: Record<string, number>;
  total: number;
  children: Node[];
};

type PeriodoTotals = {
  rec_total: number;
  vrdespesas: number;
  consulta: number;
  emergencia: number;
  internacao: number;
  exame: number;
  terapia: number;
  demais: number;
  saldo: number;
};

const EMPTY: PeriodoTotals = {
  rec_total: 0, vrdespesas: 0, consulta: 0, emergencia: 0,
  internacao: 0, exame: 0, terapia: 0, demais: 0, saldo: 0,
};

const DESPESA_ITEMS: { key: keyof PeriodoTotals; label: string }[] = [
  { key: "internacao", label: "Internação" },
  { key: "terapia", label: "Terapia" },
  { key: "exame", label: "Exame" },
  { key: "consulta", label: "Consulta" },
  { key: "emergencia", label: "Emergência" },
  { key: "demais", label: "Demais" },
];

const DRE = () => {
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [totals, setTotals] = useState<Record<string, PeriodoTotals> | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: pers, error: e1 } = await hostinger.rpc("sin_periodos");
        if (e1) throw e1;
        const list = ((pers || []) as { periodo: string }[])
          .map((p) => p.periodo)
          .sort((a, b) => a.localeCompare(b, "pt-BR"));
        setPeriodos(list);

        const results = await Promise.all(
          list.map(async (p) => {
            const { data, error } = await hostinger.rpc("sin_por_grupo", { p_periodo: p });
            if (error) throw error;
            const agg = { ...EMPTY };
            for (const r of (data || []) as Record<string, number>[]) {
              agg.rec_total += Number(r.rec_total) || 0;
              agg.vrdespesas += Number(r.vrdespesas) || 0;
              agg.consulta += Number(r.consulta) || 0;
              agg.emergencia += Number(r.emergencia) || 0;
              agg.internacao += Number(r.internacao) || 0;
              agg.exame += Number(r.exame) || 0;
              agg.terapia += Number(r.terapia) || 0;
              agg.demais += Number(r.demais) || 0;
              agg.saldo += Number(r.saldo) || 0;
            }
            return [p, agg] as const;
          })
        );
        setTotals(Object.fromEntries(results));
      } catch (e: any) {
        setErr(e?.message || String(e));
      }
    })();
  }, []);

  const tree = useMemo<Node[]>(() => {
    if (!totals) return [];
    const nReceita: Node = { key: "receita", label: "Receita Assistencial", level: 0, values: {}, total: 0, children: [] };
    const nDespesa: Node = { key: "despesa", label: "Despesa Assistencial", level: 0, values: {}, total: 0, children: [] };
    const despesaChildren: Node[] = DESPESA_ITEMS.map((it) => ({
      key: `despesa>${it.key}`, label: it.label, level: 1, values: {}, total: 0, children: [],
    }));
    nDespesa.children = despesaChildren;

    for (const p of periodos) {
      const t = totals[p] || EMPTY;
      const rec = t.rec_total;
      nReceita.values[p] = rec;
      nReceita.total += rec;
      let despesaTotal = 0;
      despesaChildren.forEach((child, idx) => {
        const v = -Math.abs(t[DESPESA_ITEMS[idx].key] as number);
        child.values[p] = v;
        child.total += v;
        despesaTotal += v;
      });
      nDespesa.values[p] = despesaTotal;
      nDespesa.total += despesaTotal;
    }
    return [nReceita, nDespesa];
  }, [totals, periodos]);

  useEffect(() => {
    if (tree.length) {
      const init: Record<string, boolean> = {};
      tree.forEach((n) => (init[n.key] = true));
      setOpen((p) => ({ ...init, ...p }));
    }
  }, [tree]);

  const grandByPeriodo: Record<string, number> = {};
  let grandTotal = 0;
  tree.forEach((n) => {
    periodos.forEach((p) => (grandByPeriodo[p] = (grandByPeriodo[p] ?? 0) + (n.values[p] ?? 0)));
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
          <p className="text-xs text-muted-foreground">
            Fonte: public.sinistralidade — valores em R$
          </p>
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

      {err && <div className="px-6 py-3 text-sm text-destructive">Erro: {err}</div>}
      {!totals && !err && (
        <div className="px-6 py-10 text-sm text-muted-foreground text-center">Carregando…</div>
      )}

      {totals && (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-6 py-3 sticky left-0 bg-muted/50">Conta</th>
                {periodos.map((p) => (
                  <th key={p} className="text-right font-medium px-4 py-3 whitespace-nowrap">{p}</th>
                ))}
                <th className="text-right font-medium px-6 py-3 whitespace-nowrap">Total</th>
              </tr>
            </thead>
            <tbody>
              {rowsOut.filter((r) => r.visible).map(({ node }) => {
                const hasChildren = node.children.length > 0;
                const isOpen = !!open[node.key];
                const isTopLevel = node.level === 0;
                const isLeaf = node.children.length === 0;
                const neg = node.total < 0;
                return (
                  <tr
                    key={node.key}
                    className={`border-t border-border ${isTopLevel ? "bg-accent/40 font-semibold" : ""} hover:bg-accent/30`}
                  >
                    <td className="px-6 py-2 sticky left-0 bg-inherit" style={{ paddingLeft: 16 + node.level * 20 }}>
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
                    {periodos.map((p) => {
                      const v = node.values[p] ?? 0;
                      return (
                        <td key={p} className={`px-4 py-2 text-right tabular-nums ${v < 0 ? "text-destructive" : "text-foreground"}`}>
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
                {periodos.map((p) => {
                  const v = grandByPeriodo[p] ?? 0;
                  return (
                    <td key={p} className={`px-4 py-3 text-right tabular-nums ${v < 0 ? "text-destructive" : "text-foreground"}`}>
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
      )}
    </section>
  );
};

export default DRE;
