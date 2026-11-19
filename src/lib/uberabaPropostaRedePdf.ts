// PDF da Proposta de Credenciamento e Gestão de Rede (Proj. Uberaba): segue o modelo do Dênis (Proposta_Rede_Uberaba_v1.docx, 19/11/2026) —
// papel timbrado, tópicos corridos, texto 12 pt justificado, quadros numerados e tinta escura para impressão p/b.
// O conteúdo vem de blocosPropostaRede, o mesmo do Word.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { attachTimbrado } from "@/lib/pdfTimbrado";
import { drawSectionTitle } from "@/lib/pdfTheme";
import { CABECALHO, LINHA, RODAPE, SECUNDARIO, TINTA, ZEBRA, textoPdf } from "@/lib/uberabaPropostaComercialPdf";
import { paragrafosDe } from "@/lib/uberabaPropostaTextos";
import { PARAMETROS_REDE_PADRAO, type ParametrosRede } from "@/lib/uberabaParametrosRede";
import {
  SECOES_REDE, TEXTOS_REDE_PADRAO, TITULO_CONDICOES_GERAIS_REDE, blocosPropostaRede, quantidadesRedeAtuais,
  type BlocoPropostaRede, type QuantidadesRede, type TextosRede,
} from "@/lib/uberabaPropostaRede";

/** Tamanhos do modelo do Dênis (pt): texto e títulos 12, rótulo dos quadros 10, Quadro 1 com 10 e os demais com 11. */
export const FONTES_PROPOSTA_REDE = { texto: 12, topico: 12, rotulo: 10, quadroGrupos: 10, quadro: 11, rodape: 9 } as const;
const F = FONTES_PROPOSTA_REDE;
const TEXTO: [number, number, number] = [30, 30, 30];
const alturaLinha = (pt: number) => pt * 0.3528 * 1.35;

/** Tópicos do PDF, na ordem (o 4, Condições Gerais, é fixo e não tem texto da IA). */
export const TOPICOS_PROPOSTA_REDE = [...SECOES_REDE.map((s) => s.titulo), TITULO_CONDICOES_GERAIS_REDE];

/** Parágrafos de cada tópico: o texto aprovado ou, sem aprovação, o padrão. */
export function paragrafosPropostaRede(textos: TextosRede | null = null): string[][] {
  const t = textos ?? TEXTOS_REDE_PADRAO;
  return SECOES_REDE.map((s) => paragrafosDe(t[s.id]));
}

type Quadro = Extract<BlocoPropostaRede, { tipo: "quadro" }>;

export function buildPropostaRedePdf(
  timbradoDataUrl?: string | null, parametros: ParametrosRede = PARAMETROS_REDE_PADRAO, textos: TextosRede | null = null,
  quantidades: QuantidadesRede = quantidadesRedeAtuais(),
): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  attachTimbrado(doc, timbradoDataUrl);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 18, marginR = 18, top = 42, bottom = 25;
  const LARGURA = pageW - marginL - marginR;
  let y = top;
  const novaPagina = () => { doc.addPage(); y = top; };
  const garantir = (h: number) => { if (y + h > pageH - bottom) novaPagina(); };
  const LINHA_TEXTO = alturaLinha(F.texto);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fimTabela = (alvo: jsPDF, fallback: number) => ((alvo as any).lastAutoTable?.finalY as number | undefined) ?? fallback;

  const fonteTexto = () => { doc.setFont("helvetica", "normal"); doc.setFontSize(F.texto); doc.setTextColor(...TEXTO); };
  /** Parágrafo justificado; continua na página seguinte quando preciso, nunca deixando uma linha sozinha. */
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

  const desenharTabela = (alvo: jsPDF, inicio: number, q: Quadro, linhas: string[][]) => {
    const soma = q.larguras.reduce((s, v) => s + v, 0);
    const itens = new Set(q.itens);
    const fonte = q.grupos ? F.quadroGrupos : F.quadro;
    const ehItem = (r: number) => itens.has(r);
    autoTable(alvo, {
      rowPageBreak: "avoid",
      theme: "plain",
      startY: inicio,
      tableWidth: LARGURA,
      margin: { left: marginL, right: marginR, top, bottom },
      head: [q.cabecalho],
      body: linhas,
      styles: { font: "helvetica", fontSize: fonte, cellPadding: { top: 1.4, bottom: 1.4, left: 1.8, right: 1.8 }, textColor: TEXTO, halign: "center", valign: "middle", overflow: "linebreak" },
      headStyles: { fillColor: CABECALHO, textColor: q.grupos ? TEXTO : TINTA, fontStyle: "bold", fontSize: fonte },
      columnStyles: Object.fromEntries(q.larguras.map((w, i) => [i, { cellWidth: (w / soma) * LARGURA, halign: q.alinhamentos[i] }])),
      didParseCell: (c) => {
        if (c.section !== "body") return;
        const ultima = c.row.index === linhas.length - 1;
        // Zebra como no modelo: primeira linha clara, segunda sombreada, e assim por diante.
        if (c.row.index % 2 === 1) c.cell.styles.fillColor = ZEBRA;
        if (q.grupos ? !ehItem(c.row.index) : q.negritoUltima && ultima) c.cell.styles.fontStyle = "bold";
        // Itens dos tipos abertos: recuados e em tinta secundária, abaixo do seu tipo.
        if (ehItem(c.row.index)) {
          c.cell.styles.textColor = SECUNDARIO;
          if (c.column.index === 0) c.cell.styles.cellPadding = { top: 1.4, bottom: 1.4, left: 7, right: 1.8 };
        }
      },
      didDrawCell: (c) => {
        if (c.section !== "body" || c.row.index === 0) return;
        // Quadro 1: traço forte acima de cada tipo e entre o tipo e o seu primeiro item; traço fino entre itens.
        const forte = q.grupos && (!ehItem(c.row.index) || !ehItem(c.row.index - 1));
        alvo.setDrawColor(...(forte ? TEXTO : LINHA));
        alvo.setLineWidth(forte ? 0.5 : 0.2);
        alvo.line(c.cell.x, c.cell.y, c.cell.x + c.cell.width, c.cell.y);
      },
    });
  };
  /** Altura do quadro (ou de parte dele), medida num rascunho descartado do mesmo tamanho. */
  const alturaTabela = (q: Quadro, linhas: string[][]) => {
    const rascunho = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    desenharTabela(rascunho, top, q, linhas);
    return fimTabela(rascunho, top) - top;
  };
  const ALTURA_ROTULO = 7;
  const rotulo = (texto: string) => {
    doc.setFont("helvetica", "bolditalic"); doc.setFontSize(F.rotulo); doc.setTextColor(...TEXTO);
    doc.text(textoPdf(texto), marginL, y + 3.5);
    y += ALTURA_ROTULO;
  };
  const tabela = (q: Quadro, rotuloTexto: string | null) => {
    // Rótulo e cabeçalho nunca ficam sozinhos no fim da página; o quadro "juntos" (Quadro 3) começa e termina na mesma página.
    const extra = rotuloTexto ? ALTURA_ROTULO : 0;
    garantir(extra + alturaTabela(q, q.juntos ? q.linhas : q.linhas.slice(0, 1)));
    if (rotuloTexto) rotulo(rotuloTexto);
    desenharTabela(doc, y, q, q.linhas);
    const fimT = fimTabela(doc, y);
    doc.setDrawColor(...TINTA);
    doc.setLineWidth(0.6);
    doc.line(marginL, fimT, marginL + LARGURA, fimT);
    doc.setDrawColor(0);
    y = fimT + 7;
  };

  const LINHA_TOPICO = alturaLinha(F.topico);
  const tituloTopico = (titulo: string) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(F.topico);
    const linhas = doc.splitTextToSize(titulo.toUpperCase(), LARGURA) as string[];
    // Título nunca sozinho no fim da página: precisa caber com duas linhas de texto.
    garantir(12 + (linhas.length - 1) * LINHA_TOPICO + LINHA_TEXTO * 2);
    linhas.slice(0, -1).forEach((l, i) => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(F.topico); doc.setTextColor(...TINTA);
      doc.text(l, marginL, y + i * LINHA_TOPICO);
    });
    y += (linhas.length - 1) * LINHA_TOPICO;
    drawSectionTitle(doc, linhas[linhas.length - 1], marginL, y, pageW - marginR, TINTA, F.topico);
    y += 9;
  };
  const subtopico = (texto: string) => {
    garantir(8 + LINHA_TEXTO * 2);
    doc.setFont("helvetica", "bold"); doc.setFontSize(F.texto); doc.setTextColor(...TINTA);
    doc.text(textoPdf(texto), marginL, y + 2);
    y += 7.5;
  };

  const blocos = blocosPropostaRede(parametros, textos, quantidades);
  blocos.forEach((b, i) => {
    if (b.tipo === "topico") { if (i > 0) y += 2; tituloTopico(b.texto); }
    else if (b.tipo === "subtopico") subtopico(b.texto);
    else if (b.tipo === "paragrafo") paragrafo(b.texto);
    else if (b.tipo === "quadro") tabela(b, blocos[i - 1]?.tipo === "rotulo" ? (blocos[i - 1] as { texto: string }).texto : null);
    // O rótulo é desenhado junto com o seu quadro, para nunca ficar sozinho no fim da página.
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
