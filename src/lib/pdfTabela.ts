import jsPDF from "jspdf";
import autoTable, { type RowInput, type Styles } from "jspdf-autotable";
import { baseTableStyles, drawReportHeading } from "@/lib/pdfTheme";
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
};

/** Gera um PDF A4 com timbrado e tabela no padrão dos relatórios do projeto. */
export async function gerarPdfTabela(opts: PdfTabelaOpts) {
  const timbrado = await loadTimbrado();
  const doc = new jsPDF({ orientation: opts.orientation ?? "portrait", unit: "mm", format: "a4" });
  attachTimbrado(doc, timbrado);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 10;
  const marginR = 10;
  const marginT = 56;
  const marginB = 16;

  const base = baseTableStyles(opts.fontSize ?? 7.6);

  autoTable(doc, {
    ...base,
    styles: { ...base.styles, fontSize: opts.fontSize ?? 7.6, cellPadding: 1, overflow: "linebreak", valign: "middle" },
    headStyles: { ...base.headStyles, fontSize: opts.fontSize ?? 7.6, halign: "center" },
    margin: { left: marginL, right: marginR, top: marginT, bottom: marginB },
    startY: marginT,
    head: opts.head,
    body: opts.body,
    foot: opts.foot,
    showFoot: opts.foot ? "lastPage" : undefined,
    columnStyles: opts.columnStyles,
    didDrawPage: () => {
      drawReportHeading(doc, {
        title: opts.title,
        plano: opts.plano,
        secao: opts.secao,
        marginL,
        marginR,
      });
    },
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    doc.text(`${i} de ${pages}`, pageW - marginR, pageH - 14, { align: "right" });
  }

  doc.save(opts.fileName);
}
