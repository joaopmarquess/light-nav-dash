import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { attachTimbrado } from "@/lib/pdfTimbrado";
import { PDF_COLORS, drawSectionTitle } from "@/lib/pdfTheme";
import {
  FATORES_PADRAO, FATOR_APARTAMENTO_PADRAO, FRENTES_COMERCIAIS, INDICES_PADRAO, PARAMETROS_UBERABA, blocosIndicadores, parametrosDe, vidasTexto, formatarCentavos, formatarFator, formatarPercentual, indicadoresPadrao, rotulosPadrao, tabelaIndexada, tabelaReferencia,
  type Fatores, type FrenteId, type IndicadoresPorFrente, type Indices, type RotulosPorFrente,
} from "@/lib/uberabaTabelasComerciais";
import { SECOES_TEXTO, TITULO_GLOSSARIO, TEXTOS_PADRAO, paragrafosDe, type SecaoTextoId, type TextosSecoes } from "@/lib/uberabaPropostaTextos";

type RGB = [number, number, number];

/**
 * Paleta pensada para impressão em preto e branco: as cores de cada frente seguem a tela, mas escurecidas,
 * e textos, linhas e contornos usam tinta escura para não sumirem no papel.
 */
const COR_FRENTE: Record<FrenteId, RGB> = { pcaAdm: [128, 90, 15], pmeAdm: [90, 55, 125], pceAdm: [15, 85, 140], pce100: [150, 65, 35] };
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
  /** Sigla e vidas abaixo do nome de cada quadro. */
  subtituloQuadro: 11,
  secaoQuadro: 11,
  tabelaReferencia: 12,
  /** Quadro de parâmetros dos produtos, na Introdução. */
  parametros: 11,
  cabecalhoReferencia: 11,
  tabela: 14,
  cabecalhoTabela: 11,
  indicador: 11,
  rotulo: 11,
  fator: 12,
  /** Linha única, em itálico e sem moldura, abaixo das tabelas de cada seção: "APARTAMENTO fator x ENFERMARIA". */
  notaPrecos: 11,
  rodape: 11,
} as const;
const F = FONTES_PROPOSTA;
/** Altura (mm) de uma linha de texto com espaçamento 1,35. */
const alturaLinha = (pt: number) => pt * 0.3528 * 1.35;

/**
 * Tópico 1 · quadro de parâmetros dos produtos (pedido do Dênis em 13/11/2026), com as colunas da tabela que ele
 * forneceu. A descrição e o fator seguem o nome e o índice atuais de Resultados Comerciais (padrão = parâmetros).
 */
export const COLUNAS_PARAMETROS = ["SIGLA", "CONTRATAÇÃO", "VIDAS", "BOLETAGEM", "DISTRIBUIDORES", "DESCRIÇÃO DA TABELA", "FATOR REF."] as const;
export function linhasParametros(indices: Indices = INDICES_PADRAO, rotulos: RotulosPorFrente = rotulosPadrao()): string[][] {
  return PARAMETROS_UBERABA.map((p) => [p.sigla, p.contratacao, p.vidas, p.boletagem, p.distribuidores, rotulos[p.id].titulo, formatarFator(indices[p.id] / 100)]);
}

/** Tópico 2 · Tabela Referencial: Faixa × Enfermaria × Apartamento a 100%, com o fator padrão. */
export function linhasReferencia(): [string, string, string][] {
  return tabelaReferencia().map((l) => [l.faixa, formatarCentavos(l.enfermariaCentavos), formatarCentavos(l.apartamentoCentavos)]);
}
export const FATOR_REFERENCIA = formatarFator(FATOR_APARTAMENTO_PADRAO);

/**
 * Tópicos 3 · Produtos com Administradora e 4 · Plano Empresarial: os quatro quadros com a mesma nomenclatura de
 * Resultados Comerciais — nome da tabela (redigitável na tela), sigla e vidas, contêiner TABELAS (Faixa × Enfermaria e
 * "APARTAMENTO fator x ENFERMARIA") e contêiner INDICADORES VARIÁVEIS; `grupo` indica a seção de cada quadro.
 */
export function quadrosProposta(indices: Indices = INDICES_PADRAO, indicadores: IndicadoresPorFrente = indicadoresPadrao(), rotulos: RotulosPorFrente = rotulosPadrao(), fatores: Fatores = FATORES_PADRAO) {
  return FRENTES_COMERCIAIS.map(({ id }) => ({
    id,
    grupo: parametrosDe(id).grupo,
    titulo: rotulos[id].titulo,
    subtitulo: [parametrosDe(id).sigla, vidasTexto(parametrosDe(id))?.toUpperCase()].filter(Boolean).join(" · "),
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
 * Glossário e Notas Explicativas: termos e notas do último tópico, sem número elevado no corpo do documento
 * (retirado a pedido do Dênis em 13/11/2026). Termos e notas são indicados pelo usuário.
 */
export const GLOSSARIO_PROPOSTA: { termo: string; nota: string }[] = [
  { termo: "ENFERMARIA", nota: "Apartamento = TRUNCAR(Enfermaria × 1,25; 2)" },
];

/**
 * Notas do Glossário com o fator do Apartamento atual: um só fator quando as tabelas coincidem;
 * do contrário, o fator de cada tabela pelo nome exibido. Depois, uma nota por sigla com os parâmetros da tabela.
 */
export function glossarioProposta(fatores: Fatores = FATORES_PADRAO, rotulos: RotulosPorFrente = rotulosPadrao(), indices: Indices = INDICES_PADRAO) {
  const ids = FRENTES_COMERCIAIS.map((f) => f.id);
  const iguais = ids.every((id) => fatores[id] === fatores[ids[0]]);
  const nota = iguais
    ? `Apartamento = TRUNCAR(Enfermaria × ${formatarFator(fatores[ids[0]])}; 2)`
    : [`Apartamento = TRUNCAR(Enfermaria × fator da tabela; 2), sendo:`, ...ids.map((id) => `${rotulos[id].titulo}: ${formatarFator(fatores[id])}`)].join("\n");
  const cap = (t: string) => t.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m) => m.toUpperCase()).replace(/\b(Por|De|Ou|A)\b/g, (m) => m.toLowerCase());
  const siglas = PARAMETROS_UBERABA.map((p) => {
    const vidas = vidasTexto(p);
    return {
      termo: p.sigla,
      nota: `${cap(p.contratacao)}${vidas ? `, de ${vidas}` : ""}. Boletagem: ${cap(p.boletagem)}. Distribuidores: ${cap(p.distribuidores)}. Tabela ${rotulos[p.id].titulo}, a ${formatarPercentual(indices[p.id])} da Tabela Referencial.`,
    };
  });
  return [...GLOSSARIO_PROPOSTA.map((g) => (g.termo === "ENFERMARIA" ? { ...g, nota } : g)), ...siglas];
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
  const LINHA_TEXTO = alturaLinha(F.texto);
  /** Parágrafo corrido: o que não cabe continua no topo da página seguinte (nunca uma linha sozinha no fim da página). */
  const paragrafo = (texto: string) => {
    fonteTexto();
    let linhas = doc.splitTextToSize(textoPdf(texto), usableW - 2) as string[];
    while (linhas.length) {
      const cabem = Math.floor((pageH - bottom - y) / LINHA_TEXTO) + 1;
      if (cabem < Math.min(2, linhas.length)) { novaPagina(); continue; }
      const parte = linhas.slice(0, cabem);
      linhas = linhas.slice(cabem);
      fonteTexto();
      // Uma linha vazia no fim mantém justificada a última linha de um trecho que continua na página seguinte.
      doc.text(linhas.length ? [...parte, ""] : parte, marginL, y, { align: "justify", maxWidth: usableW - 2, lineHeightFactor: 1.35 });
      if (linhas.length) novaPagina();
      else y += parte.length * LINHA_TEXTO + 3;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fimTabela = (fallback: number) => ((doc as any).lastAutoTable?.finalY as number | undefined) ?? fallback;

  const quadros = quadrosProposta(indices, indicadores, rotulos, fatores);
  type Quadro = (typeof quadros)[number];
  const doGrupo = (id: string) => quadros.filter((q) => q.grupo === id);
  const margem = (x: number, w: number) => ({ left: x, right: pageW - x - w, top, bottom });
  const ALTURA_TITULO_SECAO = 7;
  const LARGURA_VALOR = 15;
  /** Altura mínima (mm) de cada linha das tabelas de preços quando precisam diminuir para caber. */
  const LINHA_PRECO_MIN = 4.5;
  /** Faixa colorida (2) + nome (13 pt, até duas linhas) + sigla e vidas (11 pt). */
  const LINHA_NOME = alturaLinha(F.quadro) / 1.35 * 1.15;
  const alturaNome = (g: Geometria, lista: Quadro[]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(F.quadro);
    const n = Math.max(1, ...lista.map((q) => Math.min(2, (doc.splitTextToSize(q.titulo, g.largura - 4) as string[]).length)));
    return 2 + 3 + n * LINHA_NOME + 7;
  };
  /** Geometria dos quadros lado a lado: posição, largura e recuo do contêiner interno. */
  type Geometria = { xs: number[]; largura: number; inset: number; wSec: number };
  // Os quadros ocupam exatamente a largura dos parágrafos justificados (pedido do Dênis em 13/11/2026):
  // começam na margem esquerda e terminam onde terminam as linhas do texto.
  const LARGURA_TEXTO = usableW - 2;
  const geometria = (n: number, gap: number, inset: number, inicioX = marginL, larguraTotal = LARGURA_TEXTO): Geometria => {
    const largura = (larguraTotal - gap * (n - 1)) / n;
    return { xs: Array.from({ length: n }, (_, k) => inicioX + k * (largura + gap)), largura, inset, wSec: largura - inset * 2 };
  };
  // Produtos com Administradora: três quadros lado a lado; tabela ocupando o quadro todo, para ficarem o mais largas possível.
  const nAdm = Math.max(1, doGrupo("administradora").length);
  const GEO_REMUNERACAO = geometria(nAdm, 5, 2);
  const GEO_TABELAS = geometria(nAdm, 3, 0);
  // Plano Empresarial: um produto; a tabela de preços e os Indicadores variáveis ficam lado a lado.
  const GAP_EMPRESARIAL = 6;
  const L_EMP = (LARGURA_TEXTO - GAP_EMPRESARIAL) / 2;
  const GEO_EMP_TABELAS = geometria(1, 0, 0, marginL, L_EMP);
  const GEO_EMP_REMUNERACAO = geometria(1, 0, 2, marginL + L_EMP + GAP_EMPRESARIAL, L_EMP);
  /** Espaço entre o nome da tabela e o contêiner, no tópico 4 (pedido do Dênis em 13/11/2026). */
  const ESPACO_NOME_REMUNERACAO = 4;

  // Título de contêiner (TABELAS / INDICADORES VARIÁVEIS), como na tela.
  const tituloSecao = (g: Geometria, texto: string, x: number, yy: number) => {
    doc.setFillColor(...ZEBRA);
    doc.rect(x + g.inset, yy, g.wSec, ALTURA_TITULO_SECAO, "F");
    doc.setFont("helvetica", "bold");
    let f: number = F.secaoQuadro;
    doc.setFontSize(f);
    const w = doc.getTextWidth(texto);
    if (w > g.wSec - 5) { f *= (g.wSec - 5) / w; doc.setFontSize(f); }
    doc.setTextColor(...SECUNDARIO);
    doc.text(texto, x + g.largura / 2, yy + ALTURA_TITULO_SECAO / 2, { align: "center", baseline: "middle" });
  };
  const contornoSecao = (g: Geometria, x: number, y0: number, y1: number) => {
    if (g.inset <= 0) return; // contêiner do tamanho do quadro: o contorno do quadro já o fecha
    doc.setDrawColor(...LINHA);
    doc.setLineWidth(0.25);
    doc.rect(x + g.inset, y0, g.wSec, y1 - y0, "S");
  };
  // Faixa colorida e nome de cada tabela (o mesmo da tela); devolve onde começa o contêiner.
  const cabecalhoQuadros = (g: Geometria, lista: Quadro[], inicio: number, espaco = 0) => {
    const altura = alturaNome(g, lista);
    lista.forEach((q, k) => {
      const x = g.xs[k];
      doc.setFillColor(...COR_FRENTE[q.id]);
      doc.rect(x, inicio, g.largura, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(F.quadro);
      doc.setTextColor(...TINTA);
      // Nomes longos quebram em até duas linhas no tamanho padrão; abaixo, sigla e vidas.
      const linhas = (doc.splitTextToSize(q.titulo, g.largura - 4) as string[]).slice(0, 2);
      const yNome = inicio + 2 + 3 + LINHA_NOME / 2;
      doc.text(linhas, x + g.largura / 2, yNome, { align: "center", baseline: "middle", lineHeightFactor: 1.15 });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(F.subtituloQuadro);
      doc.setTextColor(...SECUNDARIO);
      doc.text(textoPdf(q.subtitulo), x + g.largura / 2, yNome + linhas.length * LINHA_NOME + 0.6, { align: "center", baseline: "middle" });
    });
    return inicio + altura + espaco;
  };
  const contornoQuadros = (g: Geometria, inicio: number, fimQ: number) => {
    doc.setDrawColor(...TINTA);
    doc.setLineWidth(0.35);
    g.xs.forEach((x) => doc.rect(x, inicio, g.largura, fimQ - inicio, "S"));
    doc.setDrawColor(0);
  };

  // Tópico 1: quadro de parâmetros dos produtos, na largura do texto; as colunas de texto quebram linha quando preciso.
  const desenharParametros = () => {
    // Largura de cada coluna: a da sua palavra mais longa (nenhuma palavra se parte); a letra só diminui se as sete
    // colunas não couberem na largura do texto. O que sobra é repartido entre as colunas de texto mais longo.
    const linhas = linhasParametros(indices, rotulos);
    const PAD = 1.2;
    const larguraPalavra = (t: string, negrito: boolean) => {
      doc.setFont("helvetica", negrito ? "bold" : "normal");
      return Math.max(...t.split(/\s+/).map((w) => doc.getTextWidth(w)));
    };
    const larguraTexto = (t: string, negrito: boolean) => {
      doc.setFont("helvetica", negrito ? "bold" : "normal");
      return doc.getTextWidth(t);
    };
    // Fator e valores curtos ficam numa linha só.
    const INTEIRAS = new Set([6]);
    let fonte: number = F.parametros;
    let minimas: number[] = [];
    for (; fonte > 9; fonte -= 0.5) {
      doc.setFontSize(fonte);
      minimas = COLUNAS_PARAMETROS.map((h, c) => Math.max(larguraPalavra(h, true), ...linhas.map((l) => (INTEIRAS.has(c) || l[c].length <= 7 ? larguraTexto : larguraPalavra)(l[c], c === 0))) + PAD * 2 + 0.6);
      if (minimas.reduce((a, b) => a + b, 0) <= LARGURA_TEXTO) break;
    }
    doc.setFontSize(fonte);
    const desejadas = COLUNAS_PARAMETROS.map((_, c) => Math.max(...linhas.map((l) => larguraTexto(l[c], c === 0))) + PAD * 2);
    const sobra = LARGURA_TEXTO - minimas.reduce((a, b) => a + b, 0);
    const extras = desejadas.map((d, c) => Math.max(0, d - minimas[c]));
    const totalExtras = extras.reduce((a, b) => a + b, 0) || 1;
    const larguras = minimas.map((m, c) => m + Math.min(extras[c], sobra * extras[c] / totalExtras));
    const folga = LARGURA_TEXTO - larguras.reduce((a, b) => a + b, 0);
    const colunasLarguras = Object.fromEntries(larguras.map((w, c) => [c, { cellWidth: w + folga / larguras.length }]));
    autoTable(doc, {
      theme: "plain",
      startY: y,
      tableWidth: LARGURA_TEXTO,
      margin: margem(marginL, LARGURA_TEXTO),
      head: [[...COLUNAS_PARAMETROS]],
      body: linhas,
      styles: { font: "helvetica", fontSize: fonte, cellPadding: { top: 1.2, bottom: 1.2, left: PAD, right: PAD }, textColor: PDF_COLORS.text, halign: "center", valign: "middle", overflow: "linebreak" },
      headStyles: { fillColor: CABECALHO, textColor: TINTA, fontStyle: "bold" },
      columnStyles: { ...colunasLarguras, 0: { ...colunasLarguras[0], fontStyle: "bold" } },
      alternateRowStyles: { fillColor: ZEBRA },
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
    doc.line(marginL, fimT, marginL + LARGURA_TEXTO, fimT);
    doc.setDrawColor(0);
    y = fimT + 9;
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
      styles: { font: "helvetica", fontSize: F.tabelaReferencia, cellPadding: { top: 1.05, bottom: 1.05, left: 2, right: 2 }, textColor: PDF_COLORS.text, halign: "center" },
      headStyles: { fillColor: CABECALHO, textColor: TINTA, fontStyle: "bold", fontSize: F.cabecalhoReferencia },
      alternateRowStyles: { fillColor: ZEBRA },
      didDrawCell: (c) => {
        if (c.section === "head") return;
        doc.setDrawColor(...LINHA);
        doc.setLineWidth(0.2);
        doc.line(c.cell.x, c.cell.y, c.cell.x + c.cell.width, c.cell.y);
      },
    });
    const fimT = fimTabela(y); // a tabela pode continuar na página seguinte; o fechamento fica na última
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

  // Contêiner TABELAS de cada quadro — Faixa × Enfermaria (cada coluna com moldura própria) e, abaixo dos quadros, uma linha simples com o fator do Apartamento.
  // `reserva` (mm): as linhas se ajustam para os quadros ocuparem o resto da folha deixando esse espaço livre abaixo
  // (Produtos com Administradora: tabelas e remuneração na mesma página, pedido do Dênis em 13/11/2026).
  /** Retorna onde termina o contorno dos quadros (antes da nota do fator). */
  const desenharPrecos = (lista: Quadro[], g: Geometria, reserva: number | null): number => {
    const inicio = y;
    const ySecT = cabecalhoQuadros(g, lista, inicio);
    g.xs.forEach((x) => tituloSecao(g, "TABELAS", x, ySecT));
    let fimP = ySecT + ALTURA_TITULO_SECAO;
    // Fator do Apartamento: uma só linha, sem moldura, alinhada à esquerda e abaixo dos três quadros (pedido do Dênis em 13/11/2026).
    const fatoresIguais = lista.every((q) => q.fator === lista[0].fator);
    const nota = fatoresIguais
      ? `APARTAMENTO ${lista[0].fator} x ENFERMARIA`
      : `APARTAMENTO: ${lista.map((q) => `${q.titulo} ${q.fator} x ENFERMARIA`).join("; ")}`;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(F.notaPrecos);
    const larguraNota = g.xs.length === 1 ? g.largura : LARGURA_TEXTO;
    const linhasNota = doc.splitTextToSize(textoPdf(nota), larguraNota) as string[];
    const LINHA_NOTA = alturaLinha(F.notaPrecos);
    const ESPACO_NOTA = 6, ESPACO_APOS_NOTA = 8;
    const fixo = ySecT - inicio + ALTURA_TITULO_SECAO + ESPACO_NOTA + linhasNota.length * LINHA_NOTA + ESPACO_APOS_NOTA;
    const nLinhas = Math.max(1, ...lista.map((q) => q.linhas.length)) + 1;
    const alturaLinhaPreco = reserva === null ? 7.5 : Math.min(16, Math.max(LINHA_PRECO_MIN, (pageH - bottom - reserva - inicio - fixo) / nLinhas));
    // Linhas baixas: menos respiro e letra reduzida só o necessário para caber na linha.
    const respiro = alturaLinhaPreco < 7 ? 0.5 : 1;
    const fonteLinha = Math.min(F.tabela, Math.floor(((alturaLinhaPreco - respiro * 2) / (0.3528 * 1.15)) * 2) / 2);
    const fonteCabecalho = Math.min(F.cabecalhoTabela, fonteLinha);
    lista.forEach((q, k) => {
      // Moldura de cada coluna (FAIXA e ENFERMARIA), do cabeçalho à última faixa, separando-as visualmente.
      const colunas = [0, 1].map(() => ({ x: 0, w: 0, y0: Infinity, y1: -Infinity }));
      autoTable(doc, {
        theme: "plain",
        startY: ySecT + ALTURA_TITULO_SECAO,
        tableWidth: g.wSec,
        margin: margem(g.xs[k] + g.inset, g.wSec),
        head: [["FAIXA", "ENFERMARIA"]],
        body: q.linhas,
        styles: { font: "helvetica", fontSize: fonteLinha, cellPadding: { top: respiro, bottom: respiro, left: 1.5, right: 1.5 }, minCellHeight: alturaLinhaPreco, valign: "middle", textColor: PDF_COLORS.text, halign: "center" },
        headStyles: { fillColor: CABECALHO, textColor: TINTA, fontStyle: "bold", fontSize: fonteCabecalho },
        alternateRowStyles: { fillColor: ZEBRA },
        didDrawCell: (c) => {
          const col = colunas[c.column.index];
          if (col) {
            col.x = c.cell.x;
            col.w = c.cell.width;
            col.y0 = Math.min(col.y0, c.cell.y);
            col.y1 = Math.max(col.y1, c.cell.y + c.cell.height);
          }
          if (c.section !== "body") return;
          doc.setDrawColor(...LINHA);
          doc.setLineWidth(0.2);
          doc.line(c.cell.x, c.cell.y, c.cell.x + c.cell.width, c.cell.y);
        },
      });
      doc.setDrawColor(...TINTA);
      doc.setLineWidth(0.35);
      colunas.forEach((col) => { if (col.w > 0) doc.rect(col.x, col.y0, col.w, col.y1 - col.y0, "S"); });
      doc.setDrawColor(0);
      fimP = Math.max(fimP, fimTabela(fimP));
    });
    contornoQuadros(g, inicio, fimP);
    const yNota = fimP + ESPACO_NOTA;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(F.notaPrecos);
    doc.setTextColor(...SECUNDARIO);
    doc.text(linhasNota, g.xs[0], yNota, { lineHeightFactor: 1.35 });
    y = yNota + linhasNota.length * LINHA_NOTA + ESPACO_APOS_NOTA;
    doc.setPage(doc.getNumberOfPages());
    return fimP;
  };

  // Contêiner INDICADORES VARIÁVEIS de cada quadro; cada bloco começa na mesma linha em todos os quadros da seção.
  // `fimAlvo` (mm): quando informado e abaixo do fim natural, o quadro se estende até ele
  // (Plano Empresarial: termina nivelado com a tabela de preços ao lado, pedido do Dênis em 13/11/2026).
  const desenharRemuneracao = (lista: Quadro[], g: Geometria, fimAlvo?: number) => {
    const inicio = y;
    const ySecI = cabecalhoQuadros(g, lista, inicio, ESPACO_NOME_REMUNERACAO);
    g.xs.forEach((x) => tituloSecao(g, "INDICADORES VARIÁVEIS", x, ySecI));
    let yb = ySecI + ALTURA_TITULO_SECAO + 2;
    // Fonte dos indicadores: a padrão, reduzida só o necessário para nenhum rótulo quebrar no meio da palavra.
    const larguraRotulo = g.largura - (g.inset + 1.5) * 2 - LARGURA_VALOR - 3.4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(F.indicador);
    const maisLongo = Math.max(...lista.flatMap((q) => q.blocos.flatMap((b) => b.linhas.map((l) => doc.getTextWidth(l[0])))));
    const fInd = maisLongo > larguraRotulo ? Math.max(8, F.indicador * larguraRotulo / maisLongo) : F.indicador;
    const nBlocos = Math.max(...lista.map((q) => q.blocos.length));
    const insetB = g.inset + 1.5;
    for (let b = 0; b < nBlocos; b++) {
      let fimBloco = yb;
      lista.forEach((q, k) => {
        const bloco = q.blocos[b];
        if (!bloco) return;
        autoTable(doc, {
          theme: "grid",
          startY: yb,
          tableWidth: g.largura - insetB * 2,
          margin: margem(g.xs[k] + insetB, g.largura - insetB * 2),
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
    const fimQ = Math.max(yb + 1.5, fimAlvo ?? 0);
    g.xs.forEach((x) => contornoSecao(g, x, ySecI, fimQ - 2.5));
    contornoQuadros(g, inicio, fimQ);
    y = fimQ + 11;
    doc.setPage(doc.getNumberOfPages());
  };

  const desenharGlossario = () => {
    glossarioProposta(fatores, rotulos, indices).forEach((g) => {
      const xTermo = marginL;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(F.texto);
      const linhasNota = doc.splitTextToSize(g.nota, usableW) as string[];
      garantir(7 + linhasNota.length * alturaLinha(F.texto));
      // Termo em destaque, sem número de nota.
      doc.setFont("helvetica", "bold");
      doc.setFontSize(F.texto);
      doc.setTextColor(...TINTA);
      doc.text(g.termo, xTermo, y);
      y += 6.5;
      fonteTexto();
      doc.text(linhasNota, xTermo, y, { lineHeightFactor: 1.35 });
      y += linhasNota.length * alturaLinha(F.texto) + 3;
    });
  };

  const corpo = paragrafosProposta(textos);
  // Os tópicos seguem corridos, sem pular página. Só os quadros lado a lado não se dividem:
  // quando não cabem no resto da página, passam inteiros para a seguinte.
  const ALTURA_EMPRESARIAL = 125;
  /** Tabela Referencial inteira (cabeçalho, dez faixas e a linha do fator): fica na mesma página do seu título e texto. */
  const ALTURA_REFERENCIA = 82;
  // 3 · Produtos com Administradora: tabelas e remuneração na mesma página; as tabelas diminuem para caber.
  // A altura da remuneração é medida desenhando-a numa página provisória, descartada em seguida.
  const listaAdm = doGrupo("administradora");
  const alturaRemuneracaoAdm = (() => {
    doc.addPage(); y = top;
    desenharRemuneracao(listaAdm, GEO_REMUNERACAO);
    const h = y - top - 11; // sem o espaço que segue o quadro
    doc.deletePage(doc.getNumberOfPages());
    doc.setPage(doc.getNumberOfPages());
    y = top;
    return h;
  })();
  const nLinhasAdm = Math.max(1, ...listaAdm.map((q) => q.linhas.length)) + 1;
  /** Altura mínima das tabelas da Administradora: nomes, TABELAS, linhas na altura mínima e a nota do fator. */
  const ALTURA_PRECOS_ADM_MIN = alturaNome(GEO_TABELAS, listaAdm) + ALTURA_TITULO_SECAO + nLinhasAdm * LINHA_PRECO_MIN + 20;
  const desenharAdministradora = () => {
    garantir(ALTURA_PRECOS_ADM_MIN + alturaRemuneracaoAdm);
    desenharPrecos(listaAdm, GEO_TABELAS, alturaRemuneracaoAdm);
    desenharRemuneracao(listaAdm, GEO_REMUNERACAO);
  };
  // 4 · Plano Empresarial: tabela de preços e Indicadores variáveis lado a lado.
  const desenharEmpresarial = () => {
    const lista = doGrupo("empresarial");
    garantir(ALTURA_EMPRESARIAL);
    const inicio = y;
    const fimQuadroPrecos = desenharPrecos(lista, GEO_EMP_TABELAS, null);
    const fimPrecos = y;
    y = inicio;
    desenharRemuneracao(lista, GEO_EMP_REMUNERACAO, fimQuadroPrecos);
    y = Math.max(fimPrecos, y);
  };
  const blocoDados: Partial<Record<SecaoTextoId, () => void>> = { introducao: desenharParametros, referencia: desenharReferencia, administradora: desenharAdministradora, empresarial: desenharEmpresarial };
  const ALTURA_BLOCO: Partial<Record<SecaoTextoId, number>> = { introducao: 30, referencia: 30 };
  const INICIO_TOPICO = 10 + LINHA_TEXTO * 2; // título com pelo menos duas linhas de texto abaixo
  SECOES_TEXTO.forEach((s, i) => {
    // Produtos com Administradora e Plano Empresarial: título, texto e quadros ficam juntos na mesma página.
    const juntos = s.id === "empresarial" ? ALTURA_EMPRESARIAL : s.id === "administradora" ? ALTURA_PRECOS_ADM_MIN + alturaRemuneracaoAdm : s.id === "referencia" ? ALTURA_REFERENCIA : null;
    garantir(juntos === null ? INICIO_TOPICO : 10 + corpo[i].length * LINHA_TEXTO * 3 + juntos);
    drawSectionTitle(doc, s.titulo, marginL, y, pageW - marginR, TINTA, F.topico);
    y += 10;
    corpo[i].forEach(paragrafo);
    const dados = blocoDados[s.id];
    y += 2;
    if (dados) { garantir(ALTURA_BLOCO[s.id] ?? 0); dados(); }
  });
  garantir(INICIO_TOPICO + 14); // título do Glossário junto com o primeiro termo e sua nota
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
