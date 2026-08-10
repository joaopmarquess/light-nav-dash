import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, FileDown, Printer, X, FileText, ChevronRight, ChevronDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { baseTableStyles, drawReportHeading, fmtCompetencia, groupRowStyles, subtotalRowStyles, totalRowStyles } from "@/lib/pdfTheme";
import { attachTimbrado, loadTimbrado } from "@/lib/pdfTimbrado";

type Row = Record<string, string>;

const VAL_COLS = ["Mensalidade", "Coparticipacao", "Taxas_Adesao", "Odonto", "Outros", "Total"] as const;
type ValCol = (typeof VAL_COLS)[number];

const toNum = (v: string) => Number(String(v ?? "").replace(/\./g, "").replace(",", ".")) || 0;
const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Vals = Record<ValCol, number>;
const zero = (): Vals => ({ Mensalidade: 0, Coparticipacao: 0, Taxas_Adesao: 0, Odonto: 0, Outros: 0, Total: 0 });
const add = (a: Vals, r: Row) => { for (const c of VAL_COLS) a[c] += toNum(r[c]); return a; };
const addV = (a: Vals, b: Vals) => { for (const c of VAL_COLS) a[c] += b[c]; return a; };

type Node = { key: string; label: string; vals: Vals; children: Node[] };

const SinistralidadeAPBFaturas = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [pdfOpen, setPdfOpen] = useState(false);

  useEffect(() => {
    fetch("/data/apb_faturas.json")
      .then((r) => r.json())
      .then((d: Row[]) => {
        setRows(d);
        const ms = Array.from(new Set(d.map((r) => r.mabas))).sort();
        setDe(ms[0] ?? "");
        setAte(ms[ms.length - 1] ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  const mabasList = useMemo(() => Array.from(new Set(rows.map((r) => r.mabas))).sort(), [rows]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (de && r.mabas < de) return false;
      if (ate && r.mabas > ate) return false;
      if (!t) return true;
      return ["cdpln", "codfamilia", "Colaborador", "Beneficiario"].some((c) =>
        String(r[c] ?? "").toLowerCase().includes(t),
      );
    });
  }, [rows, q, de, ate]);

  const tree = useMemo(() => {
    const planos = new Map<string, Map<string, Map<string, Map<string, Vals>>>>();
    for (const r of filtered) {
      const p = planos.get(r.cdpln) ?? new Map();
      planos.set(r.cdpln, p);
      const m = p.get(r.mabas) ?? new Map();
      p.set(r.mabas, m);
      const c = m.get(r.Colaborador) ?? new Map();
      m.set(r.Colaborador, c);
      const b = c.get(r.Beneficiario) ?? zero();
      c.set(r.Beneficiario, add(b, r));
    }
    const out: Node[] = [];
    for (const [cdpln, ms] of Array.from(planos.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      const pNode: Node = { key: `p:${cdpln}`, label: `Plano ${cdpln}`, vals: zero(), children: [] };
      for (const [mabas, cols] of Array.from(ms.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
        const mNode: Node = { key: `${pNode.key}|m:${mabas}`, label: fmtCompetencia(mabas), vals: zero(), children: [] };
        for (const [colab, bens] of Array.from(cols.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
          const cNode: Node = { key: `${mNode.key}|c:${colab}`, label: colab, vals: zero(), children: [] };
          for (const [ben, v] of Array.from(bens.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
            cNode.children.push({ key: `${cNode.key}|b:${ben}`, label: ben, vals: v, children: [] });
            addV(cNode.vals, v);
          }
          mNode.children.push(cNode);
          addV(mNode.vals, cNode.vals);
        }
        pNode.children.push(mNode);
        addV(pNode.vals, mNode.vals);
      }
      out.push(pNode);
      }
    return out;
  }, [filtered]);

  const totals = useMemo(() => tree.reduce((a, n) => addV(a, n.vals), zero()), [tree]);

  const toggle = (k: string) =>
    setOpen((prev) => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  type FlatRow = { node: Node; depth: number; expandable: boolean; expanded: boolean };
  const flat = useMemo(() => {
    const out: FlatRow[] = [];
    const walk = (nodes: Node[], depth: number) => {
      for (const n of nodes) {
        const expandable = n.children.length > 0;
        const expanded = open.has(n.key);
        out.push({ node: n, depth, expandable, expanded });
        if (expandable && expanded) walk(n.children, depth + 1);
      }
    };
    walk(tree, 0);
    return out;
  }, [tree, open]);

  const allKeys = useMemo(() => {
    const ks: string[] = [];
    const walk = (nodes: Node[]) => {
      for (const n of nodes) {
        if (n.children.length > 0) { ks.push(n.key); walk(n.children); }
      }
    };
    walk(tree);
    return ks;
  }, [tree]);
  const allExpanded = allKeys.length > 0 && allKeys.every((k) => open.has(k));



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

    const header = () =>
      drawReportHeading(doc, {
        title: "APB · Faturas",
        plano: `${fmtCompetencia(de)} a ${fmtCompetencia(ate)}`,
        secao: q.trim() ? `Filtro: ${q.trim()}` : "Faturamento por plano, competência, colaborador e beneficiário",
        marginL,
        marginR,
      });

    const base = baseTableStyles(6.6);
    const labelW = usableW * 0.34;
    const valW = (usableW - labelW) / 6;

    const styleFor = (depth: number) =>
      depth === 0 ? groupRowStyles : depth === 1 ? subtotalRowStyles : depth === 2 ? { fontStyle: "bold" as const } : {};

    const body = flat.map(({ node, depth }) => {
      const pad = "  ".repeat(depth);
      const st = styleFor(depth);
      return [
        { content: `${pad}${node.label}`, styles: { ...st, halign: "left" as const, overflow: "ellipsize" as const } },
        ...VAL_COLS.map((c) => ({ content: fmt(node.vals[c]), styles: { ...st, halign: "right" as const } })),
      ];
    });

    autoTable(doc, {
      ...base,
      styles: { ...base.styles, fontSize: 6.6, cellPadding: 0.8, minCellHeight: 0, overflow: "ellipsize" },
      headStyles: { ...base.headStyles, fontSize: 6.6, cellPadding: 0.7, halign: "center" },
      margin: { left: marginL, right: marginR, top: marginT, bottom: marginB },
      didDrawPage: () => { header(); },
      startY: marginT,
      head: [[
        "Plano / Competência / Colaborador / Beneficiário",
        ...VAL_COLS.map((c) => ({ content: c.replace("_", " "), styles: { halign: "right" as const } })),
      ]],
      body,
      foot: [[
        { content: "TOTAL GERAL", styles: { ...totalRowStyles, halign: "left" as const, fontSize: 7 } },
        ...VAL_COLS.map((c) => ({ content: fmt(totals[c]), styles: { ...totalRowStyles, halign: "right" as const, fontSize: 7 } })),
      ]],
      showFoot: "lastPage",
      columnStyles: {
        0: { cellWidth: labelW, fontSize: 6 },
        1: { cellWidth: valW, halign: "right" },
        2: { cellWidth: valW, halign: "right" },
        3: { cellWidth: valW, halign: "right" },
        4: { cellWidth: valW, halign: "right" },
        5: { cellWidth: valW, halign: "right" },
        6: { cellWidth: valW, halign: "right" },
      },
    });

    const pages = doc.getNumberOfPages();
    const footY = pageH - 14;
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      doc.text(`${i} de ${pages}`, pageW - marginR, footY, { align: "right" });
    }
    return doc;
  };

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>mabas de</span>
          <select
            value={de}
            onChange={(e) => setDe(e.target.value)}
            className="h-9 px-2 rounded-md border border-border bg-background text-sm text-foreground"
          >
            {mabasList.map((m) => (
              <option key={m} value={m}>{fmtCompetencia(m)}</option>
            ))}
          </select>
          <span>até</span>
          <select
            value={ate}
            onChange={(e) => setAte(e.target.value)}
            className="h-9 px-2 rounded-md border border-border bg-background text-sm text-foreground"
          >
            {mabasList.map((m) => (
              <option key={m} value={m}>{fmtCompetencia(m)}</option>
            ))}
          </select>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar (plano, família, colaborador, beneficiário...)"
          className="h-9 w-80 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <span className="text-xs text-muted-foreground">
          {filtered.length.toLocaleString("pt-BR")} lançamentos
        </span>
        <button
          type="button"
          onClick={() => setPdfOpen(true)}
          disabled={loading || flat.length === 0}
          className="ml-auto h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
        >
          <FileText className="h-4 w-4" /> Gerar PDF
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-accent text-primary">
              <tr>
                <th className="px-2 py-1.5 font-semibold text-left">Plano / Competência / Colaborador / Beneficiário</th>
                {VAL_COLS.map((c) => (
                  <th key={c} className="px-2 py-1.5 font-semibold text-right whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flat.map(({ node, depth, expandable, expanded }) => (
                <tr
                  key={node.key}
                  className={`border-b border-border/60 hover:bg-accent/40 ${depth === 0 ? "bg-accent/50 font-semibold" : depth === 1 ? "bg-accent/20 font-medium" : ""}`}
                >
                  <td className="px-2 py-1">
                    <button
                      type="button"
                      onClick={() => expandable && toggle(node.key)}
                      className="inline-flex items-center gap-1 text-left"
                      style={{ paddingLeft: depth * 14 }}
                    >
                      {expandable ? (
                        expanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />
                      ) : (
                        <span className="w-3" />
                      )}
                      <span className={depth >= 2 ? "text-[10px]" : ""}>{node.label}</span>
                    </button>
                  </td>
                  {VAL_COLS.map((c) => (
                    <td key={c} className="px-2 py-1 text-right tabular-nums whitespace-nowrap">{fmt(node.vals[c])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 bg-card border-t border-border">
              <tr className="font-semibold">
                <td className="px-2 py-1.5">TOTAL GERAL</td>
                {VAL_COLS.map((c) => (
                  <td key={c} className="px-2 py-1.5 text-right tabular-nums">{fmt(totals[c])}</td>
                ))}
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {pdfOpen && (
        <PdfPreview
          onClose={() => setPdfOpen(false)}
          build={buildDoc}
          fileName="apb-faturas.pdf"
          linhas={flat.length}
        />
      )}
    </section>
  );
};

function PdfPreview({
  onClose,
  build,
  fileName,
  linhas,
}: {
  onClose: () => void;
  build: () => Promise<jsPDF>;
  fileName: string;
  linhas: number;
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
      console.error("[APB Faturas PDF] falha ao renderizar:", err);
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
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>APB Faturas</title>
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
          Gerar PDF · {linhas} linha(s){pages.length > 0 ? ` — ${pages.length} página(s)` : ""}
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

export default SinistralidadeAPBFaturas;
