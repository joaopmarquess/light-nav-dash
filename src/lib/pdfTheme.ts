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
  favorable: [32, 122, 83] as RGB,
  attention: [151, 111, 22] as RGB,
};

/** Título de seção: caixa alta, negrito, azul, com linha fina abaixo. */
export function drawSectionTitle(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  rightX: number,
  /** Cor única para texto e linha (ex.: tinta escura para impressão em preto e branco). */
  tinta?: RGB,
  /** Tamanho da fonte do título (padrão 10,5); a linha abaixo acompanha o tamanho. */
  fonte = 10.5,
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fonte);
  doc.setTextColor(...(tinta ?? PDF_COLORS.navy));
  doc.text(text.toUpperCase(), x, y);
  doc.setDrawColor(...(tinta ?? PDF_COLORS.blue));
  doc.setLineWidth(tinta ? 0.5 : 0.4);
  const dy = 1.8 * (fonte / 10.5);
  doc.line(x, y + dy, rightX, y + dy);
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
  textColor: [0, 0, 0] as RGB,
  fontStyle: "bold" as const,
  overflow: "ellipsize" as const,
};

export const subtotalRowStyles = {
  fillColor: PDF_COLORS.subtotalFill,
  textColor: [0, 0, 0] as RGB,
  fontStyle: "bold" as const,
  overflow: "ellipsize" as const,
};

export const totalRowStyles = {
  fillColor: PDF_COLORS.totalFill,
  textColor: PDF_COLORS.totalText,
  fontStyle: "bold" as const,
  fontSize: 9.5,
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
  opts: {
    title: string; plano: string; secao: string; marginL: number; marginR: number; top?: number; tinta?: RGB;
    /** Tamanhos das fontes (padrão 11,5 / 8,5 / 9,5); a faixa do plano cresce junto. */
    fontes?: { titulo?: number; plano?: number; secao?: number };
  },
) {
  const { title, plano, secao, marginL, marginR } = opts;
  const tinta = opts.tinta ?? PDF_COLORS.navy;
  const off = (opts.top ?? 23) - 23;
  const pageW = doc.internal.pageSize.getWidth();
  const cx = pageW / 2;

  doc.setFont("helvetica", "bold");
  const fT = opts.fontes?.titulo ?? 11.5;
  const fP = opts.fontes?.plano ?? 8.5;
  const fS = opts.fontes?.secao ?? 9.5;
  const extra = Math.max(0, (fP - 8.5) * 0.45);
  doc.setFontSize(fT);
  doc.setTextColor(...tinta);
  doc.text(title, cx, 23 + off - extra, { align: "center", baseline: "middle" });

  doc.setFillColor(...PDF_COLORS.groupFill);
  doc.rect(marginL, 25.6 + off - extra, pageW - marginL - marginR, 6 + extra * 2, "F");
  doc.setFontSize(fP);
  doc.setTextColor(...tinta);
  doc.text(plano, cx, 28.7 + off, { align: "center", baseline: "middle" });

  doc.setFontSize(fS);
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(secao, cx, 35.5 + off + extra, { align: "center", baseline: "middle" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_COLORS.text);
  return 38 + off;

}

/** Formata competência 202407 -> 07/2024 */
export function fmtCompetencia(v: string | number | null | undefined): string {
  const t = String(v ?? "").trim();
  if (/^\d{6}$/.test(t)) return `${t.slice(4, 6)}/${t.slice(0, 4)}`;
  return t;
}
