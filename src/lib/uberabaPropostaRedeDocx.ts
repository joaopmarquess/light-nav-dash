// Word da Proposta de Credenciamento e Gestão de Rede: segue o modelo do Dênis (Proposta_Rede_Uberaba_v1.docx, 19/11/2026),
// com o conteúdo de blocosPropostaRede, o mesmo do PDF, para o Word nunca divergir do PDF.
import {
  AlignmentType, BorderStyle, Document, Footer, Header, HorizontalPositionRelativeFrom, ImageRun, Packer, PageNumber, Paragraph,
  ShadingType, Table, TableCell, TableRow, TextRun, TextWrappingType, VerticalAlign, VerticalPositionRelativeFrom, WidthType,
} from "docx";
import { PARAMETROS_REDE_PADRAO, type ParametrosRede } from "@/lib/uberabaParametrosRede";
import { TIMBRADO_URL } from "@/lib/pdfTimbrado";
import { blocosPropostaRede, quantidadesRedeAtuais, type BlocoPropostaRede, type QuantidadesRede, type TextosRede } from "@/lib/uberabaPropostaRede";

export { blocosPropostaRede, type BlocoPropostaRede };

// Cores e tamanhos (meios-pontos) do modelo: texto e títulos 12 pt, rótulo dos quadros 10 pt, Quadro 1 com 10 pt e os demais com 11 pt.
const TINTA = "0A2648", CAB = "CDDEEC", ZEBRA = "ECF1F5", LINHA = "5F6973", SEC = "232A32", TXT = "1E1E1E";
const T = { texto: 24, rotulo: 20, quadroGrupos: 20, quadro: 22, rodape: 18 };
const LARGURA = 9866; // A4 (11906) − margens de 18 mm (1020 cada), em DXA
const ALINHA = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED };

function quadro(q: Extract<BlocoPropostaRede, { tipo: "quadro" }>): Table {
  const soma = q.larguras.reduce((s, v) => s + v, 0);
  const larg = q.larguras.map((v) => Math.round((v / soma) * LARGURA));
  larg[larg.length - 1] += LARGURA - larg.reduce((s, v) => s + v, 0);
  const itens = new Set(q.itens);
  const ehItem = (r: number) => itens.has(r);
  const tamanho = q.grupos ? T.quadroGrupos : T.quadro;
  const nada = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const fino = { style: BorderStyle.SINGLE, size: 2, color: LINHA };
  const grosso = { style: BorderStyle.SINGLE, size: 12, color: TXT };
  const fim = { style: BorderStyle.SINGLE, size: 10, color: TINTA };
  const celula = (texto: string, c: number, r: number | null) => {
    const cabecalho = r === null, item = r !== null && ehItem(r), ultima = r === q.linhas.length - 1;
    // Quadro 1: traço forte acima de cada tipo e entre o tipo e o seu primeiro item; traço fino entre itens.
    const topo = cabecalho || r === 0 ? nada : q.grupos && (!item || !ehItem(r! - 1)) ? grosso : fino;
    const negrito = cabecalho || (q.grupos ? !item : q.negritoUltima && ultima);
    return new TableCell({
      width: { size: larg[c], type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
      shading: cabecalho ? { fill: CAB, type: ShadingType.CLEAR, color: "auto" } : r! % 2 === 1 ? { fill: ZEBRA, type: ShadingType.CLEAR, color: "auto" } : undefined,
      margins: { top: 80, bottom: 80, left: item && c === 0 ? 400 : 100, right: 100 },
      borders: { left: nada, right: nada, top: topo, bottom: ultima ? fim : nada },
      children: [new Paragraph({
        keepNext: q.juntos && !ultima, keepLines: true, alignment: cabecalho ? AlignmentType.CENTER : ALINHA[q.alinhamentos[c]],
        // Marca de parágrafo no tamanho do quadro: células vazias não ficam mais altas que as preenchidas.
        run: { size: tamanho },
        children: [new TextRun({ text: texto, bold: negrito, size: tamanho, color: cabecalho && !q.grupos ? TINTA : item ? SEC : TXT })],
      })],
    });
  };
  return new Table({
    width: { size: LARGURA, type: WidthType.DXA }, columnWidths: larg,
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: q.cabecalho.map((h, c) => celula(h, c, null)) }),
      ...q.linhas.map((l, r) => new TableRow({ cantSplit: true, children: l.map((t, c) => celula(t, c, r)) })),
    ],
  });
}

function elementos(blocos: BlocoPropostaRede[]): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  blocos.forEach((b, i) => {
    const aposQuadro = blocos[i - 1]?.tipo === "quadro";
    if (b.tipo === "topico") out.push(new Paragraph({ keepNext: true, spacing: { before: 200, after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: TINTA, space: 2 } },
      children: [new TextRun({ text: b.texto.toUpperCase(), bold: true, size: T.texto, color: TINTA })] }));
    else if (b.tipo === "subtopico") out.push(new Paragraph({ keepNext: true, spacing: { before: aposQuadro ? 240 : 120, after: 60 },
      children: [new TextRun({ text: b.texto, bold: true, size: T.texto, color: TINTA })] }));
    else if (b.tipo === "rotulo") out.push(new Paragraph({ keepNext: true, spacing: { before: 240, after: 60 },
      children: [new TextRun({ text: b.texto, bold: true, italics: true, size: T.rotulo, color: TXT })] }));
    else if (b.tipo === "paragrafo") out.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { before: aposQuadro ? 200 : 0, after: 160, line: 324 },
      children: [new TextRun({ text: b.texto, size: T.texto, color: TXT })] }));
    else out.push(quadro(b));
  });
  return out;
}

/** Papel timbrado como bytes PNG (o mesmo do PDF); sem ele o documento sai sem fundo. */
export async function carregarTimbradoBytes(): Promise<Uint8Array | null> {
  try { return new Uint8Array(await (await fetch(TIMBRADO_URL)).arrayBuffer()); } catch { return null; }
}

export function documentoPropostaRede(blocos: BlocoPropostaRede[], timbrado: Uint8Array | null): Document {
  const fundo = timbrado ? [new Paragraph({ children: [new ImageRun({
    type: "png", data: timbrado, transformation: { width: 794, height: 1123 },
    floating: { horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 }, verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
      behindDocument: true, allowOverlap: true, wrap: { type: TextWrappingType.NONE } },
    altText: { title: "Papel timbrado", description: "Papel timbrado do Bensaúde", name: "timbrado" },
  })] })] : [];
  return new Document({
    creator: "Bensaúde", title: "Proposta de Credenciamento e Gestão de Rede — Bensaúde|Uberaba",
    styles: { default: { document: { run: { font: "Arial", size: T.texto } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 2381, bottom: 1417, left: 1020, right: 1020, header: 0, footer: 850 } } },
      headers: { default: new Header({ children: fundo }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
        children: [new TextRun({ children: ["Página ", PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES], size: T.rodape, color: "2D2D2D" })] })] }) },
      children: elementos(blocos),
    }],
  });
}

export async function buildPropostaRedeDocx(
  timbrado: Uint8Array | null, parametros: ParametrosRede = PARAMETROS_REDE_PADRAO, textos: TextosRede | null = null, quantidades: QuantidadesRede = quantidadesRedeAtuais(),
): Promise<Blob> {
  return Packer.toBlob(documentoPropostaRede(blocosPropostaRede(parametros, textos, quantidades), timbrado));
}
