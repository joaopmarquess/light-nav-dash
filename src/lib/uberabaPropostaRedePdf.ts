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
  COLUNAS_CONDICOES_REDE, COLUNAS_RESULTADO_REDE, CONDICOES_GERAIS_REDE, linhasResultadoRede, quantidadesRedeAtuais, type QuantidadesRede, NOTA_CONDICOES_REDE, SECOES_REDE, TITULO_CONDICOES_GERAIS_REDE, TEXTO_CONDICOES_GERAIS_REDE, SUBTITULO_PROJECAO_REDE, TEXTO_PROJECAO_REDE, TEXTOS_REDE_PADRAO, quadroCondicoesRede, linhasParametrosRede, regraMensalidadeRede,
  type SecaoRedeId, type TextosRede,
} from "@/lib/uberabaPropostaRede";

const alturaLinha = (pt: number) => pt * 0.3528 * 1.35;

/** Tópicos do PDF, na ordem (o 4, Condições Gerais, é fixo e não tem texto da IA). */
export const TOPICOS_PROPOSTA_REDE = [...SECOES_REDE.map((s) => s.titulo), TITULO_CONDICOES_GERAIS_REDE];

/** Parágrafos de cada tópico: o texto aprovado ou, sem aprovação, o padrão. */
export function paragrafosPropostaRede(textos: TextosRede | null = null): string[][] {
  const t = textos ?? TEXTOS_REDE_PADRAO;
  return SECOES_REDE.map((s) => paragrafosDe(t[s.id]));
}

export function buildPropostaRedePdf(
  timbradoDataUrl?: string | null, parametros: ParametrosRede = PARAMETROS_REDE_PADRAO, textos: TextosRede | null = null,
  quantidades: QuantidadesRede = quantidadesRedeAtuais(),
): jsPDF {
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

  const tabela = (head: string[], body: string[][], colunas: Record<number, { halign?: "left" | "center" | "right"; cellWidth?: number }>, negritoUltima: boolean, itens: ReadonlySet<number> = new Set()) => {
    autoTable(doc, {
      rowPageBreak: "avoid",
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
      didParseCell: (c) => {
        if (c.section !== "body") return;
        if (negritoUltima && c.row.index === body.length - 1) c.cell.styles.fontStyle = "bold";
        // Itens dos tipos abertos: recuados, letra menor e tinta secundária, abaixo do seu tipo.
        if (itens.has(c.row.index)) {
          c.cell.styles.fontSize = F.parametros - 2;
          c.cell.styles.textColor = SECUNDARIO;
          c.cell.styles.cellPadding = { top: 1, bottom: 1, left: c.column.index === 0 ? 7 : 1.8, right: 1.8 };
        }
      },
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
    // A nota nunca se divide entre páginas; basta a linha de base da última linha caber acima da margem inferior.
    garantir((linhas.length - 1) * LN + 1);
    linhas.forEach((l) => { doc.text(l, marginL, y); y += LN; });
    y += 6;
  };

  const desenharCondicoes = () => {
    // Quadro de quantidades montado a partir da seção Credenciamento (pedido de 18/11/2026); larguras fixas para não partir palavras.
    // Tipos abertos item a item, exceto Especialidades médicas (pedido de 18/11/2026).
    const quadro = quadroCondicoesRede(quantidades);
    tabela([...COLUNAS_CONDICOES_REDE], quadro.map((l) => l.celulas), {
      0: { halign: "left", cellWidth: 70 }, 1: { cellWidth: 26 }, 2: { cellWidth: 36 }, 3: { cellWidth: LARGURA - 132 },
    }, true, new Set(quadro.flatMap((l, i) => (l.item ? [i] : []))));
    nota(NOTA_CONDICOES_REDE);
  };
  // Depois do tópico 3, antes das Condições Gerais (pedido de 18/11/2026): subtítulo e texto da Projeção financeira
  // e o quadro da seção Resultado, juntos e inteiros numa mesma página.
  const desenharProjecao = () => {
    const linhasRes = linhasResultadoRede(parametros, quantidades);
    garantir(10 + alturaParagrafos([TEXTO_PROJECAO_REDE]) + 10 + (linhasRes.length + 1) * 7.2);
    doc.setFont("helvetica", "bold"); doc.setFontSize(F.texto); doc.setTextColor(...TINTA);
    doc.text(textoPdf(SUBTITULO_PROJECAO_REDE), marginL, y + 3);
    y += 10;
    paragrafo(TEXTO_PROJECAO_REDE);
    doc.setFont("helvetica", "bold"); doc.setFontSize(F.parametros); doc.setTextColor(...TINTA);
    doc.text(textoPdf("Resultado"), marginL, y + 3);
    y += 6;
    tabela([...COLUNAS_RESULTADO_REDE], linhasRes, {
      0: { halign: "left", cellWidth: 24 }, 1: { halign: "right", cellWidth: 36 }, 2: { halign: "right", cellWidth: 38 }, 3: { halign: "right", cellWidth: 38 }, 4: { halign: "right", cellWidth: LARGURA - 136 },
    }, true);
    y += 6;
  };
  const desenharGestao = () => {
    tabela(["PARÂMETRO", "VALOR"], linhasParametrosRede(parametros), { 0: { halign: "left" }, 1: { cellWidth: 50 } }, false);
    nota(regraMensalidadeRede(parametros));
    desenharProjecao();
  };
  const blocoDados: Partial<Record<SecaoRedeId, () => void>> = { condicoes: desenharCondicoes, gestao: desenharGestao };

  /** Altura exata dos parágrafos (mesma quebra e espaçamento de `paragrafo`). */
  const alturaParagrafos = (lista: string[]) => {
    fonteTexto();
    return lista.reduce((h, t) => h + (doc.splitTextToSize(textoPdf(t), LARGURA) as string[]).length * LINHA_TEXTO + 3, 0);
  };
  /** Altura aproximada de cada quadro com a sua nota: título, texto e quadro ficam juntos na mesma página. */
  const ALTURA_BLOCO: Partial<Record<SecaoRedeId, number>> = { condicoes: 60, gestao: 48 };

  /** Título longo (ex.: "2. ... | Credenciamento por Captação") quebra em mais linhas no mesmo tamanho, nunca passando da margem;
   * a linha do título fica sob a última. Retorna a altura extra das linhas acima dela. */
  const LINHA_TOPICO = alturaLinha(F.topico);
  const linhasTitulo = (titulo: string) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(F.topico);
    const largura = pageW - marginL - marginR;
    const t = titulo.toUpperCase();
    if (doc.getTextWidth(t) <= largura) return [t];
    // Quebra preferencial na barra: "2. ... ASSISTENCIAL |" / "CREDENCIAMENTO POR CAPTAÇÃO".
    const partes = t.split(" | ");
    if (partes.length === 2 && doc.getTextWidth(`${partes[0]} |`) <= largura && doc.getTextWidth(partes[1]) <= largura) return [`${partes[0]} |`, partes[1]];
    return doc.splitTextToSize(t, largura) as string[];
  };
  const tituloTopico = (titulo: string) => {
    const linhas = linhasTitulo(titulo);
    linhas.slice(0, -1).forEach((l, i) => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(F.topico); doc.setTextColor(...TINTA);
      doc.text(l, marginL, y + i * LINHA_TOPICO);
    });
    y += (linhas.length - 1) * LINHA_TOPICO;
    drawSectionTitle(doc, linhas[linhas.length - 1], marginL, y, pageW - marginR, TINTA, F.topico);
  };

  const corpo = paragrafosPropostaRede(textos);
  SECOES_REDE.forEach((s, i) => {
    const extra = (linhasTitulo(s.titulo).length - 1) * LINHA_TOPICO;
    const h = 12 + extra + alturaParagrafos(corpo[i]) + (ALTURA_BLOCO[s.id] ?? 0);
    garantir(h > pageH - top - bottom ? 10 + extra + LINHA_TEXTO * 3 : h);
    tituloTopico(s.titulo);
    y += 10;
    corpo[i].forEach(paragrafo);
    y += 2;
    blocoDados[s.id]?.();
  });

  // 4. Condições Gerais: título e quadro sempre juntos na mesma página.
  garantir(12 + alturaParagrafos([TEXTO_CONDICOES_GERAIS_REDE]) + 2 + 12 + CONDICOES_GERAIS_REDE.length * 14);
  drawSectionTitle(doc, TITULO_CONDICOES_GERAIS_REDE, marginL, y, pageW - marginR, TINTA, F.topico);
  y += 10;
  paragrafo(TEXTO_CONDICOES_GERAIS_REDE);
  y += 2;
  tabela(["CONDIÇÃO", "DEFINIÇÃO"], CONDICOES_GERAIS_REDE.map((c) => [c.item, c.valor]), { 0: { halign: "left", cellWidth: 55 }, 1: { halign: "left" } }, false);

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
