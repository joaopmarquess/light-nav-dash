import { aplicarMarcaAxis, loadMarcaAxis } from "@/lib/pdfMarcaAxis";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/** Prepara o clone para captura: tabelas inteiras, sem rolagem/colunas fixas e sem controles marcados. */
function prepararClone(el: HTMLElement) {
  el.querySelectorAll<HTMLElement>("[data-pdf-ocultar]").forEach(n => { n.style.display = "none"; });
  [el, ...Array.from(el.querySelectorAll<HTMLElement>("*"))].forEach(n => {
    const cs = n.ownerDocument.defaultView!.getComputedStyle(n);
    if (/(auto|scroll)/.test(cs.overflowX) || /(auto|scroll)/.test(cs.overflowY)) { n.style.overflow = "visible"; n.style.maxHeight = "none"; }
    if (cs.position === "sticky") n.style.position = "static";
  });
  el.style.width = "max-content"; el.style.minWidth = `${el.getBoundingClientRect().width}px`;
}

async function capturar(el: HTMLElement) {
  // Fundo branco: o PDF é pensado para impressão, inclusive em preto e branco.
  const fundo = "#ffffff";
  const canvas = await html2canvas(el, {
    scale: 2, backgroundColor: fundo, logging: false, imageTimeout: 1000,
    onclone: (_doc, clone) => prepararClone(clone),
  });
  return { data: canvas.toDataURL("image/jpeg", 0.92), w: canvas.width, h: canvas.height };
}

/** Gera um PDF A4 paisagem com cabeçalho e as seções da tela, uma abaixo da outra, quebrando página entre seções. */
export async function gerarPdfComparacao(secoes: HTMLElement[], cabecalho: { titulo: string; linhas: string[] }, arquivo: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 10;
  const larguraUtil = W - 2 * M, rodape = 8;
  const gerado = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

  doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text(cabecalho.titulo, M, M + 5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  let y = M + 11;
  cabecalho.linhas.forEach(l => { doc.text(l, M, y); y += 4.5; });
  y += 2;

  for (const el of secoes) {
    const img = await capturar(el);
    let w = larguraUtil, h = (img.h / img.w) * w;
    const alturaMax = H - 2 * M - rodape;
    if (h > alturaMax) { h = alturaMax; w = (img.w / img.h) * h; }
    const resta = H - M - rodape - y;
    // Reduz até 20% para manter a seção na página atual; acima disso, começa uma página nova.
    if (h > resta && h * 0.8 <= resta) { w = w * (resta / h); h = resta; }
    else if (h > resta) { doc.addPage(); y = M; }
    doc.addImage(img.data, "JPEG", M, y, w, h);
    y += h + 4;
  }

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p); doc.setFontSize(8); doc.setTextColor(40);
    doc.text(`Bench Vidas · Fonte: ANS · gerado em ${gerado}`, M, H - M + 2);
    doc.text(`Página ${p} de ${total}`, W - M, H - M + 2, { align: "right" });
  }
  aplicarMarcaAxis(doc, await loadMarcaAxis(), (_p, w, h) => ({ x: w / 2, y: h - M + 2, align: "center" }));
  doc.save(arquivo);
}
