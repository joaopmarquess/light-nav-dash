/** Impressão das Tabelas de Resultados Comerciais (Proj. Uberaba): uma página Venda e uma Net com as quatro tabelas, mesmos cálculos da tela. */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { aplicarMarcaAxis } from "@/lib/pdfMarcaAxis";
import { attachTimbrado, TIMBRADO_RAZAO_SOCIAL } from "@/lib/pdfTimbrado";
import {
  FRENTES_COMERCIAIS, formatarCentavos, formatarFator, formatarPercentual, operadoraDe, parametrosDe, tabelaNet, tabelaVenda,
  type Fatores, type FrenteId, type IndicadoresPorFrente, type Indices, type RotulosPorFrente,
} from "@/lib/uberabaTabelasComerciais";

export type ModoPrecoImpressao = "venda" | "net";
export type QuadroImpressao = { id: FrenteId; titulo: string; sigla: string; detalhe: string; nota: string; linhas: [string, string, string][] };

/** Um quadro por tabela, na ordem da tela; Net = Venda × participação da OPERADORA da própria tabela. */
export function quadrosImpressao(modo: ModoPrecoImpressao, d: { indices: Indices; fatores: Fatores; indicadores: IndicadoresPorFrente; rotulos: RotulosPorFrente }): QuadroImpressao[] {
  return FRENTES_COMERCIAIS.map(({ id }) => {
    const operadora = operadoraDe(id, d.indicadores[id]);
    const tabela = modo === "net" ? tabelaNet(d.indices[id], operadora, d.fatores[id]) : tabelaVenda(d.indices[id], d.fatores[id]);
    const ref = `Referência × ${formatarPercentual(d.indices[id])}`;
    return {
      id,
      titulo: d.rotulos[id].titulo,
      sigla: parametrosDe(id).sigla,
      detalhe: modo === "net" ? `${ref} × OPERADORA ${formatarPercentual(operadora)}` : ref,
      nota: `Apartamento = Enfermaria × ${formatarFator(d.fatores[id])}`,
      linhas: tabela.map((l) => [l.faixa, formatarCentavos(l.enfermariaCentavos), formatarCentavos(l.apartamentoCentavos)]),
    };
  });
}

type RGB = [number, number, number];
const TINTA: RGB = [26, 46, 79];
const TEXTO: RGB = [20, 20, 20];
const FUNDO: RGB = [226, 232, 240];

/** Ordem das páginas impressas: sempre Venda e depois Net, qualquer que seja o modo exibido na tela. */
export const MODOS_IMPRESSAO: ModoPrecoImpressao[] = ["venda", "net"];
export type PaginaImpressao = { modo: ModoPrecoImpressao; quadros: QuadroImpressao[] };
export const paginasImpressao = (d: Parameters<typeof quadrosImpressao>[1]): PaginaImpressao[] =>
  MODOS_IMPRESSAO.map((modo) => ({ modo, quadros: quadrosImpressao(modo, d) }));

/** A4 retrato, uma página por modo: título, regra do modo e as quatro tabelas em 2 × 2 (cores escuras, legíveis em preto e branco). */
export function buildTabelasImpressaoPdf(timbrado: string | null, marca: string | null, paginas: PaginaImpressao[], geradoEm = new Date()): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  attachTimbrado(doc, timbrado, { semRazaoSocial: true });
  paginas.forEach((pg, i) => { if (i > 0) doc.addPage(); desenharPagina(doc, pg.modo, pg.quadros); });
  rodape(doc, marca, geradoEm);
  return doc;
}

function desenharPagina(doc: jsPDF, modo: ModoPrecoImpressao, quadros: QuadroImpressao[]) {
  const pageW = doc.internal.pageSize.getWidth();
  const mL = 18, mR = 18, right = pageW - mR, gap = 8, w = (pageW - mL - mR - gap) / 2;
  let y = 44;
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(...TINTA);
  doc.text(`Tabelas de Preço · ${modo === "net" ? "Net" : "Venda"}`, mL, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...TEXTO);
  doc.text(modo === "net" ? "Proj. Uberaba · Preço Net = Preço de Venda × participação da OPERADORA de cada tabela" : "Proj. Uberaba · Preço de Venda = Referência × fator de cada tabela", mL, y + 6);
  doc.setDrawColor(...TINTA); doc.setLineWidth(0.6); doc.line(mL, y + 9, right, y + 9);
  y += 16;

  let linhaY = y, proximaY = y;
  quadros.forEach((q, i) => {
    const col = i % 2;
    if (col === 0 && i > 0) linhaY = proximaY + 6;
    const x = mL + col * (w + gap);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...TINTA);
    doc.text(doc.splitTextToSize(q.titulo, w)[0], x, linhaY + 4);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...TEXTO);
    doc.text(`${q.sigla} · ${q.detalhe}`, x, linhaY + 9);
    autoTable(doc, {
      startY: linhaY + 11.5,
      margin: { left: x, right: pageW - x - w },
      tableWidth: w,
      head: [["FAIXA", "ENFERMARIA", "APARTAMENTO"]],
      body: q.linhas,
      theme: "grid",
      styles: { font: "helvetica", fontSize: 10.5, cellPadding: 1.8, halign: "center", textColor: TEXTO, lineColor: TINTA, lineWidth: 0.2 },
      headStyles: { fillColor: FUNDO, textColor: TINTA, fontStyle: "bold", fontSize: 10 },
      columnStyles: { 0: { fontStyle: "bold" } },
    });
    const fim = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    doc.setFont("helvetica", "italic"); doc.setFontSize(8.5); doc.setTextColor(...TEXTO);
    doc.text(q.nota, x, fim + 4.5);
    proximaY = Math.max(proximaY, fim + 5);
  });
}

function rodape(doc: jsPDF, marca: string | null, geradoEm: Date) {
  const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
  const mL = 18, right = pageW - 18;
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...TEXTO);
    doc.text(`Gerado em ${geradoEm.toLocaleDateString("pt-BR")} ${geradoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`, mL, pageH - 16);
    doc.text(`Página ${p} de ${total}`, right, pageH - 16, { align: "right" });
  }
  aplicarMarcaAxis(doc, marca, (_p, pw, h) => ({ x: pw / 2, y: TIMBRADO_RAZAO_SOCIAL.linha * (h / 297), align: "center" }), 7.5);
}
