import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { attachTimbrado } from "@/lib/pdfTimbrado";
import type { LinhaPracaMes } from "@/lib/evolucaoProdutos";

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

const pct = (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

/** PDF A4 do grid mês × praça: título, cartões de resumo, gráfico mensal e a grade inteira (cabeçalho repetido nas páginas). */
export function buildGridPracasPdf(timbrado: string | null, o: GridPracasPdf): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  attachTimbrado(doc, timbrado);
  const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
  const mL = 18, mR = 18, top = 42, bottom = 25, w = pageW - mL - mR, right = pageW - mR;
  const celula = (v: number | null) => (v == null ? "Sem dado" : o.fmt(v));
  let y = top;

  // Título
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(...TINTA);
  doc.text(o.titulo, mL, y + 5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...SECUNDARIO);
  doc.text(`Evolução Produtos · Cidade (UF) · Período ${o.periodo} · ${o.filtros}`, mL, y + 11);
  doc.setDrawColor(...TINTA); doc.setLineWidth(0.6); doc.line(mL, y + 14, right, y + 14);
  y += 20;

  // Cartões
  const gap = 4, cw = (w - gap * 2) / 3, ch = 25;
  resumoPracas(o.linhas).forEach((r, i) => {
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
  if (!o.razao && meses.length > 0) {
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
  const corpo = o.linhas.map((l) => [l.rotulo, celula(l.praca), celula(l.regiao), celula(l.total)]);
  // Linhas se ajustam para a grade caber no espaço restante da página (fonte de 10 a 8,5 pt); se não couber, continua na próxima.
  const { fonte, pad } = ajusteGrade(pageH - bottom - y - 2, corpo.length + 1);
  autoTable(doc, {
    startY: y,
    margin: { left: mL, right: mR, top, bottom },
    head: [["Mês", ...COLUNAS_PRACAS.map((c) => c.rotulo)]],
    body: corpo,
    theme: "grid",
    styles: { font: "helvetica", fontSize: fonte, cellPadding: { top: pad, bottom: pad, left: 3, right: 3 }, textColor: TEXTO, lineColor: LINHA, lineWidth: 0.15 },
    headStyles: { fillColor: TINTA, textColor: [255, 255, 255], fontStyle: "bold", lineColor: TINTA },
    alternateRowStyles: { fillColor: ZEBRA },
    columnStyles: { 0: { halign: "left", cellWidth: 34 }, 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right", fontStyle: "bold" } },
    tableLineColor: TINTA,
    tableLineWidth: 0.4,
    didParseCell: (d) => {
      if (d.section === "head" && d.column.index > 0) d.cell.styles.halign = "right";
      if (d.section === "body" && corpo[d.row.index][0] === "Total") { d.cell.styles.fillColor = CARTAO; d.cell.styles.fontStyle = "bold"; d.cell.styles.textColor = TINTA; }
    },
  });

  // Rodapé
  const total = doc.getNumberOfPages();
  const gerado = (o.geradoEm ?? new Date()).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...SECUNDARIO);
    doc.text(`S. J. Rio Preto = SAO JOSE DO RIO PRETO (SP); Região = demais cidades · Gerado em ${gerado}`, mL, pageH - 16);
    doc.text(`Página ${i} de ${total}`, right, pageH - 16, { align: "right" });
  }
  return doc;
}
