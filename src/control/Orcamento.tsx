import { Fragment, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, ChevronsDownUp, ChevronsUpDown, Coins, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mergeOrcamento } from "@/control/orcamentoLocal";

type Row = { item: string; mes: number; previsto: number; realizado: number; projetado: number };

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

type TipLine = { label: string; abs: string; pct: string; positive: boolean; neutral?: boolean; up?: boolean };
type TipData = { title: string; lines: TipLine[] };

const Orcamento = () => {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tip, setTip] = useState<{ d: TipData; x: number; y: number; pinned?: boolean } | null>(null);
  const [openCols, setOpenCols] = useState<Record<string, boolean>>({});
  const [fonteFutura, setFonteFutura] = useState<"projetado" | "previsto">("projetado");
  const [visao, setVisao] = useState<"original" | "orcamento">("orcamento");
  const orig = visao === "original";
  const sub = (c: { key: string }) => !orig && !!openCols[c.key];
  const toggleCol = (k: string) => setOpenCols((p) => ({ ...p, [k]: !p[k] }));

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("orcamento_2026")
          .select("*")
          .order("item")
          .order("nr_mes");
        if (error) throw error;
        setRows(
          mergeOrcamento(
            (data || []).map((r) => ({
              item: r.item || "",
              mes: Number(r.nr_mes) || 0,
              previsto: Number(r.previsto) || 0,
              realizado: Number(r.realizado) || 0,
              projetado: Number((r as { projetado?: number }).projetado) || 0,
            }))
          )
        );
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
        setRows(mergeOrcamento([]));
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

  /** item -> mes -> { previsto, realizado, projetado } */
  const map = useMemo(() => {
    const m = new Map<string, Map<number, { previsto: number; realizado: number; projetado: number }>>();
    // Meses sem nenhum realizado exibem o Projetado ou o Previsto (conforme a chave)
    const mesesComReal = new Set((rows || []).filter((r) => Math.abs(r.realizado) >= 0.005).map((r) => r.mes));
    for (const r of rows || []) {
      if (!m.has(r.item)) m.set(r.item, new Map());
      const im = m.get(r.item)!;
      const cur = im.get(r.mes) || { previsto: 0, realizado: 0, projetado: 0 };
      const real = mesesComReal.has(r.mes) ? r.realizado : fonteFutura === "previsto" ? r.previsto : r.projetado;
      im.set(r.mes, {
        previsto: cur.previsto + r.previsto,
        realizado: cur.realizado + real,
        projetado: cur.projetado + r.projetado,
      });
    }
    return m;
  }, [rows, fonteFutura]);

  const COLS = useMemo<Col[]>(() => {
    const comReal = (rows || []).filter((r) => Math.abs(r.realizado) >= 0.005).map((r) => r.mes);
    const ultimo = comReal.length ? Math.max(...comReal) : 0;
    const out: Col[] = [];
    for (const m of meses) {
      out.push({ key: `m:${m}`, label: MES_LABEL[m - 1] || String(m), meses: [m], kind: "mes" });
      if (m === ultimo && m !== meses[meses.length - 1]) {
        out.push({ key: "parcial", label: "Parcial", meses: meses.filter((x) => x <= ultimo), kind: "total" });
      }
    }
    const todosReal = meses.length > 0 && meses.every((m) => comReal.includes(m));
    const labelAcum = todosReal ? "Realizado" : fonteFutura === "previsto" ? "Previsto" : "Projetado";
    if (meses.length) out.push({ key: "acum", label: labelAcum, meses, kind: "total" });
    return out;
  }, [meses, rows, fonteFutura]);

  const cellVals = (item: string, col: Col) => {
    const im = map.get(item);
    let previsto = 0;
    let realizado = 0;
    let projetado = 0;
    for (const m of col.meses) {
      const v = im?.get(m);
      previsto += v?.previsto ?? 0;
      realizado += v?.realizado ?? 0;
      projetado += v?.projetado ?? 0;
    }
    return { previsto, realizado, projetado };
  };

  const sumVals = (its: string[], col: Col) => {
    let previsto = 0;
    let realizado = 0;
    let projetado = 0;
    for (const it of its) {
      const v = cellVals(it, col);
      previsto += v.previsto;
      realizado += v.realizado;
      projetado += v.projetado;
    }
    return { previsto, realizado, projetado };
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
    const usados = new Set<string>([...entradas, ...saidas]);

    const leaf = (i: string, label?: string): Node => {
      usados.add(i);
      return { id: `i:${i}`, label: label ?? stripPrefix(i), items: [i] };
    };
    const one = (re: RegExp, label?: string) => {
      const i = items.find((x) => re.test(x));
      return i ? [leaf(i, label)] : [];
    };

    const nodes: Node[] = [];

    const opPrincipal: Node | null =
      entradas.length || saidas.length
        ? {
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
          }
        : null;

    const opOutros: Node[] = [
      ...one(/IMPOSTOS DIRETOS/i, "Impostos diretos"),
      ...one(/PROVIS[ÕO]ES OPERACIONAIS/i, "Provisões operacionais"),
      ...one(/COMERCIALIZA/i, "Comercialização"),
      ...one(/OUTRAS RECEITAS OPERACIONAIS/i, "Demais operações"),
    ];

    const opChildren = [...(opPrincipal ? [opPrincipal] : []), ...opOutros];
    if (opChildren.length) {
      nodes.push({
        id: "g:operacional",
        label: "Operacional",
        items: opChildren.flatMap((n) => n.items),
        children: opChildren,
      });
    }

    const admChildren: Node[] = [
      ...one(/\|\s*PESSOAL/i, "Pessoal"),
      ...one(/MARKETING/i, "Marketing"),
      ...one(/INFORM[ÁA]TICA/i, "Informática"),
      ...one(/DEMAIS DESPESAS ADMINISTRATIVAS/i, "Demais despesas administrativas"),
    ];
    if (admChildren.length) {
      nodes.push({
        id: "g:adm",
        label: "Despesas administrativas",
        items: admChildren.flatMap((n) => n.items),
        children: admChildren,
      });
    }

    nodes.push(...one(/FINANCEIRO/i, "Financeiro"));

    for (const i of items) if (!usados.has(i)) nodes.push({ id: `i:${i}`, label: stripPrefix(i), items: [i] });
    return nodes;
  }, [items]);


  const [openRows, setOpenRows] = useState<Record<string, boolean>>({ "g:operacional": true, "g:op": true, "g:entradas": true, "g:saidas": true, "g:adm": true });
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


  const mkLine = (
    label: string,
    base: number,
    realizado: number,
    opts?: { invert?: boolean; pp?: boolean }
  ): TipLine => {
    const diff = realizado - base;
    const has = Math.abs(base) >= 0.005;
    const sign = diff > 0 ? "+ " : diff < 0 ? "− " : "";
    return {
      label,
      abs: opts?.pp ? `${sign}${pctFmt(Math.abs(diff))} p.p.` : `${sign}${fmt(Math.abs(diff))}`,
      pct: has ? `${sign}${pctFmt(Math.abs((diff / Math.abs(base)) * 100))}` : "n/d",
      positive: opts?.invert ? diff <= 0 : diff >= 0,
      up: diff >= 0,
      neutral: Math.abs(diff) < 0.005,
    };
  };

  const showTip = (
    e: React.MouseEvent,
    title: string,
    previsto: number,
    realizado: number,
    opts?: { invert?: boolean; pp?: boolean; projetado?: number | null }
  ) => {
    if (tip?.pinned) return;
    const lines: TipLine[] = [mkLine("vs Previsto", previsto, realizado, opts)];
    if (opts?.projetado != null && Math.abs(opts.projetado) >= 0.005) {
      lines.push(mkLine("vs Projetado", opts.projetado, realizado, opts));
    }
    setTip({ x: e.clientX + 14, y: e.clientY + 14, d: { title, lines } });
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
        lines: [
          {
            label: "Participação",
            abs: `${fmt(valor)} / ${fmt(base)}`,
            pct: has ? pctFmt((valor / Math.abs(base)) * 100) : "n/d",
            positive: valor >= 0,
            neutral: !has,
          },
        ],
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
  const mesesComRealSet = useMemo(
    () => new Set((rows || []).filter((r) => Math.abs(r.realizado) >= 0.005).map((r) => r.mes)),
    [rows],
  );
  /** Cor da coluna principal: azul se tem realizado; senão a cor do tipo exibido */
  const corReal = (c: Col) =>
    c.meses.some((m) => mesesComRealSet.has(m))
      ? "text-blue-600"
      : fonteFutura === "previsto"
        ? "text-orange-500"
        : "text-foreground/80";
  /** Projetado só existe de julho a dezembro */
  const showProj = (c: Col) => c.meses.some((m) => m >= 7);

  if (!rows) {
    return (
      <section className="bg-card rounded-xl border border-border shadow-sm p-6 text-sm text-muted-foreground">
        Carregando…
      </section>
    );
  }

  return (
    <div className="space-y-3">
      {(() => {
        const parc = COLS.find((c) => c.key === "parcial") || COLS.find((c) => c.key === "acum");
        const acum = COLS.find((c) => c.key === "acum");
        if (!parc || !acum) return null;
        const p = totalVals(parc);
        const a = totalVals(acum);
        const soma = (re: RegExp) => items.filter((i) => re.test(i)).reduce((t, i) => t + cellVals(i, acum).realizado, 0);
        const fat = soma(/FATURAMENTO/i);
        const entradas = fat + soma(/COPARTICIPA/i);
        const desp = soma(/ASSISTENC/i);
        const sin = Math.abs(entradas) >= 0.005 ? (Math.abs(desp) / Math.abs(entradas)) * 100 : 0;
        const cards = [
          { label: "Resultado Parcial", bar: "border-l-blue-600", value: fmt(p.realizado), hint: `Jan a ${MES_LABEL[Math.max(...parc.meses) - 1]}`, cls: p.realizado < 0 ? "text-rose-600" : "text-blue-600" },
          { label: `Faturamento ${acum.label}`, bar: "border-l-emerald-600", value: fmt(fat), hint: "Ano", cls: "text-foreground/80" },
          { label: `Entradas ${acum.label}`, bar: "border-l-teal-500", value: fmt(entradas), hint: "Faturamento + coparticipação", cls: "text-foreground/80" },
          { label: `Desp. Assistenciais ${acum.label}`, bar: "border-l-rose-600", value: fmt(desp), hint: "Ano", cls: "text-foreground/80" },
          { label: `Sinistralidade ${acum.label}`, bar: "border-l-orange-500", value: pctFmt(sin), hint: "Desp. assistenciais ÷ entradas", cls: "text-foreground/80" },
          { label: `Resultado ${acum.label}`, bar: "border-l-primary", value: fmt(a.realizado), hint: `Com ${fonteFutura === "previsto" ? "previsto" : "projetado"} nos meses abertos`, cls: a.realizado < 0 ? "text-rose-600" : "text-foreground/80" },
        ];
        return (
          <div className="grid grid-flow-col auto-cols-fr gap-3 p-3 bg-card rounded-xl border border-border shadow-sm">
            {cards.map((k) => (
              <div key={k.label} className={`rounded-lg border border-border border-l-4 ${k.bar} bg-background p-3 min-w-0`}>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">{k.label}</div>
                <div className={`mt-1 text-lg font-semibold tabular-nums ${k.cls}`}>{k.value}</div>
                <div className="text-[11px] text-muted-foreground truncate">{k.hint}</div>
              </div>
            ))}
          </div>
        );
      })()}
    <section className="bg-card rounded-xl border border-border shadow-sm">
      {error ? (
        <div className="px-4 py-1 border-b border-border text-[11px] text-destructive">erro: {error}</div>
      ) : null}
      <div className="flex items-center justify-end gap-2 px-3 py-1.5 border-b border-border text-[12px]">
        <div className="mr-auto inline-flex rounded-md border border-border overflow-hidden">
          {(["original", "orcamento"] as const).map((k) => (
            <button key={k} onClick={() => setVisao(k)} className={`px-2.5 py-0.5 transition-colors ${visao === k ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent"}`}>
              {k === "original" ? "Original" : "Orçamento"}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-md border border-border overflow-hidden">
          {(["projetado", "previsto"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFonteFutura(k)}
              className={`px-2.5 py-0.5 transition-colors ${fonteFutura === k ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent"}`}
            >
              {k === "projetado" ? "Projetado" : "Previsto"}
            </button>
          ))}
        </div>
      </div>



      <div className="overflow-x-auto">
        <table className="w-full text-[13px] leading-normal">
          <thead className="bg-muted/50 text-muted-foreground sticky top-0 z-10">
            <tr>
              <th className="text-left font-medium px-3 py-0.5 sticky left-0 bg-muted/50">
                <span className="inline-flex items-center gap-2">
                  Item
                  {(() => {
                    const ids: string[] = [];
                    const walk = (ns: Node[]) => ns.forEach((n) => { if (n.children?.length) { ids.push(n.id); walk(n.children); } });
                    walk(tree);
                    const tudo = ids.every((i) => openRows[i]) && COLS.every((c) => openCols[c.key]);
                    return (
                      <button
                        onClick={() => {
                          setOpenRows(Object.fromEntries(ids.map((i) => [i, !tudo])));
                          setOpenCols(Object.fromEntries(COLS.map((c) => [c.key, !tudo])));
                        }}
                        className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-accent hover:text-primary"
                        title={tudo ? "Recolher tudo" : "Expandir tudo"}
                        aria-label={tudo ? "Recolher tudo" : "Expandir tudo"}
                      >
                        {tudo ? <ChevronsDownUp className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5" />}
                      </button>
                    );
                  })()}
                </span>
              </th>
              {COLS.map((c) => (
                <Fragment key={c.key}>
                  {sub(c) && (
                    <th className={`text-right font-normal px-1.5 py-0.5 text-[11px] whitespace-nowrap border-l border-border bg-muted/60 text-orange-500`}>
                      {c.label} · Previsto
                    </th>
                  )}
                  {sub(c) && showProj(c) && (
                    <th className="text-right font-normal px-1.5 py-0.5 text-[11px] whitespace-nowrap border-l border-border bg-muted/60">
                      {c.label} · Projetado
                    </th>
                  )}
                  <th
                    className={`text-right font-medium px-1.5 py-0.5 whitespace-nowrap ${sub(c) ? "" : "border-l border-border"} ${headClass(c.kind)}`}
                  >
                    <button
                      onClick={() => !orig && toggleCol(c.key)}
                      className="inline-flex items-center gap-1 hover:text-primary"
                      title={openCols[c.key] ? "Ocultar previsto e projetado" : "Mostrar previsto e projetado"}
                    >
                      {!orig && <ChevronRight className={`h-3 w-3 transition-transform ${openCols[c.key] ? "rotate-90" : ""}`} />}
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
                  className={`border-t border-border hover:bg-accent/40 ${isGroup ? "font-semibold bg-muted/20" : ""} ${node.label === "Financeiro" ? "font-semibold" : ""} ${isRatio ? "italic" : ""}`}
                >
                  <td
                    className={`px-3 py-1.5 sticky left-0 whitespace-nowrap ${isGroup ? "bg-muted/20" : "bg-card"}`}
                    style={{ paddingLeft: `${0.75 + depth * 0.8}rem` }}
                  >
                    {isGroup ? (
                      <button onClick={() => toggleRow(node.id)} className="inline-flex items-center gap-1 hover:text-primary">
                        <ChevronRight className={`h-3 w-3 transition-transform ${openRows[node.id] ? "rotate-90" : ""}`} />
                        {node.label}
                      </button>
                    ) : (
                      node.label
                    )}
                  </td>
                  {COLS.map((c) => {
                    let previsto: number;
                    let realizado: number;
                    let projetado: number;
                    if (isRatio) {
                      const num = sumVals(node.ratio!.num, c);
                      const den = sumVals(node.ratio!.den, c);
                      previsto = Math.abs(den.previsto) >= 0.005 ? (Math.abs(num.previsto) / Math.abs(den.previsto)) * 100 : 0;
                      realizado = Math.abs(den.realizado) >= 0.005 ? (Math.abs(num.realizado) / Math.abs(den.realizado)) * 100 : 0;
                      projetado = Math.abs(den.projetado) >= 0.005 ? (Math.abs(num.projetado) / Math.abs(den.projetado)) * 100 : 0;
                    } else {
                      const v = sumVals(node.items, c);
                      previsto = v.previsto;
                      realizado = v.realizado;
                      projetado = v.projetado;
                    }
                    const title = `${node.label} — ${c.label}`;
                    const show = (v: number) => (isRatio ? (Math.abs(v) < 0.005 ? "-" : pctFmt(v)) : fmt(v));
                    return (
                      <Fragment key={c.key}>
                        {sub(c) && (
                          <td
                            className="px-1.5 py-1.5 text-right tabular-nums whitespace-nowrap border-l border-border bg-muted/30 text-orange-500"
                            onContextMenu={(e) => !isRatio && showPctTip(e, c, previsto, `${c.label} · Previsto`)}
                          >
                            {show(previsto)}
                          </td>
                        )}
                        {sub(c) && showProj(c) && (
                          <td
                            className="px-1.5 py-1.5 text-right tabular-nums whitespace-nowrap border-l border-border bg-muted/30 text-foreground/80"
                            onContextMenu={(e) => !isRatio && showPctTip(e, c, projetado, `${c.label} · Projetado`)}
                          >
                            {show(projetado)}
                          </td>
                        )}
                        <td
                          className={`px-1.5 py-1.5 text-right tabular-nums whitespace-nowrap cursor-help ${orig ? "text-orange-500" : corReal(c)} ${sub(c) ? "" : "border-l border-border"} ${bodyClass(c.kind)}`}
                          onMouseEnter={(e) => showTip(e, title, previsto, realizado, { invert: isRatio, pp: isRatio, projetado: showProj(c) ? projetado : null })}
                          onMouseMove={(e) => showTip(e, title, previsto, realizado, { invert: isRatio, pp: isRatio, projetado: showProj(c) ? projetado : null })}

                          onMouseLeave={() => !tip?.pinned && setTip(null)}
                          onContextMenu={(e) => !isRatio && showPctTip(e, c, realizado, `${c.label} · Realizado`)}
                        >
                          {show(orig ? previsto : realizado)}
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              );
            })}

            <tr className="border-t-2 border-border bg-muted/60 font-semibold">
              <td className="px-3 py-2 sticky left-0 bg-muted/60">Resultado do período</td>
              {COLS.map((c) => {
                const { previsto, realizado, projetado } = totalVals(c);
                return (
                  <Fragment key={c.key}>
                    {sub(c) && (
                      <td className="px-1.5 py-2 text-right tabular-nums whitespace-nowrap border-l border-border text-orange-500">
                        {fmt(previsto)}
                      </td>
                    )}
                    {sub(c) && showProj(c) && (
                      <td className="px-1.5 py-2 text-right tabular-nums whitespace-nowrap border-l border-border text-foreground/80">
                        {fmt(projetado)}
                      </td>
                    )}
                    <td
                      className={`px-1.5 py-2 text-right tabular-nums whitespace-nowrap cursor-help ${orig ? "text-orange-500" : corReal(c)} ${sub(c) ? "" : "border-l border-border"}`}
                      onMouseEnter={(e) => showTip(e, `Resultado — ${c.label}`, previsto, realizado, { projetado: showProj(c) ? projetado : null })}
                      onMouseMove={(e) => showTip(e, `Resultado — ${c.label}`, previsto, realizado, { projetado: showProj(c) ? projetado : null })}
                      onMouseLeave={() => !tip?.pinned && setTip(null)}
                      onContextMenu={(e) => showPctTip(e, c, realizado, `${c.label} · Resultado`)}
                    >
                      {fmt(orig ? previsto : realizado)}
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
          {tip.d.lines.map((l, i) => (
            <div key={l.label} className={i > 0 ? "pt-1 border-t border-border/60" : ""}>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{l.label}</div>
              <div
                className={`flex items-center gap-1.5 ${
                  l.neutral ? "text-muted-foreground" : l.positive ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                <Coins className="h-3.5 w-3.5" />
                {l.abs}
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  l.neutral ? "text-muted-foreground" : l.positive ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {(l.up ?? l.positive) ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {l.pct}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
      {(() => {
        const acum = COLS.find((c) => c.key === "acum");
        if (!acum) return null;
        const v = (re: RegExp) => items.filter((i) => re.test(i)).reduce((t, i) => t + cellVals(i, acum).realizado, 0);
        const opPrinc = v(/\|\s*FATURAMENTO/i) + v(/COPARTICIPA/i) + v(/DESPESAS ASSISTENCIAIS/i);
        const opTotal = opPrinc + v(/IMPOSTOS DIRETOS/i) + v(/PROVIS[ÕO]ES OPERACIONAIS/i) + v(/COMERCIALIZA/i) + v(/OUTRAS RECEITAS OPERACIONAIS/i);
        const adm = v(/\|\s*PESSOAL/i) + v(/MARKETING/i) + v(/INFORM[ÁA]TICA/i) + v(/DEMAIS DESPESAS ADMINISTRATIVAS/i);
        const ebitda = opTotal + adm;
        const fin = v(/FINANCEIRO/i);
        const rai = ebitda + fin;
        const imp = rai > 0 ? -rai * 0.34 : 0;
        const liq = rai + imp;
        const tom = (x: number) => (x >= 0 ? "text-emerald-600" : "text-rose-600");
        const L = acum.label;
        const cards: { label: string; value: number; bar: string; hint: string; naoRes?: boolean }[] = [
          { label: `Operacional Principal ${L}`, value: opPrinc, bar: "border-l-blue-600", hint: "Entradas − desp. assistenciais" },
          { label: `Operacional Total ${L}`, value: opTotal, bar: "border-l-teal-500", hint: "Principal + demais operacionais" },
          { label: `Desp. Administrativas ${L}`, naoRes: true, value: adm, bar: "border-l-rose-600", hint: "Pessoal, marketing, informática, demais" },
          { label: `EBITDA ${L}`, value: ebitda, bar: "border-l-primary", hint: "Operacional total + administrativas" },
          { label: `Financeiro ${L}`, value: fin, bar: "border-l-orange-500", hint: "Resultado financeiro" },
          { label: `Resultado antes dos impostos ${L}`, value: rai, bar: "border-l-emerald-600", hint: "EBITDA + financeiro" },
          { label: `Impostos Federais ${L}`, naoRes: true, value: imp, bar: "border-l-rose-600", hint: "IR + CSLL 34% s/ resultado positivo" },
          { label: `Resultado Líquido ${L}`, value: liq, bar: "border-l-blue-600", hint: "Resultado − impostos federais" },
        ];
        return (
          <div className="grid grid-flow-col auto-cols-fr gap-3 p-3 bg-card rounded-xl border border-border shadow-sm">
            {cards.map((k) => (
              <div key={k.label} className={`rounded-lg border border-border border-l-4 ${k.bar} bg-background p-3 min-w-0`}>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground truncate" title={k.label}>{k.label}</div>
                <div className={`mt-1 text-lg font-semibold tabular-nums ${k.naoRes ? "text-foreground" : tom(k.value)}`}>{fmt(k.value)}</div>
                <div className="text-[11px] text-muted-foreground truncate" title={k.hint}>{k.hint}</div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
};

export default Orcamento;
