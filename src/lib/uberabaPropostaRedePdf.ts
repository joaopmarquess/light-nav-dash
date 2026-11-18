// PDF da Proposta de Credenciamento e Gestão de Rede (Proj. Uberaba): mesmo padrão da Proposta Comercial —
// papel timbrado, sem cabeçalho de título, tópicos corridos, texto 13 pt justificado e tinta escura para impressão p/b.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { attachTimbrado } from "@/lib/pdfTimbrado";
import { PDF_COLORS, drawSectionTitle } from "@/lib/pdfTheme";
import { CABECALHO, FONTES_PROPOSTA as F, LINHA, RODAPE, SECUNDARIO, TINTA, ZEBRA, textoPdf } from "@/lib/uberabaPropostaComercialPdf";
import { paragrafosDe } from "@/lib/uberabaPropostaTextos";
import { PARAMETROS_REDE_PADRAO, type ParametrosRede } from "@/lib/uberabaParametrosRede";
import {
  COLUNAS_CONDICOES_REDE, NOTA_CONDICOES_REDE, SECOES_REDE, TEXTOS_REDE_PADRAO, linhasCondicoesRede, linhasParametrosRede, regraMensalidadeRede,
  type SecaoRedeId, type TextosRede,
} from "@/lib/uberabaPropostaRede";

const alturaLinha = (pt: number) => pt * 0.3528 * 1.35;

/** Tópicos do PDF, na ordem. */
export const TOPICOS_PROPOSTA_REDE = SECOES_REDE.map((s) => s.titulo);

/** Parágrafos de cada tópico: o texto aprovado ou, sem aprovação, o padrão. */
export function paragrafosPropostaRede(textos: TextosRede | null = null): string[][] {
  const t = textos ?? TEXTOS_REDE_PADRAO;
  return SECOES_REDE.map((s) => paragrafosDe(t[s.id]));
}

export function buildPropostaRedePdf(timbradoDataUrl?: string | null, parametros: ParametrosRede = PARAMETROS_REDE_PADRAO, textos: TextosRede | null = null): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  attachTimbrado(doc, timbradoDataUrl);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 18, marginR = 18, top = 42, bottom = 25;
  const usableW = pageW - marginL - marginR;
  const LARGURA = usableW - 2;
  let y = top;
  const novaPagina = () => { doc.addPage(); y = top; };
  const garantir = (h: number) => { if (y + h > pageH - bottom) novaPagina(); };
  const LINHA_TEXTO = alturaLinha(F.texto);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fimTabela = (fallback: number) => ((doc as any).lastAutoTable?.finalY as number | undefined) ?? fallback;

  const fonteTexto = () => { doc.setFont("helvetica", "normal"); doc.setFontSize(F.texto); doc.setTextColor(...PDF_COLORS.text); };
  const paragrafo = (texto: string) => {
    fonteTexto();
    let linhas = doc.splitTextToSize(textoPdf(texto), LARGURA) as string[];
    while (linhas.length) {
      const cabem = Math.floor((pageH - bottom - y) / LINHA_TEXTO) + 1;
      if (cabem < Math.min(2, linhas.length)) { novaPagina(); continue; }
      const parte = linhas.slice(0, cabem);
      linhas = linhas.slice(cabem);
      fonteTexto();
      doc.text(linhas.length ? [...parte, ""] : parte, marginL, y, { align: "justify", maxWidth: LARGURA, lineHeightFactor: 1.35 });
      if (linhas.length) novaPagina();
      else y += parte.length * LINHA_TEXTO + 3;
    }
  };

  const tabela = (head: string[], body: string[][], colunas: Record<number, { halign?: "left" | "center" | "right"; cellWidth?: number }>, negritoUltima: boolean) => {
    autoTable(doc, {
      theme: "plain",
      startY: y,
      tableWidth: LARGURA,
      margin: { left: marginL, right: pageW - marginL - LARGURA, top, bottom },
      head: [head],
      body,
      styles: { font: "helvetica", fontSize: F.parametros, cellPadding: { top: 1.6, bottom: 1.6, left: 1.8, right: 1.8 }, textColor: PDF_COLORS.text, halign: "center", valign: "middle", overflow: "linebreak" },
      headStyles: { fillColor: CABECALHO, textColor: TINTA, fontStyle: "bold", fontSize: F.parametros - 2 },
      columnStyles: colunas,
      alternateRowStyles: { fillColor: ZEBRA },
      didParseCell: (c) => { if (negritoUltima && c.section === "body" && c.row.index === body.length - 1) c.cell.styles.fontStyle = "bold"; },
      didDrawCell: (c) => {
        if (c.section === "head") return;
        doc.setDrawColor(...LINHA);
        doc.setLineWidth(0.2);
        doc.line(c.cell.x, c.cell.y, c.cell.x + c.cell.width, c.cell.y);
      },
    });
    const fimT = fimTabela(y);
    doc.setDrawColor(...TINTA);
    doc.setLineWidth(0.6);
    doc.line(marginL, fimT, marginL + LARGURA, fimT);
    doc.setDrawColor(0);
    y = fimT + 5;
  };

  const nota = (texto: string) => {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(F.notaPrecos);
    doc.setTextColor(...SECUNDARIO);
    const linhas = doc.splitTextToSize(textoPdf(texto), LARGURA) as string[];
    const LN = alturaLinha(F.notaPrecos);
    linhas.forEach((l) => { garantir(LN); doc.text(l, marginL, y); y += LN; });
    y += 6;
  };

  const desenharCondicoes = () => {
    // Larguras fixas (somam a largura do texto): nenhum título de coluna ou valor se parte no meio da palavra.
    tabela([...COLUNAS_CONDICOES_REDE], linhasCondicoesRede(), {
      0: { halign: "left", cellWidth: 46 }, 1: { cellWidth: 28 }, 2: { cellWidth: 28 }, 3: { cellWidth: 38 }, 4: { cellWidth: LARGURA - 140 },
    }, true);
    nota(NOTA_CONDICOES_REDE);
  };
  const desenharGestao = () => {
    tabela(["PARÂMETRO", "VALOR"], linhasParametrosRede(parametros), { 0: { halign: "left" }, 1: { cellWidth: 50 } }, false);
    nota(regraMensalidadeRede(parametros));
  };
  const blocoDados: Partial<Record<SecaoRedeId, () => void>> = { condicoes: desenharCondicoes, gestao: desenharGestao };

  /** Altura exata dos parágrafos (mesma quebra e espaçamento de `paragrafo`). */
  const alturaParagrafos = (lista: string[]) => {
    fonteTexto();
    return lista.reduce((h, t) => h + (doc.splitTextToSize(textoPdf(t), LARGURA) as string[]).length * LINHA_TEXTO + 3, 0);
  };
  /** Altura aproximada de cada quadro com a sua nota: título, texto e quadro ficam juntos na mesma página. */
  const ALTURA_BLOCO: Partial<Record<SecaoRedeId, number>> = { condicoes: 78, gestao: 48 };

  const corpo = paragrafosPropostaRede(textos);
  SECOES_REDE.forEach((s, i) => {
    const h = 12 + alturaParagrafos(corpo[i]) + (ALTURA_BLOCO[s.id] ?? 0);
    garantir(h > pageH - top - bottom ? 10 + LINHA_TEXTO * 3 : h);
    drawSectionTitle(doc, s.titulo, marginL, y, pageW - marginR, TINTA, F.topico);
    y += 10;
    corpo[i].forEach(paragrafo);
    y += 2;
    blocoDados[s.id]?.();
  });

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(F.rodape);
    doc.setTextColor(...RODAPE);
    doc.text(`Página ${p} de ${total}`, pageW - marginR, pageH - 16.5, { align: "right" });
  }
  return doc;
}
