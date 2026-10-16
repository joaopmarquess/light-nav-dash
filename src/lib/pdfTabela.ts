import jsPDF from "jspdf";
import autoTable, { type RowInput, type Styles } from "jspdf-autotable";
import { baseTableStyles, drawReportHeading, PDF_COLORS } from "@/lib/pdfTheme";
import { attachTimbrado, loadTimbrado } from "@/lib/pdfTimbrado";

export type PdfTabelaOpts = {
  fileName: string;
  title: string;
  plano: string;
  secao: string;
  head: RowInput[];
  body: RowInput[];
  foot?: RowInput[];
  columnStyles?: Record<number, Partial<Styles>>;
  fontSize?: number;
  orientation?: "portrait" | "landscape";
  /** Y (mm) do título; use ~33 para começar abaixo do traço do timbrado. */
  headingTop?: number;
  /** Estilo 2518 Declarações: sem timbrado, título grande no topo, nº pequeno à esquerda. */
  topTitle?: string;
  /** Se informado, cada bloco começa em página nova (body é ignorado). */
  sections?: RowInput[][];
  /** Texto do rodapé esquerdo para cada bloco de sections (substitui o nº pequeno). */
  sectionLabels?: string[];
};

/** Monta um PDF A4 com timbrado e tabela no padrão dos relatórios do projeto. */
export async function buildPdfTabela(opts: PdfTabelaOpts): Promise<jsPDF> {
  const timbrado = opts.topTitle ? null : await loadTimbrado();
  const doc = new jsPDF({ orientation: opts.orientation ?? "portrait", unit: "mm", format: "a4" });
  attachTimbrado(doc, timbrado);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 10;
  const marginR = 10;
  const headingTop = opts.headingTop ?? (opts.topTitle ? 26 : 23);
  const marginT = 44 + (headingTop - 23);
  const marginB = 16;
  const footY = pageH - (opts.topTitle ? 8 : 14);

  const base = baseTableStyles(opts.fontSize ?? 7.6);

  const blocks = opts.sections ?? [opts.body];
  const labelByPage: Record<number, string> = {};
  blocks.forEach((blockBody, bi) => {
  if (bi > 0) doc.addPage();
  const startPage = doc.getNumberOfPages();
  const isLast = bi === blocks.length - 1;
  autoTable(doc, {
    ...base,
    styles: { ...base.styles, fontSize: opts.fontSize ?? 7.6, cellPadding: 1, overflow: "linebreak", valign: "middle" },
    headStyles: { ...base.headStyles, fontSize: opts.fontSize ?? 7.6, halign: "center" },
    margin: { left: marginL, right: marginR, top: marginT, bottom: marginB },
    startY: marginT,
    head: opts.head,
    body: blockBody,
    foot: isLast ? opts.foot : undefined,
    showFoot: isLast && opts.foot ? "lastPage" : undefined,
    columnStyles: opts.columnStyles,
    didDrawPage: () => {
      if (opts.topTitle) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(...PDF_COLORS.navy);
        doc.text(opts.topTitle, pageW / 2, 10, { align: "center", baseline: "middle" });
        doc.setDrawColor(...PDF_COLORS.navy);
        doc.setLineWidth(0.5);
        doc.line(marginL, 13.5, pageW - marginR, 13.5);
        doc.setTextColor(0, 0, 0);
        doc.setDrawColor(0);
        doc.setLineWidth(0.2);
      }
      drawReportHeading(doc, {
        title: opts.title,
        plano: opts.plano,
        secao: opts.secao,
        marginL,
        marginR,
        top: headingTop,
      });
    },
  });
  const lbl = opts.sectionLabels?.[bi];
  if (lbl) for (let pg = startPage; pg <= doc.getNumberOfPages(); pg++) labelByPage[pg] = lbl;
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    if (opts.topTitle) {
      const lbl = labelByPage[i];
      doc.setFont("helvetica", lbl ? "bold" : "normal");
      doc.setFontSize(lbl ? 9.5 : 6);
      doc.text(lbl ?? `${i}`, marginL, footY, { align: "left" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
    }
    doc.text(`${i} de ${pages}`, pageW - marginR, footY, { align: "right" });
  }

  return doc;
}

/** Gera e baixa direto (sem pré-visualização). */
export async function gerarPdfTabela(opts: PdfTabelaOpts) {
  const doc = await buildPdfTabela(opts);
  doc.save(opts.fileName);
}
