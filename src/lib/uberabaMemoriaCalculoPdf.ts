import jsPDF from "jspdf";
import autoTable, { type Styles } from "jspdf-autotable";
import { attachTimbrado } from "@/lib/pdfTimbrado";
import { drawSectionTitle } from "@/lib/pdfTheme";
import { textoPdf } from "@/lib/uberabaPropostaComercialPdf";
import {
  inteiroSimulacao, numeroSimulacao, parametrosMemoriaCalculo, percentualSimulacao, relatorioMemoriaCalculo, type CenarioAgenciamento,
} from "@/lib/uberabaSimulacao";

type RGB = [number, number, number];
// Tinta escura para continuar legível impresso em preto e branco (fontes, linhas e contornos).
const TINTA: RGB = [10, 38, 72];
const TEXTO: RGB = [0, 0, 0];
const SECUNDARIO: RGB = [38, 38, 38];
const LINHA: RGB = [74, 85, 104];
const CABECALHO: RGB = [214, 226, 238];
const ZEBRA: RGB = [242, 245, 248];
const DESTAQUE: RGB = [228, 234, 241];

export const FONTES_MEMORIA = { titulo: 15, secao: 13, indicador: 11.5, texto: 11, tabela: 9.5, rodape: 9 };
const F = FONTES_MEMORIA;
const alturaLinha = (pt: number) => pt * 0.3528 * 1.35;
const n = numeroSimulacao;
const p = percentualSimulacao;

/** Título do relatório e seções, na ordem em que aparecem no PDF. */
export function topicosMemoriaCalculo(cenarios: CenarioAgenciamento[], nomes: string[]) {
  return ["1. Parâmetros da simulação", ...relatorioMemoriaCalculo(cenarios, nomes).map((e, i) => `${i + 2}. ${e.titulo}`), "6. Premissas"];
}

/**
 * Relatório com a memória de cálculo detalhada do Resultado por Ente (Simulação de resultados),
 * gerado com os cenários que estão na tela (Contratual e Promocional): parâmetros, cada indicador com fórmula e contas
 * por modalidade, e a evolução mensal consolidada de cada ente. Só o que depende do Agenciamento aparece em dobro.
 */
export function buildMemoriaCalculoPdf(timbradoDataUrl: string | null, cenarios: CenarioAgenciamento[], nomes: string[], geradoEm = new Date()): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  attachTimbrado(doc, timbradoDataUrl);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 18, marginR = 18, top = 42, bottom = 25;
  const usableW = pageW - marginL - marginR;
  const right = pageW - marginR;
  let y = top;
  const novaPagina = () => { doc.addPage(); y = top; };
  const garantir = (h: number) => { if (y + h > pageH - bottom) novaPagina(); };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fimTabela = () => ((doc as any).lastAutoTable?.finalY as number | undefined) ?? y;

  const paragrafo = (texto: string, tamanho = F.texto, cor: RGB = TEXTO, estilo: "normal" | "italic" = "normal") => {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tamanho);
    doc.setTextColor(...cor);
    const lh = alturaLinha(tamanho);
    for (const linha of doc.splitTextToSize(textoPdf(texto), usableW) as string[]) {
      garantir(lh);
      doc.text(linha, marginL, y + lh * 0.75);
      y += lh;
    }
    y += 1.5;
  };
  const secao = (titulo: string) => {
    garantir(24);
    y += 3;
    drawSectionTitle(doc, titulo, marginL, y + 4, right, TINTA, F.secao);
    y += 10;
  };
    /** Altura estimada (mm) de uma tabela com `linhas` linhas de uma só linha de texto, para não dividi-la entre páginas. */
  const alturaTabela = (linhas: number, fonte = F.tabela) => linhas * (fonte * 0.3528 * 1.15 + 2.8) + 5;
  /** Linhas que um texto ocupa na largura útil. */
  const linhasDe = (texto: string, tamanho: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(tamanho);
    return (doc.splitTextToSize(textoPdf(texto), usableW) as string[]).length;
  };
  const tabela = (head: string[], body: (string | { content: string; styles?: object })[][], opts: { foot?: string[]; colunas?: Record<number, Partial<Styles>>; fonte?: number } = {}) => {
    // O rodapé da tabela segue o alinhamento de cada coluna (columnStyles não vale para o rodapé).
    const foot = opts.foot?.map((c, i) => ({ content: c, styles: { halign: opts.colunas?.[i]?.halign ?? "left" } }));
    autoTable(doc, {
      startY: y,
      margin: { left: marginL, right: marginR, top, bottom },
      head: [head],
      body,
      foot: foot ? [foot] : undefined,
      showFoot: "lastPage",
      theme: "grid",
      styles: { font: "helvetica", fontSize: opts.fonte ?? F.tabela, cellPadding: 1.4, textColor: TEXTO, lineColor: LINHA, lineWidth: 0.2, valign: "middle" },
      headStyles: { fillColor: CABECALHO, textColor: TINTA, fontStyle: "bold", lineColor: LINHA, lineWidth: 0.3, halign: "center" },
      footStyles: { fillColor: DESTAQUE, textColor: TINTA, fontStyle: "bold", lineColor: LINHA, lineWidth: 0.3 },
      alternateRowStyles: { fillColor: ZEBRA },
      tableLineColor: TINTA,
      tableLineWidth: 0.4,
      columnStyles: opts.colunas,
    });
    y = fimTabela() + 4;
  };

  // Cabeçalho do relatório.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(F.titulo);
  doc.setTextColor(...TINTA);
  doc.text("MEMÓRIA DE CÁLCULO · RESULTADO POR ENTE", pageW / 2, y + 5, { align: "center" });
  y += 10;
  const data = geradoEm.toLocaleDateString("pt-BR") + " " + geradoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(F.texto);
  doc.setTextColor(...SECUNDARIO);
  const bases = cenarios.map(c => c.rotulo.toLowerCase()).join(" e ");
  // Duas linhas, para o subtítulo não passar das margens.
  doc.text(textoPdf("Bensaúde|Uberaba · Simulação de resultados"), pageW / 2, y + 3, { align: "center" });
  doc.text(textoPdf(`Agenciamento ${bases} · gerado em ${data}`), pageW / 2, y + 3 + alturaLinha(F.texto), { align: "center" });
  y += 8 + alturaLinha(F.texto);

  // 1. Parâmetros.
  const parametros = parametrosMemoriaCalculo(cenarios, nomes);
  secao("1. Parâmetros da simulação");
  paragrafo("Valores de cada modalidade usados nas contas abaixo, conforme as tabelas de Resultados Comerciais e as variáveis digitadas na Simulação de resultados.");
  const soma = (f: (x: (typeof parametros)[number]) => number) => parametros.reduce((s, x) => s + f(x), 0);
  const vidasTotal = soma(x => x.vidas);
  const direita = (de: number, ate: number) => Object.fromEntries(Array.from({ length: ate - de + 1 }, (_, k) => [de + k, { halign: "right" as const }]));
  tabela(
    ["Modalidade", "Vidas", "Mensalidade média", "Vendas", "Sinistralidade", "Desp. assist. média", "% Copart"],
    parametros.map(x => [x.modalidade, inteiroSimulacao(x.vidas), n(x.mensalidadeMedia), n(x.vendas), p(x.sinistralidade), n(x.despesaMedia), p(x.copart)]),
    {
      foot: ["Total", inteiroSimulacao(vidasTotal), n(vidasTotal ? soma(x => x.vendas) / vidasTotal : 0), n(soma(x => x.vendas)), "", "", ""],
      colunas: { 0: { fontStyle: "bold", halign: "left" }, ...direita(1, 6) },
      fonte: 9,
    },
  );
  // Percentuais em quadro próprio, para caber os nomes OPERADORA, ADMINISTRADORA e AGENCIADORA.
  garantir(alturaTabela(parametros.length + 2));
  tabela(
    ["Modalidade", ...cenarios.map(c => `Agenciamento ${c.rotulo.toLowerCase()}`), "Taxa de adesão", "OPERADORA", "ADMINISTRADORA", "AGENCIADORA"],
    parametros.map(x => [x.modalidade, ...x.agenciamentos.map(p), p(x.adesao), p(x.bensaude), p(x.lancers), p(x.siga)]),
    { colunas: { 0: { fontStyle: "bold", halign: "left", cellWidth: 22 }, ...direita(1, cenarios.length + 4), [cenarios.length + 3]: { halign: "right", cellWidth: 36 } }, fonte: 9 },
  );
  paragrafo("Vendas = 1ª mensalidade (Enfermaria por faixa etária) de cada vida vendida no ano. Mensalidade média = Vendas ÷ Vidas. OPERADORA, ADMINISTRADORA e AGENCIADORA = participação de cada uma no faturamento. Desp. assist. média = referência por vida/mês e base da coparticipação (% Copart sobre ela).", F.tabela, SECUNDARIO, "italic");

  // 2 a 5. Um tópico por ente.
  type Indicador = ReturnType<typeof relatorioMemoriaCalculo>[number]["indicadores"][number];
  const alturaIndicador = (ind: Indicador) => alturaLinha(F.indicador) + 1 + linhasDe(ind.formula, F.texto) * alturaLinha(F.texto) + 1.5 + alturaTabela(ind.itens.length + 1 + (ind.itens.length > 1 ? 1 : 0));
  relatorioMemoriaCalculo(cenarios, nomes).forEach((ente, idx) => {
    // O título do ente nunca fica sozinho no fim da página: vai junto com o primeiro indicador.
    garantir(13 + alturaIndicador(ente.indicadores[0]));
    secao(`${idx + 2}. ${ente.titulo}`);
    for (const ind of ente.indicadores) {
      // Indicador inteiro (título, fórmula e contas) na mesma página.
      garantir(alturaIndicador(ind));
      doc.setFont("helvetica", "bold");
      doc.setFontSize(F.indicador);
      doc.setTextColor(...TINTA);
      const lh = alturaLinha(F.indicador);
      // Só o nome do indicador; o valor aparece uma única vez, na linha "Indicador" do quadro (pedido de 13/11/2026).
      // Indicadores com Agenciamento aparecem em dobro, identificados pelo cenário (Contratual ou Promocional).
      doc.text(textoPdf(ind.base ? `${ind.label} · ${ind.base}` : ind.label), marginL, y + lh * 0.75);
      y += lh + 1;
      paragrafo(ind.formula, F.texto, SECUNDARIO);
      const varias = ind.itens.length > 1;
      tabela(
        ["Modalidade", "Cálculo", "Valor"],
        ind.itens.map(it => [it.modalidade, textoPdf(it.calculo), n(it.valor)]),
        {
          foot: varias ? ["Indicador", "", n(ind.valor)] : undefined,
          colunas: { 0: { cellWidth: 26, fontStyle: "bold" }, 1: { halign: "left" }, 2: { cellWidth: 32, halign: "right" } },
        },
      );
      y += 1;
    }
    // Evolução mensal consolidada do ente (uma por cenário quando tem Agenciamento), com o título, sempre inteira na mesma página.
    const fmt = (v: number, inteiro: boolean) => (inteiro ? inteiroSimulacao(v) : n(v));
    for (const mensal of ente.mensais) {
      garantir(alturaLinha(F.indicador) + 1.5 + alturaTabela(mensal.linhas.length + 2));
      doc.setFont("helvetica", "bold");
      doc.setFontSize(F.indicador);
      doc.setTextColor(...TINTA);
      const titulo = `Evolução mensal · ${ente.titulo}${mensal.base ? ` · ${mensal.base}` : ""} (quatro modalidades somadas)`;
      doc.text(textoPdf(titulo), marginL, y + alturaLinha(F.indicador) * 0.75);
      y += alturaLinha(F.indicador) + 1.5;
      const cols = mensal.colunas.length;
      tabela(
        mensal.colunas,
        mensal.linhas.map(l => [l.mes, ...l.valores.map((v, i) => fmt(v, mensal.inteiros[i]))]),
        {
          foot: ["Total do ano", ...mensal.total.map((v, i) => fmt(v, mensal.inteiros[i]))],
          colunas: Object.fromEntries(Array.from({ length: cols }, (_, i) => [i, i === 0 ? { halign: "left", fontStyle: "bold" } : { halign: "right" }])),
        },
      );
      if (mensal.colunas.includes("Vidas acumuladas")) paragrafo("Total de Vidas acumuladas = carteira no fim de dezembro.", F.tabela, SECUNDARIO, "italic");
    }
  });

  // 6. Premissas.
  secao("6. Premissas");
  [
    `Agenciamento: percentual ${bases} dos Indicadores variáveis × uma mensalidade de cada venda, pago no mês da venda. Os indicadores que dependem dele aparecem uma vez para cada percentual.`,
    "Faturamento cumulativo de janeiro a dezembro, sem cancelamentos ou reajustes. Acomodação: Enfermaria.",
    "Distribuição etária: %CART fornecido em 26/10/2026, aplicado às quatro modalidades.",
    "Taxa de adesão paga pelo beneficiário diretamente à AGENCIADORA.",
    "Coparticipação = vidas na carteira em cada mês × Desp. assist. média × % Copart; paga pelo beneficiário e 100% da OPERADORA. A despesa assistencial continua = faturamento × Sinistralidade.",
    "Simulação de proposta comercial, não aprovação ou resultado realizado.",
  ].forEach(t => paragrafo(`- ${t}`));

  // Rodapé: "Página X de Y" em todas as páginas.
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(F.rodape);
    doc.setTextColor(...SECUNDARIO);
    doc.text(`Página ${i} de ${total}`, right, pageH - 16, { align: "right" });
  }
  return doc;
}
