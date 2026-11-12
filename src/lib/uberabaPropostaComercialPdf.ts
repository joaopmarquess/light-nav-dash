import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { attachTimbrado } from "@/lib/pdfTimbrado";
import { PDF_COLORS, drawReportHeading, drawSectionTitle } from "@/lib/pdfTheme";
import {
  FRENTES_COMERCIAIS, INDICES_PADRAO, blocosIndicadores, formatarCentavos, formatarPercentual, indicadoresPadrao, tabelaIndexada,
  type FrenteId, type IndicadoresPorFrente, type Indices,
} from "@/lib/uberabaTabelasComerciais";

type RGB = [number, number, number];

/** Cor de cada frente, igual à tela de Resultados Comerciais. */
const COR_FRENTE: Record<FrenteId, RGB> = { pcaAdm: [209, 168, 87], pceAdm: [48, 152, 213], pce100: [216, 142, 116] };
const CABECALHO: RGB = [221, 238, 248];
const ZEBRA: RGB = [243, 248, 250];
const LINHA: RGB = [212, 221, 229];
const SECUNDARIO: RGB = [84, 98, 112];

/** Tópico 1 · Tabelas: os três quadros de Resultados Comerciais (Faixa × Enfermaria e Indicadores variáveis). */
export function quadrosProposta(indices: Indices = INDICES_PADRAO, indicadores: IndicadoresPorFrente = indicadoresPadrao()) {
  return FRENTES_COMERCIAIS.map(({ id, titulo, segmento }) => ({
    id,
    titulo,
    segmento,
    linhas: tabelaIndexada(indices[id]).map((l) => [l.faixa, formatarCentavos(l.enfermariaCentavos)] as [string, string]),
    blocos: blocosIndicadores(id, indicadores[id]).map((b) => ({
      titulo: b.titulo.toUpperCase(),
      linhas: b.linhas.map((l) => [l.rotulo.toUpperCase(), formatarPercentual(l.valor)] as [string, string]),
    })),
  }));
}

// Proposta Comercial Bensaúde|Uberaba — tópico 1 com os quadros de Resultados Comerciais; demais textos ainda em Lorem ipsum.
const LOREM = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus posuere velit aliquet. Cras mattis consectetur purus sit amet fermentum. Donec ullamcorper nulla non metus auctor fringilla.",
  "Sed posuere consectetur est at lobortis. Maecenas faucibus mollis interdum. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Nullam quis risus eget urna mollis ornare vel eu leo. Aenean lacinia bibendum nulla sed consectetur.",
  "Curabitur blandit tempus porttitor. Etiam porta sem malesuada magna mollis euismod. Morbi leo risus, porta ac consectetur ac, vestibulum at eros. Praesent commodo cursus magna, vel scelerisque nisl consectetur et.",
];

const SECOES = [
  "1. Tabelas",
  "2. Objeto da proposta",
  "3. Produtos e modalidades",
  "4. Condições comerciais",
  "5. Rede assistencial",
  "6. Vigência e validade",
  "7. Glossário e Notas Explicativas",
];

/**
 * Glossário e Notas Explicativas: cada termo marcado recebe, no corpo do documento, um número elevado
 * (1, 2, 3… na ordem desta lista) e a mesma legenda no último tópico. Termos e notas são indicados pelo usuário.
 */
export const GLOSSARIO_PROPOSTA: { termo: string; nota: string }[] = [
  { termo: "ENFERMARIA", nota: "Apartamento = TRUNCAR(Enfermaria × 1,25; 2)" },
];

/** Número do marcador do termo no Glossário (começa em 1); null quando o termo não tem nota. */
export function marcadorGlossario(termo: string): number | null {
  const i = GLOSSARIO_PROPOSTA.findIndex((g) => g.termo.toUpperCase() === termo.toUpperCase());
  return i < 0 ? null : i + 1;
}

export function buildPropostaComercialPdf(timbradoDataUrl?: string | null, indices: Indices = INDICES_PADRAO, indicadores: IndicadoresPorFrente = indicadoresPadrao()): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  attachTimbrado(doc, timbradoDataUrl);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  // O traço azul do timbrado termina em ~31 mm; o título começa uma linha de texto (≈5 mm) abaixo dele, em todas as páginas.
  const marginL = 18, marginR = 18, top = 59, bottom = 20;
  const usableW = pageW - marginL - marginR;
  const heading = () => drawReportHeading(doc, {
    title: "Proposta Comercial",
    plano: "Bensaúde|Uberaba",
    secao: "Minuta provisória · conteúdo em Lorem ipsum",
    marginL, marginR, top: 38,
  });
  heading();
  let y = top;
  const novaPagina = () => { doc.addPage(); heading(); y = top; };
  const garantir = (h: number) => { if (y + h > pageH - bottom) novaPagina(); };

  const fonteTexto = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.text);
  };
  const paragrafo = (texto: string) => {
    fonteTexto();
    const linhas = doc.splitTextToSize(texto, usableW - 2) as string[];
    const h = linhas.length * 4.8;
    garantir(h);
    fonteTexto(); // o cabeçalho de uma nova página altera a fonte
    doc.text(linhas, marginL, y, { align: "justify", maxWidth: usableW - 2, lineHeightFactor: 1.35 });
    y += h + 3;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fimTabela = (fallback: number) => ((doc as any).lastAutoTable?.finalY as number | undefined) ?? fallback;

  const desenharTabelas = () => {
    const quadros = quadrosProposta(indices, indicadores);
    garantir(170); // os três quadros ficam inteiros na mesma página
    const gap = 5;
    const largura = (usableW - gap * 2) / 3;
    const xs = quadros.map((_, k) => marginL + k * (largura + gap));
    const inicio = y;
    const margem = (x: number, w: number) => ({ left: x, right: pageW - x - w, top, bottom });

    // Faixa colorida e título de cada frente.
    quadros.forEach((q, k) => {
      const x = xs[k];
      doc.setFillColor(...COR_FRENTE[q.id]);
      doc.rect(x, inicio, largura, 1.6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const wTit = doc.getTextWidth(q.titulo);
      doc.setFontSize(6.5);
      const wSeg = doc.getTextWidth(q.segmento);
      const x0 = x + (largura - (wTit + 2 + wSeg)) / 2;
      doc.setFontSize(10);
      doc.setTextColor(...PDF_COLORS.navy);
      doc.text(q.titulo, x0, inicio + 7.2);
      doc.setFontSize(6.5);
      doc.setTextColor(...COR_FRENTE[q.id]);
      doc.text(q.segmento, x0 + wTit + 2, inicio + 7.2);
    });

    // Faixa × Enfermaria.
    let fim = inicio + 10;
    quadros.forEach((q, k) => {
      autoTable(doc, {
        theme: "plain",
        startY: inicio + 10,
        tableWidth: largura,
        margin: margem(xs[k], largura),
        head: [["FAIXA", "ENFERMARIA"]],
        body: q.linhas,
        styles: { font: "helvetica", fontSize: 8, cellPadding: { top: 1.1, bottom: 1.1, left: 2, right: 2 }, textColor: PDF_COLORS.text, halign: "center" },
        headStyles: { fillColor: CABECALHO, textColor: PDF_COLORS.navy, fontStyle: "bold", fontSize: 7.5 },
        alternateRowStyles: { fillColor: ZEBRA },
        didDrawCell: (c) => {
          if (c.section === "head") {
            const texto = String(c.cell.raw ?? "");
            const n = marcadorGlossario(texto);
            if (n !== null) {
              // Número elevado logo após o termo (texto do cabeçalho é centralizado).
              doc.setFont("helvetica", "bold");
              doc.setFontSize(7.5);
              const xFim = c.cell.x + c.cell.width / 2 + doc.getTextWidth(texto) / 2;
              doc.setFontSize(5);
              doc.setTextColor(...PDF_COLORS.navy);
              doc.text(String(n), xFim + 0.4, c.cell.y + c.cell.height / 2 - 0.6);
            }
            return;
          }
          if (c.section !== "body") return;
          doc.setDrawColor(...LINHA);
          doc.setLineWidth(0.1);
          doc.line(c.cell.x, c.cell.y, c.cell.x + c.cell.width, c.cell.y);
        },
      });
      fim = Math.max(fim, fimTabela(fim));
    });

    // Indicadores variáveis: cada bloco começa na mesma linha nas três frentes.
    let yb = fim + 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(...SECUNDARIO);
    xs.forEach((x) => doc.text("INDICADORES VARIÁVEIS", x + largura / 2, yb, { align: "center" }));
    yb += 2.5;
    const nBlocos = Math.max(...quadros.map((q) => q.blocos.length));
    const inset = 2;
    for (let b = 0; b < nBlocos; b++) {
      let fimBloco = yb;
      quadros.forEach((q, k) => {
        const bloco = q.blocos[b];
        if (!bloco) return;
        autoTable(doc, {
          theme: "grid",
          startY: yb,
          tableWidth: largura - inset * 2,
          margin: margem(xs[k] + inset, largura - inset * 2),
          head: [[{ content: bloco.titulo, colSpan: 2 }]],
          body: bloco.linhas,
          styles: { font: "helvetica", fontSize: 7.2, cellPadding: { top: 1.1, bottom: 1.1, left: 2, right: 2 }, textColor: PDF_COLORS.text, lineColor: LINHA, lineWidth: 0.1 },
          headStyles: { fillColor: ZEBRA, textColor: SECUNDARIO, fontStyle: "bold", halign: "center" },
          columnStyles: { 0: { halign: "left" }, 1: { halign: "right", cellWidth: 14 } },
        });
        fimBloco = Math.max(fimBloco, fimTabela(fimBloco));
      });
      yb = fimBloco + 3;
    }

    // Contorno de cada quadro.
    const altura = yb - inicio;
    doc.setDrawColor(...LINHA);
    doc.setLineWidth(0.2);
    xs.forEach((x) => doc.rect(x, inicio, largura, altura, "S"));
    doc.setDrawColor(0);
    y = yb + 11;
    doc.setPage(doc.getNumberOfPages());
  };

  const desenharGlossario = () => {
    GLOSSARIO_PROPOSTA.forEach((g, i) => {
      const xTermo = marginL + 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const linhasNota = doc.splitTextToSize(g.nota, usableW - 8) as string[];
      garantir(6 + linhasNota.length * 4.8);
      // Número elevado + termo em destaque.
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...PDF_COLORS.navy);
      doc.text(String(i + 1), marginL, y - 1.6);
      doc.setFontSize(10);
      doc.text(g.termo, xTermo, y);
      y += 5;
      fonteTexto();
      doc.text(linhasNota, xTermo, y, { lineHeightFactor: 1.35 });
      y += linhasNota.length * 4.8 + 3;
    });
  };

  SECOES.forEach((titulo, i) => {
    const ehTabelas = titulo.startsWith("1.");
    garantir(ehTabelas ? 180 : 32); // título não fica sozinho no fim da página
    drawSectionTitle(doc, titulo, marginL, y, pageW - marginR);
    y += 8;
    if (ehTabelas) { desenharTabelas(); return; }
    if (titulo.startsWith("7.")) { desenharGlossario(); return; }
    LOREM.slice(0, i % 2 === 0 ? 3 : 2).forEach(paragrafo);
    y += 2;
  });

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(`Página ${p} de ${total}`, pageW - marginR, pageH - 10, { align: "right" });
  }
  return doc;
}
