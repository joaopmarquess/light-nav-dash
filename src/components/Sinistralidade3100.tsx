import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown, LineChart as LineChartIcon, FileDown, Printer, X, Loader2 } from "lucide-react";
import FunLoader from "@/components/FunLoader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { attachTimbrado, loadTimbrado } from "@/lib/pdfTimbrado";
import {
  PDF_COLORS,
  baseTableStyles,
  drawReportHeading,
  groupRowStyles,
  subtotalRowStyles,
  totalRowStyles,
} from "@/lib/pdfTheme";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  Tooltip as RTooltip, ResponsiveContainer,
} from "recharts";


type Raw = [string, string, string, string, string, number, number, number, number, number, number, number, number, number, number, number, string, string];

type Desp = {
  rec_total: number;
  rec_tm: number;
  rec_cpa: number;
  vrdespesas: number;
  internacao: number;
  terapia: number;
  exame: number;
  consulta: number;
  emergencia: number;
  demais: number;
};

type Benef = Desp & { codigo: string; nome: string; contrato: string; relacao: string; titular?: string; outros?: number };

const isTitular = (rel?: string) => (rel || "").toUpperCase().startsWith("TITULAR");

const benefLabel = (b: { nome: string; relacao?: string; codigo: string; titular?: string; outros?: number }) =>
  b.outros ? b.nome : `${b.nome} (${b.relacao || "—"}-${b.codigo})${b.titular ? `\nTitular: ${b.titular}` : ""}`;
type Plano = Desp & { plano: string; benefs: Benef[] };
type Periodo = Desp & { periodo: string; planos: Plano[] };

type SortKey = "PLANO" | "vrdespesas" | "internacao" | "terapia" | "exame" | "consulta" | "emergencia" | "demais";

const TOP_N = 10;

const fmtNum = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n: number) => n.toLocaleString("pt-BR");
const fmtShare = (v: number, total: number) => {
  if (!total) return "0,00%";
  return `${((v / total) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};
const fmtComp = (mabas: string) =>
  mabas && mabas.length === 6 ? `${mabas.slice(4, 6)}/${mabas.slice(0, 4)}` : mabas;

const zero = (): Desp => ({
  rec_total: 0, rec_tm: 0, rec_cpa: 0,
  vrdespesas: 0, internacao: 0, terapia: 0, exame: 0, consulta: 0, emergencia: 0, demais: 0,
});
const saldoOf = (m: Desp) => m.rec_total - m.vrdespesas;
const sinOf = (m: Desp) => (m.rec_total ? m.vrdespesas / m.rec_total : 0);
const fmtPct = (v: number) =>
  `${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const add = (t: Desp, r: Raw) => {
  t.rec_total += r[5] ?? 0;
  t.rec_tm += r[14] ?? 0;
  t.rec_cpa += r[15] ?? 0;
  t.vrdespesas += r[6];
  t.internacao += r[7];
  t.terapia += r[8];
  t.exame += r[9];
  t.consulta += r[10];
  t.emergencia += r[11];
  t.demais += r[12];
};
const addDesp = (t: Desp, s: Desp) => {
  t.rec_total += s.rec_total;
  t.rec_tm += s.rec_tm;
  t.rec_cpa += s.rec_cpa;
  t.vrdespesas += s.vrdespesas;
  t.internacao += s.internacao;
  t.terapia += s.terapia;
  t.exame += s.exame;
  t.consulta += s.consulta;
  t.emergencia += s.emergencia;
  t.demais += s.demais;
};

const DESP_COLS: { key: keyof Desp; label: string }[] = [
  { key: "internacao", label: "Internação" },
  { key: "terapia", label: "Terapia" },
  { key: "exame", label: "Exame" },
  { key: "consulta", label: "Consulta" },
  { key: "emergencia", label: "Emergência" },
  { key: "demais", label: "Demais" },
];

const DespTooltip = ({ title, m }: { title: string; m: Desp }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-2">
        {fmtNum(m.vrdespesas)}
      </span>
    </TooltipTrigger>
    <TooltipContent side="left" className="p-0">
      <div className="min-w-[220px] p-2">
        <div className="text-xs font-semibold mb-1.5 border-b border-border pb-1">{title}</div>
        <table className="text-[11px] w-full">
          <tbody>
            {DESP_COLS.map(({ key, label }) => (
              <tr key={label}>
                <td className="pr-3 py-0.5">{label}</td>
                <td className="text-right tabular-nums">
                  {fmtNum(m[key])} <span className="text-muted-foreground">({fmtShare(m[key], m.vrdespesas)})</span>
                </td>
              </tr>
            ))}
            <tr className="border-t border-border font-semibold">
              <td className="pr-3 pt-1">Total</td>
              <td className="text-right tabular-nums pt-1">{fmtNum(m.vrdespesas)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </TooltipContent>
  </Tooltip>
);

export default function Sinistralidade3100({ embedded = false }: { embedded?: boolean } = {}) {
  const [rows, setRows] = useState<Raw[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodoLabel, setPeriodoLabel] = useState("");
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandedPlano, setExpandedPlano] = useState<Record<string, boolean>>({});
  const [sortKey, setSortKey] = useState<SortKey>("vrdespesas");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/data/3100_sinistralidade.json");
        const json = await res.json();
        if (!alive) return;
        setRows((json.rows ?? []) as Raw[]);
        setPeriodoLabel(String(json.periodoLabel ?? ""));
      } catch (e) {
        console.error("3100 load error", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const periodos = useMemo<Periodo[]>(() => {
    const fq = filter.trim().toLowerCase();
    const byPeriodo = new Map<string, Periodo>();
    const plMaps = new Map<string, Map<string, Plano>>();
    const bMaps = new Map<string, Map<string, Benef>>();

    for (const r of rows) {
      if (fq && !(
        r[1].toLowerCase().includes(fq) ||
        r[2].toLowerCase().includes(fq) ||
        r[3].toLowerCase().includes(fq) ||
        r[4].toLowerCase().includes(fq) ||
        (r[17] ?? "").toLowerCase().includes(fq)
      )) continue;

      const ciclo = r[0];

      let p = byPeriodo.get(ciclo);
      if (!p) {
        p = { periodo: ciclo, planos: [], ...zero() };
        byPeriodo.set(ciclo, p);
        plMaps.set(ciclo, new Map());
      }
      add(p, r);

      const pm = plMaps.get(ciclo)!;
      let pl = pm.get(r[1]);
      if (!pl) {
        pl = { plano: r[1], benefs: [], ...zero() };
        pm.set(r[1], pl);
        p.planos.push(pl);
        bMaps.set(`${ciclo}|${r[1]}`, new Map());
      }
      add(pl, r);

      const bm = bMaps.get(`${ciclo}|${r[1]}`)!;
      let b = bm.get(r[3]);
      if (!b) {
        const cod = String(r[3] ?? "");
        const rel = (r[16] ?? "") as string;
        const tit = isTitular(rel) ? "" : String(r[17] ?? "");
        b = { codigo: cod, nome: r[4], contrato: r[2], relacao: rel, titular: tit || undefined, ...zero() };
        bm.set(r[3], b);
        pl.benefs.push(b);
      }
      add(b, r);
    }


    const arr = Array.from(byPeriodo.values());
    for (const p of arr) {
      for (const pl of p.planos) {
        pl.benefs.sort((a, b) => b.vrdespesas - a.vrdespesas);
        if (pl.benefs.length > TOP_N) {
          const resto = pl.benefs.slice(TOP_N);
          const outros: Benef = {
            codigo: "",
            contrato: "",
            relacao: "",
            nome: `OUTROS (${resto.length} beneficiários)`,
            outros: resto.length,
            ...zero(),
          };
          for (const b of resto) addDesp(outros, b);
          pl.benefs = [...pl.benefs.slice(0, TOP_N), outros];
        }
      }
    }
    arr.sort((a, b) => b.periodo.localeCompare(a.periodo));
    return arr;
  }, [rows, filter]);

  const fmtCiclo = (ciclo: string) => {
    const [a, b] = ciclo.split("-");
    return `${fmtComp(a)} a ${fmtComp(b)}`;
  };

  const maxDesp = useMemo(
    () => periodos.reduce((m, t) => Math.max(m, t.vrdespesas), 0),
    [periodos]
  );

  const totais = useMemo(() => {
    const t = zero();
    for (const p of periodos) addDesp(t, p);
    return t;
  }, [periodos]);

  const [showChart, setShowChart] = useState(false);

  // Gráfico: Top 15 beneficiários por despesa no período consolidado
  const chart = useMemo(() => {
    const fq = filter.trim().toLowerCase();
    const acc = new Map<string, { nome: string; valor: number }>();

    for (const r of rows) {
      if (fq && !(
        r[1].toLowerCase().includes(fq) ||
        r[2].toLowerCase().includes(fq) ||
        r[3].toLowerCase().includes(fq) ||
        r[4].toLowerCase().includes(fq) ||
        (r[17] ?? "").toLowerCase().includes(fq)
      )) continue;
      const key = r[3];
      const cur = acc.get(key) ?? { nome: r[4], valor: 0 };
      cur.valor += r[6];
      acc.set(key, cur);
    }

    const data = Array.from(acc.values())
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 15)
      .map((b) => ({ nome: b.nome, valor: b.valor }));
    return { data };
  }, [rows, filter]);

  const CHART_COLORS = [
    "#f97316", "#a855f7", "#d4af37",
    "#fb923c", "#c084fc", "#eab308",
    "#ea580c", "#7e22ce", "#b8860b",
    "#fdba74", "#d8b4fe", "#facc15",
  ];

  const onSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "PLANO" ? "asc" : "desc");
    }
  };
  const arrow = (k: SortKey) =>
    sortKey === k ? (
      sortDir === "asc" ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />
    ) : null;

  const sortPlanos = (list: Plano[]) => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === "PLANO") return a.plano.localeCompare(b.plano, "pt-BR") * dir;
      return ((a as any)[sortKey] - (b as any)[sortKey]) * dir;
    });
  };

  const [pdfOpen, setPdfOpen] = useState(false);
  const abertos = useMemo(
    () => periodos.filter((p) => expanded[p.periodo]),
    [periodos, expanded]
  );

  const buildDoc = async () => {
    const timbradoDataUrl = await loadTimbrado();
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    attachTimbrado(doc, timbradoDataUrl);
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginL = 10;
    const marginR = 10;
    const marginT = 56;
    const marginB = 16;
    const usableW = pageW - marginL - marginR;

    let currentSecao = "";
    const header = () =>
      drawReportHeading(doc, {
        title: "3100 · Top 10 Despesas por Plano",
        plano: `Competências: ${periodoLabel}`,
        secao: currentSecao,
        marginL,
        marginR,
      });

    const base = baseTableStyles(6.2);
    const common: Parameters<typeof autoTable>[1] = {
      ...base,
      styles: { ...base.styles, cellPadding: 0.6, minCellHeight: 0, overflow: "ellipsize" },
      headStyles: { ...base.headStyles, halign: "center", fontSize: 6.2, cellPadding: 0.5, minCellHeight: 0 },
      footStyles: { ...(base as any).footStyles, cellPadding: 0.6, minCellHeight: 0 },
      margin: { left: marginL, right: marginR, top: marginT, bottom: marginB },
      didDrawPage: () => { header(); },
    };


    const colW = {
      nome: usableW * 0.34,
      val: (usableW * 0.66) / 7,
    };
    const columnStyles: Record<number, any> = {
      0: { cellWidth: colW.nome, overflow: "linebreak", fontSize: 5.2 },
    };
    for (let i = 1; i <= 7; i++) columnStyles[i] = { cellWidth: colW.val, halign: "right", fontSize: 6 };

    const resumo = (m: Desp) =>
      `Rec TM ${fmtNum(m.rec_tm)}  |  Rec CPA ${fmtNum(m.rec_cpa)}  |  Receita ${fmtNum(m.rec_total)}  |  Despesas ${fmtNum(m.vrdespesas)}  |  Saldo ${fmtNum(saldoOf(m))}  |  Sin ${fmtPct(sinOf(m))}`;

    abertos.forEach((p, idx) => {
      if (idx > 0) doc.addPage();
      currentSecao = `Período ${fmtCiclo(p.periodo)} · Total de Despesas: ${fmtNum(p.vrdespesas)}`;

      let y = marginT;
      const planos = sortPlanos(p.planos);

      for (const pl of planos) {
        const body: any[] = pl.benefs.map((b, i) => [
          b.outros ? b.nome : `${i + 1}. ${benefLabel(b)}`,
          ...DESP_COLS.map(({ key }) => fmtNum(b[key])),
          fmtNum(b.vrdespesas),
        ]);

        autoTable(doc, {
          ...common,
          startY: y,
          showFoot: "lastPage",
          head: [
            [{ content: pl.plano, colSpan: 8, styles: { ...groupRowStyles, halign: "left", cellPadding: 0.6, minCellHeight: 0 } }],
            [{
              content: resumo(pl),
              colSpan: 8,
              styles: {
                ...subtotalRowStyles,
                halign: "left" as const,
                fontSize: 6,
                cellPadding: 0.6,
                minCellHeight: 0,
                fillColor: PDF_COLORS.zebra,
                textColor: PDF_COLORS.navy,
              },
            }],
            [
              "Beneficiário",
              ...DESP_COLS.map(({ label }) => ({ content: label, styles: { halign: "right" as const } })),
              { content: "Total Despesa", styles: { halign: "right" as const } },
            ],
          ],
          body,
          foot: [[
            { content: `Subtotal ${pl.plano}`, styles: { ...subtotalRowStyles, halign: "left", lineWidth: { top: 0.1, bottom: 0.8, left: 0.1, right: 0 }, lineColor: PDF_COLORS.navy } },
            ...DESP_COLS.map(({ key }) => ({
              content: fmtNum(pl[key]),
              styles: { ...subtotalRowStyles, halign: "right" as const, lineWidth: { top: 0.1, bottom: 0.8, left: 0, right: 0 }, lineColor: PDF_COLORS.navy },
            })),
            { content: fmtNum(pl.vrdespesas), styles: { ...subtotalRowStyles, halign: "right" as const, lineWidth: { top: 0.1, bottom: 0.8, left: 0, right: 0.1 }, lineColor: PDF_COLORS.navy } },
          ]],
          columnStyles,
        });
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2;
        if (y > pageH - marginB - 24) { doc.addPage(); y = marginT; }
      }

      autoTable(doc, {
        ...common,
        startY: y,
        body: [[
          { content: `TOTAL DO PERÍODO ${fmtCiclo(p.periodo)}`, styles: { ...totalRowStyles, halign: "left", fontSize: 7 } },
          ...DESP_COLS.map(({ key }) => ({ content: fmtNum(p[key]), styles: { ...totalRowStyles, halign: "right" as const, fontSize: 7 } })),
          { content: fmtNum(p.vrdespesas), styles: { ...totalRowStyles, halign: "right" as const, fontSize: 7 } },
        ]],
        columnStyles,
      });
    });

    // Rodapé: apenas p de pp (sem seções)
    const total = doc.getNumberOfPages();
    const footY = pageH - 14;
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      doc.text(`${i} de ${total}`, pageW - marginR, footY, { align: "right" });
    }
    return doc;
  };


  const inputCls =
    "h-8 w-24 px-2 rounded border border-border bg-background text-xs text-foreground tabular-nums focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <TooltipProvider delayDuration={100}>
      <section className={`bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col ${embedded ? "h-full" : "h-[calc(100vh-9rem)]"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-2">
            <span className="shrink-0">3100 · período {periodoLabel}</span>

            <button
              onClick={() => setShowChart(true)}
              className="h-8 px-3 inline-flex items-center gap-1.5 rounded border border-border bg-background text-xs text-foreground hover:bg-accent"
              title="Gráfico de despesas por plano"
            >
              <LineChartIcon className="h-3.5 w-3.5" /> Gráfico
            </button>
            <button
              onClick={() => setPdfOpen(true)}
              disabled={abertos.length === 0}
              className="h-8 px-3 inline-flex items-center gap-1.5 rounded border border-border bg-background text-xs text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              title={abertos.length === 0 ? "Expanda ao menos um período para gerar o PDF" : `Gerar PDF de ${abertos.length} período(s) aberto(s)`}
            >
              <FileDown className="h-3.5 w-3.5" /> Gerar PDF
            </button>

          </div>

          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar por Grupo, Contrato, Código ou Beneficiário"
            className="flex-1 min-w-[220px] max-w-md h-8 px-2 rounded border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="shrink-0">
            <span className="font-semibold text-foreground tabular-nums">{fmtInt(periodos.length)}</span> período(s)
          </span>
        </div>

        <div className="flex-1 overflow-auto border border-border rounded-lg p-4">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <FunLoader />
            </div>
          ) : periodos.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Sem dados para o intervalo informado.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/60 border border-border text-xs font-semibold text-foreground">
                <div className="w-6 shrink-0" />
                <div className="w-40 shrink-0 text-left">TOTAL GERAL</div>
                <div className="flex-1 grid grid-cols-6 gap-2 text-right tabular-nums">
                  {DESP_COLS.map(({ key, label }) => (
                    <span key={key} title={label}>{fmtNum(totais[key])}</span>
                  ))}
                </div>
                <div className="w-40 shrink-0 text-right tabular-nums">
                  <DespTooltip title="TOTAL GERAL · Despesa" m={totais} />
                </div>
              </div>

              {periodos.map((t) => {
                const pct = maxDesp ? (t.vrdespesas / maxDesp) * 100 : 0;
                const isOpen = !!expanded[t.periodo];
                const planos = sortPlanos(t.planos);
                return (
                  <div key={t.periodo} className="border border-border/60 rounded-md">
                    <button
                      onClick={() => setExpanded((p) => ({ ...p, [t.periodo]: !p[t.periodo] }))}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent/40 rounded-md"
                    >
                      <div className="w-6 shrink-0 text-muted-foreground">
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                      <div className="w-40 shrink-0 text-xs font-medium text-foreground text-left">
                        {fmtCiclo(t.periodo)}
                      </div>
                      <div className="flex-1 h-5 bg-muted/40 rounded overflow-hidden">
                        <div className="h-full bg-primary/70" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-56 shrink-0 text-right text-xs tabular-nums text-foreground">
                        <span className="font-semibold">{fmtNum(t.vrdespesas)}</span>
                        <span className="text-muted-foreground"> · despesa total</span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-border/60">
                        <div className="max-h-[60vh] overflow-auto">
                          <table className="w-full text-[9px]">
                            <thead className="sticky top-0 bg-muted/40 z-10">
                              <tr>
                                <th className="px-1 py-1 text-left font-semibold cursor-pointer select-none" onClick={() => onSort("PLANO")}>PLANO {arrow("PLANO")}</th>
                                {DESP_COLS.map(({ key, label }) => (
                                  <th
                                    key={key}
                                    className="px-1 py-1 text-right font-semibold cursor-pointer select-none"
                                    onClick={() => onSort(key as SortKey)}
                                  >
                                    {label} {arrow(key as SortKey)}
                                  </th>
                                ))}
                                <th className="px-1 py-1 text-right font-semibold cursor-pointer select-none" onClick={() => onSort("vrdespesas")}>Total Despesa {arrow("vrdespesas")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {planos.map((pl) => {
                                const pkey = `${t.periodo}::${pl.plano}`;
                                const pOpen = !!expandedPlano[pkey];
                                return (
                                  <Fragment key={pkey}>
                                    <tr className={`border-b border-border/40 hover:bg-accent/30 ${pOpen ? "font-bold" : ""}`}>
                                      <td className="px-1 py-0.5 truncate max-w-[300px]" title={pl.plano}>
                                        <button
                                          onClick={() => setExpandedPlano((s) => ({ ...s, [pkey]: !s[pkey] }))}
                                          className="inline-flex items-center gap-1 hover:text-primary"
                                        >
                                          {pOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                          <span>{pl.plano}</span>
                                        </button>
                                      </td>
                                      {DESP_COLS.map(({ key }) => (
                                        <td key={key} className="px-1 py-0.5 text-right tabular-nums">{fmtNum(pl[key])}</td>
                                      ))}
                                      <td className="px-1 py-0.5 text-right tabular-nums"><DespTooltip title={pl.plano} m={pl} /></td>
                                    </tr>
                                    {pOpen && pl.benefs.map((b, i) => (
                                      <tr
                                        key={`${pkey}::${b.codigo}::${i}`}
                                        className={`border-b border-border/20 ${b.outros ? "bg-muted/20 italic" : "bg-muted/5"}`}
                                      >
                                        <td className="px-1 py-0.5 pl-6 max-w-[300px] text-[7.5px] leading-tight" title={benefLabel(b)}>
                                          {b.outros ? (
                                            <span className="text-muted-foreground">{b.nome}</span>
                                          ) : (
                                            <>
                                              <div className="truncate">
                                                <span className="text-muted-foreground mr-1 tabular-nums">{i + 1}.</span>
                                                {b.nome} <span className="text-muted-foreground">({b.relacao || "—"}-{b.codigo})</span>
                                              </div>
                                              {b.titular && (
                                                <div className="pl-4 truncate text-[6.8px] text-muted-foreground italic">
                                                  Titular: {b.titular}
                                                </div>
                                              )}
                                            </>
                                          )}
                                        </td>
                                        {DESP_COLS.map(({ key }) => (
                                          <td key={key} className="px-1 py-0.5 text-right tabular-nums">{fmtNum(b[key])}</td>
                                        ))}
                                        <td className="px-1 py-0.5 text-right tabular-nums"><DespTooltip title={benefLabel(b)} m={b} /></td>
                                      </tr>
                                    ))}

                                  </Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {pdfOpen && (
        <PdfPreview
          onClose={() => setPdfOpen(false)}
          build={buildDoc}
          fileName={`3100_Top10_${periodoLabel.replace(/\D/g, "")}.pdf`}
          periodos={abertos.length}
        />
      )}

      <Dialog open={showChart} onOpenChange={setShowChart}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Despesa por Plano · {fmtComp(mIni)} a {fmtComp(mFim)}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[60vh]">
            {chart.data.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Sem dados para o intervalo informado.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart.data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v) => fmtInt(Math.round(Number(v)))}
                  />
                  <RTooltip
                    formatter={(v: any, n: any) => [v == null ? "-" : fmtNum(Number(v)), n]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {chart.planos.map((p, i) => (
                    <Line
                      key={p}
                      type="monotone"
                      dataKey={p}
                      name={p}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

// ============ Pré-visualização do PDF ============

function PdfPreview({
  onClose,
  build,
  fileName,
  periodos,
}: {
  onClose: () => void;
  build: () => Promise<jsPDF>;
  fileName: string;
  periodos: number;
}) {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const docRef = useRef<jsPDF | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const doc = await build();
      docRef.current = doc;
      const pdfjs = await import("pdfjs-dist");
      const workerMod: { default: string } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = workerMod.default;
      const data = doc.output("arraybuffer");
      const pdf = await pdfjs.getDocument({ data }).promise;
      const imgs: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.6 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        imgs.push(canvas.toDataURL("image/png"));
        if (cancelled) return;
      }
      if (!cancelled) {
        setPages(imgs);
        setLoading(false);
      }
    })().catch((err) => {
      console.error("[3100 Top10 PDF] falha ao renderizar:", err);
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doDownload = () => docRef.current?.save(fileName);

  const doPrint = () => {
    if (pages.length === 0) return;
    const w = window.open("", "_blank");
    if (!w) { doDownload(); return; }
    const imgsHtml = pages
      .map((src) => `<img src="${src}" style="display:block;width:100%;page-break-after:always;" />`)
      .join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>3100 Top 10</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  img { max-width: 100%; }
  @media print { img { page-break-after: always; } }
</style>
</head><body>${imgsHtml}<script>window.onload=function(){setTimeout(function(){window.focus();window.print();},250);};</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
      <div className="bg-card border-b border-border p-3 flex items-center justify-between gap-2">
        <div className="text-sm font-medium">
          Gerar PDF · {periodos} período(s){pages.length > 0 ? ` — ${pages.length} página(s)` : ""}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={doDownload}
            disabled={loading}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent disabled:opacity-50 inline-flex items-center gap-2"
          >
            <FileDown className="h-4 w-4" /> Exportar PDF
          </button>
          <button
            onClick={doPrint}
            disabled={loading || pages.length === 0}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </button>
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent inline-flex items-center gap-2"
          >
            <X className="h-4 w-4" /> Fechar
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-neutral-800 p-4">
        {loading ? (
          <div className="h-full flex items-center justify-center text-white text-sm">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando PDF...
          </div>
        ) : pages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-white text-sm">
            Não foi possível gerar a pré-visualização.
          </div>
        ) : (
          <div className="mx-auto max-w-4xl flex flex-col gap-4">
            {pages.map((src, i) => (
              <img key={i} src={src} alt={`Página ${i + 1}`} className="w-full bg-white shadow-lg" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
