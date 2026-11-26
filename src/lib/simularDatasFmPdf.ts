import jsPDF from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";
import { attachTimbrado, TIMBRADO_RAZAO_SOCIAL } from "@/lib/pdfTimbrado";
import { aplicarMarcaAxis } from "@/lib/pdfMarcaAxis";
import {
  PARTES_BLOCOS_FM, avaliarImpactosFm, blocosPeriodoFm, blocosRedeFm, fechamentosFm, hospitalBeneFm, beneNoBlocoFm, formatarCompetencia, formatarNumeroFm, formatarPrazo, ordenarSimulacoesFm, periodoFm, prazoFolhaFm, simularDatasFm,
  type NivelImpactoFm, type SimulacaoFm,
} from "@/lib/simularDatasFm";

/** Relatório "Imprimir Cenários" (pedido de 18/11/2026): uma página A4 por cenário da Lista de Simulações, na ordem de inserção,
 * com os mesmos números da tela (helpers de simularDatasFm), para o relatório nunca divergir da tela. */
export type PaginaCenarioFm = {
  titulo: string; cenario: string; competencia: string; arquivo: string; periodo: string; prazoFolha: string; alteradaEm: string;
  datas: { variavel: string; referencia: string; data: string; prazo: string }[];
  impactos: { variavel: string; dias: string; situacao: string; nivel: NivelImpactoFm; descricao: string }[];
  /** Cenários "Em blocos" (pedido de 18/11/2026): o mesmo quadro da tela, com um texto que o situa no relatório; ausente nos demais. */
  blocos?: { contexto: string; partes: { titulo: string; linhas: { bloco: string; periodo: string; dias: string; arquivo: string }[] }[] };
};
/** Rótulo dos cenários simulados em blocos (Lista de Simulações e relatório). */
export const EM_BLOCOS_FM = "Em blocos";


// Fonte padrão do PDF (WinAnsi) não tem o "−": vira hífen.
const pdfTexto = (t: string) => t.replace(/−/g, "-");
const dataHora = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export function paginasCenariosFm(lista: SimulacaoFm[]): PaginaCenarioFm[] {
  return ordenarSimulacoesFm(lista).map((s) => {
    const linhas = simularDatasFm(s.entrada);
    const arquivo = linhas.find((l) => l.id === "arquivo")!;
    const p = periodoFm(s.entrada);
    return {
      titulo: `Cenário ${formatarNumeroFm(s.numero)}`,
      cenario: s.descricao.trim() || "Sem nome",
      competencia: formatarCompetencia(s.entrada.mes, s.entrada.ano),
      arquivo: arquivo.data,
      periodo: `${p.de} a ${p.ate}`,
      prazoFolha: pdfTexto(prazoFolhaFm(s.entrada)),
      alteradaEm: dataHora(s.atualizadaEm),
      datas: linhas.filter((l) => l.id !== "arquivo").flatMap((l) => l.id === "fechamento" && s.entrada.blocos
        ? fechamentosFm(s.entrada).map((f) => ({
          variavel: pdfTexto(f.rotulo.toUpperCase()), referencia: `${formatarPrazo(f.dias)} dias após o Arquivo`, data: f.data,
          prazo: pdfTexto(`${formatarPrazo(f.dias)} dias desde o Arquivo ${f.arquivo.slice(0, 5)}`),
        }))
        : [{
          variavel: l.rotulo.toUpperCase(),
          referencia: l.somaAoArquivo ? `${formatarPrazo(l.dia)} dias após o Arquivo` : `dia ${formatarPrazo(l.dia)}`,
          data: `${l.data}${l.ajustado ? " *" : ""}`,
          prazo: pdfTexto(`${formatarPrazo(l.diasBase)} ${Math.abs(l.diasBase) === 1 ? "dia" : "dias"} desde o ${l.base}`),
        }]),
      impactos: avaliarImpactosFm(s.entrada).map((i) => ({ variavel: i.rotulo, dias: pdfTexto(formatarPrazo(i.dias)), situacao: i.status, nivel: i.nivel, descricao: pdfTexto(i.descricao) })),
      ...(s.entrada.blocos ? { blocos: blocosDaPagina(s) } : {}),
    };
  });
}

function blocosDaPagina(s: SimulacaoFm): NonNullable<PaginaCenarioFm["blocos"]> {
  const blocos = blocosRedeFm(s.entrada), hospital = hospitalBeneFm(s.entrada);
  const linha = (bloco: string, b: { de: string; ate: string; dias: number; arquivo: string }) => ({ bloco, periodo: `${b.de} a ${b.ate}`, dias: `${formatarPrazo(b.dias)} dias`, arquivo: b.arquivo });
  if (beneNoBlocoFm(s.entrada)) return {
    contexto: `Período simulado em blocos, com o ${PARTES_BLOCOS_FM.hospital} entrando nos blocos: todos os credenciados enviam o arquivo em ${blocos.length} blocos, com Arquivo no dia seguinte ao fim de cada bloco. Datas e Impactos seguem o Arquivo do cenário.`,
    partes: [{ titulo: `Parte 1 — ${PARTES_BLOCOS_FM.todos}`, linhas: blocos.map((b) => linha(`Bloco ${b.bloco}`, b)) }],
  };
  return {
    contexto: `Período simulado em blocos. Parte 1: os ${PARTES_BLOCOS_FM.outros} enviam o arquivo em ${blocos.length} blocos, com Arquivo no dia seguinte ao fim de cada bloco. Parte 2: o ${PARTES_BLOCOS_FM.hospital} envia o Período geral, com Arquivo na data limite do cenário (${hospital.arquivo}). Datas e Impactos seguem o Arquivo do cenário.`,
    partes: [
      { titulo: `Parte 1 — ${PARTES_BLOCOS_FM.outros}`, linhas: blocos.map((b) => linha(`Bloco ${b.bloco}`, b)) },
      { titulo: `Parte 2 — ${PARTES_BLOCOS_FM.hospital}`, linhas: [linha("Período geral", hospital)] },
    ],
  };
}

type RGB = [number, number, number];
// Tintas escuras para continuar legível impresso em preto e branco; a situação vem sempre escrita, a cor só acompanha.
const TINTA: RGB = [26, 46, 79], TEXTO: RGB = [0, 0, 0], SECUNDARIO: RGB = [38, 38, 38], LINHA: RGB = [74, 85, 104], CARTAO: RGB = [238, 242, 247], ZEBRA: RGB = [245, 247, 250];
const MARCADOR: Record<NivelImpactoFm, RGB> = { ideal: [46, 179, 92], aceito: [214, 168, 18], moderado: [247, 129, 22], critico: [220, 38, 38] };

const MM_PT = 0.3528;
/** Escalas tentadas, da maior para a menor: cada cenário usa a maior com que cabe inteiro numa página A4 (pedido de 18/11/2026). */
export const ESCALAS_CENARIO_FM = Array.from({ length: 26 }, (_, i) => Math.round((1 - i * 0.02) * 100) / 100);

/** Desenha um cenário a partir da página atual de `doc`, com fontes, alturas e espaços multiplicados por `k`. */
function desenharCenario(doc: jsPDF, p: PaginaCenarioFm, totalCenarios: number, gerado: string, k: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const mL = 18, mR = 18, top = 42, w = pageW - mL - mR, right = pageW - mR;
  const fs = (n: number) => n * k;
  let y = top;
  doc.setFont("helvetica", "bold"); doc.setFontSize(fs(16)); doc.setTextColor(...TINTA);
  doc.text("Simulação de Datas FM", mL, y + 5 * k);
  doc.setFont("helvetica", "normal"); doc.setFontSize(fs(10)); doc.setTextColor(...SECUNDARIO);
  doc.text(`Laboratory · Lista de Simulações · ${p.titulo} de ${totalCenarios}${p.blocos ? ` · ${EM_BLOCOS_FM}` : ""}`, mL, y + 11 * k);
  doc.setDrawColor(...TINTA); doc.setLineWidth(0.6); doc.line(mL, y + 14 * k, right, y + 14 * k);
  y += 21 * k;

  // Cenário e dados de entrada
  doc.setFont("helvetica", "bold"); doc.setFontSize(fs(13)); doc.setTextColor(...TINTA);
  const nome = doc.splitTextToSize(`${p.titulo}: ${p.cenario}`, w) as string[];
  doc.text(nome, mL, y + 4 * k); y += nome.length * 5.6 * k + 3 * k;
  const campos: [string, string][] = [["Competência", p.competencia], ["Arquivo", p.arquivo], ["Período", p.periodo], ["Prazo", p.prazoFolha]];
  const ch = 17 * k, gap = 3, cw = (w - gap * 3) / 4;
  campos.forEach(([r, v], i) => {
    const x = mL + i * (cw + gap);
    doc.setFillColor(...CARTAO); doc.setDrawColor(...LINHA); doc.setLineWidth(0.3); doc.roundedRect(x, y, cw, ch, 2, 2, "FD");
    doc.setFont("helvetica", "bold"); doc.setFontSize(fs(8.5)); doc.setTextColor(...SECUNDARIO); doc.text(r.toUpperCase(), x + 3, y + 5.5 * k);
    doc.setTextColor(...TINTA); let f = fs(11); doc.setFontSize(f); while (f > 6 && doc.getTextWidth(v) > cw - 6) doc.setFontSize((f -= 0.5));
    doc.text(v, x + 3, y + ch - 4.5 * k);
  });
  y += ch + 8 * k;

  const pad = 2 * k;
  const tabela = (titulo: string, head: string[], body: RowInput[], extra: Parameters<typeof autoTable>[1]) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(fs(11)); doc.setTextColor(...TINTA); doc.text(titulo, mL, y);
    autoTable(doc, {
      startY: y + 2.5 * k, margin: { left: mL, right: mR, top, bottom: 25 }, head: [head], body, theme: "grid", rowPageBreak: "avoid",
      styles: { font: "helvetica", fontSize: fs(10), cellPadding: { top: pad, bottom: pad, left: 3, right: 3 }, textColor: TEXTO, lineColor: LINHA, lineWidth: 0.15, valign: "middle" },
      headStyles: { fillColor: TINTA, textColor: [255, 255, 255], fontStyle: "bold", lineColor: TINTA },
      alternateRowStyles: { fillColor: ZEBRA }, tableLineColor: TINTA, tableLineWidth: 0.4, ...extra,
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 9 * k;
  };
  if (p.blocos) {
    // Simulação em blocos (pedido de 18/11/2026): texto de contexto + o mesmo quadro da tela, antes das Datas (mesma ordem da tela).
    doc.setFont("helvetica", "normal"); doc.setFontSize(fs(9.5)); doc.setTextColor(...TEXTO);
    const ctx = doc.splitTextToSize(pdfTexto(p.blocos.contexto), w) as string[];
    doc.text(ctx, mL, y, { lineHeightFactor: 1.3 }); y += ctx.length * fs(9.5) * MM_PT * 1.3 + 4 * k;
    const corpo: RowInput[] = p.blocos.partes.flatMap((pt) => [
      [{ content: pt.titulo.toUpperCase(), colSpan: 4, styles: { fontStyle: "bold", fillColor: CARTAO, textColor: TINTA, fontSize: fs(8.5) } }],
      ...pt.linhas.map((l) => [l.bloco, l.periodo, l.dias, l.arquivo]),
    ]);
    tabela("Simulação em blocos", ["BLOCO", "PERÍODO", "DIAS", "ARQUIVO"], corpo, {
      alternateRowStyles: {},
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 38 }, 2: { halign: "right", cellWidth: 25 }, 3: { halign: "right", fontStyle: "bold", cellWidth: 32 } },
    });
  }
  tabela("Datas", ["VARIÁVEL", "REFERÊNCIA", "DATA", "PRAZO"], p.datas.map((d) => [d.variavel, d.referencia, d.data, d.prazo]), {
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 32 }, 1: { cellWidth: 48 }, 2: { halign: "right", cellWidth: 30 } },
  });
  const q = 2.8 * k;
  tabela("Impactos", ["VARIÁVEL", "DIAS", "SITUAÇÃO", "DESCRIÇÃO"], p.impactos.map((i) => [i.variavel, i.dias, i.situacao, i.descricao]), {
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 35 }, 1: { halign: "right", cellWidth: 15 }, 2: { fontStyle: "bold", cellWidth: 30, cellPadding: { top: pad, bottom: pad, left: 7, right: 3 } } },
    didDrawCell: (d) => {
      const nivel = p.impactos[d.row.index]?.nivel;
      if (d.section !== "body" || d.column.index !== 2 || !nivel) return;
      doc.setFillColor(...MARCADOR[nivel]); doc.setDrawColor(...LINHA); doc.setLineWidth(0.2);
      doc.rect(d.cell.x + 2.2, d.cell.y + d.cell.height / 2 - q / 2, q, q, "FD");
    },
  });

  doc.setFont("helvetica", "italic"); doc.setFontSize(fs(8.5)); doc.setTextColor(...SECUNDARIO);
  doc.text(`Cenário alterado em ${p.alteradaEm} · Gerado em ${gerado}${p.datas.some((d) => d.data.endsWith("*")) ? " · * dia limitado ao último dia do mês" : ""}`, mL, y - 9 * k + 4);
}

/** Maior escala com que o cenário cabe numa única página (medido num documento descartável); a menor como último recurso. */
export function escalaCenarioFm(p: PaginaCenarioFm, totalCenarios = 1): number {
  for (const k of ESCALAS_CENARIO_FM) {
    const rascunho = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    desenharCenario(rascunho, p, totalCenarios, "00/00/0000, 00:00:00", k);
    if (rascunho.getNumberOfPages() === 1) return k;
  }
  return ESCALAS_CENARIO_FM[ESCALAS_CENARIO_FM.length - 1];
}

export function buildCenariosFmPdf(timbrado: string | null, lista: SimulacaoFm[], o: { marcaAxis?: string | null; geradoEm?: Date } = {}): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  attachTimbrado(doc, timbrado, { semRazaoSocial: true });
  const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
  const right = pageW - 18;
  const gerado = (o.geradoEm ?? new Date()).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const paginas = paginasCenariosFm(lista);
  // Uma página por cenário, inclusive "Em blocos" (pedido de 18/11/2026): cada um na maior escala que cabe inteira na folha.
  paginas.forEach((p, idx) => {
    if (idx > 0) doc.addPage();
    desenharCenario(doc, p, paginas.length, gerado, escalaCenarioFm(p, paginas.length));
  });

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...SECUNDARIO);
    doc.text(`Página ${i} de ${total}`, right, pageH - 16, { align: "right" });
  }
  aplicarMarcaAxis(doc, o.marcaAxis ?? null, (_p, w2, h) => ({ x: w2 / 2, y: TIMBRADO_RAZAO_SOCIAL.linha * (h / 297), align: "center" }), 7.5);
  return doc;
}
