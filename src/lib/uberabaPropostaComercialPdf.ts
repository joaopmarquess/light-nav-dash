import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { attachTimbrado } from "@/lib/pdfTimbrado";
import { PDF_COLORS, drawSectionTitle } from "@/lib/pdfTheme";
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

/**
 * Tamanhos de fonte (pt): texto geral 13; títulos dos tópicos e das tabelas 1 ou 2 pontos acima; tabelas, rótulos
 * e notas 1 ou 2 abaixo, conforme a função de cada elemento.
 */
export const FONTES_PROPOSTA = {
  texto: 13,
  topico: 14,
  quadro: 13,
  secaoQuadro: 11,
  tabelaReferencia: 12,
  cabecalhoReferencia: 11,
  tabela: 11,
  cabecalhoTabela: 11,
  indicador: 11,
  rotulo: 11,
  fator: 12,
  marcador: 8,
  rodape: 11,
} as const;
const F = FONTES_PROPOSTA;
/** Altura (mm) de uma linha de texto com espaçamento 1,35. */
const alturaLinha = (pt: number) => pt * 0.3528 * 1.35;

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
  // Sem cabeçalho de título: o traço azul do timbrado termina em ~31 mm e o primeiro tópico começa logo abaixo, em todas as páginas.
  const marginL = 18, marginR = 18, top = 42, bottom = 25;
  const usableW = pageW - marginL - marginR;
  let y = top;
  const novaPagina = () => { doc.addPage(); y = top; };
  const garantir = (h: number) => { if (y + h > pageH - bottom) novaPagina(); };

  const fonteTexto = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(F.texto);
    doc.setTextColor(...PDF_COLORS.text);
  };
  const alturaParagrafos = (lista: string[]) => {
    fonteTexto();
    return lista.reduce((h, t) => h + (doc.splitTextToSize(textoPdf(t), usableW - 2) as string[]).length * alturaLinha(F.texto) + 3, 0);
  };
  const paragrafo = (texto: string) => {
    fonteTexto();
    const linhas = doc.splitTextToSize(textoPdf(texto), usableW - 2) as string[];
    const h = linhas.length * alturaLinha(F.texto);
    garantir(h);
    fonteTexto();
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
  const ALTURA_TITULO_SECAO = 7;
  const LARGURA_VALOR = 15;
  const ALTURA_NOME_QUADRO = 12;
  const ALTURA_LINHA_FATOR = alturaLinha(F.rotulo) * 0.9;

  // Número elevado do Glossário logo após um termo de cabeçalho centralizado.
  const marcadorCabecalho = (texto: string, cx: number, cy: number, fonte: number) => {
    const n = marcadorGlossario(texto);
    if (n === null) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fonte);
    const xFim = cx + doc.getTextWidth(texto) / 2;
    doc.setFontSize(F.marcador);
    doc.setTextColor(...TINTA);
    doc.text(String(n), xFim + 0.4, cy - 1);
  };

  // Título de contêiner (TABELAS / INDICADORES VARIÁVEIS), como na tela.
  const tituloSecao = (texto: string, x: number, yy: number) => {
    doc.setFillColor(...ZEBRA);
    doc.rect(x + inset, yy, wSec, ALTURA_TITULO_SECAO, "F");
    doc.setFont("helvetica", "bold");
    let f: number = F.secaoQuadro;
    doc.setFontSize(f);
    const w = doc.getTextWidth(texto);
    if (w > wSec - 5) { f *= (wSec - 5) / w; doc.setFontSize(f); }
    doc.setTextColor(...SECUNDARIO);
    doc.text(texto, x + largura / 2, yy + ALTURA_TITULO_SECAO / 2, { align: "center", baseline: "middle" });
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
      doc.setFontSize(F.quadro);
      doc.setTextColor(...TINTA);
      // Nomes longos quebram em até duas linhas no tamanho padrão.
      const linhas = (doc.splitTextToSize(q.titulo, largura - 4) as string[]).slice(0, 2);
      const y0 = inicio + 2 + (ALTURA_NOME_QUADRO - 2 - (linhas.length - 1) * alturaLinha(F.quadro) / 1.35 * 1.15) / 2;
      doc.text(linhas, x + largura / 2, y0, { align: "center", baseline: "middle", lineHeightFactor: 1.15 });
    });
    return inicio + ALTURA_NOME_QUADRO;
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
      styles: { font: "helvetica", fontSize: F.tabelaReferencia, cellPadding: { top: 1.4, bottom: 1.4, left: 2, right: 2 }, textColor: PDF_COLORS.text, halign: "center" },
      headStyles: { fillColor: CABECALHO, textColor: TINTA, fontStyle: "bold", fontSize: F.cabecalhoReferencia },
      alternateRowStyles: { fillColor: ZEBRA },
      didDrawCell: (c) => {
        if (c.section === "head") { marcadorCabecalho(String(c.cell.raw ?? ""), c.cell.x + c.cell.width / 2, c.cell.y + c.cell.height / 2, F.cabecalhoReferencia); return; }
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
    doc.setFontSize(F.rotulo);
    doc.setTextColor(...SECUNDARIO);
    const rotulo = `APARTAMENTO ${FATOR_REFERENCIA} x ENFERMARIA`;
    doc.text(rotulo, x + 2, fimT + 6);
    doc.setDrawColor(0);
    y = fimT + 15;
  };

  // Tópico 3: contêiner TABELAS de cada quadro — Faixa × Enfermaria, linha sólida de fechamento e fator do Apartamento.
  const desenharPrecos = () => {
    const inicio = y;
    const ySecT = cabecalhoQuadros(inicio);
    xs.forEach((x) => tituloSecao("TABELAS", x, ySecT));
    let fimP = ySecT + ALTURA_TITULO_SECAO;
    quadros.forEach((q, k) => {
      autoTable(doc, {
        theme: "plain",
        startY: ySecT + ALTURA_TITULO_SECAO,
        tableWidth: wSec,
        margin: margem(xs[k] + inset, wSec),
        head: [["FAIXA", "ENFERMARIA"]],
        body: q.linhas,
        styles: { font: "helvetica", fontSize: F.tabela, cellPadding: { top: 1.3, bottom: 1.3, left: 1.5, right: 1.5 }, textColor: PDF_COLORS.text, halign: "center" },
        headStyles: { fillColor: CABECALHO, textColor: TINTA, fontStyle: "bold", fontSize: F.cabecalhoTabela },
        alternateRowStyles: { fillColor: ZEBRA },
        didDrawCell: (c) => {
          if (c.section === "head") { marcadorCabecalho(String(c.cell.raw ?? ""), c.cell.x + c.cell.width / 2, c.cell.y + c.cell.height / 2, F.cabecalhoTabela); return; }
          if (c.section !== "body") return;
          doc.setDrawColor(...LINHA);
          doc.setLineWidth(0.2);
          doc.line(c.cell.x, c.cell.y, c.cell.x + c.cell.width, c.cell.y);
        },
      });
      fimP = Math.max(fimP, fimTabela(fimP));
    });
    const yFator = fimP + 6;
    quadros.forEach((q, k) => {
      const x = xs[k] + inset;
      doc.setDrawColor(...TINTA);
      doc.setLineWidth(0.6);
      doc.line(x, fimP, x + wSec, fimP);
      doc.setFont("helvetica", "bold");
      // "APARTAMENTO fator" e, abaixo, "x ENFERMARIA", centralizados no quadro (o tamanho padrão não cabe numa linha só).
      const cx = x + wSec / 2;
      doc.setFontSize(F.rotulo);
      const wA = doc.getTextWidth("APARTAMENTO") + 1.6;
      doc.setFontSize(F.fator);
      const wF = doc.getTextWidth(q.fator);
      let xx = cx - (wA + wF) / 2;
      doc.setFontSize(F.rotulo);
      doc.setTextColor(...SECUNDARIO);
      doc.text("APARTAMENTO", xx, yFator);
      xx += wA;
      doc.setFontSize(F.fator);
      doc.setTextColor(...TINTA);
      doc.text(q.fator, xx, yFator);
      doc.setFontSize(F.rotulo);
      doc.setTextColor(...SECUNDARIO);
      doc.text("x ENFERMARIA", cx, yFator + ALTURA_LINHA_FATOR, { align: "center" });
      contornoSecao(xs[k], ySecT, yFator + ALTURA_LINHA_FATOR + 3);
    });
    const fimQ = yFator + ALTURA_LINHA_FATOR + 5;
    contornoQuadros(inicio, fimQ);
    y = fimQ + 11;
    doc.setPage(doc.getNumberOfPages());
  };

  // Tópico 4: contêiner INDICADORES VARIÁVEIS de cada quadro; cada bloco começa na mesma linha nas três frentes.
  const desenharRemuneracao = () => {
    const inicio = y;
    const ySecI = cabecalhoQuadros(inicio);
    xs.forEach((x) => tituloSecao("INDICADORES VARIÁVEIS", x, ySecI));
    let yb = ySecI + ALTURA_TITULO_SECAO + 2;
    // Fonte dos indicadores: a padrão, reduzida só o necessário para nenhum rótulo quebrar no meio da palavra.
    const larguraRotulo = largura - (inset + 1.5) * 2 - LARGURA_VALOR - 3.4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(F.indicador);
    const maisLongo = Math.max(...quadros.flatMap((q) => q.blocos.flatMap((b) => b.linhas.map((l) => doc.getTextWidth(l[0])))));
    const fInd = maisLongo > larguraRotulo ? Math.max(8, F.indicador * larguraRotulo / maisLongo) : F.indicador;
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
          styles: { font: "helvetica", fontSize: fInd, cellPadding: { top: 1.2, bottom: 1.2, left: 1.5, right: 1.5 }, textColor: PDF_COLORS.text, lineColor: LINHA, lineWidth: 0.2 },
          headStyles: { fillColor: ZEBRA, textColor: SECUNDARIO, fontStyle: "bold", halign: "center" },
          columnStyles: { 0: { halign: "left" }, 1: { halign: "right", cellWidth: LARGURA_VALOR } },
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
      doc.setFontSize(F.texto);
      const linhasNota = doc.splitTextToSize(g.nota, usableW - 8) as string[];
      garantir(7 + linhasNota.length * alturaLinha(F.texto));
      // Número elevado + termo em destaque.
      doc.setFont("helvetica", "bold");
      doc.setFontSize(F.marcador);
      doc.setTextColor(...TINTA);
      doc.text(String(i + 1), marginL, y - 2);
      doc.setFontSize(F.texto);
      doc.text(g.termo, xTermo, y);
      y += 6.5;
      fonteTexto();
      doc.text(linhasNota, xTermo, y, { lineHeightFactor: 1.35 });
      y += linhasNota.length * alturaLinha(F.texto) + 3;
    });
  };

  const corpo = paragrafosProposta(textos);
  const blocoDados: Partial<Record<SecaoTextoId, () => void>> = { referencia: desenharReferencia, tabelas: desenharPrecos, remuneracao: desenharRemuneracao };
  // Altura de cada bloco de dados: o tópico (título, texto e bloco) fica inteiro na mesma página quando cabe.
  const ALTURA_BLOCO: Partial<Record<SecaoTextoId, number>> = { referencia: 100, tabelas: 112, remuneracao: 110 };
  SECOES_TEXTO.forEach((s, i) => {
    const bloco = ALTURA_BLOCO[s.id];
    const inteiro = 12 + alturaParagrafos(corpo[i]) + (bloco ?? 0);
    garantir(inteiro <= pageH - bottom - top ? inteiro : Math.max(36, bloco ?? 0)); // título nunca fica sozinho no fim da página
    drawSectionTitle(doc, s.titulo, marginL, y, pageW - marginR, TINTA, F.topico);
    y += 10;
    corpo[i].forEach(paragrafo);
    const dados = blocoDados[s.id];
    y += 2;
    if (dados) { garantir(ALTURA_BLOCO[s.id] ?? 0); dados(); }
  });
  garantir(36);
  drawSectionTitle(doc, TITULO_GLOSSARIO, marginL, y, pageW - marginR, TINTA, F.topico);
  y += 10;
  desenharGlossario();

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(F.rodape);
    doc.setTextColor(...RODAPE);
    doc.text(`Página ${p} de ${total}`, pageW - marginR, pageH - 16.5, { align: "right" }); // acima do traço do rodapé do timbrado (~284 mm)
  }
  return doc;
}
