import { useEffect, useMemo, useState } from "react";
import { ChevronRight, CalendarDays, Coins, TrendingUp, TrendingDown, Percent, FileText, BarChart3, LayoutDashboard, Activity, Landmark, Wallet, Banknote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mergeDre } from "@/control/dreLocal";
import { useContabilidadeCharts, fmtBRLFull } from "@/control/contabilidadeCharts";

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

type ColKind = "ano" | "tri" | "mes" | "fixo";

type Col = {
  key: string;
  label: string;
  kind: ColKind;
  cells: string[]; // "ano-mes" keys
  toggleKey?: string;
  open?: boolean;
  isGroupEdge?: boolean;
  prevCells?: string[] | undefined;
  prevLabel?: string | undefined;
};


const headClass = (k: ColKind) =>
  k === "ano"
    ? "bg-primary/15 text-foreground"
    : k === "tri"
    ? "bg-secondary text-secondary-foreground"
    : k === "fixo"
    ? "bg-muted text-muted-foreground"
    : "bg-background text-foreground";

const bodyClass = (k: ColKind) =>
  k === "ano"
    ? "bg-primary/10 font-semibold"
    : k === "tri"
    ? "bg-secondary/50 font-medium"
    : k === "fixo"
    ? "bg-muted/40 font-medium"
    : "";

const cellKey = (ano: number, mes: number) => `${ano}-${mes}`;

const anoLabel = (y: number) => `Total ${y}`;
const triLabel = (y: number, t: number) => `${t}ºT/${String(y).slice(2)}`;
const mesLabel = (y: number, m: number) => `${MES_LABEL[m - 1]}/${String(y).slice(2)}`;

/** variação percentual formatada */
const fmtVar = (atual: number, anterior: number) => {
  const diff = atual - anterior;
  const sinal = diff > 0 ? "+" : diff < 0 ? "−" : "";
  const abs = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Math.abs(diff));
  const pct =
    Math.abs(anterior) < 0.005
      ? "n/d"
      : `${diff / Math.abs(anterior) > 0 ? "+" : ""}${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format((diff / Math.abs(anterior)) * 100)}%`;
  return { txt: `${sinal}${abs}`, pct };
};




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
  const [tip, setTip] = useState<{ d: { title: string; abs: string; pct: string; positive: boolean; neutral?: boolean }; x: number; y: number; pinned?: boolean } | null>(null);
  const [selCol, setSelCol] = useState<string | null>(null);

  const {
    anoAtual: chartAno,
    resultadoMensal,
    receitasVsDespesa,
    opAdmFin,
    sinistralidade,
    operacionalFilhos,
    loading: chartLoading,
  } = useContabilidadeCharts();



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
        setAllRows(mergeDre(parsed));
      } catch (e: any) {
        setError(e?.message || String(e));
        setAllRows(mergeDre([]));
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
      .sort((a, b) => b[0] - a[0])
      .map(([y, tris]) => ({
        ano: y,
        tris: Array.from(tris.entries())
          .sort((a, b) => b[0] - a[0])
          .map(([t, meses]) => ({ tri: t, meses: Array.from(meses).sort((a, b) => b - a) })),
      }));
  }, [rows]);

  /** meses existentes por ano em toda a base (para achar o par anterior) */
  const mesesPorAno = useMemo(() => {
    const m = new Map<number, number[]>();
    for (const r of allRows || []) {
      if (!m.has(r.ano)) m.set(r.ano, []);
      const a = m.get(r.ano)!;
      if (!a.includes(r.mes)) a.push(r.mes);
    }
    m.forEach((v) => v.sort((a, b) => a - b));
    return m;
  }, [allRows]);

  const prevAno = (y: number) => {
    const meses = mesesPorAno.get(y - 1);
    if (!meses?.length) return undefined;
    return { cells: meses.map((m) => cellKey(y - 1, m)), label: anoLabel(y - 1) };
  };
  const prevTri = (y: number, t: number) => {
    const py = t === 1 ? y - 1 : y;
    const pt = t === 1 ? 4 : t - 1;
    const meses = (mesesPorAno.get(py) || []).filter((m) => Math.ceil(m / 3) === pt);
    if (!meses.length) return undefined;
    return { cells: meses.map((m) => cellKey(py, m)), label: triLabel(py, pt) };
  };
  const prevMes = (y: number, mes: number) => {
    const py = mes === 1 ? y - 1 : y;
    const pm = mes === 1 ? 12 : mes - 1;
    if (!(mesesPorAno.get(py) || []).includes(pm)) return undefined;
    return { cells: [cellKey(py, pm)], label: mesLabel(py, pm) };
  };

  const COLS = useMemo<Col[]>(() => {
    const out: Col[] = [];
    for (const y of structure) {
      const yKey = `y:${y.ano}`;
      const yOpen = !!openCols[yKey];
      const allCells = y.tris.flatMap((t) => t.meses.map((m) => cellKey(y.ano, m)));
      const py = prevAno(y.ano);
      if (!yOpen) {
        out.push({ key: yKey, label: String(y.ano), kind: "ano", cells: allCells, toggleKey: yKey, open: false, isGroupEdge: true, prevCells: py?.cells, prevLabel: py?.label });
        continue;
      }
      for (const t of y.tris) {
        const tKey = `t:${y.ano}:${t.tri}`;
        const tOpen = !!openCols[tKey];
        const tCells = t.meses.map((m) => cellKey(y.ano, m));
        const pt = prevTri(y.ano, t.tri);
        if (!tOpen) {
          out.push({ key: tKey, label: triLabel(y.ano, t.tri), kind: "tri", cells: tCells, toggleKey: tKey, open: false, prevCells: pt?.cells, prevLabel: pt?.label });
          continue;
        }
        for (const m of t.meses) {
          const pm = prevMes(y.ano, m);
          out.push({ key: `m:${y.ano}:${m}`, label: mesLabel(y.ano, m), kind: "mes", cells: [cellKey(y.ano, m)], prevCells: pm?.cells, prevLabel: pm?.label });
        }
        out.push({ key: `t:${y.ano}:${t.tri}:tot`, label: triLabel(y.ano, t.tri), kind: "tri", cells: tCells, toggleKey: tKey, open: true, prevCells: pt?.cells, prevLabel: pt?.label });
      }
      out.push({ key: `${yKey}:tot`, label: String(y.ano), kind: "ano", cells: allCells, toggleKey: yKey, open: true, isGroupEdge: true, prevCells: py?.cells, prevLabel: py?.label });
    }

    for (const fy of FIXED_YEARS) {
      const meses = Array.from(new Set((allRows || []).filter((r) => r.ano === fy).map((r) => r.mes)));
      if (!meses.length) continue;
      const py = prevAno(fy);
      out.push({
        key: `fx:${fy}`,
        label: String(fy),
        kind: "fixo",
        cells: meses.map((m) => cellKey(fy, m)),
        isGroupEdge: true,
        prevCells: py?.cells,
        prevLabel: py?.label,
      });
    }
    return out;
  }, [structure, openCols, allRows, mesesPorAno]);


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
  const grandPrevByCol: Record<string, number> = {};
  tree.forEach((n) => {
    COLS.forEach((c) => {
      grandByCol[c.key] = (grandByCol[c.key] ?? 0) + sumCells(n, c.cells);
      if (c.prevCells) grandPrevByCol[c.key] = (grandPrevByCol[c.key] ?? 0) + sumCells(n, c.prevCells);
    });
  });

  const colLabel = (c: Col) => (c.kind === "ano" || c.kind === "fixo" ? anoLabel(Number(c.label)) : c.label);

  // ===== Cards totalizadores: reagem à coluna clicada =====
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const pct = (v: number) => `${v.toFixed(1)}%`;
  const toneKpi = (v: number) => (v >= 0 ? "text-emerald-600" : "text-rose-600");

  const selColObj = selCol ? COLS.find((c) => c.key === selCol) ?? null : null;
  const periodoSel = selColObj ? colLabel(selColObj) : null;

  const kpiSel = (() => {
    if (!selColObj || !allRows) return null;
    const cells = new Set(selColObj.cells);
    let fat = 0, copa = 0, desp = 0, ebitda = 0, fin = 0, op = 0, adm = 0;
    const opG3 = new Map<string, number>();
    for (const r of allRows) {
      if (!cells.has(cellKey(r.ano, r.mes))) continue;
      const g4 = r.g4.replace(/^\d+\|/, "").toUpperCase();
      if (g4.startsWith("FATURAMENTO")) fat += r.valor;
      else if (g4.startsWith("COPARTICIPA")) copa += r.valor;
      else if (g4.startsWith("DESP. ASSISTENCIAL")) desp += Math.abs(r.valor);
      if (/EBITDA/i.test(r.g1)) ebitda += r.valor;
      else fin += r.valor;
      const g2 = r.g2.replace(/^\d+\|/, "").toUpperCase();
      if (!/FINANCEIRO/i.test(r.g1) && g2.startsWith("OPERACIONAL")) {
        op += r.valor;
        const nome = stripPrefix(r.g3) || "(sem grupo)";
        opG3.set(nome, (opG3.get(nome) || 0) + r.valor);
      } else if (g2.startsWith("ADMINISTRATIVO")) adm += Math.abs(r.valor);
    }
    const rec = fat + copa;
    const maior = Array.from(opG3.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value !== 0)
      .sort((a, b) => b.value - a.value)[0];
    return { fat, rec, desp, ebitda, fin, resultado: ebitda + fin, op, adm, sin: rec ? (desp / rec) * 100 : 0, maior };
  })();

  const ultimoMes = resultadoMensal[resultadoMensal.length - 1]?.mes ?? "";
  const ebitda = sum(resultadoMensal.map((d) => d.EBITDA));
  const financeiro = sum(resultadoMensal.map((d) => d.Financeiro));
  const resultado = sum(resultadoMensal.map((d) => d.Resultado));
  const faturamento = sum(receitasVsDespesa.map((d) => d.Faturamento));
  const receitas = sum(receitasVsDespesa.map((d) => d.Receitas));
  const despAssist = sum(receitasVsDespesa.map((d) => d["Desp. Assistencial"]));
  const sinistroMedio = receitas ? (despAssist / receitas) * 100 : 0;
  const sinistroUlt = sinistralidade[sinistralidade.length - 1]?.Sinistralidade ?? 0;
  const operacional = sum(opAdmFin.map((d) => d.Operacional));
  const administrativo = sum(opAdmFin.map((d) => d.Administrativo));
  const maiorOp = operacionalFilhos[0];

  const kpis = chartLoading
    ? []
    : kpiSel
    ? [
        { label: `Faturamento ${periodoSel}`, value: fmtBRLFull(kpiSel.fat), hint: "Somente faturamento", icon: Coins, tone: "text-emerald-600" },
        { label: "Desp. assistencial", value: fmtBRLFull(kpiSel.desp), hint: `Sinistralidade ${pct(kpiSel.sin)}`, icon: TrendingDown, tone: "text-rose-600" },
        { label: "EBITDA", value: fmtBRLFull(kpiSel.ebitda), hint: `Período ${periodoSel}`, icon: TrendingUp, tone: toneKpi(kpiSel.ebitda) },
        { label: "Resultado geral", value: fmtBRLFull(kpiSel.resultado), hint: "EBITDA + financeiro", icon: Landmark, tone: toneKpi(kpiSel.resultado) },
        { label: "Sinistralidade", value: pct(kpiSel.sin), hint: `Desp. ÷ receitas · ${periodoSel}`, icon: Percent, tone: kpiSel.sin > 80 ? "text-rose-600" : "text-emerald-600" },
        { label: "Operacional", value: fmtBRLFull(kpiSel.op), hint: kpiSel.maior ? `Maior: ${kpiSel.maior.name}` : "—", icon: Activity, tone: toneKpi(kpiSel.op) },
        { label: "Administrativo", value: fmtBRLFull(kpiSel.adm), hint: "Em módulo", icon: Wallet, tone: "text-rose-600" },
        { label: "Financeiro", value: fmtBRLFull(kpiSel.fin), hint: `Período ${periodoSel}`, icon: Banknote, tone: toneKpi(kpiSel.fin) },
      ]
    : [
        { label: `Faturamento ${chartAno}`, value: fmtBRLFull(faturamento), hint: "Somente faturamento", icon: Coins, tone: "text-emerald-600" },
        { label: "Desp. assistencial", value: fmtBRLFull(despAssist), hint: `Sinistralidade média ${pct(sinistroMedio)}`, icon: TrendingDown, tone: "text-rose-600" },
        { label: "EBITDA acumulado", value: fmtBRLFull(ebitda), hint: `Último mês: ${ultimoMes}`, icon: TrendingUp, tone: toneKpi(ebitda) },
        { label: "Resultado geral", value: fmtBRLFull(resultado), hint: "EBITDA + financeiro", icon: Landmark, tone: toneKpi(resultado) },
        { label: "Sinistralidade", value: pct(sinistroUlt), hint: `${ultimoMes} · média ${pct(sinistroMedio)}`, icon: Percent, tone: sinistroUlt > 80 ? "text-rose-600" : "text-emerald-600" },
        { label: "Operacional", value: fmtBRLFull(operacional), hint: maiorOp ? `Maior: ${maiorOp.name}` : "—", icon: Activity, tone: toneKpi(operacional) },
        { label: "Administrativo", value: fmtBRLFull(administrativo), hint: "Acumulado em módulo", icon: Wallet, tone: "text-rose-600" },
        { label: "Financeiro", value: fmtBRLFull(financeiro), hint: `Acumulado ${chartAno}`, icon: Banknote, tone: toneKpi(financeiro) },
      ];

  type TipData = { title: string; abs: string; pct: string; positive: boolean; neutral?: boolean };

  const tipFor = (c: Col, atual: number, anterior?: number): TipData => {
    if (anterior === undefined)
      return { title: colLabel(c), abs: fmt(atual), pct: "sem período anterior", positive: true, neutral: true };
    const { txt, pct } = fmtVar(atual, anterior);
    const diff = atual - anterior;
    return {
      title: `${c.prevLabel} x ${colLabel(c)}`,
      abs: `${diff > 0 ? "+ " : diff < 0 ? "− " : ""}${txt.replace(/^[+−]/, "")}`,
      pct: pct === "n/d" ? "n/d" : `${diff > 0 ? "+ " : diff < 0 ? "− " : ""}${pct.replace(/^[+−-]/, "")}`,
      positive: diff >= 0,
      neutral: Math.abs(diff) < 0.005,
    };
  };

  const showTip = (e: React.MouseEvent, d: TipData) => {
    if (tip?.pinned) return;
    setTip({ d, x: e.clientX + 14, y: e.clientY + 14 });
  };

  /** nó de Faturamento (busca recursiva pelo rótulo) */
  const faturNode = useMemo<Node | null>(() => {
    let found: Node | null = null;
    const walkFind = (ns: Node[]) => {
      for (const n of ns) {
        if (!found && /faturamento/i.test(n.label)) found = n;
        if (!found) walkFind(n.children);
      }
    };
    walkFind(tree);
    return found;
  }, [tree]);

  const showPctTip = (e: React.MouseEvent, c: Col, valor: number) => {
    e.preventDefault();
    const base = faturNode ? sumCells(faturNode, c.cells) : 0;
    const has = Math.abs(base) >= 0.005;
    const p = has ? (valor / Math.abs(base)) * 100 : 0;
    setTip({
      pinned: true,
      x: e.clientX + 14,
      y: e.clientY + 14,
      d: {
        title: `% sobre Faturamento — ${colLabel(c)}`,
        abs: `${fmt(valor)} / ${fmt(base)}`,
        pct: has ? `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(p)}%` : "n/d",
        positive: p >= 0,
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






  const toggle = (k: string) => setOpen((p) => ({ ...p, [k]: !p[k] }));
  const toggleCol = (k: string) => setOpenCols((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="space-y-6">
      {kpis.length > 0 && (
        <section className="space-y-2">
          {periodoSel && (
            <div className="flex items-center justify-between gap-2 text-xs bg-primary/10 border border-primary/30 rounded-lg px-3 py-2">
              <span className="text-foreground">
                Cards filtrados por <strong>{periodoSel}</strong> — clique em outra coluna para trocar.
              </span>
              <button
                onClick={() => setSelCol(null)}
                className="px-2 py-1 rounded-md border border-border bg-background hover:bg-accent hover:text-primary shrink-0"
              >
                Voltar ao acumulado
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} className="bg-card rounded-xl border border-border shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{k.label}</span>
                  <Icon className={`h-4 w-4 ${k.tone}`} />
                </div>
                <div className={`mt-2 text-xl font-semibold ${k.tone}`}>{k.value}</div>
                <div className="mt-1 text-xs text-muted-foreground truncate">{k.hint}</div>
              </div>
            );
          })}
          </div>
        </section>
      )}

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
                  onClick={() => setSelCol((k) => (k === c.key ? null : c.key))}
                  title="Clique para atualizar os cards com este período"
                  className={`text-right font-medium px-3 py-3 whitespace-nowrap cursor-pointer select-none ${headClass(c.kind)} ${c.isGroupEdge ? "border-l border-border" : ""} ${selCol === c.key ? "ring-2 ring-inset ring-primary text-primary" : "hover:text-primary"}`}
                >
                  {c.toggleKey ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleCol(c.toggleKey!); }}
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
                        onMouseEnter={(e) => showTip(e, tipFor(c, v, c.prevCells ? sumCells(node, c.prevCells) : undefined))}
                        onMouseMove={(e) => showTip(e, tipFor(c, v, c.prevCells ? sumCells(node, c.prevCells) : undefined))}
                        onMouseLeave={() => setTip((t) => (t?.pinned ? t : null))}
                        onContextMenu={(e) => showPctTip(e, c, v)}
                        className={`px-3 py-2 text-right tabular-nums ${bodyClass(c.kind)} ${c.isGroupEdge ? "border-l border-border" : ""} ${selCol === c.key ? "bg-primary/10" : ""} ${v < 0 ? "text-destructive" : "text-foreground"}`}
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
                  <td
                    key={c.key}
                    onMouseEnter={(e) => showTip(e, tipFor(c, v, c.prevCells ? grandPrevByCol[c.key] ?? 0 : undefined))}
                    onMouseMove={(e) => showTip(e, tipFor(c, v, c.prevCells ? grandPrevByCol[c.key] ?? 0 : undefined))}
                    onMouseLeave={() => setTip((t) => (t?.pinned ? t : null))}
                    onContextMenu={(e) => showPctTip(e, c, v)}
                    className={`px-3 py-3 text-right tabular-nums ${bodyClass(c.kind)} ${c.isGroupEdge ? "border-l border-border" : ""} ${selCol === c.key ? "bg-primary/10" : ""} ${v < 0 ? "text-destructive" : "text-foreground"}`}
                  >
                    {fmt(v)}
                  </td>
                );
              })}
            </tr>


          </tbody>
        </table>
      </div>

      {tip && (
        <div
          className="fixed z-50 pointer-events-none rounded-lg border border-border bg-popover text-popover-foreground shadow-lg px-4 py-3 space-y-1.5 text-sm"
          style={{ left: tip.x, top: tip.y }}
        >
          <div className="flex items-center gap-2 font-semibold">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span>{tip.d.title}</span>
          </div>
          <div className={`flex items-center gap-2 font-semibold ${tip.d.neutral ? "text-muted-foreground" : tip.d.positive ? "text-emerald-600" : "text-destructive"}`}>
            <Coins className="h-4 w-4" />
            <span>{tip.d.abs}</span>
          </div>
          <div className={`flex items-center gap-2 font-semibold ${tip.d.neutral ? "text-muted-foreground" : tip.d.positive ? "text-emerald-600" : "text-destructive"}`}>
            {tip.d.positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>{tip.d.pct}</span>
          </div>
        </div>
      )}
      </section>
    </div>
  );
};

export default DREGerencialPE;

