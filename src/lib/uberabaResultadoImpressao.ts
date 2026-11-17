/**
 * Impressão do Resultado por Ente (Simulação de resultados, Proj. Uberaba): uma folha por cenário (Contratual e Promocional),
 * cada uma com os parâmetros das tabelas (% sobre a Referência e % Spread), os parâmetros da simulação e os quadros dos entes.
 * Pedido de 17/11/2026: os quadros dos entes sempre mostram duas colunas, despesas por Percentual e por Média Assist.,
 * qualquer que seja a chave na tela. Tudo vem de simularPorBase e dos quadros da tela (ENTES_RESULTADO), sem fórmulas próprias.
 */
import jsPDF from "jspdf";
import autoTable, { type Styles } from "jspdf-autotable";
import { aplicarMarcaAxis } from "@/lib/pdfMarcaAxis";
import { attachTimbrado, TIMBRADO_RAZAO_SOCIAL } from "@/lib/pdfTimbrado";
import { textoPdf } from "@/lib/uberabaPropostaComercialPdf";
import { MODELO_INDICADORES, type IndicadoresPorFrente, type Indices } from "@/lib/uberabaTabelasComerciais";
import {
  BASES_DESPESA, ENTES_RESULTADO, FRENTE_DO_PRODUTO, inteiroSimulacao, numeroSimulacao, parametrosMemoriaCalculo, percentualSimulacao, premissaDespesa, resumoSimulacao,
  simularPorBase, type BaseDespesa, type CenarioAgenciamento, type ConfigSimulacao,
} from "@/lib/uberabaSimulacao";

export type LinhaTabelaResultado = { modalidade: string; sobreReferencia: number; spread: number; spreadPara: "ADMINISTRADORA" | "AGENCIADORA"; agenciamento: number; adesao: number; operadora: number };
export type PaginaResultado = {
  rotulo: string;
  tabelas: LinhaTabelaResultado[];
  parametros: ReturnType<typeof parametrosMemoriaCalculo>;
  /** Bases da despesa, na ordem das colunas dos quadros (Percentual, Média Assist.). */
  bases: { id: BaseDespesa; rotulo: string }[];
  /** `valores` na ordem de `bases`. */
  entes: { titulo: string; linhas: { label: string; valores: number[]; destaque: boolean }[] }[];
};

/** Cenários Contratual e Promocional calculados em cada base da despesa, com os mesmos parâmetros da tela. */
export function cenariosPorBaseDespesa(configuracoes: ConfigSimulacao[], indices: Indices, indicadores: IndicadoresPorFrente): Record<BaseDespesa, CenarioAgenciamento[]> {
  return Object.fromEntries(BASES_DESPESA.map((b) => [b.id, simularPorBase(configuracoes, indices, indicadores, b.id)])) as Record<BaseDespesa, CenarioAgenciamento[]>;
}

/** Uma página por cenário, na ordem da tela (Contratual, Promocional). Percentuais das tabelas em fração (0,95 = 95%). */
export function paginasResultado(porBase: Record<BaseDespesa, CenarioAgenciamento[]>, nomes: string[], indices: Indices, indicadores: IndicadoresPorFrente): PaginaResultado[] {
  return porBase.percentual.map((c, ci) => {
    const parametros = parametrosMemoriaCalculo([c], nomes);
    const totais = BASES_DESPESA.map((b) => resumoSimulacao(porBase[b.id][ci].resultados));
    return {
      rotulo: c.rotulo,
      tabelas: c.resultados.map((r, i) => {
        const id = FRENTE_DO_PRODUTO[r.config.produto_codigo];
        return {
          modalidade: nomes[i] ?? r.config.produto_codigo,
          sobreReferencia: indices[id] / 100,
          spread: indicadores[id].spread / 100,
          spreadPara: MODELO_INDICADORES[id] === "vitalicio" ? "AGENCIADORA" : "ADMINISTRADORA",
          agenciamento: r.condicao.agenciamento_parcela_1,
          adesao: r.condicao.taxa_adesao,
          operadora: r.condicao.participacao_bensaude,
        };
      }),
      parametros,
      bases: BASES_DESPESA,
      entes: ENTES_RESULTADO.map((e) => ({ titulo: e.titulo, linhas: e.linhas.map((l) => ({ label: l.label, valores: totais.map((t) => l.valor(t)), destaque: !!l.destaque })) })),
    };
  });
}

type RGB = [number, number, number];
const TINTA: RGB = [10, 38, 72];
const TEXTO: RGB = [0, 0, 0];
const SECUNDARIO: RGB = [38, 38, 38];
const LINHA: RGB = [74, 85, 104];
const CABECALHO: RGB = [214, 226, 238];
const DESTAQUE: RGB = [228, 234, 241];
const NEGATIVO: RGB = [150, 20, 20];
const n = numeroSimulacao;
const p = percentualSimulacao;

/** A4 retrato, uma folha por cenário, com timbrado e marca do AXIS (documento interno), cores escuras para preto e branco. */
export function buildResultadoImpressaoPdf(timbrado: string | null, marca: string | null, paginas: PaginaResultado[], geradoEm = new Date()): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  attachTimbrado(doc, timbrado, { semRazaoSocial: true });
  const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
  const mL = 16, mR = 16, right = pageW - mR, w = pageW - mL - mR;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fim = () => (doc as any).lastAutoTable.finalY as number;
  const estilos = (fonte: number) => ({
    theme: "grid" as const,
    styles: { font: "helvetica" as const, fontSize: fonte, cellPadding: 1.2, textColor: TEXTO, lineColor: LINHA, lineWidth: 0.2, valign: "middle" as const, halign: "right" as const },
    headStyles: { fillColor: CABECALHO, textColor: TINTA, fontStyle: "bold" as const, halign: "center" as const, lineColor: LINHA, lineWidth: 0.3 },
    footStyles: { fillColor: DESTAQUE, textColor: TINTA, fontStyle: "bold" as const, lineColor: LINHA, lineWidth: 0.3 },
    tableLineColor: TINTA, tableLineWidth: 0.4,
  });
  const subtitulo = (t: string, y: number) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(...TINTA);
    doc.text(textoPdf(t.toUpperCase()), mL, y);
    doc.setDrawColor(...TINTA); doc.setLineWidth(0.4); doc.line(mL, y + 1.5, right, y + 1.5);
    return y + 4;
  };
  const col0: Partial<Styles> = { halign: "left", fontStyle: "bold" };
  const fundo = (d: boolean): RGB | false => (d ? DESTAQUE : false);

  paginas.forEach((pg, pi) => {
    if (pi > 0) doc.addPage();
    let y = 43;
    doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...TINTA);
    doc.text(textoPdf(`RESULTADO POR ENTE · ${pg.rotulo.toUpperCase()}`), pageW / 2, y, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...SECUNDARIO);
    doc.text(textoPdf(`Bensaúde|Uberaba · Simulação de resultados · agenciamento ${pg.rotulo.toLowerCase()} · despesas por percentual e por média assist.`), pageW / 2, y + 5, { align: "center" });
    y += 11;

    y = subtitulo("Parâmetros das tabelas", y);
    autoTable(doc, {
      ...estilos(8.5), startY: y, margin: { left: mL, right: mR },
      head: [["Modalidade", "% sobre Referência", "% Spread", "Spread atribuído à", `Agenciamento ${pg.rotulo.toLowerCase()}`, "Taxa de adesão", "OPERADORA"]],
      body: pg.tabelas.map((t) => [t.modalidade, p(t.sobreReferencia), p(t.spread), { content: t.spreadPara, styles: { halign: "center" as const } }, p(t.agenciamento), p(t.adesao), p(t.operadora)]),
      columnStyles: { 0: col0 },
    });
    y = fim() + 5;

    y = subtitulo("Parâmetros da simulação", y);
    const par = pg.parametros;
    const vidas = par.reduce((s, x) => s + x.vidas, 0);
    const pond = (f: (x: (typeof par)[number]) => number) => n(vidas ? par.reduce((s, x) => s + f(x) * x.vidas, 0) / vidas : 0);
    autoTable(doc, {
      ...estilos(7.6), startY: y, margin: { left: mL, right: mR },
      head: [["Modalidade", "Vidas", "% Equipe Própria", "% Agenc. Próprio", "Sinistra- lidade", "Desp. Assist. média", "% Copart", "Mensal. média", "Net média", "Copart.", "Receitas"]],
      body: par.map((x) => [x.modalidade, inteiroSimulacao(x.vidas), p(x.equipePropria), p(x.agencProprio), p(x.sinistralidade), n(x.despesaMedia), p(x.copart), n(x.mensalidadeMedia), n(x.netMedia), n(x.copartVida), { content: n(x.receitas), styles: { fontStyle: "bold" as const } }]),
      foot: [[{ content: "Total", styles: { halign: "left" as const } }, { content: inteiroSimulacao(vidas), styles: { halign: "right" as const } }, "", "", "", "", "",
        { content: n(vidas ? par.reduce((s, x) => s + x.vendas, 0) / vidas : 0), styles: { halign: "right" as const } },
        { content: pond((x) => x.netMedia), styles: { halign: "right" as const } }, { content: pond((x) => x.copartVida), styles: { halign: "right" as const } }, { content: pond((x) => x.receitas), styles: { halign: "right" as const } }]],
      showFoot: "lastPage",
      columnStyles: { 0: { ...col0, cellWidth: 19 } },
    });
    y = fim() + 2;
    doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(...SECUNDARIO);
    for (const l of doc.splitTextToSize(textoPdf("Valores em R$ por vida/mês. Net média = Mensalidade média × OPERADORA; Copart. = Desp. Assist. média × % Copart; Receitas = Net média + Copart.; Total = média ponderada pelas vidas."), w) as string[]) { y += 3.2; doc.text(l, mL, y); }
    y += 5;

    y = subtitulo("Resultado por ente (anual, R$)", y);
    const gap = 6, cw = (w - gap) / 2;
    let linhaY = y, proxima = y;
    pg.entes.forEach((e, i) => {
      const col = i % 2;
      if (col === 0 && i > 0) linhaY = proxima + 4;
      const x = mL + col * (cw + gap);
      autoTable(doc, {
        startY: linhaY, margin: { left: x, right: pageW - x - cw }, tableWidth: cw,
        ...estilos(7.8),
        head: [[{ content: e.titulo, colSpan: 1 + pg.bases.length, styles: { halign: "center" as const, fontSize: 9.5 } }],
          [{ content: "Indicador", styles: { halign: "left" as const, fontSize: 7.4 } }, ...pg.bases.map((b) => ({ content: textoPdf(`Despesa ${b.rotulo}`), styles: { fontSize: 7.4 } }))]],
        body: e.linhas.map((l) => [
          { content: textoPdf(l.label), styles: { halign: "left" as const, fontStyle: l.destaque ? ("bold" as const) : ("normal" as const), fillColor: fundo(l.destaque) } },
          ...l.valores.map((v) => ({ content: n(v), styles: { fontStyle: l.destaque ? ("bold" as const) : ("normal" as const), fillColor: fundo(l.destaque), textColor: v < 0 ? NEGATIVO : TEXTO } })),
        ]),
        columnStyles: { 1: { cellWidth: 24 }, 2: { cellWidth: 24 } },
      });
      proxima = Math.max(proxima, fim());
    });
    y = proxima + 5;
    doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(...SECUNDARIO);
    const notas = [...pg.bases.map((b) => premissaDespesa(b.id)), "Faturamento cumulativo de janeiro a dezembro, sem cancelamentos ou reajustes; acomodação Enfermaria. Simulação de proposta comercial, não aprovação ou resultado realizado."];
    for (const t of notas) for (const l of doc.splitTextToSize(textoPdf(t), w) as string[]) { doc.text(l, mL, y); y += 3.2; }
  });

  const total = doc.getNumberOfPages();
  const data = `${geradoEm.toLocaleDateString("pt-BR")} ${geradoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...SECUNDARIO);
    doc.text(`Gerado em ${data}`, mL, pageH - 16);
    doc.text(`Página ${i} de ${total}`, right, pageH - 16, { align: "right" });
  }
  aplicarMarcaAxis(doc, marca, (_p, pw, h) => ({ x: pw / 2, y: TIMBRADO_RAZAO_SOCIAL.linha * (h / 297), align: "center" }), 7.5);
  return doc;
}
