import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { attachTimbrado } from "@/lib/pdfTimbrado";
import { PDF_COLORS, drawReportHeading, drawSectionTitle } from "@/lib/pdfTheme";
import {
  FATORES_PADRAO, FATOR_APARTAMENTO_PADRAO, FRENTES_COMERCIAIS, INDICES_PADRAO, blocosIndicadores, formatarCentavos, formatarFator, formatarPercentual, indicadoresPadrao, rotulosPadrao, tabelaIndexada, tabelaReferencia,
  type Fatores, type FrenteId, type IndicadoresPorFrente, type Indices, type RotulosPorFrente,
} from "@/lib/uberabaTabelasComerciais";
import { SECOES_TEXTO, TITULO_GLOSSARIO, TEXTOS_PADRAO, paragrafosDe, type SecaoTextoId, type TextosSecoes } from "@/lib/uberabaPropostaTextos";

type RGB = [number, number, number];

/**
 * Paleta pensada para impressão em preto e branco: as cores de cada frente seguem a tela, mas escurecidas,
 * e textos, linhas e contornos usam tinta escura para não sumirem no papel.
 */
const COR_FRENTE: Record<FrenteId, RGB> = { pcaAdm: [128, 90, 15], pceAdm: [15, 85, 140], pce100: [150, 65, 35] };
const TINTA: RGB = [10, 38, 72];
const CABECALHO: RGB = [205, 222, 236];
const ZEBRA: RGB = [236, 241, 245];
const LINHA: RGB = [95, 105, 115];
const SECUNDARIO: RGB = [35, 42, 50];
const RODAPE: RGB = [45, 45, 45];

/** Tópico 2 · Tabela Referencial: Faixa × Enfermaria × Apartamento a 100%, com o fator padrão. */
export function linhasReferencia(): [string, string, string][] {
  return tabelaReferencia().map((l) => [l.faixa, formatarCentavos(l.enfermariaCentavos), formatarCentavos(l.apartamentoCentavos)]);
}
export const FATOR_REFERENCIA = formatarFator(FATOR_APARTAMENTO_PADRAO);

/**
 * Tópicos 3 · Tabelas e 4 · Proposta de Remuneração: os três quadros com a mesma nomenclatura de Resultados Comerciais —
 * nome da tabela (redigitável na tela), contêiner TABELAS (Faixa × Enfermaria e "APARTAMENTO fator x ENFERMARIA")
 * e contêiner INDICADORES VARIÁVEIS.
 */
export function quadrosProposta(indices: Indices = INDICES_PADRAO, indicadores: IndicadoresPorFrente = indicadoresPadrao(), rotulos: RotulosPorFrente = rotulosPadrao(), fatores: Fatores = FATORES_PADRAO) {
  return FRENTES_COMERCIAIS.map(({ id }) => ({
    id,
    titulo: rotulos[id].titulo,
    fator: formatarFator(fatores[id]),
    linhas: tabelaIndexada(indices[id], fatores[id]).map((l) => [l.faixa, formatarCentavos(l.enfermariaCentavos)] as [string, string]),
    blocos: blocosIndicadores(id, indicadores[id]).map((b) => ({
      titulo: b.titulo.toUpperCase(),
      linhas: b.linhas.map((l) => [l.rotulo.toUpperCase(), formatarPercentual(l.valor)] as [string, string]),
    })),
  }));
}

// Proposta Comercial Bensaúde|Uberaba — cada tópico abre com o texto revisado (aprovado pelo usuário) ou, sem aprovação,
// com o texto padrão; os tópicos 2, 3 e 4 seguem com a Tabela Referencial, os quadros de preços e os Indicadores variáveis.
/** Ordem dos tópicos do PDF: os cinco tópicos com texto e, por último, o Glossário. */
export const TOPICOS_PROPOSTA = [...SECOES_TEXTO.map((s) => s.titulo), TITULO_GLOSSARIO];

/** Parágrafos de cada tópico 1 a 5: o texto revisado quando houver; do contrário, o texto padrão. */
export function paragrafosProposta(textos: TextosSecoes | null = null): string[][] {
  const t = textos ?? TEXTOS_PADRAO;
  return SECOES_TEXTO.map((s) => paragrafosDe(t[s.id]));
}

/**
 * Glossário e Notas Explicativas: cada termo marcado recebe, no corpo do documento, um número elevado
 * (1, 2, 3… na ordem desta lista) e a mesma legenda no último tópico. Termos e notas são indicados pelo usuário.
 */
export const GLOSSARIO_PROPOSTA: { termo: string; nota: string }[] = [
  { termo: "ENFERMARIA", nota: "Apartamento = TRUNCAR(Enfermaria × 1,25; 2)" },
];

/**
 * Notas do Glossário com o fator do Apartamento atual: um só fator quando as três tabelas coincidem;
 * do contrário, o fator de cada tabela pelo nome exibido.
 */
export function glossarioProposta(fatores: Fatores = FATORES_PADRAO, rotulos: RotulosPorFrente = rotulosPadrao()) {
  const ids = FRENTES_COMERCIAIS.map((f) => f.id);
  const iguais = ids.every((id) => fatores[id] === fatores[ids[0]]);
  const nota = iguais
    ? `Apartamento = TRUNCAR(Enfermaria × ${formatarFator(fatores[ids[0]])}; 2)`
    : [`Apartamento = TRUNCAR(Enfermaria × fator da tabela; 2), sendo:`, ...ids.map((id) => `${rotulos[id].titulo}: ${formatarFator(fatores[id])}`)].join("\n");
  return GLOSSARIO_PROPOSTA.map((g) => (g.termo === "ENFERMARIA" ? { ...g, nota } : g));
}

/** Número do marcador do termo no Glossário (começa em 1); null quando o termo não tem nota. */
export function marcadorGlossario(termo: string): number | null {
  const i = GLOSSARIO_PROPOSTA.findIndex((g) => g.termo.toUpperCase() === termo.toUpperCase());
  return i < 0 ? null : i + 1;
}

/**
 * A fonte padrão do PDF (Helvetica, WinAnsi) não tem alguns sinais que a tela e a IA usam — o "−" das fórmulas
 * sai espaçado e corrompe o parágrafo. Troca por equivalentes que a fonte tem.
 */
export function textoPdf(texto: string): string {
  return texto
    .replace(/[\u2212\u2010\u2011]/g, "-")
    .replace(/\u2264/g, "<=")
    .replace(/\u2265/g, ">=")
    .replace(/[\u200B\uFEFF]/g, "")
    .replace(/[\u202F\u2007]/g, " ");
}

export function buildPropostaComercialPdf(timbradoDataUrl?: string | null, indices: Indices = INDICES_PADRAO, indicadores: IndicadoresPorFrente = indicadoresPadrao(), rotulos: RotulosPorFrente = rotulosPadrao(), fatores: Fatores = FATORES_PADRAO, textos: TextosSecoes | null = null): jsPDF {
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
    secao: "Minuta para revisão",
    marginL, marginR, top: 38, tinta: TINTA,
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
  const alturaParagrafos = (lista: string[]) => {
    fonteTexto();
    return lista.reduce((h, t) => h + (doc.splitTextToSize(textoPdf(t), usableW - 2) as string[]).length * 4.8 + 3, 0);
  };
  const paragrafo = (texto: string) => {
    fonteTexto();
    const linhas = doc.splitTextToSize(textoPdf(texto), usableW - 2) as string[];
    const h = linhas.length * 4.8;
    garantir(h);
    fonteTexto(); // o cabeçalho de uma nova página altera a fonte
    doc.text(linhas, marginL, y, { align: "justify", maxWidth: usableW - 2, lineHeightFactor: 1.35 });
    y += h + 3;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fimTabela = (fallback: number) => ((doc as any).lastAutoTable?.finalY as number | undefined) ?? fallback;

  const quadros = quadrosProposta(indices, indicadores, rotulos, fatores);
  const gap = 5;
  const largura = (usableW - gap * 2) / 3;
  const xs = quadros.map((_, k) => marginL + k * (largura + gap));
  const margem = (x: number, w: number) => ({ left: x, right: pageW - x - w, top, bottom });
  const inset = 2;
  const wSec = largura - inset * 2;

  // Número elevado do Glossário logo após um termo de cabeçalho centralizado.
  const marcadorCabecalho = (texto: string, cx: number, cy: number, fonte: number) => {
    const n = marcadorGlossario(texto);
    if (n === null) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fonte);
    const xFim = cx + doc.getTextWidth(texto) / 2;
    doc.setFontSize(5.5);
    doc.setTextColor(...TINTA);
    doc.text(String(n), xFim + 0.4, cy - 0.6);
  };

  // Título de contêiner (TABELAS / INDICADORES VARIÁVEIS), como na tela.
  const tituloSecao = (texto: string, x: number, yy: number) => {
    doc.setFillColor(...ZEBRA);
    doc.rect(x + inset, yy, wSec, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(...SECUNDARIO);
    doc.text(texto, x + largura / 2, yy + 3.4, { align: "center" });
  };
  const contornoSecao = (x: number, y0: number, y1: number) => {
    doc.setDrawColor(...LINHA);
    doc.setLineWidth(0.25);
    doc.rect(x + inset, y0, wSec, y1 - y0, "S");
  };
  // Faixa colorida e nome de cada tabela (o mesmo da tela); devolve onde começa o contêiner.
  const cabecalhoQuadros = (inicio: number) => {
    quadros.forEach((q, k) => {
      const x = xs[k];
      doc.setFillColor(...COR_FRENTE[q.id]);
      doc.rect(x, inicio, largura, 2, "F");
      doc.setFont("helvetica", "bold");
      let fT = 10;
      doc.setFontSize(fT);
      const w = doc.getTextWidth(q.titulo);
      if (w > largura - 4) { fT *= (largura - 4) / w; doc.setFontSize(fT); }
      doc.setTextColor(...TINTA);
      doc.text(q.titulo, x + largura / 2, inicio + 7.2, { align: "center" });
    });
    return inicio + 10;
  };
  const contornoQuadros = (inicio: number, fimQ: number) => {
    doc.setDrawColor(...TINTA);
    doc.setLineWidth(0.35);
    xs.forEach((x) => doc.rect(x, inicio, largura, fimQ - inicio, "S"));
    doc.setDrawColor(0);
  };

  // Tópico 2: Tabela Referencial (100%), com Enfermaria e Apartamento pelo fator padrão.
  const desenharReferencia = () => {
    const w = Math.min(120, usableW);
    const x = marginL + (usableW - w) / 2;
    autoTable(doc, {
      theme: "plain",
      startY: y,
      tableWidth: w,
      margin: margem(x, w),
      head: [["FAIXA", "ENFERMARIA", "APARTAMENTO"]],
      body: linhasReferencia(),
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: { top: 1.2, bottom: 1.2, left: 2, right: 2 }, textColor: PDF_COLORS.text, halign: "center" },
      headStyles: { fillColor: CABECALHO, textColor: TINTA, fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: ZEBRA },
      didDrawCell: (c) => {
        if (c.section === "head") { marcadorCabecalho(String(c.cell.raw ?? ""), c.cell.x + c.cell.width / 2, c.cell.y + c.cell.height / 2, 8); return; }
        doc.setDrawColor(...LINHA);
        doc.setLineWidth(0.2);
        doc.line(c.cell.x, c.cell.y, c.cell.x + c.cell.width, c.cell.y);
      },
    });
    const fimT = fimTabela(y);
    doc.setDrawColor(...TINTA);
    doc.setLineWidth(0.6);
    doc.line(x, fimT, x + w, fimT);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(...SECUNDARIO);
    const rotulo = `APARTAMENTO ${FATOR_REFERENCIA} x ENFERMARIA`;
    doc.text(rotulo, x + 2, fimT + 4.6);
    doc.setDrawColor(0);
    y = fimT + 13;
  };

  // Tópico 3: contêiner TABELAS de cada quadro — Faixa × Enfermaria, linha sólida de fechamento e fator do Apartamento.
  const desenharPrecos = () => {
    const inicio = y;
    const ySecT = cabecalhoQuadros(inicio);
    xs.forEach((x) => tituloSecao("TABELAS", x, ySecT));
    let fimP = ySecT + 5;
    quadros.forEach((q, k) => {
      autoTable(doc, {
        theme: "plain",
        startY: ySecT + 5,
        tableWidth: wSec,
        margin: margem(xs[k] + inset, wSec),
        head: [["FAIXA", "ENFERMARIA"]],
        body: q.linhas,
        styles: { font: "helvetica", fontSize: 8, cellPadding: { top: 1.1, bottom: 1.1, left: 2, right: 2 }, textColor: PDF_COLORS.text, halign: "center" },
        headStyles: { fillColor: CABECALHO, textColor: TINTA, fontStyle: "bold", fontSize: 7.5 },
        alternateRowStyles: { fillColor: ZEBRA },
        didDrawCell: (c) => {
          if (c.section === "head") { marcadorCabecalho(String(c.cell.raw ?? ""), c.cell.x + c.cell.width / 2, c.cell.y + c.cell.height / 2, 7.5); return; }
          if (c.section !== "body") return;
          doc.setDrawColor(...LINHA);
          doc.setLineWidth(0.2);
          doc.line(c.cell.x, c.cell.y, c.cell.x + c.cell.width, c.cell.y);
        },
      });
      fimP = Math.max(fimP, fimTabela(fimP));
    });
    const yFator = fimP + 4.6;
    quadros.forEach((q, k) => {
      const x = xs[k] + inset;
      doc.setDrawColor(...TINTA);
      doc.setLineWidth(0.6);
      doc.line(x, fimP, x + wSec, fimP);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.setTextColor(...SECUNDARIO);
      doc.text("APARTAMENTO", x + 2, yFator);
      let xx = x + 2 + doc.getTextWidth("APARTAMENTO") + 1.6;
      doc.setFontSize(7.6);
      doc.setTextColor(...TINTA);
      doc.text(q.fator, xx, yFator);
      xx += doc.getTextWidth(q.fator) + 1.6;
      doc.setFontSize(6.8);
      doc.setTextColor(...SECUNDARIO);
      doc.text("x ENFERMARIA", xx, yFator);
      contornoSecao(xs[k], ySecT, yFator + 2.6);
    });
    const fimQ = yFator + 4.6;
    contornoQuadros(inicio, fimQ);
    y = fimQ + 11;
    doc.setPage(doc.getNumberOfPages());
  };

  // Tópico 4: contêiner INDICADORES VARIÁVEIS de cada quadro; cada bloco começa na mesma linha nas três frentes.
  const desenharRemuneracao = () => {
    const inicio = y;
    const ySecI = cabecalhoQuadros(inicio);
    xs.forEach((x) => tituloSecao("INDICADORES VARIÁVEIS", x, ySecI));
    let yb = ySecI + 7;
    const nBlocos = Math.max(...quadros.map((q) => q.blocos.length));
    const insetB = inset + 1.5;
    for (let b = 0; b < nBlocos; b++) {
      let fimBloco = yb;
      quadros.forEach((q, k) => {
        const bloco = q.blocos[b];
        if (!bloco) return;
        autoTable(doc, {
          theme: "grid",
          startY: yb,
          tableWidth: largura - insetB * 2,
          margin: margem(xs[k] + insetB, largura - insetB * 2),
          head: [[{ content: bloco.titulo, colSpan: 2 }]],
          body: bloco.linhas,
          styles: { font: "helvetica", fontSize: 7.2, cellPadding: { top: 1.1, bottom: 1.1, left: 2, right: 2 }, textColor: PDF_COLORS.text, lineColor: LINHA, lineWidth: 0.2 },
          headStyles: { fillColor: ZEBRA, textColor: SECUNDARIO, fontStyle: "bold", halign: "center" },
          columnStyles: { 0: { halign: "left" }, 1: { halign: "right", cellWidth: 14 } },
        });
        fimBloco = Math.max(fimBloco, fimTabela(fimBloco));
      });
      yb = fimBloco + 3;
    }
    xs.forEach((x) => contornoSecao(x, ySecI, yb - 1));
    const fimQ = yb + 1.5;
    contornoQuadros(inicio, fimQ);
    y = fimQ + 11;
    doc.setPage(doc.getNumberOfPages());
  };

  const desenharGlossario = () => {
    glossarioProposta(fatores, rotulos).forEach((g, i) => {
      const xTermo = marginL + 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const linhasNota = doc.splitTextToSize(g.nota, usableW - 8) as string[];
      garantir(6 + linhasNota.length * 4.8);
      // Número elevado + termo em destaque.
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...TINTA);
      doc.text(String(i + 1), marginL, y - 1.6);
      doc.setFontSize(10);
      doc.text(g.termo, xTermo, y);
      y += 5;
      fonteTexto();
      doc.text(linhasNota, xTermo, y, { lineHeightFactor: 1.35 });
      y += linhasNota.length * 4.8 + 3;
    });
  };

  const corpo = paragrafosProposta(textos);
  const blocoDados: Partial<Record<SecaoTextoId, () => void>> = { referencia: desenharReferencia, tabelas: desenharPrecos, remuneracao: desenharRemuneracao };
  // Altura de cada bloco de dados: o tópico (título, texto e bloco) fica inteiro na mesma página quando cabe.
  const ALTURA_BLOCO: Partial<Record<SecaoTextoId, number>> = { referencia: 72, tabelas: 92, remuneracao: 82 };
  SECOES_TEXTO.forEach((s, i) => {
    const bloco = ALTURA_BLOCO[s.id];
    const inteiro = 10 + alturaParagrafos(corpo[i]) + (bloco ?? 0);
    garantir(inteiro <= pageH - bottom - top ? inteiro : Math.max(32, bloco ?? 0)); // título nunca fica sozinho no fim da página
    drawSectionTitle(doc, s.titulo, marginL, y, pageW - marginR, TINTA);
    y += 8;
    corpo[i].forEach(paragrafo);
    const dados = blocoDados[s.id];
    y += 2;
    if (dados) { garantir(ALTURA_BLOCO[s.id] ?? 0); dados(); }
  });
  garantir(32);
  drawSectionTitle(doc, TITULO_GLOSSARIO, marginL, y, pageW - marginR, TINTA);
  y += 8;
  desenharGlossario();

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...RODAPE);
    doc.text(`Página ${p} de ${total}`, pageW - marginR, pageH - 10, { align: "right" });
  }
  return doc;
}
