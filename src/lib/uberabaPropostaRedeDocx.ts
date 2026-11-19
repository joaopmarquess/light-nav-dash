// Word da Proposta de Credenciamento e Gestão de Rede: segue o modelo do Dênis (Proposta_Rede_Uberaba_v1.docx, 19/11/2026),
// com o conteúdo de blocosPropostaRede, o mesmo do PDF, para o Word nunca divergir do PDF.
import {
  AlignmentType, Bookmark, BorderStyle, Document, Footer, Header, HorizontalPositionRelativeFrom, ImageRun, Packer, PageBreak, PageNumber, Paragraph,
  ShadingType, SimpleField, Tab, TabStopType, Table, TableCell, TableRow, TextRun, TextWrappingType, VerticalAlign, VerticalPositionRelativeFrom, WidthType,
} from "docx";
import { bytesLogo, type CapaProposta, type ItemSumario, type LogoCapa } from "@/lib/pdfCapaProposta";
import { capaPropostaRede, comporPropostaRedePdf } from "@/lib/uberabaPropostaRedePdf";
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

const marcador = (n: number) => `topico_${n + 1}`;

function elementos(blocos: BlocoPropostaRede[]): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  let nTopico = 0;
  blocos.forEach((b, i) => {
    const aposQuadro = blocos[i - 1]?.tipo === "quadro";
    // Cada tópico tem um marcador: o número de página do sumário aponta para ele.
    if (b.tipo === "topico") out.push(new Paragraph({ keepNext: true, spacing: { before: 200, after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: TINTA, space: 2 } },
      children: [new Bookmark({ id: marcador(nTopico++), children: [new TextRun({ text: b.texto.toUpperCase(), bold: true, size: T.texto, color: TINTA })] })] }));
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

/** Capa sem timbrado: logomarca grande do Bensaúde, título, projeto, destinatário e mês/ano (como no PDF). */
function paginaCapa(capa: CapaProposta): Paragraph[] {
  const centro = (texto: string, size: number, opts: { bold?: boolean; color?: string; before?: number; after?: number } = {}) =>
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: opts.before ?? 0, after: opts.after ?? 0 },
      children: [new TextRun({ text: texto, size, bold: opts.bold, color: opts.color ?? TINTA })] });
  const logo: LogoCapa | null | undefined = capa.logo;
  const largura = 491; // 130 mm, como no PDF
  return [
    logo
      ? new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 2100 }, children: [new ImageRun({
        type: "jpg", data: bytesLogo(logo), transformation: { width: largura, height: Math.round(largura * logo.altura / logo.largura) },
        altText: { title: "Bensaúde", description: "Logomarca do Bensaúde", name: "logo" } })] })
      : centro("Bensaúde", 80, { bold: true, before: 2600 }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 700, after: 500 }, indent: { left: 4000, right: 4000 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: TINTA, space: 1 } }, children: [] }),
    centro(capa.titulo, 48, { bold: true, after: 240 }),
    ...(capa.subtitulo ? [centro(capa.subtitulo, 30, { color: SEC })] : []),
    ...(capa.destinatario ? [centro("PARA", 22, { color: SEC, before: 1400 }), centro(capa.destinatario, 30, { bold: true, before: 80 })] : []),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: capa.destinatario ? 2600 : 4200 },
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: TINTA, space: 12 } },
      children: [new TextRun({ text: capa.mesAno, size: 24, color: SEC })] }),
  ];
}

/** Sumário no verso da capa: tópicos com pontilhado e o número de página (campo PAGEREF, já preenchido com a página do PDF). */
function paginaSumario(sumario: ItemSumario[]): Paragraph[] {
  return [
    new Paragraph({ spacing: { after: 360 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: TINTA, space: 2 } },
      children: [new TextRun({ text: "SUMÁRIO", bold: true, size: 28, color: TINTA })] }),
    ...sumario.map((item, n) => new Paragraph({
      spacing: { after: 160 }, tabStops: [{ type: TabStopType.RIGHT, position: LARGURA, leader: "dot" }],
      children: [new TextRun({ text: item.titulo, size: T.texto, color: TXT }), new TextRun({ children: [new Tab()], size: T.texto }),
        new SimpleField(`PAGEREF ${marcador(n)} \\h`, String(item.pagina))],
    })),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

export function documentoPropostaRede(blocos: BlocoPropostaRede[], timbrado: Uint8Array | null, capa?: { capa: CapaProposta; sumario: ItemSumario[] }): Document {
  const fundo = () => timbrado ? [new Paragraph({ children: [new ImageRun({
    type: "png", data: timbrado, transformation: { width: 794, height: 1123 },
    floating: { horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 }, verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
      behindDocument: true, allowOverlap: true, wrap: { type: TextWrappingType.NONE } },
    altText: { title: "Papel timbrado", description: "Papel timbrado do Bensaúde", name: "timbrado" },
  })] })] : [];
  const pagina = { size: { width: 11906, height: 16838 }, margin: { top: 2381, bottom: 1417, left: 1020, right: 1020, header: 0, footer: 850 } };
  const rodape = () => new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
    children: [new TextRun({ children: ["Página ", PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES], size: T.rodape, color: "2D2D2D" })] })] });
  const conteudo = {
    // Com capa: o sumário é a primeira página desta seção (com timbrado e sem número); a numeração segue as páginas físicas.
    properties: { page: pagina, ...(capa ? { titlePage: true } : {}) },
    headers: capa ? { default: new Header({ children: fundo() }), first: new Header({ children: fundo() }) } : { default: new Header({ children: fundo() }) },
    footers: capa ? { default: rodape(), first: new Footer({ children: [] }) } : { default: rodape() },
    children: [...(capa ? paginaSumario(capa.sumario) : []), ...elementos(blocos)],
  };
  return new Document({
    creator: "Bensaúde", title: "Proposta de Credenciamento e Gestão de Rede — Bensaúde|Uberaba",
    styles: { default: { document: { run: { font: "Arial", size: T.texto } } } },
    sections: [
      ...(capa ? [{
        properties: { page: { size: pagina.size, margin: { top: 1417, bottom: 1417, left: 1020, right: 1020, header: 0, footer: 0 } } },
        headers: { default: new Header({ children: [] }) }, footers: { default: new Footer({ children: [] }) },
        children: paginaCapa(capa.capa),
      }] : []),
      conteudo,
    ],
  });
}

export async function buildPropostaRedeDocx(
  timbrado: Uint8Array | null, parametros: ParametrosRede = PARAMETROS_REDE_PADRAO, textos: TextosRede | null = null, quantidades: QuantidadesRede = quantidadesRedeAtuais(),
  logo: LogoCapa | null = null,
): Promise<Blob> {
  // Mesma capa do PDF; as páginas do sumário vêm da paginação do PDF (o Word as atualiza com F9).
  const { sumario } = comporPropostaRedePdf(null, parametros, textos, quantidades);
  return Packer.toBlob(documentoPropostaRede(blocosPropostaRede(parametros, textos, quantidades), timbrado, { capa: capaPropostaRede(logo), sumario }));
}
