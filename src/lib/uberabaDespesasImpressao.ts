/**
 * Relatório das Despesas Assistenciais (Simulação de resultados, Proj. Uberaba), pedido de 17/11/2026:
 * duas folhas, uma com a despesa calculada por PERCENTUAL (faturamento × Sinistralidade) e outra por MÉDIA ASSIST.
 * (vidas projetadas acumuladas × Desp. Assist. média), sempre nessa ordem, qualquer que seja a chave na tela.
 * Os números vêm de simularPorBase com os mesmos parâmetros, índices e indicadores da tela, para a folha nunca recalcular por conta própria.
 */
import jsPDF from "jspdf";
import autoTable, { type Styles } from "jspdf-autotable";
import { aplicarMarcaAxis } from "@/lib/pdfMarcaAxis";
import { attachTimbrado, TIMBRADO_RAZAO_SOCIAL } from "@/lib/pdfTimbrado";
import { textoPdf } from "@/lib/uberabaPropostaComercialPdf";
import type { IndicadoresPorFrente, Indices } from "@/lib/uberabaTabelasComerciais";
import {
  BASES_DESPESA, consolidarSimulacao, ENTES_RESULTADO, fontesSimulacao, inteiroSimulacao, numeroSimulacao, percentualSimulacao, premissaDespesa,
  resumoSimulacao, simularPorBase, sinistralidadePadrao, type BaseDespesa, type ConfigSimulacao,
} from "@/lib/uberabaSimulacao";

export type LinhaDespesaModalidade = {
  modalidade: string; vidas: number; vidasMes: number; sinistralidadeInformada: number; despesaMediaInformada: number;
  faturamento: number; coparticipacao: number; despesa: number; sinistralidadeResultante: number; despesaVidaMes: number;
};
export type LinhaDespesaMes = { mes: string; acumuladas: number; faturamento: number; coparticipacao: number; despesa: number; sinistralidade: number };
export type PaginaDespesa = {
  base: BaseDespesa; rotulo: string; premissa: string;
  modalidades: LinhaDespesaModalidade[]; total: LinhaDespesaModalidade;
  mensal: LinhaDespesaMes[];
  /** Quadro da OPERADORA (onde a despesa entra), com Contratual e Promocional lado a lado. */
  operadora: { label: string; destaque: boolean; valores: number[] }[];
  cenarios: string[];
};

const razao = (a: number, b: number) => (b ? a / b : 0);

/** Uma página por base da despesa: Percentual e depois Média Assist. */
export function paginasDespesas(configuracoes: ConfigSimulacao[], indices: Indices, indicadores: IndicadoresPorFrente, nomes: string[]): PaginaDespesa[] {
  const operadora = ENTES_RESULTADO.find((e) => e.titulo === "OPERADORA")!;
  return BASES_DESPESA.map((b) => {
    const cenarios = simularPorBase(configuracoes, indices, indicadores, b.id);
    const resultados = cenarios[0].resultados; // a despesa não depende do agenciamento
    const modalidades = resultados.map((r, i): LinhaDespesaModalidade => {
      const vidasMes = r.mensal.reduce((s, m) => s + m.acumuladas, 0);
      return {
        modalidade: nomes[i] ?? r.config.produto_codigo, vidas: r.config.total_vidas, vidasMes,
        sinistralidadeInformada: (r.config.sinistralidade_percentual ?? sinistralidadePadrao) / 100,
        despesaMediaInformada: r.config.despesa_media ?? 0,
        faturamento: r.anual.faturamento, coparticipacao: r.anual.coparticipacao, despesa: r.anual.despesa_assistencial,
        sinistralidadeResultante: razao(r.anual.despesa_assistencial, r.anual.faturamento),
        despesaVidaMes: razao(r.anual.despesa_assistencial, vidasMes),
      };
    });
    const soma = (k: keyof LinhaDespesaModalidade) => modalidades.reduce((s, m) => s + (m[k] as number), 0);
    const vidasMes = soma("vidasMes"), faturamento = soma("faturamento"), despesa = soma("despesa");
    const total: LinhaDespesaModalidade = {
      modalidade: "Total", vidas: soma("vidas"), vidasMes,
      sinistralidadeInformada: razao(modalidades.reduce((s, m) => s + m.sinistralidadeInformada * m.faturamento, 0), faturamento),
      despesaMediaInformada: razao(modalidades.reduce((s, m) => s + m.despesaMediaInformada * m.vidasMes, 0), vidasMes),
      faturamento, coparticipacao: soma("coparticipacao"), despesa,
      sinistralidadeResultante: razao(despesa, faturamento), despesaVidaMes: razao(despesa, vidasMes),
    };
    const mensal = consolidarSimulacao(resultados).mensal.map((m, i) => ({
      mes: fontesSimulacao.meses[i]?.mes ?? String(i + 1), acumuladas: m.acumuladas, faturamento: m.faturamento,
      coparticipacao: m.coparticipacao, despesa: m.despesa_assistencial, sinistralidade: razao(m.despesa_assistencial, m.faturamento),
    }));
    const resumos = cenarios.map((c) => resumoSimulacao(c.resultados));
    return {
      base: b.id, rotulo: b.rotulo, premissa: premissaDespesa(b.id), modalidades, total, mensal,
      operadora: operadora.linhas.map((l) => ({ label: l.label, destaque: !!l.destaque, valores: resumos.map((r) => l.valor(r)) })),
      cenarios: cenarios.map((c) => c.rotulo),
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

/** A4 retrato, uma folha por base da despesa, com timbrado e marca do AXIS (documento interno), cores escuras para preto e branco. */
export function buildDespesasImpressaoPdf(timbrado: string | null, marca: string | null, paginas: PaginaDespesa[], geradoEm = new Date()): jsPDF {
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
    footStyles: { fillColor: DESTAQUE, textColor: TINTA, fontStyle: "bold" as const, halign: "right" as const, lineColor: LINHA, lineWidth: 0.3 },
    tableLineColor: TINTA, tableLineWidth: 0.4,
  });
  const subtitulo = (t: string, y: number) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(...TINTA);
    doc.text(textoPdf(t.toUpperCase()), mL, y);
    doc.setDrawColor(...TINTA); doc.setLineWidth(0.4); doc.line(mL, y + 1.5, right, y + 1.5);
    return y + 4;
  };
  const nota = (t: string, y: number) => {
    doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor(...SECUNDARIO);
    for (const l of doc.splitTextToSize(textoPdf(t), w) as string[]) { y += 3.2; doc.text(l, mL, y); }
    return y;
  };
  const col0: Partial<Styles> = { halign: "left", fontStyle: "bold" };
  const esq = { halign: "left" as const };
  const fundo = (d: boolean): RGB | false => (d ? DESTAQUE : false);

  paginas.forEach((pg, pi) => {
    if (pi > 0) doc.addPage();
    let y = 43;
    doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...TINTA);
    doc.text(textoPdf(`DESPESAS ASSISTENCIAIS · ${pg.rotulo.toUpperCase()}`), pageW / 2, y, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...SECUNDARIO);
    doc.text(textoPdf(`Bensaúde|Uberaba · Simulação de resultados · despesas calculadas por ${pg.rotulo.toLowerCase()}`), pageW / 2, y + 5, { align: "center" });
    y += 9;
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...TEXTO);
    for (const l of doc.splitTextToSize(textoPdf(pg.premissa), w) as string[]) { y += 4; doc.text(l, mL, y); }
    y += 7;

    y = subtitulo("Despesa por modalidade (anual, R$)", y);
    const usada = pg.base === "media" ? "Desp. Assist. média (usada)" : "Sinistralidade (usada)";
    const outra = pg.base === "media" ? "Sinistralidade (informada, não entra)" : "Desp. Assist. média (informada, não entra)";
    const linha = (m: LinhaDespesaModalidade) => {
      const usadaV = pg.base === "media" ? n(m.despesaMediaInformada) : p(m.sinistralidadeInformada);
      const outraV = pg.base === "media" ? p(m.sinistralidadeInformada) : n(m.despesaMediaInformada);
      return [m.modalidade, inteiroSimulacao(m.vidas), inteiroSimulacao(m.vidasMes), usadaV, outraV, n(m.faturamento), n(m.despesa), p(m.sinistralidadeResultante), n(m.despesaVidaMes)];
    };
    const t = pg.total;
    autoTable(doc, {
      ...estilos(7.8), startY: y, margin: { left: mL, right: mR },
      head: [["Modalidade", "Vidas vendidas", "Vidas-mês", usada, outra, "Faturamento", "Despesa Assistencial", "Sinistralidade resultante", "Despesa vida/mês"]],
      body: pg.modalidades.map(linha),
      foot: [[{ content: "Total", styles: esq }, inteiroSimulacao(t.vidas), inteiroSimulacao(t.vidasMes), "", "", n(t.faturamento), n(t.despesa), p(t.sinistralidadeResultante), n(t.despesaVidaMes)]],
      columnStyles: { 0: { ...col0, cellWidth: 19 }, 6: { fontStyle: "bold" } },
    });
    y = nota("Vidas-mês = soma das vidas projetadas acumuladas em cada mês. Sinistralidade resultante = Despesa ÷ Faturamento; Despesa vida/mês = Despesa ÷ Vidas-mês.", fim() + 1) + 7;

    y = subtitulo("Evolução mensal consolidada (R$)", y);
    const tm = pg.mensal.reduce((s, m) => ({ faturamento: s.faturamento + m.faturamento, coparticipacao: s.coparticipacao + m.coparticipacao, despesa: s.despesa + m.despesa }), { faturamento: 0, coparticipacao: 0, despesa: 0 });
    autoTable(doc, {
      ...estilos(7.8), startY: y, margin: { left: mL, right: mR },
      head: [["Mês", "Vidas acumuladas", "Faturamento", "Coparticipação", "Despesa Assistencial", "Sinistralidade do mês"]],
      body: pg.mensal.map((m) => [m.mes, inteiroSimulacao(m.acumuladas), n(m.faturamento), n(m.coparticipacao), n(m.despesa), p(m.sinistralidade)]),
      foot: [[{ content: "Ano", styles: esq }, inteiroSimulacao(pg.mensal.at(-1)?.acumuladas ?? 0), n(tm.faturamento), n(tm.coparticipacao), n(tm.despesa), p(razao(tm.despesa, tm.faturamento))]],
      columnStyles: { 0: col0, 4: { fontStyle: "bold" } },
    });
    y = fim() + 5;

    y = subtitulo("Resultado da OPERADORA (anual, R$)", y);
    autoTable(doc, {
      ...estilos(8.4), startY: y, margin: { left: mL, right: mR },
      head: [["Indicador", ...pg.cenarios.map((c) => `Agenciamento ${c.toLowerCase()}`)]],
      body: pg.operadora.map((l) => [
        { content: textoPdf(l.label), styles: { halign: "left" as const, fontStyle: l.destaque ? ("bold" as const) : ("normal" as const), fillColor: fundo(l.destaque) } },
        ...l.valores.map((v) => ({ content: n(v), styles: { fontStyle: l.destaque ? ("bold" as const) : ("normal" as const), fillColor: fundo(l.destaque), textColor: v < 0 ? NEGATIVO : TEXTO } })),
      ]),
    });
    nota("Faturamento cumulativo de janeiro a dezembro, sem cancelamentos ou reajustes; acomodação Enfermaria. Coparticipação = vidas acumuladas × Desp. Assist. média × % Copart, igual nas duas bases. Simulação de proposta comercial, não aprovação ou resultado realizado.", fim() + 1);
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
