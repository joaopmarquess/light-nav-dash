// Word da Proposta de Credenciamento e Gestão de Rede (pedido de 19/11/2026): mesmos textos, quadros e ordem do PDF,
// vindos de blocosPropostaRede sobre os mesmos helpers, para o Word nunca divergir do PDF.
import {
  AlignmentType, BorderStyle, Document, Footer, Header, HorizontalPositionRelativeFrom, ImageRun, Packer, PageNumber, Paragraph,
  ShadingType, Table, TableCell, TableRow, TextRun, TextWrappingType, VerticalAlign, VerticalPositionRelativeFrom, WidthType,
} from "docx";
import { PARAMETROS_REDE_PADRAO, type ParametrosRede } from "@/lib/uberabaParametrosRede";
import { TIMBRADO_URL } from "@/lib/pdfTimbrado";
import {
  COLUNAS_CONDICOES_REDE, COLUNAS_RESULTADO_REDE, CONDICOES_GERAIS_REDE, NOTA_CONDICOES_REDE, NOTA_PROJECAO_REDE, SECOES_REDE,
  SUBTITULO_PROJECAO_REDE, TEXTO_CONDICOES_GERAIS_REDE, TEXTO_PROJECAO_REDE, TITULO_CONDICOES_GERAIS_REDE, linhasParametrosRede,
  linhasResultadoRede, quadroCondicoesRede, quantidadesRedeAtuais, regraMensalidadeRede, type QuantidadesRede, type TextosRede,
} from "@/lib/uberabaPropostaRede";
import { paragrafosPropostaRede } from "@/lib/uberabaPropostaRedePdf";

type Alinhamento = "left" | "center" | "right" | "justify";
export type BlocoPropostaRede =
  | { tipo: "topico"; texto: string }
  | { tipo: "subtopico"; texto: string }
  | { tipo: "rotulo"; texto: string }
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "quadro"; cabecalho: string[]; linhas: string[][]; larguras: number[]; alinhamentos: Alinhamento[]; negritoUltima: boolean; itens: number[]; juntos: boolean };

/** Sequência do documento, na mesma ordem do PDF: tópicos 1–3 com seus quadros, Projeção financeira e Condições Gerais em subtópicos. */
export function blocosPropostaRede(
  parametros: ParametrosRede = PARAMETROS_REDE_PADRAO, textos: TextosRede | null = null, quantidades: QuantidadesRede = quantidadesRedeAtuais(),
): BlocoPropostaRede[] {
  const corpo = paragrafosPropostaRede(textos);
  const b: BlocoPropostaRede[] = [];
  SECOES_REDE.forEach((s, i) => {
    b.push({ tipo: "topico", texto: s.titulo });
    corpo[i].forEach((t) => b.push({ tipo: "paragrafo", texto: t }));
    if (s.id === "condicoes") {
      const quadro = quadroCondicoesRede(quantidades);
      b.push({ tipo: "quadro", cabecalho: [...COLUNAS_CONDICOES_REDE], linhas: quadro.map((l) => l.celulas), larguras: [70, 26, 36, 40],
        alinhamentos: ["justify", "center", "center", "center"], negritoUltima: true, itens: quadro.flatMap((l, k) => (l.item ? [k] : [])), juntos: false });
      b.push({ tipo: "paragrafo", texto: NOTA_CONDICOES_REDE });
    }
    if (s.id === "gestao") {
      b.push({ tipo: "quadro", cabecalho: ["PARÂMETRO", "VALOR"], linhas: linhasParametrosRede(parametros), larguras: [122, 50],
        alinhamentos: ["justify", "center"], negritoUltima: false, itens: [], juntos: false });
      b.push({ tipo: "paragrafo", texto: regraMensalidadeRede(parametros) });
      b.push({ tipo: "subtopico", texto: SUBTITULO_PROJECAO_REDE }, { tipo: "paragrafo", texto: TEXTO_PROJECAO_REDE });
      b.push({ tipo: "rotulo", texto: "Resultado" });
      b.push({ tipo: "quadro", cabecalho: [...COLUNAS_RESULTADO_REDE], linhas: linhasResultadoRede(parametros, quantidades), larguras: [24, 36, 38, 38, 36],
        alinhamentos: ["left", "right", "right", "right", "right"], negritoUltima: true, itens: [], juntos: true });
      b.push({ tipo: "paragrafo", texto: NOTA_PROJECAO_REDE });
    }
  });
  b.push({ tipo: "topico", texto: TITULO_CONDICOES_GERAIS_REDE }, { tipo: "paragrafo", texto: TEXTO_CONDICOES_GERAIS_REDE });
  const n = TITULO_CONDICOES_GERAIS_REDE.split(".")[0];
  CONDICOES_GERAIS_REDE.forEach((c, i) => b.push({ tipo: "subtopico", texto: `${n}.${i + 1} ${c.item}` }, { tipo: "paragrafo", texto: c.valor }));
  return b;
}

// Mesma tinta escura do PDF, legível em preto e branco.
const TINTA = "0A2648", CAB = "CDDEEC", ZEBRA = "ECF1F5", LINHA = "5F6973", SEC = "232A32", TXT = "1E1E1E";
const LARGURA = 9866; // A4 (11906) − margens de 18 mm (1020 cada), em DXA
const ALINHA = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED };

function quadro(q: Extract<BlocoPropostaRede, { tipo: "quadro" }>): Table {
  const soma = q.larguras.reduce((s, v) => s + v, 0);
  const larg = q.larguras.map((v) => Math.round((v / soma) * LARGURA));
  larg[larg.length - 1] += LARGURA - larg.reduce((s, v) => s + v, 0);
  const itens = new Set(q.itens);
  const nada = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const fino = { style: BorderStyle.SINGLE, size: 2, color: LINHA };
  const forte = { style: BorderStyle.SINGLE, size: 10, color: TINTA };
  const celula = (texto: string, c: number, r: number | null) => {
    const cabecalho = r === null, item = r !== null && itens.has(r), ultima = r === q.linhas.length - 1;
    return new TableCell({
      width: { size: larg[c], type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
      shading: cabecalho ? { fill: CAB, type: ShadingType.CLEAR, color: "auto" } : r! % 2 === 1 ? { fill: ZEBRA, type: ShadingType.CLEAR, color: "auto" } : undefined,
      margins: { top: item ? 40 : 80, bottom: item ? 40 : 80, left: item && c === 0 ? 400 : 100, right: 100 },
      borders: { left: nada, right: nada, top: cabecalho || r === 0 ? nada : fino, bottom: ultima ? forte : nada },
      children: [new Paragraph({
        keepNext: q.juntos && !ultima, keepLines: true, alignment: cabecalho ? AlignmentType.CENTER : ALINHA[q.alinhamentos[c]],
        children: [new TextRun({ text: texto, bold: cabecalho || (q.negritoUltima && ultima), size: cabecalho || item ? 18 : 22, color: cabecalho ? TINTA : item ? SEC : TXT })],
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
      children: [new TextRun({ text: b.texto.toUpperCase(), bold: true, size: 28, color: TINTA })] }));
    else if (b.tipo === "subtopico" || b.tipo === "rotulo") out.push(new Paragraph({ keepNext: true, spacing: { before: 120, after: b.tipo === "rotulo" ? 80 : 60 },
      children: [new TextRun({ text: b.texto, bold: true, size: b.tipo === "rotulo" ? 22 : 26, color: TINTA })] }));
    else if (b.tipo === "paragrafo") out.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { before: aposQuadro ? 200 : 0, after: 160, line: 324 },
      children: [new TextRun({ text: b.texto, size: 26, color: TXT })] }));
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
    styles: { default: { document: { run: { font: "Arial", size: 26 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 2381, bottom: 1417, left: 1020, right: 1020, header: 0, footer: 850 } } },
      headers: { default: new Header({ children: fundo }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
        children: [new TextRun({ children: ["Página ", PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES], size: 18, color: "2D2D2D" })] })] }) },
      children: elementos(blocos),
    }],
  });
}

export async function buildPropostaRedeDocx(
  timbrado: Uint8Array | null, parametros: ParametrosRede = PARAMETROS_REDE_PADRAO, textos: TextosRede | null = null, quantidades: QuantidadesRede = quantidadesRedeAtuais(),
): Promise<Blob> {
  return Packer.toBlob(documentoPropostaRede(blocosPropostaRede(parametros, textos, quantidades), timbrado));
}
