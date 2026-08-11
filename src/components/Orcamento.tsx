import { Fragment, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Coins, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Row = { item: string; mes: number; previsto: number; realizado: number };

const MES_LABEL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const fmt = (v: number) => {
  if (Math.abs(v) < 0.005) return "-";
  const s = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Math.abs(v));
  return v < 0 ? `(${s})` : s;
};

const pctFmt = (v: number) => `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v)}%`;

const ACRONYMS = ["EBITDA", "TI"];
const toSentence = (s: string) => {
  if (!s) return s;
  let r = s.toLowerCase();
  r = r.charAt(0).toUpperCase() + r.slice(1);
  for (const a of ACRONYMS) r = r.replace(new RegExp(`\\b${a.toLowerCase()}\\b`, "gi"), a);
  return r;
};
const stripPrefix = (s: string) => toSentence((s || "").replace(/^\d+\|/, ""));

type Col = { key: string; label: string; meses: number[]; kind: "mes" | "total" };

type TipData = { title: string; abs: string; pct: string; positive: boolean; neutral?: boolean; up?: boolean };

const Orcamento = () => {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tip, setTip] = useState<{ d: TipData; x: number; y: number; pinned?: boolean } | null>(null);
  const [openCols, setOpenCols] = useState<Record<string, boolean>>({});
  const toggleCol = (k: string) => setOpenCols((p) => ({ ...p, [k]: !p[k] }));

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("orcamento_2026")
          .select("item,nr_mes,previsto,realizado")
          .order("item")
          .order("nr_mes");
        if (error) throw error;
        setRows(
          (data || []).map((r) => ({
            item: r.item || "",
            mes: Number(r.nr_mes) || 0,
            previsto: Number(r.previsto) || 0,
            realizado: Number(r.realizado) || 0,
          }))
        );
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
        setRows([]);
      }
    })();
  }, []);

  const meses = useMemo(
    () => Array.from(new Set((rows || []).map((r) => r.mes))).sort((a, b) => a - b),
    [rows]
  );

  const items = useMemo(
    () => Array.from(new Set((rows || []).map((r) => r.item))).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true })),
    [rows]
  );

  /** item -> mes -> { previsto, realizado } */
  const map = useMemo(() => {
    const m = new Map<string, Map<number, { previsto: number; realizado: number }>>();
    for (const r of rows || []) {
      if (!m.has(r.item)) m.set(r.item, new Map());
      const im = m.get(r.item)!;
      const cur = im.get(r.mes) || { previsto: 0, realizado: 0 };
      im.set(r.mes, { previsto: cur.previsto + r.previsto, realizado: cur.realizado + r.realizado });
    }
    return m;
  }, [rows]);

  const COLS = useMemo<Col[]>(() => {
    const out: Col[] = meses.map((m) => ({ key: `m:${m}`, label: MES_LABEL[m - 1] || String(m), meses: [m], kind: "mes" }));
    if (meses.length) out.push({ key: "acum", label: "Acumulado", meses, kind: "total" });
    return out;
  }, [meses]);

  const cellVals = (item: string, col: Col) => {
    const im = map.get(item);
    let previsto = 0;
    let realizado = 0;
    for (const m of col.meses) {
      const v = im?.get(m);
      previsto += v?.previsto ?? 0;
      realizado += v?.realizado ?? 0;
    }
    return { previsto, realizado };
  };

  const sumVals = (its: string[], col: Col) => {
    let previsto = 0;
    let realizado = 0;
    for (const it of its) {
      const v = cellVals(it, col);
      previsto += v.previsto;
      realizado += v.realizado;
    }
    return { previsto, realizado };
  };

  const totalVals = (col: Col) => sumVals(items, col);

  /** Árvore: Operacional principal > Entradas / Saídas / Sinistralidade */
  type Node = {
    id: string;
    label: string;
    items: string[];
    children?: Node[];
    ratio?: { num: string[]; den: string[] };
  };

  const tree = useMemo<Node[]>(() => {
    const find = (re: RegExp) => items.filter((i) => re.test(i));
    const entradas = [...find(/\|\s*FATURAMENTO/i), ...find(/COPARTICIPA/i)];
    const saidas = find(/DESPESAS ASSISTENCIAIS/i);
    const usados = new Set([...entradas, ...saidas]);
    const nodes: Node[] = [];
    if (entradas.length || saidas.length) {
      nodes.push({
        id: "g:op",
        label: "Operacional principal",
        items: [...entradas, ...saidas],
        children: [
          {
            id: "g:entradas",
            label: "Entradas",
            items: entradas,
            children: entradas.map((i) => ({ id: `i:${i}`, label: stripPrefix(i), items: [i] })),
          },
          {
            id: "g:saidas",
            label: "Saídas",
            items: saidas,
            children: saidas.map((i) => ({ id: `i:${i}`, label: stripPrefix(i), items: [i] })),
          },
          {
            id: "r:sin",
            label: "Sinistralidade",
            items: [],
            ratio: { num: saidas, den: entradas },
          },
        ],
      });
    }
    for (const i of items) if (!usados.has(i)) nodes.push({ id: `i:${i}`, label: stripPrefix(i), items: [i] });
    return nodes;
  }, [items]);

  const [openRows, setOpenRows] = useState<Record<string, boolean>>({ "g:op": true });
  const toggleRow = (k: string) => setOpenRows((p) => ({ ...p, [k]: !p[k] }));

  const flat = useMemo(() => {
    const out: { node: Node; depth: number }[] = [];
    const walk = (ns: Node[], depth: number) => {
      for (const n of ns) {
        out.push({ node: n, depth });
        if (n.children?.length && openRows[n.id]) walk(n.children, depth + 1);
      }
    };
    walk(tree, 0);
    return out;
  }, [tree, openRows]);


  const showTip = (
    e: React.MouseEvent,
    title: string,
    previsto: number,
    realizado: number,
    opts?: { invert?: boolean; pp?: boolean }
  ) => {
    if (tip?.pinned) return;
    const diff = realizado - previsto;
    const has = Math.abs(previsto) >= 0.005;
    const sign = diff > 0 ? "+ " : diff < 0 ? "− " : "";
    setTip({
      x: e.clientX + 14,
      y: e.clientY + 14,
      d: {
        title,
        abs: opts?.pp ? `${sign}${pctFmt(Math.abs(diff))} p.p.` : `${sign}${fmt(Math.abs(diff))}`,
        pct: has ? `${sign}${pctFmt(Math.abs((diff / Math.abs(previsto)) * 100))}` : "n/d",
        positive: opts?.invert ? diff <= 0 : diff >= 0,
        neutral: Math.abs(diff) < 0.005,
      },
    });
  };


  const faturItem = useMemo(() => items.find((i) => /faturamento/i.test(i)) || null, [items]);

  const showPctTip = (e: React.MouseEvent, col: Col, valor: number, label: string) => {
    e.preventDefault();
    const base = faturItem ? cellVals(faturItem, col).realizado : 0;
    const has = Math.abs(base) >= 0.005;
    setTip({
      pinned: true,
      x: e.clientX + 14,
      y: e.clientY + 14,
      d: {
        title: `% sobre Faturamento — ${label}`,
        abs: `${fmt(valor)} / ${fmt(base)}`,
        pct: has ? pctFmt((valor / Math.abs(base)) * 100) : "n/d",
        positive: valor >= 0,
        neutral: !has,
      },
    });
  };

  useEffect(() => {
    if (!tip?.pinned) return;
    const clear = () => setTip(null);
    window.addEventListener("click", clear);
    window.addEventListener("scroll", clear, true);
    return () => {
      window.removeEventListener("click", clear);
      window.removeEventListener("scroll", clear, true);
    };
  }, [tip?.pinned]);

  const headClass = (k: Col["kind"]) =>
    k === "total" ? "bg-primary/15 text-foreground" : "bg-background text-foreground";
  const bodyClass = (k: Col["kind"]) => (k === "total" ? "bg-primary/10 font-semibold" : "");

  if (!rows) {
    return (
      <section className="bg-card rounded-xl border border-border shadow-sm p-6 text-sm text-muted-foreground">
        Carregando…
      </section>
    );
  }

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">Orçamento</h2>
        <p className="text-xs text-muted-foreground">
          Orçado x Realizado por mês — valores em R$ (botão direito no valor: % sobre Faturamento)
          {error ? ` — erro: ${error}` : ""}
        </p>
      </div>

      <div className="overflow-auto max-h-[calc(100vh-13rem)]">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground sticky top-0 z-10">
            <tr>
              <th className="text-left font-medium px-6 py-3 sticky left-0 bg-muted/50">Item</th>
              {COLS.map((c) => (
                <Fragment key={c.key}>
                  {openCols[c.key] && (
                    <th className={`text-right font-normal px-3 py-3 text-xs whitespace-nowrap border-l border-border bg-muted/60`}>
                      {c.label} · Previsto
                    </th>
                  )}
                  <th
                    className={`text-right font-medium px-3 py-3 whitespace-nowrap ${openCols[c.key] ? "" : "border-l border-border"} ${headClass(c.kind)}`}
                  >
                    <button
                      onClick={() => toggleCol(c.key)}
                      className="inline-flex items-center gap-1 hover:text-primary"
                      title={openCols[c.key] ? "Ocultar previsto" : "Mostrar previsto"}
                    >
                      <ChevronRight className={`h-3.5 w-3.5 transition-transform ${openCols[c.key] ? "rotate-90" : ""}`} />
                      {c.label}
                    </button>
                  </th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {flat.map(({ node, depth }) => {
              const isGroup = !!node.children?.length;
              const isRatio = !!node.ratio;
              return (
                <tr
                  key={node.id}
                  className={`border-t border-border hover:bg-accent/40 ${isGroup ? "font-semibold bg-muted/20" : ""} ${isRatio ? "italic" : ""}`}
                >
                  <td
                    className={`px-6 py-2 sticky left-0 whitespace-nowrap ${isGroup ? "bg-muted/20" : "bg-card"}`}
                    style={{ paddingLeft: `${1.5 + depth * 1.1}rem` }}
                  >
                    {isGroup ? (
                      <button onClick={() => toggleRow(node.id)} className="inline-flex items-center gap-1 hover:text-primary">
                        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${openRows[node.id] ? "rotate-90" : ""}`} />
                        {node.label}
                      </button>
                    ) : (
                      node.label
                    )}
                  </td>
                  {COLS.map((c) => {
                    let previsto: number;
                    let realizado: number;
                    if (isRatio) {
                      const num = sumVals(node.ratio!.num, c);
                      const den = sumVals(node.ratio!.den, c);
                      previsto = Math.abs(den.previsto) >= 0.005 ? (Math.abs(num.previsto) / Math.abs(den.previsto)) * 100 : 0;
                      realizado = Math.abs(den.realizado) >= 0.005 ? (Math.abs(num.realizado) / Math.abs(den.realizado)) * 100 : 0;
                    } else {
                      const v = sumVals(node.items, c);
                      previsto = v.previsto;
                      realizado = v.realizado;
                    }
                    const title = `${node.label} — ${c.label}`;
                    const show = (v: number) => (isRatio ? (Math.abs(v) < 0.005 ? "-" : pctFmt(v)) : fmt(v));
                    return (
                      <Fragment key={c.key}>
                        {openCols[c.key] && (
                          <td
                            className="px-3 py-2 text-right tabular-nums border-l border-border bg-muted/30 text-muted-foreground"
                            onContextMenu={(e) => !isRatio && showPctTip(e, c, previsto, `${c.label} · Previsto`)}
                          >
                            {show(previsto)}
                          </td>
                        )}
                        <td
                          className={`px-3 py-2 text-right tabular-nums cursor-help ${openCols[c.key] ? "" : "border-l border-border"} ${bodyClass(c.kind)}`}
                          onMouseEnter={(e) => showTip(e, title, previsto, realizado)}
                          onMouseMove={(e) => showTip(e, title, previsto, realizado)}
                          onMouseLeave={() => !tip?.pinned && setTip(null)}
                          onContextMenu={(e) => !isRatio && showPctTip(e, c, realizado, `${c.label} · Realizado`)}
                        >
                          {show(realizado)}
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              );
            })}

            <tr className="border-t-2 border-border bg-muted/60 font-semibold">
              <td className="px-6 py-2.5 sticky left-0 bg-muted/60">Resultado do período</td>
              {COLS.map((c) => {
                const { previsto, realizado } = totalVals(c);
                return (
                  <Fragment key={c.key}>
                    {openCols[c.key] && (
                      <td className="px-3 py-2.5 text-right tabular-nums border-l border-border text-muted-foreground">
                        {fmt(previsto)}
                      </td>
                    )}
                    <td
                      className={`px-3 py-2.5 text-right tabular-nums cursor-help ${openCols[c.key] ? "" : "border-l border-border"}`}
                      onMouseEnter={(e) => showTip(e, `Resultado — ${c.label}`, previsto, realizado)}
                      onMouseMove={(e) => showTip(e, `Resultado — ${c.label}`, previsto, realizado)}
                      onMouseLeave={() => !tip?.pinned && setTip(null)}
                      onContextMenu={(e) => showPctTip(e, c, realizado, `${c.label} · Resultado`)}
                    >
                      {fmt(realizado)}
                    </td>
                  </Fragment>
                );
              })}
            </tr>
          </tbody>

        </table>
      </div>

      {tip && (
        <div
          className="fixed z-50 pointer-events-none rounded-lg border border-border bg-popover text-popover-foreground shadow-lg px-3 py-2 text-xs space-y-1"
          style={{ left: tip.x, top: tip.y }}
        >
          <div className="flex items-center gap-1.5 font-medium">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            {tip.d.title}
          </div>
          <div
            className={`flex items-center gap-1.5 ${
              tip.d.neutral ? "text-muted-foreground" : tip.d.positive ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            <Coins className="h-3.5 w-3.5" />
            {tip.d.abs}
          </div>
          <div
            className={`flex items-center gap-1.5 ${
              tip.d.neutral ? "text-muted-foreground" : tip.d.positive ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {tip.d.positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {tip.d.pct}
          </div>
        </div>
      )}
    </section>
  );
};

export default Orcamento;
