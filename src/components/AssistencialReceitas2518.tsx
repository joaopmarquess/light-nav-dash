import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, ChevronDown, FileDown, Printer, X, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";
import FunLoader from "@/components/FunLoader";
import { attachTimbrado, loadTimbrado } from "@/lib/pdfTimbrado";
import {
  PDF_COLORS,
  baseTableStyles,
  drawReportHeading,
  groupRowStyles,
  negativeRed,
  subtotalRowStyles,
  totalRowStyles,
} from "@/lib/pdfTheme";


type Row = {
  bscmp: string;
  dsevento: string;
  valor: number;
};

type RowV2 = {
  bscmp: string;
  nmctr: string;
  cdcontrato: string;
  dp: string;
  nmcli: string;
  dsevento: string;
  valor: number;
};

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parseNum = (s: string) => {
  if (!s) return 0;
  const n = parseFloat(s.replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};

const fmtBscmp = (s: string) => {
  const t = (s || "").trim();
  if (/^\d{6}$/.test(t)) return `${t.slice(4, 6)}|${t.slice(0, 4)}`;
  return t;
};

const EVENT_MAP: Record<string, { order: number; label: string }> = {
  "CARTEIRINHA": { order: 3, label: "Cartão|Inscrição" },
  "COPARTICIPACAO - VARIAVEL": { order: 2, label: "Coparticipação" },
  "COPARTICIPACAO PROCEDIMENTOS": { order: 2, label: "Coparticipação" },
  "CPP - CONTRAPRESTACAO PECUNIARIA": { order: 1, label: "Mensalidade" },
  "NEGOCIAÇÃO EM TMM": { order: 1, label: "Mensalidade" },
  "TAXA DE INSCRICAO": { order: 3, label: "Cartão|Inscrição" },
};

const mapEvento = (raw: string): { order: number; label: string } => {
  const key = (raw || "").trim().toUpperCase();
  for (const k of Object.keys(EVENT_MAP)) {
    if (k.toUpperCase() === key) return EVENT_MAP[k];
  }
  return { order: 99, label: raw || "(sem evento)" };
};

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return [];
  const header = lines[0].split(";").map((h) => h.trim());
  const idxBs = header.indexOf("bscmp");
  const idxEv = header.indexOf("dsevento");
  const idxVl = header.indexOf("valor");
  const out: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(";");
    out.push({
      bscmp: (c[idxBs] || "").trim(),
      dsevento: (c[idxEv] || "").trim(),
      valor: parseNum(c[idxVl] || "0"),
    });
  }
  return out;
}

function parseCsvV2(text: string): RowV2[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return [];
  const header = lines[0].split(";").map((h) => h.trim());
  const idx = (n: string) => header.indexOf(n);
  const iBs = idx("bscmp");
  const iNc = idx("nmctr");
  const iCd = idx("cdcontrato");
  const iDp = idx("dp");
  const iBn = idx("beneficiario");
  const iEv = idx("dsevento");
  const iVl = idx("valor");
  const out: RowV2[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(";");
    out.push({
      bscmp: (c[iBs] || "").trim(),
      nmctr: (c[iNc] || "").trim(),
      cdcontrato: (c[iCd] || "").trim(),
      dp: (c[iDp] || "").trim(),
      nmcli: (c[iBn] || "").trim(),
      dsevento: (c[iEv] || "").trim(),
      valor: parseNum(c[iVl] || "0"),
    });
  }
  return out;
}

function buildPdf({
  grouped,
  totalGeral,
  rowsV2,
  timbradoDataUrl,
}: {
  grouped: { bscmp: string; total: number }[];
  totalGeral: number;
  rowsV2: RowV2[];
  timbradoDataUrl?: string | null;
}): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  attachTimbrado(doc, timbradoDataUrl);
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 12;
  const marginR = 12;
  const marginT = 56;
  const marginB = 16;
  const usableW = pageW - marginL - marginR;

  const bsIni = grouped.length ? grouped[0].bscmp : "";
  const bsFim = grouped.length ? grouped[grouped.length - 1].bscmp : "";

  let currentSecao = "Seção 1 | Mês de Competência";
  const header = () => {
    drawReportHeading(doc, {
      title: "Relatório Receitas",
      plano: "Plano: 2518 - SINDICATO DOS SERVIDORES PÚBLICOS MUNICIPAIS DE JALES E REGIÃO",
      secao: currentSecao,
      marginL,
      marginR,
    });
  };

  const base = baseTableStyles(9);

  // ===================== Seção 1 =====================
  const sec1Start = doc.getNumberOfPages();

  autoTable(doc, {
    ...base,
    footStyles: { ...base.footStyles, ...totalRowStyles },
    margin: { left: marginL, right: marginR, top: marginT, bottom: marginB },
    startY: marginT,
    head: [[
      { content: "bscmp", styles: { halign: "center" } },
      { content: "Valor", styles: { halign: "right" } },
    ]],
    body: grouped.map((g) => [
      { content: g.bscmp, styles: { halign: "center" } },
      { content: fmtBRL(g.total), styles: { halign: "right" } },
    ]),
    showFoot: "lastPage",
    foot: [[
      { content: "TOTAL GERAL", styles: { halign: "left" } },
      { content: fmtBRL(totalGeral), styles: { halign: "right" } },
    ]],
    columnStyles: {
      0: { cellWidth: usableW * 0.5 },
      1: { cellWidth: usableW * 0.5 },
    },
    didParseCell: negativeRed,
    didDrawPage: () => header(),
  });
  const sec1End = doc.getNumberOfPages();


  // ===================== Seção 2 =====================
  let sec2Start = 0;
  let sec2End = 0;
  if (rowsV2.length) {
    doc.addPage();
    sec2Start = doc.getNumberOfPages();
    currentSecao = "Seção 2 | Beneficiários";

    // Agrupamento
    type Detail = { dp: string; nmcli: string; dsevento: string; order: number; valor: number };
    type Contrato = { nmctr: string; cdcontrato: string; total: number; details: Detail[] };
    type Compe = { bscmp: string; total: number; contratos: Map<string, Contrato> };
    const byBs = new Map<string, Compe>();

    for (const r of rowsV2) {
      const { order, label } = mapEvento(r.dsevento);
      if (!byBs.has(r.bscmp)) byBs.set(r.bscmp, { bscmp: r.bscmp, total: 0, contratos: new Map() });
      const c = byBs.get(r.bscmp)!;
      const ckey = r.cdcontrato + "||" + r.nmctr;
      if (!c.contratos.has(ckey))
        c.contratos.set(ckey, { nmctr: r.nmctr, cdcontrato: r.cdcontrato, total: 0, details: [] });
      const ct = c.contratos.get(ckey)!;
      ct.details.push({ dp: r.dp, nmcli: r.nmcli, dsevento: label, order, valor: r.valor });
      ct.total += r.valor;
      c.total += r.valor;
    }

    const compesArr = Array.from(byBs.values()).sort((a, b) => a.bscmp.localeCompare(b.bscmp));

    const body: RowInput[] = [];

    for (const c of compesArr) {
      // header bscmp
      body.push([
        {
          content: fmtBscmp(c.bscmp),
          colSpan: 2,
          styles: { ...groupRowStyles, halign: "left" },
        },
      ]);

      const contratosArr = Array.from(c.contratos.values()).sort((a, b) =>
        a.nmctr.localeCompare(b.nmctr) || a.cdcontrato.localeCompare(b.cdcontrato)
      );

      for (const ct of contratosArr) {
        // header contrato
        body.push([
          {
            content: `${ct.nmctr} (${ct.cdcontrato})`,
            colSpan: 2,
            styles: { ...subtotalRowStyles, halign: "left" },
          },
        ]);

        const details = [...ct.details].sort(
          (a, b) =>
            a.dp.localeCompare(b.dp) ||
            a.nmcli.localeCompare(b.nmcli) ||
            a.order - b.order ||
            a.dsevento.localeCompare(b.dsevento),
        );

        for (const d of details) {
          body.push([
            { content: `${d.dp} - ${d.nmcli} - ${d.dsevento}`, styles: { halign: "left", overflow: "ellipsize" } },
            { content: fmtBRL(d.valor), styles: { halign: "right", overflow: "ellipsize" } },
          ]);
        }

        // subtotal contrato
        body.push([
          {
            content: `Subtotal ${ct.nmctr} (${ct.cdcontrato})`,
            styles: { ...subtotalRowStyles, halign: "left", lineWidth: { top: 0.1, bottom: 0.6, left: 0.1, right: 0 }, lineColor: PDF_COLORS.navy },
          },
          {
            content: fmtBRL(ct.total),
            styles: { ...subtotalRowStyles, halign: "right", lineWidth: { top: 0.1, bottom: 0.6, left: 0, right: 0.1 }, lineColor: PDF_COLORS.navy },
          },
        ]);

        // espaçador entre contratos
        body.push([
          {
            content: "",
            colSpan: 2,
            styles: { minCellHeight: 2.2, cellPadding: 0, fillColor: [255, 255, 255], lineWidth: 0 },
          },
        ]);
      }

      // subtotal bscmp
      body.push([
        {
          content: `Subtotal ${fmtBscmp(c.bscmp)}`,
          styles: { ...groupRowStyles, halign: "left", lineWidth: { top: 0.1, bottom: 0.8, left: 0.1, right: 0 }, lineColor: PDF_COLORS.navy },
        },
        {
          content: fmtBRL(c.total),
          styles: { ...groupRowStyles, halign: "right", lineWidth: { top: 0.1, bottom: 0.8, left: 0, right: 0.1 }, lineColor: PDF_COLORS.navy },
        },
      ]);

      // espaçador entre competências
      body.push([
        {
          content: "",
          colSpan: 2,
          styles: { minCellHeight: 3, cellPadding: 0, fillColor: [255, 255, 255], lineWidth: 0 },
        },
      ]);
    }

    const totalV2 = compesArr.reduce((s, c) => s + c.total, 0);

    autoTable(doc, {
      ...baseTableStyles(8.5),
      styles: { ...baseTableStyles(8.5).styles, overflow: "ellipsize" },
      alternateRowStyles: {},
      footStyles: { ...baseTableStyles(8.5).footStyles, ...totalRowStyles },
      margin: { left: marginL, right: marginR, top: marginT, bottom: marginB },
      startY: marginT,
      head: [[
        { content: "Competência / Contrato / (dp - Beneficiário - Evento)", styles: { halign: "left" } },
        { content: "Valor", styles: { halign: "right" } },
      ]],
      body,
      showFoot: "lastPage",
      foot: [[
        { content: "TOTAL GERAL", styles: { halign: "left" } },
        { content: fmtBRL(totalV2), styles: { halign: "right" } },
      ]],
      columnStyles: {
        0: { cellWidth: usableW * 0.78 },
        1: { cellWidth: usableW * 0.22 },
      },
      didParseCell: negativeRed,
    didDrawPage: () => header(),
    });
    sec2End = doc.getNumberOfPages();
  }

  // ===== Rodapé de paginação =====
  const pageH = doc.internal.pageSize.getHeight();
  const totalPages = doc.getNumberOfPages();
  const sectionByPage: Record<number, string> = {};
  for (let p = sec1Start; p <= sec1End; p++) sectionByPage[p] = "Seção 1";
  if (sec2Start) for (let p = sec2Start; p <= sec2End; p++) sectionByPage[p] = "Seção 2";
  const secTotals: Record<string, number> = {};
  for (let p = 1; p <= totalPages; p++) {
    const s = sectionByPage[p];
    if (s) secTotals[s] = (secTotals[s] ?? 0) + 1;
  }
  const secSeen: Record<string, number> = {};
  const footY = pageH - 14;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    doc.text(`${p}`, marginL, footY, { align: "left" });
    const sec = sectionByPage[p];
    if (sec) {
      secSeen[sec] = (secSeen[sec] ?? 0) + 1;
      doc.text(`${secSeen[sec]} de ${secTotals[sec]}`, pageW - marginR, footY, { align: "right" });
    }
    doc.setTextColor(0);
  }


  return doc;
}

function ReportPreview({
  grouped,
  totalGeral,
  rowsV2,
  onClose,
}: {
  grouped: { bscmp: string; total: number }[];
  totalGeral: number;
  rowsV2: RowV2[];
  onClose: () => void;
}) {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const docRef = useRef<jsPDF | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const timbrado = await loadTimbrado();
      const doc = buildPdf({
        grouped,
        totalGeral,
        rowsV2,
        timbradoDataUrl: timbrado,
      });

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
      console.error("[ReceitasReport] falha:", err);
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doDownload = () => {
    docRef.current?.save("receitas_2518.pdf");
  };
  const doPrint = () => {
    if (!pages.length) return;
    const w = window.open("", "_blank");
    if (!w) { doDownload(); return; }
    const imgsHtml = pages
      .map((src) => `<img src="${src}" style="display:block;width:100%;page-break-after:always;" />`)
      .join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Relatório</title>
<style>@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0;background:#fff}img{max-width:100%}@media print{img{page-break-after:always}}</style>
</head><body>${imgsHtml}<script>window.onload=function(){setTimeout(function(){window.focus();window.print();},250);};</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
      <div className="bg-card border-b border-border p-3 flex items-center justify-between gap-2">
        <div className="text-sm font-medium">
          Pré-visualização do Relatório (PDF) {pages.length > 0 && `— ${pages.length} página(s)`}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={doDownload} disabled={loading} className="h-9 px-3 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent disabled:opacity-50 inline-flex items-center gap-2">
            <FileDown className="h-4 w-4" /> Baixar PDF
          </button>
          <button onClick={doPrint} disabled={loading || !pages.length} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
          <button onClick={onClose} className="h-9 px-3 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent inline-flex items-center gap-2">
            <X className="h-4 w-4" /> Fechar
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-neutral-800 p-4">
        {loading ? (
          <div className="h-full flex items-center justify-center text-white text-sm">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando PDF...
          </div>
        ) : !pages.length ? (
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

export default function AssistencialReceitas2518() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [rowsV2, setRowsV2] = useState<RowV2[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [showPdf, setShowPdf] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [res1, res2] = await Promise.all([
          fetch("/data/2518_receitas.csv"),
          fetch("/data/2518_receitas_v2.csv"),
        ]);
        if (!res1.ok) throw new Error("Falha ao ler CSV");
        const buf1 = await res1.arrayBuffer();
        let text1 = new TextDecoder("utf-8").decode(buf1);
        if (text1.includes("\uFFFD")) text1 = new TextDecoder("iso-8859-1").decode(buf1);
        setRows(parseCsv(text1));

        if (res2.ok) {
          const buf2 = await res2.arrayBuffer();
          let text2 = new TextDecoder("utf-8").decode(buf2);
          if (text2.includes("\uFFFD")) text2 = new TextDecoder("iso-8859-1").decode(buf2);
          setRowsV2(parseCsvV2(text2));
        }
      } catch (e: any) {
        setError(e?.message || String(e));
      }
    })();
  }, []);

  const grouped = useMemo(() => {
    if (!rows) return [];
    const byBs = new Map<string, Map<string, { order: number; valor: number }>>();
    for (const r of rows) {
      const { order, label } = mapEvento(r.dsevento);
      if (!byBs.has(r.bscmp)) byBs.set(r.bscmp, new Map());
      const m = byBs.get(r.bscmp)!;
      const cur = m.get(label) ?? { order, valor: 0 };
      cur.valor += r.valor;
      m.set(label, cur);
    }
    const arr = Array.from(byBs.entries())
      .map(([bscmp, m]) => {
        const eventos = Array.from(m.entries())
          .map(([dsevento, v]) => ({ dsevento, valor: v.valor, order: v.order }))
          .sort((a, b) => a.order - b.order || a.dsevento.localeCompare(b.dsevento));
        const total = eventos.reduce((s, e) => s + e.valor, 0);
        return { bscmp, total, eventos };
      })
      .sort((a, b) => a.bscmp.localeCompare(b.bscmp));
    return arr;
  }, [rows]);

  const totalGeral = useMemo(
    () => grouped.reduce((s, g) => s + g.total, 0),
    [grouped]
  );

  const s1 = useMemo(
    () => grouped.map(({ bscmp, total }) => ({ bscmp, total })),
    [grouped]
  );

  if (error)
    return (
      <section className="bg-card rounded-xl border border-border shadow-sm p-6 text-sm text-destructive">
        Erro: {error}
      </section>
    );
  if (!rows)
    return (
      <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex items-center justify-center">
        <FunLoader />
      </section>
    );

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">2518 Receitas</h2>
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">
            Total Geral: <span className="font-semibold text-foreground tabular-nums">{fmtBRL(totalGeral)}</span>
          </div>
          <button
            onClick={() => setShowPdf(true)}
            disabled={!grouped.length}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent disabled:opacity-50 inline-flex items-center gap-2"
          >
            <FileDown className="h-4 w-4" />
            Gerar PDF
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/70 backdrop-blur">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Competência / Evento</th>
              <th className="px-3 py-2 font-medium text-right w-56">Valor</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((g) => {
              const isOpen = !!open[g.bscmp];
              return (
                <>
                  <tr
                    key={g.bscmp}
                    className="border-t border-border hover:bg-accent/40 cursor-pointer"
                    onClick={() => setOpen((p) => ({ ...p, [g.bscmp]: !p[g.bscmp] }))}
                  >
                    <td className="px-3 py-2 font-medium">
                      <span className="inline-flex items-center gap-1">
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        {g.bscmp}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{fmtBRL(g.total)}</td>
                  </tr>
                  {isOpen &&
                    g.eventos.map((e) => (
                      <tr key={g.bscmp + "|" + e.dsevento} className="border-t border-border/60 bg-muted/20">
                        <td className="px-3 py-1.5 pl-10 text-foreground/80">{e.dsevento}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{fmtBRL(e.valor)}</td>
                      </tr>
                    ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {showPdf && (
        <ReportPreview
          grouped={s1}
          totalGeral={totalGeral}
          rowsV2={rowsV2}
          onClose={() => setShowPdf(false)}
        />
      )}
    </section>
  );
}
