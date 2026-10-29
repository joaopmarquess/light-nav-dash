import { jsPDF } from "jspdf";
import "core-js/actual/map/get-or-insert-computed";
import "core-js/actual/weak-map/get-or-insert-computed";
import autoTable from "jspdf-autotable";
import { PDF_COLORS, baseTableStyles } from "./pdfTheme";
import { dataBR } from "./controladoriaRegras";
import { UNAVAILABLE, type ControladoriaReport, type ReportBlock } from "./controladoriaDados";
import axisLogo from "@/assets/axis-logo.png.asset.json";

export type ReportPdf = { doc: jsPDF; contents: { id: string; title: string; page: number }[] };
export async function comporPdfRelatorio(report: ControladoriaReport): Promise<ReportPdf> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  doc.setProperties({ title: "Relatório de Controladoria — AXIS / CONTROL", subject: `${report.period.de} a ${report.period.ate}`, creator: "AXIS / CONTROL" });
  const colors = PDF_COLORS, margin = 19, width = 172, bottom = 276;
  const contents: ReportPdf["contents"] = [];
  let y = 28;
  const text = (size = 10, bold = false, color = colors.text) => { doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(...color); };
  const page = () => { doc.addPage(); y = 28; };
  const room = (height: number) => { if (y + height > bottom) page(); };
  const paragraph = (value: string, size = 10, color = colors.text) => {
    text(size, false, color);
    const lines = doc.splitTextToSize(value, width) as string[];
    const step = size * 0.46;
    for (let i = 0; i < lines.length; i++) { room(step + 1); doc.text(lines[i], margin, y); y += step; }
    y += 4;
  };
  const heading = (title: string, size = 17) => {
    text(size, true, colors.navy);
    const lines = doc.splitTextToSize(title, width) as string[];
    room(lines.length * 7 + 22);
    text(size, true, colors.navy); doc.text(lines, margin, y); y += lines.length * 7 + 3;
    doc.setDrawColor(...colors.blue); doc.setLineWidth(0.6); doc.line(margin, y, margin + width, y); y += 9;
  };
  // Cover uses an actual brand asset and an abstract corporate composition, never fictitious data.
  try {
    const image = new Image(); image.crossOrigin = "anonymous"; image.src = axisLogo.url;
    await image.decode();
    const h = 55 * image.naturalHeight / image.naturalWidth;
    doc.addImage(image, "PNG", margin, 22, 55, h);
  } catch { text(20, true, colors.navy); doc.text("AXIS / CONTROL", margin, 34); }
  doc.setFillColor(...colors.navy); doc.rect(0, 65, 210, 119, "F");
  doc.setFillColor(...colors.blue); doc.rect(0, 65, 5, 119, "F");
  text(28, true, colors.headText); doc.text(["RELATÓRIO DE", "CONTROLADORIA"], margin, 102);
  text(12, false, colors.headText); doc.text(["Visão econômica, assistencial", "e administrativa"], margin, 137);
  text(11, true, colors.headText); doc.text(`${dataBR(report.period.de)} a ${dataBR(report.period.ate)}`, margin, 164);
  text(12, true, colors.navy); doc.text("AXIS / CONTROL", margin, 212);
  text(10, false, colors.muted); doc.text("Carteira · Assistencial · DRE · Orçamento", margin, 224);
  doc.setDrawColor(...colors.lightBlue); doc.setLineWidth(1); doc.line(margin, 237, 191, 237);
  text(9, false, colors.muted); doc.text(`Gerado em ${new Date(report.generatedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`, margin, 252);
  page(); // Sumário is always page two, filled after actual pagination.
  const renderBlock = (block: ReportBlock, main = false) => {
    if (main) page();
    room(40);
    contents.push({ id: block.id, title: block.title, page: doc.getNumberOfPages() });
    heading(block.title, main ? 19 : 14);
    if (block.introduction) paragraph(block.introduction, 10, colors.muted);
    if (block.status !== "available") {
      paragraph(UNAVAILABLE, 11, colors.muted);
      if (block.notice) paragraph(block.notice, 9, colors.muted);
    } else {
      if (block.cards.length) {
        // Compact executive indicator strip; wraps by rows without splitting indicators.
        for (let start = 0; start < block.cards.length; start += 3) {
          const cards = block.cards.slice(start, start + 3), cellWidth = width / cards.length;
          room(28);
          cards.forEach((card, i) => {
            const x = margin + i * cellWidth;
            doc.setFillColor(...colors.zebra); doc.rect(x, y - 3, cellWidth - 2, 25, "F");
            doc.setDrawColor(...colors.blue); doc.setLineWidth(0.8); doc.line(x, y - 3, x, y + 22);
            text(8, false, colors.muted); doc.text(doc.splitTextToSize(card.label, cellWidth - 8), x + 4, y + 3);
            text(11, true, colors.navy); doc.text(doc.splitTextToSize(card.value, cellWidth - 8), x + 4, y + 15);
          });
          y += 31;
        }
      }
      if (block.table?.rows.length) {
        room(24);
        autoTable(doc, {
          ...baseTableStyles(block.table.headers.length > 5 ? 7 : 8),
          startY: y, margin: { top: 27, left: margin, right: margin, bottom: 23 },
          head: [block.table.headers], body: block.table.rows,
          rowPageBreak: "avoid", showHead: "everyPage", pageBreak: "auto",
          styles: { ...baseTableStyles().styles, fontSize: block.table.headers.length > 5 ? 7 : 8, cellPadding: 2.2, overflow: "linebreak" },
          columnStyles: { [block.table.headers.length - 1]: { halign: "right" } },
        });
        y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
        y += 7;
        paragraph(`Fonte: ${block.sourceModule}`, 8, colors.muted);
      }
      if (block.chart && block.chart.labels.length) {
        room(77);
        text(10, true, colors.navy); doc.text(doc.splitTextToSize(block.chart.title, width), margin, y); y += 10;
        const chart = block.chart, x0 = margin + 17, chartW = width - 22, chartH = 41, top = y;
        const all = chart.series.flatMap(s => s.values);
        const low = Math.min(0, ...all), high = Math.max(1, ...all), span = high - low;
        const px = (i: number) => x0 + (chart.labels.length > 1 ? i / (chart.labels.length - 1) : 0.5) * chartW;
        const py = (v: number) => top + chartH - ((v - low) / span) * chartH;
        const short = (v: number) => Math.abs(v) >= 1e6 ? `${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi` : Math.abs(v) >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
        for (let i = 0; i <= 3; i++) {
          const value = low + span * i / 3;
          doc.setDrawColor(...colors.gridLine); doc.setLineWidth(0.15); doc.line(x0, py(value), x0 + chartW, py(value));
          text(7, false, colors.muted); doc.text(short(value), x0 - 3, py(value) + 1, { align: "right" });
        }
        chart.series.forEach((series, j) => {
          const color = j === 0 ? colors.blue : colors.navy;
          doc.setDrawColor(...color); doc.setFillColor(...color); doc.setLineWidth(0.65);
          series.values.forEach((v, i) => { if (i > 0) doc.line(px(i - 1), py(series.values[i - 1]), px(i), py(v)); doc.circle(px(i), py(v), 0.65, "F"); });
          text(8, false, color); doc.text(series.label, margin + j * 65, top + chartH + 15);
        });
        const step = Math.max(1, Math.ceil(chart.labels.length / 6));
        chart.labels.forEach((label, i) => { if (i % step === 0 || i === chart.labels.length - 1) { text(6.5, false, colors.muted); doc.text(label, px(i), top + chartH + 6, { align: "center" }); } });
        y = top + chartH + 23;
        paragraph(`Fonte: ${block.sourceModule}`, 8, colors.muted);
      }
      block.paragraphs.forEach(p => paragraph(p));
      if (block.considerations.length) {
        room(18); text(10, true, colors.navy); doc.text("Considerações", margin, y); y += 7;
        block.considerations.slice(0, 3).forEach(p => paragraph(p, 9, colors.muted));
      }
    }
    if (!block.table?.rows.length) paragraph(`Fonte: ${block.sourceModule}`, 8, colors.muted);
    y += 5;
    block.children?.forEach(child => renderBlock(child));
  };
  report.blocks.forEach(block => renderBlock(block, true));
  page(); contents.push({ id: "conclusao", title: "Conclusão Final", page: doc.getNumberOfPages() });
  heading("Conclusão Final", 19);
  report.conclusions.slice(0, 4).forEach(value => paragraph(value, 11));
  paragraph("As conclusões se limitam aos números recuperados e à cobertura identificada nas fontes; não atribuem causas nem substituem a análise institucional.", 9, colors.muted);
  doc.setPage(2); y = 39; heading("Sumário", 22);
  contents.forEach(item => {
    const nested = !/^\d\. |Conclusão/.test(item.title);
    text(nested ? 10 : 11, !nested, nested ? colors.muted : colors.navy);
    const x = nested ? margin + 5 : margin;
    doc.text(item.title, x, y);
    doc.text(String(item.page), 191, y, { align: "right" });
    doc.link(x, y - 4, width, 6, { pageNumber: item.page });
    doc.setDrawColor(...colors.gridLine); doc.setLineWidth(0.15); doc.line(x, y + 3, 191, y + 3);
    y += nested ? 10 : 14;
  });
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    if (i > 2) { text(8, false, colors.muted); doc.text("AXIS / CONTROL · Relatório de Controladoria", margin, 15); doc.text(`${dataBR(report.period.de)} a ${dataBR(report.period.ate)}`, 191, 15, { align: "right" }); }
    text(8, false, colors.muted); doc.text(`p. ${i} de ${totalPages}`, 191, 287, { align: "right" });
  }
  return { doc, contents };
}

/** Render the exported PDF itself: screen and file always have identical pagination and content. */
export async function paginasRelatorio(pdf: ReportPdf, onPage: (src: string, index: number) => void) {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({ data: pdf.doc.output("arraybuffer") });
  const loaded = await task.promise;
  try {
    for (let i = 1; i <= loaded.numPages; i++) {
      const page = await loaded.getPage(i), viewport = page.getViewport({ scale: 1.7 });
      const canvas = document.createElement("canvas"); canvas.width = viewport.width; canvas.height = viewport.height;
      const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Não foi possível preparar a página.");
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      onPage(canvas.toDataURL("image/png"), i); page.cleanup();
    }
  } finally { await task.destroy(); }
}