import type jsPDF from "jspdf";

type RGB = [number, number, number];

/** Paleta derivada do azul institucional do timbrado. */
export const PDF_COLORS = {
  navy: [23, 72, 122] as RGB,
  blue: [41, 128, 185] as RGB,
  lightBlue: [137, 196, 232] as RGB,
  headFill: [23, 72, 122] as RGB,
  headText: [255, 255, 255] as RGB,
  groupFill: [222, 232, 241] as RGB,
  subtotalFill: [205, 219, 232] as RGB,
  totalFill: [23, 72, 122] as RGB,
  totalText: [255, 255, 255] as RGB,
  zebra: [246, 248, 250] as RGB,
  gridLine: [168, 180, 192] as RGB,
  outerLine: [23, 72, 122] as RGB,
  text: [0, 0, 0] as RGB,
  muted: [110, 120, 130] as RGB,
  negative: [178, 34, 34] as RGB,
};

/** Título de seção: caixa alta, negrito, azul, com linha fina abaixo. */
export function drawSectionTitle(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  rightX: number,
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text(text.toUpperCase(), x, y);
  doc.setDrawColor(...PDF_COLORS.blue);
  doc.setLineWidth(0.4);
  doc.line(x, y + 1.8, rightX, y + 1.8);
  doc.setTextColor(...PDF_COLORS.text);
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
}

/** Estilos base compartilhados pelas tabelas dos relatórios. */
export function baseTableStyles(fontSize = 8.5) {
  return {
    styles: {
      font: "helvetica" as const,
      fontSize,
      cellPadding: 1.4,
      lineColor: PDF_COLORS.gridLine,
      lineWidth: 0.1,
      textColor: PDF_COLORS.text,
    },
    headStyles: {
      fillColor: PDF_COLORS.headFill,
      textColor: PDF_COLORS.headText,
      fontStyle: "bold" as const,
      lineColor: PDF_COLORS.headFill,
      lineWidth: 0.1,
      cellPadding: 1.6,
    },
    footStyles: {
      fillColor: PDF_COLORS.subtotalFill,
      textColor: PDF_COLORS.text,
      fontStyle: "bold" as const,
      lineColor: PDF_COLORS.gridLine,
      lineWidth: 0.1,
    },
    alternateRowStyles: { fillColor: PDF_COLORS.zebra },
    tableLineColor: PDF_COLORS.outerLine,
    tableLineWidth: 0.5,
    theme: "grid" as const,
  };
}

export const groupRowStyles = {
  fillColor: PDF_COLORS.groupFill,
  textColor: PDF_COLORS.navy,
  fontStyle: "bold" as const,
  overflow: "ellipsize" as const,
};

export const subtotalRowStyles = {
  fillColor: PDF_COLORS.subtotalFill,
  textColor: PDF_COLORS.text,
  fontStyle: "bold" as const,
  overflow: "ellipsize" as const,
};

export const totalRowStyles = {
  fillColor: PDF_COLORS.totalFill,
  textColor: PDF_COLORS.totalText,
  fontStyle: "bold" as const,
  fontSize: 9,
  overflow: "ellipsize" as const,
};

/** Hook autoTable: pinta valores negativos em vermelho. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const negativeRed = (data: any) => {
  if (data.section !== "body") return;
  const raw = String(data.cell.raw?.content ?? data.cell.raw ?? "");
  if (/^-\s?[\d.]/.test(raw.trim())) data.cell.styles.textColor = PDF_COLORS.negative;
};

/** Bloco de cabeçalho de seção: título, faixa do plano e rótulo da seção (centralizados). */
export function drawReportHeading(
  doc: jsPDF,
  opts: { title: string; plano: string; secao: string; marginL: number; marginR: number },
) {
  const { title, plano, secao, marginL, marginR } = opts;
  const pageW = doc.internal.pageSize.getWidth();
  const cx = pageW / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text(title, cx, 35, { align: "center", baseline: "middle" });

  doc.setFillColor(...PDF_COLORS.groupFill);
  doc.rect(marginL, 37.6, pageW - marginL - marginR, 6, "F");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_COLORS.navy);
  doc.text(plano, cx, 40.7, { align: "center", baseline: "middle" });

  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(secao, cx, 47.5, { align: "center", baseline: "middle" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_COLORS.text);
  return 50;
}
