// PDF das propostas "Administrados" e "Empresariais": capa, sumário e os quatro tópicos, com o timbrado, as fontes e a
// paleta escura da Proposta Comercial (legível em preto e branco). Conteúdo de src/lib/uberabaPropostaGrupo.ts.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { attachTimbrado } from "@/lib/pdfTimbrado";
import { inserirCapaESumario, mesAnoCapa, numerarPaginasProposta, type ItemSumario, type LogoCapa } from "@/lib/pdfCapaProposta";
import { PDF_COLORS, drawSectionTitle } from "@/lib/pdfTheme";
import { CABECALHO, COR_FRENTE, FONTES_PROPOSTA as F, LINHA, RODAPE, SECUNDARIO, TINTA, ZEBRA, textoPdf } from "@/lib/uberabaPropostaComercialPdf";
import { TOPICOS_PROPOSTA_GRUPO, type PropostaGrupo, type TabelaProdutoGrupo } from "@/lib/uberabaPropostaGrupo";

const alturaLinha = (pt: number) => pt * 0.3528 * 1.35;

export function buildPropostaGrupoPdf(p: PropostaGrupo, timbradoDataUrl?: string | null, logo: LogoCapa | null = null): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const timbrado = attachTimbrado(doc, timbradoDataUrl);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 18, marginR = 18, top = 42, bottom = 25;
  const largura = pageW - marginL - marginR - 2;
  let y = top;
  const topicos: ItemSumario[] = [];
  const garantir = (h: number) => { if (y + h > pageH - bottom) { doc.addPage(); y = top; } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fimTabela = (fallback: number) => ((doc as any).lastAutoTable?.finalY as number | undefined) ?? fallback;

  const titulo = (t: string, juntos: number) => {
    garantir(10 + juntos);
    topicos.push({ titulo: textoPdf(t), pagina: doc.getNumberOfPages() });
    drawSectionTitle(doc, t, marginL, y, pageW - marginR, TINTA, F.topico);
    y += 10;
  };

  // Dois quadros lado a lado: faixa colorida, nome da tabela, sigla/vidas e Faixa × Enfermaria × Apartamento.
  const GAP = 6;
  const wQ = (largura - GAP) / 2;
  const ALTURA_QUADROS = 2 + 15 + 11 * 6.6 + 4;
  const quadros = (lista: TabelaProdutoGrupo[]) => {
    const inicio = y;
    let fim = inicio;
    lista.forEach((q, k) => {
      const x = marginL + k * (wQ + GAP);
      doc.setFillColor(...COR_FRENTE[q.id]);
      doc.rect(x, inicio, wQ, 2, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(F.quadro); doc.setTextColor(...TINTA);
      doc.text(textoPdf(q.titulo), x + wQ / 2, inicio + 7, { align: "center", baseline: "middle" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(F.subtituloQuadro); doc.setTextColor(...SECUNDARIO);
      doc.text(textoPdf(q.subtitulo), x + wQ / 2, inicio + 12.5, { align: "center", baseline: "middle" });
      autoTable(doc, {
        theme: "plain",
        startY: inicio + 17,
        tableWidth: wQ,
        margin: { left: x, right: pageW - x - wQ, top, bottom },
        head: [["FAIXA", "ENFERMARIA", "APARTAMENTO"]],
        body: q.linhas,
        styles: { font: "helvetica", fontSize: 12, cellPadding: { top: 1, bottom: 1, left: 1.5, right: 1.5 }, minCellHeight: 6.6, valign: "middle", textColor: PDF_COLORS.text, halign: "center" },
        headStyles: { fillColor: CABECALHO, textColor: TINTA, fontStyle: "bold", fontSize: F.cabecalhoTabela },
        alternateRowStyles: { fillColor: ZEBRA },
        didDrawCell: (c) => {
          if (c.section !== "body") return;
          doc.setDrawColor(...LINHA); doc.setLineWidth(0.2);
          doc.line(c.cell.x, c.cell.y, c.cell.x + c.cell.width, c.cell.y);
        },
      });
      fim = Math.max(fim, fimTabela(inicio));
    });
    doc.setDrawColor(...TINTA); doc.setLineWidth(0.35);
    lista.forEach((_, k) => doc.rect(marginL + k * (wQ + GAP), inicio, wQ, fim - inicio, "S"));
    doc.setDrawColor(0);
    y = fim + 10;
  };

  const LINHA_TEXTO = alturaLinha(F.texto);
  const texto = (t: string, recuo = 0) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(F.texto); doc.setTextColor(...PDF_COLORS.text);
    const linhas = doc.splitTextToSize(textoPdf(t), largura - recuo) as string[];
    garantir(linhas.length * LINHA_TEXTO);
    doc.text(linhas, marginL + recuo, y, { align: "justify", maxWidth: largura - recuo, lineHeightFactor: 1.35 });
    y += linhas.length * LINHA_TEXTO + 2;
  };
  const item = (t: string) => {
    garantir(LINHA_TEXTO);
    doc.setFillColor(...TINTA);
    doc.circle(marginL + 2, y - 1.3, 0.8, "F");
    texto(t, 6);
  };

  titulo(TOPICOS_PROPOSTA_GRUPO[0], ALTURA_QUADROS);
  quadros(p.net);
  titulo(TOPICOS_PROPOSTA_GRUPO[1], ALTURA_QUADROS);
  quadros(p.venda);
  titulo(TOPICOS_PROPOSTA_GRUPO[2], p.distribuidores.length * LINHA_TEXTO);
  p.distribuidores.forEach(item);
  y += 6;
  titulo(TOPICOS_PROPOSTA_GRUPO[3], LINHA_TEXTO * 3);
  texto(p.promocao);
  p.metas.forEach(item);

  inserirCapaESumario(doc, { titulo: "Proposta Comercial", subtitulo: `Bensaúde|Uberaba · ${p.nome}`, mesAno: mesAnoCapa(), logo }, topicos,
    { tinta: TINTA, secundario: SECUNDARIO, timbrado, topoSumario: top + 2, margem: marginL });
  numerarPaginasProposta(doc, (t) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(F.rodape); doc.setTextColor(...RODAPE);
    doc.text(t, pageW - marginR, pageH - 16.5, { align: "right" });
  });
  return doc;
}
