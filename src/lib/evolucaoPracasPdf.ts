import { aplicarMarcaAxis } from "@/lib/pdfMarcaAxis";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { attachTimbrado, TIMBRADO_RAZAO_SOCIAL } from "@/lib/pdfTimbrado";
import type { LinhaPracaMes } from "@/lib/evolucaoProdutos";
import { comAns, type LinhaPracaAns } from "@/lib/evolucaoPracasAns";

type RGB = [number, number, number];
// Tintas escuras para continuar legível impresso em preto e branco.
const TINTA: RGB = [26, 46, 79];
const TEXTO: RGB = [0, 0, 0];
const SECUNDARIO: RGB = [38, 38, 38];
const LINHA: RGB = [74, 85, 104];
const CARTAO: RGB = [238, 242, 247];
const ZEBRA: RGB = [245, 247, 250];
const BARRA_REGIAO: RGB = [184, 198, 216];

export const COLUNAS_PRACAS = [
  { id: "praca", rotulo: "S. J. Rio Preto" },
  { id: "regiao", rotulo: "Região" },
  { id: "total", rotulo: "Total Geral" },
] as const;
type ColunaPraca = (typeof COLUNAS_PRACAS)[number]["id"];

/** Resumo de cada coluna: primeiro e último mês com dado e a variação entre eles (sem contar a linha Total). */
export function resumoPracas(linhas: LinhaPracaMes[]) {
  const meses = linhas.filter((l) => l.rotulo !== "Total");
  return COLUNAS_PRACAS.map((c) => {
    const com = meses.filter((l) => l[c.id] != null);
    const ini = com[0], fim = com[com.length - 1];
    const inicial = ini ? (ini[c.id] as number) : null, final = fim ? (fim[c.id] as number) : null;
    const variacao = inicial != null && final != null ? final - inicial : null;
    return {
      id: c.id as ColunaPraca, rotulo: c.rotulo, inicial, final, mesInicial: ini?.rotulo ?? null, mesFinal: fim?.rotulo ?? null,
      variacao, variacaoPct: variacao != null && inicial ? variacao / inicial : null,
    };
  });
}

export type GridPracasPdf = {
  titulo: string; periodo: string; filtros: string; linhas: LinhaPracaMes[]; fmt: (n: number) => string;
  /** Visões em razão (Sinistralidade, per capita): sem gráfico de barras empilhadas e sem variação percentual. */
  razao: boolean; geradoEm?: Date;
  /** Logo do AXIS (dataURL) para a marca do rodapé; sem ela, a marca sai só com o texto. */
  marcaAxis?: string | null;
  /** "Incluir ANS": ativos de Plano de Saúde do Bensaúde no Bench Vidas Mensal por mês ("MM/AAAA"). */
  ans?: Map<string, number> | null;
};

/** Fonte e espaçamento vertical das linhas para `linhas` linhas caberem em `altura` mm (mínimos 8,5 pt e 0,7 mm; padrão 10 pt e 1,6 mm). */
export function ajusteGrade(altura: number, linhas: number) {
  const alturaLinha = (fonte: number, pad: number) => fonte * 0.3528 * 1.15 + pad * 2 + 0.3;
  for (const fonte of [10, 9.5, 9, 8.5]) {
    for (let pad = 1.6; pad >= 0.7 - 1e-9; pad -= 0.1) {
      if (alturaLinha(fonte, pad) * linhas <= altura) return { fonte, pad: Math.round(pad * 10) / 10 };
    }
  }
  return { fonte: 10, pad: 1.6 };
}

// Hífen como sinal de menos: a fonte padrão do PDF (WinAnsi) não tem o caractere "−".
const assinado = (v: number, fmt: (n: number) => string) => `${v > 0 ? "+" : v < 0 ? "-" : ""}${fmt(Math.abs(v))}`;
const pct2 = (v: number) => `${v > 0 ? "+" : v < 0 ? "-" : ""}${Math.abs(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const pct = (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

/** PDF A4 do grid mês × praça: título, cartões de resumo, gráfico mensal e a grade inteira (cabeçalho repetido nas páginas). */
export function buildGridPracasPdf(timbrado: string | null, o: GridPracasPdf): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  attachTimbrado(doc, timbrado, { semRazaoSocial: true });
  const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
  const mL = 18, mR = 18, top = 42, bottom = 25, w = pageW - mL - mR, right = pageW - mR;
  const celula = (v: number | null) => (v == null ? "Sem dado" : o.fmt(v));
  let y = top;

  // Título
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(...TINTA);
  const comparar: LinhaPracaAns[] | null = o.ans ? comAns(o.linhas, o.ans) : null;
  doc.text(comparar ? `${o.titulo} × Bench Vidas (ANS)` : o.titulo, mL, y + 5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(comparar ? 8.5 : 10); doc.setTextColor(...SECUNDARIO);
  if (comparar) {
    doc.text(`AXIS: Evolução Produtos · Cidade (UF) · Período ${o.periodo} · ${o.filtros} · vidas no fim do mês`, mL, y + 10.5);
    doc.text("ANS: Bench Vidas Mensal · OPS Bensaúde · Tipo Produto: Plano de Saúde · demais filtros Todos · Ativos na competência", mL, y + 14.5);
    doc.setDrawColor(...TINTA); doc.setLineWidth(0.6); doc.line(mL, y + 17.5, right, y + 17.5);
    y += 23;
  } else {
    doc.text(`Evolução Produtos · Cidade (UF) · Período ${o.periodo} · ${o.filtros}`, mL, y + 11);
    doc.setDrawColor(...TINTA); doc.setLineWidth(0.6); doc.line(mL, y + 14, right, y + 14);
    y += 20;
  }

  // Cartões
  const gap = 4, cw = (w - gap * 2) / 3, ch = 25;
  const cartoes = comparar ? cartoesAns(comparar, o.fmt) : null;
  if (cartoes) cartoes.forEach((r, i) => {
    const x = mL + i * (cw + gap), destaque = i === 2;
    doc.setFillColor(...(destaque ? TINTA : CARTAO)); doc.setDrawColor(...(destaque ? TINTA : LINHA)); doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cw, ch, 2.5, 2.5, "FD");
    const cor: RGB = destaque ? [255, 255, 255] : TEXTO;
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...(destaque ? cor : SECUNDARIO)); doc.text(r.rotulo, x + 4, y + 6);
    doc.setFontSize(17); doc.setTextColor(...(destaque ? cor : TINTA)); doc.text(r.valor, x + 4, y + 14);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...(destaque ? cor : SECUNDARIO)); doc.text(r.mes, x + 4, y + 18.5);
    doc.setFont("helvetica", "bold"); let f = 8.5; doc.setFontSize(f); while (f > 6 && doc.getTextWidth(r.sub) > cw - 8) doc.setFontSize((f -= 0.5));
    doc.text(r.sub, x + 4, y + 22.5);
  });
  else resumoPracas(o.linhas).forEach((r, i) => {
    const x = mL + i * (cw + gap);
    const destaque = r.id === "total";
    doc.setFillColor(...(destaque ? TINTA : CARTAO)); doc.setDrawColor(...(destaque ? TINTA : LINHA)); doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cw, ch, 2.5, 2.5, "FD");
    const cor: RGB = destaque ? [255, 255, 255] : TEXTO;
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...(destaque ? cor : SECUNDARIO));
    doc.text(r.rotulo.toUpperCase(), x + 4, y + 6);
    // Textos dos cartões diminuem até caber na largura (valores em R$ são longos).
    const caber = (t: string, max: number, min: number) => { let f = max; doc.setFontSize(f); while (f > min && doc.getTextWidth(t) > cw - 8) doc.setFontSize((f -= 0.5)); };
    doc.setTextColor(...(destaque ? cor : TINTA));
    caber(celula(r.final), 17, 11);
    doc.text(celula(r.final), x + 4, y + 14);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...(destaque ? cor : SECUNDARIO));
    const sub = r.mesFinal ? `em ${r.mesFinal}` : "sem dado";
    doc.text(sub, x + 4, y + 18.5);
    if (r.variacao != null && r.mesInicial) {
      const v = o.razao ? `${r.variacao >= 0 ? "+" : ""}${o.fmt(r.variacao)}` : `${r.variacao >= 0 ? "+" : ""}${o.fmt(r.variacao)}${r.variacaoPct != null ? ` (${pct(r.variacaoPct)})` : ""}`;
      doc.setFont("helvetica", "bold");
      caber(`${v} desde ${r.mesInicial}`, 8.5, 6);
      doc.text(`${v} desde ${r.mesInicial}`, x + 4, y + 22.5);
    }
  });
  y += ch + 7;

  // Gráfico mensal: barras empilhadas S. J. Rio Preto + Região (visões aditivas).
  const meses = o.linhas.filter((l) => l.rotulo !== "Total");
  if (comparar && comparar.length > 0) {
    y = graficoAns(doc, comparar, mL, right, y);
  } else if (!o.razao && meses.length > 0) {
    const gh = 46, base = y + gh - 8, alto = gh - 16;
    const max = Math.max(1, ...meses.map((l) => l.total ?? 0));
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...TINTA);
    doc.text("Evolução mensal", mL, y + 3);
    // Legenda
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...SECUNDARIO);
    const leg = (x: number, cor: RGB, t: string) => { doc.setFillColor(...cor); doc.setDrawColor(...LINHA); doc.setLineWidth(0.2); doc.rect(x, y, 3, 3, "FD"); doc.text(t, x + 4.5, y + 2.6); };
    leg(right - 62, TINTA, "S. J. Rio Preto"); leg(right - 28, BARRA_REGIAO, "Região");
    doc.setDrawColor(...LINHA); doc.setLineWidth(0.3); doc.line(mL, base, right, base);
    const slot = w / meses.length, bw = Math.min(9, slot * 0.68);
    const cada = Math.ceil(meses.length / 12);
    meses.forEach((l, i) => {
      const cx = mL + slot * i + slot / 2, x = cx - bw / 2;
      const hp = ((l.praca ?? 0) / max) * alto, hr = ((l.regiao ?? 0) / max) * alto;
      doc.setLineWidth(0.15); doc.setDrawColor(...LINHA);
      if (hr > 0) { doc.setFillColor(...BARRA_REGIAO); doc.rect(x, base - hp - hr, bw, hr, "FD"); }
      if (hp > 0) { doc.setFillColor(...TINTA); doc.rect(x, base - hp, bw, hp, "FD"); }
      doc.setFontSize(6.5); doc.setTextColor(...SECUNDARIO);
      // Rótulos contados a partir do último mês, que sempre aparece.
      if ((meses.length - 1 - i) % cada === 0) doc.text(l.rotulo.replace(/\/(\d{2})(\d{2})$/, "/$2"), cx, base + 3.5, { align: "center" });
    });
    y += gh;
  }

  // Grade
  const corpo = comparar
    ? comparar.map((l) => [l.rotulo, celula(l.praca), celula(l.regiao), celula(l.total), celula(l.ans), l.diferenca == null ? "—" : assinado(l.diferenca, o.fmt), l.diferencaPct == null ? "—" : pct2(l.diferencaPct)])
    : o.linhas.map((l) => [l.rotulo, celula(l.praca), celula(l.regiao), celula(l.total)]);
  const cabecalho = comparar ? ["Mês", ...COLUNAS_PRACAS.map((c) => c.rotulo), "ANS · Plano de Saúde", "Diferença", "Dif. %"] : ["Mês", ...COLUNAS_PRACAS.map((c) => c.rotulo)];
  // Linhas se ajustam para a grade caber no espaço restante da página (fonte de 10 a 8,5 pt); se não couber, continua na próxima.
  // Com a ANS, a nota tem três linhas: reserva o espaço delas na mesma página.
  const { fonte, pad } = ajusteGrade(pageH - bottom - y - 2 - (comparar ? 8 : 0), corpo.length + 1);
  autoTable(doc, {
    startY: y,
    margin: { left: mL, right: mR, top, bottom },
    head: [cabecalho],
    body: corpo,
    theme: "grid",
    styles: { font: "helvetica", fontSize: fonte, cellPadding: { top: pad, bottom: pad, left: 3, right: 3 }, textColor: TEXTO, lineColor: LINHA, lineWidth: 0.15 },
    // Com a ANS, o cabeçalho fica em uma linha só (9 pt no máximo) para a grade caber na página.
    headStyles: { fillColor: TINTA, textColor: [255, 255, 255], fontStyle: "bold", lineColor: TINTA, ...(comparar ? { fontSize: Math.min(fonte, 9), overflow: "visible" as const } : {}) },
    alternateRowStyles: { fillColor: ZEBRA },
    columnStyles: comparar
      ? { 0: { halign: "left", cellWidth: 20 }, 1: { halign: "right", cellWidth: 26 }, 2: { halign: "right", cellWidth: 23 }, 3: { halign: "right", fontStyle: "bold", cellWidth: 25 }, 4: { halign: "right", fontStyle: "bold", cellWidth: 38 }, 5: { halign: "right", fontStyle: "bold", cellWidth: 22 }, 6: { halign: "right", cellWidth: w - 154 } }
      : { 0: { halign: "left", cellWidth: 34 }, 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right", fontStyle: "bold" } },
    tableLineColor: TINTA,
    tableLineWidth: 0.4,
    didParseCell: (d) => {
      if (d.section === "head" && d.column.index > 0) d.cell.styles.halign = "right";
      if (d.section === "body" && corpo[d.row.index][0] === "Total") { d.cell.styles.fillColor = CARTAO; d.cell.styles.fontStyle = "bold"; d.cell.styles.textColor = TINTA; }
    },
  });

  // Nota das praças em itálico, logo abaixo do fim da grade.
  const gerado = (o.geradoEm ?? new Date()).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const fimGrade = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  doc.setPage(doc.getNumberOfPages());
  doc.setFont("helvetica", "italic"); doc.setFontSize(8.5); doc.setTextColor(...SECUNDARIO);
  if (comparar) {
    doc.setFontSize(8);
    const nota = doc.splitTextToSize([
      "S. J. Rio Preto = SAO JOSE DO RIO PRETO (SP); Região = demais cidades. Diferença = Total Geral AXIS - ANS; Dif. % sobre a ANS.",
      "ANS: linha Total do Bench Vidas Mensal (OPS Bensaúde, Tipo Produto \"Plano de Saúde\", sem planos odontológicos); \"Sem dado\" = mês ainda não publicado pela ANS.",
      `Gerado em ${gerado}.`,
    ].join("\n"), w) as string[];
    nota.forEach((t, i) => doc.text(t, mL, fimGrade + 4.5 + i * 3.6));
  } else doc.text(`S. J. Rio Preto = SAO JOSE DO RIO PRETO (SP); Região = demais cidades · Gerado em ${gerado}`, mL, fimGrade + 4.5);

  // Rodapé
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...SECUNDARIO);
    doc.text(`Página ${i} de ${total}`, right, pageH - 16, { align: "right" });
  }
  // A marca do AXIS ocupa o lugar da razão social do timbrado.
  aplicarMarcaAxis(doc, o.marcaAxis ?? null, (_p, w, h) => ({ x: w / 2, y: TIMBRADO_RAZAO_SOCIAL.linha * (h / 297), align: "center" }), 7.5);
  return doc;
}

/** Cartões do modo "Incluir ANS": Total Geral AXIS, ANS e diferença no último mês com os dois valores. */
export function cartoesAns(linhas: LinhaPracaAns[], fmt: (n: number) => string) {
  const ambos = linhas.filter((l) => l.total != null && l.ans != null);
  const ini = ambos[0], fim = ambos[ambos.length - 1];
  if (!ini || !fim) return null;
  const varia = (a: number, b: number) => `${assinado(b - a, fmt)} (${pct2(a ? (b - a) / a : 0)}) desde ${ini.rotulo}`;
  return [
    { rotulo: "TOTAL GERAL · AXIS", valor: fmt(fim.total!), mes: `em ${fim.rotulo}`, sub: varia(ini.total!, fim.total!) },
    { rotulo: "ANS · PLANO DE SAÚDE", valor: fmt(fim.ans!), mes: `em ${fim.rotulo}`, sub: varia(ini.ans!, fim.ans!) },
    { rotulo: "DIFERENÇA (AXIS - ANS)", valor: assinado(fim.diferenca!, fmt), mes: `em ${fim.rotulo}`, sub: `${pct2(fim.diferencaPct ?? 0)} da ANS · ${ini.rotulo}: ${assinado(ini.diferenca!, fmt)}` },
  ];
}

/** Linhas Total Geral AXIS (contínua, círculos) × ANS (tracejada, quadrados), legíveis em preto e branco. */
function graficoAns(doc: jsPDF, linhas: LinhaPracaAns[], mL: number, right: number, y: number) {
  // Períodos longos encolhem o gráfico para a grade continuar cabendo na mesma página.
  const gh = linhas.length > 21 ? 42 : 50, topo = y + 7, base = y + gh - 8, x0 = mL + 12, x1 = right - 2;
  const valores = linhas.flatMap((l) => [l.total, l.ans]).filter((v): v is number => v != null);
  if (!valores.length) return y;
  const passo = 2000;
  let lo = Math.floor(Math.min(...valores) / passo) * passo, hi = Math.ceil(Math.max(...valores) / passo) * passo;
  if (hi === lo) hi = lo + passo;
  const marcas = (hi - lo) / passo > 8 ? passo * 2 : passo;
  const Y = (v: number) => base - ((v - lo) / (hi - lo)) * (base - topo);
  const X = (i: number) => linhas.length === 1 ? (x0 + x1) / 2 : x0 + (i * (x1 - x0)) / (linhas.length - 1);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...TINTA);
  doc.text("Evolução mensal: Total Geral AXIS × ANS (Plano de Saúde)", mL, y + 3);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...SECUNDARIO);
  doc.setDrawColor(...TINTA); doc.setLineWidth(0.5);
  doc.line(right - 52, y + 2, right - 46, y + 2); doc.text("Total Geral AXIS", right - 44.5, y + 3);
  doc.setLineDashPattern([1.2, 0.8], 0); doc.line(right - 14, y + 2, right - 8, y + 2); doc.setLineDashPattern([], 0); doc.text("ANS", right - 6.5, y + 3);
  doc.setFontSize(6.5);
  for (let v = lo; v <= hi; v += marcas) {
    doc.setDrawColor(...BARRA_REGIAO); doc.setLineWidth(0.15); doc.line(x0, Y(v), x1, Y(v));
    doc.text(v.toLocaleString("pt-BR"), x0 - 1.5, Y(v) + 1, { align: "right" });
  }
  const cada = Math.ceil(linhas.length / 12);
  linhas.forEach((l, i) => { if ((linhas.length - 1 - i) % cada === 0) doc.text(l.rotulo.replace(/\/(\d{2})(\d{2})$/, "/$2"), X(i), base + 3.5, { align: "center" }); });
  const serie = (chave: "total" | "ans", tracejada: boolean) => {
    doc.setDrawColor(...TINTA); doc.setFillColor(...TINTA); doc.setLineWidth(0.5);
    if (tracejada) doc.setLineDashPattern([1.2, 0.8], 0);
    let ant: [number, number] | null = null;
    linhas.forEach((l, i) => { const v = l[chave]; if (v == null) { ant = null; return; } const p: [number, number] = [X(i), Y(v)]; if (ant) doc.line(ant[0], ant[1], p[0], p[1]); ant = p; });
    doc.setLineDashPattern([], 0);
    linhas.forEach((l, i) => { const v = l[chave]; if (v == null) return; if (tracejada) doc.rect(X(i) - 0.55, Y(v) - 0.55, 1.1, 1.1, "F"); else doc.circle(X(i), Y(v), 0.55, "F"); });
  };
  serie("total", false); serie("ans", true);
  return y + gh;
}
