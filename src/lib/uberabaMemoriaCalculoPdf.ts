import { aplicarMarcaAxis } from "@/lib/pdfMarcaAxis";
import jsPDF from "jspdf";
import autoTable, { type Styles } from "jspdf-autotable";
import { attachTimbrado, TIMBRADO_RAZAO_SOCIAL } from "@/lib/pdfTimbrado";
import { drawSectionTitle } from "@/lib/pdfTheme";
import { textoPdf } from "@/lib/uberabaPropostaComercialPdf";
import {
  baseDespesaDos, premissaDespesa, BASES_DESPESA, inteiroSimulacao, numeroSimulacao, parametrosMemoriaCalculo, percentualSimulacao, relatorioMemoriaCalculo, type CenarioAgenciamento,
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
export function buildMemoriaCalculoPdf(timbradoDataUrl: string | null, cenarios: CenarioAgenciamento[], nomes: string[], geradoEm = new Date(), marcaAxis: string | null = null): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  attachTimbrado(doc, timbradoDataUrl, { semRazaoSocial: true });
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
      // Linha da tabela nunca se divide entre páginas (contas mês a mês ocupam várias linhas).
      rowPageBreak: "avoid",
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
  const rotuloDespesa = BASES_DESPESA.find(b => b.id === baseDespesaDos(cenarios))!.rotulo.toLowerCase();
  doc.text(textoPdf(`Agenciamento ${bases} · despesas por ${rotuloDespesa} · gerado em ${data}`), pageW / 2, y + 3 + alturaLinha(F.texto), { align: "center" });
  y += 8 + alturaLinha(F.texto);

  // 1. Parâmetros.
  const parametros = parametrosMemoriaCalculo(cenarios, nomes);
  secao("1. Parâmetros da simulação");
  paragrafo("Valores de cada modalidade usados nas contas abaixo, conforme as tabelas de Resultados Comerciais e as variáveis digitadas na Simulação de resultados.");
  const soma = (f: (x: (typeof parametros)[number]) => number) => parametros.reduce((s, x) => s + f(x), 0);
  const vidasTotal = soma(x => x.vidas);
  const direita = (de: number, ate: number) => Object.fromEntries(Array.from({ length: ate - de + 1 }, (_, k) => [de + k, { halign: "right" as const }]));
  // Mesma ordem da tela: percentuais, depois vidas e variáveis, depois os valores por vida/mês.
  tabela(
    ["Modalidade", ...cenarios.map(c => `Agenciamento ${c.rotulo.toLowerCase()}`), "% Equipe própria", "% Agenc. próprio"],
    parametros.map(x => [x.modalidade, ...x.agenciamentos.map(p), p(x.equipePropria), p(x.agencProprio)]),
    { colunas: { 0: { fontStyle: "bold", halign: "left", cellWidth: 30 }, ...direita(1, cenarios.length + 2) }, fonte: 9 },
  );
  garantir(alturaTabela(parametros.length + 2));
  tabela(
    ["Modalidade", "Taxa de adesão", "OPERADORA", "ADMINISTRADORA", "AGENCIADORA"],
    parametros.map(x => [x.modalidade, p(x.adesao), p(x.bensaude), p(x.lancers), p(x.siga)]),
    { colunas: { 0: { fontStyle: "bold", halign: "left", cellWidth: 30 }, ...direita(1, 4) }, fonte: 9 },
  );
  garantir(alturaTabela(parametros.length + 2));
  tabela(
    ["Modalidade", "Vidas", "Vendas", "Sinistralidade", "Desp. assist. média", "% Copart"],
    parametros.map(x => [x.modalidade, inteiroSimulacao(x.vidas), n(x.vendas), p(x.sinistralidade), n(x.despesaMedia), p(x.copart)]),
    {
      foot: ["Total", inteiroSimulacao(vidasTotal), n(soma(x => x.vendas)), "", "", ""],
      colunas: { 0: { fontStyle: "bold", halign: "left" }, ...direita(1, 5) },
      fonte: 9,
    },
  );
  // Valores por vida/mês: totais ponderados pelas vidas de cada modalidade.
  const ponderada = (f: (x: (typeof parametros)[number]) => number) => n(vidasTotal ? soma(x => f(x) * x.vidas) / vidasTotal : 0);
  garantir(alturaTabela(parametros.length + 3));
  tabela(
    ["Modalidade", "Mensalidade média", "Net média (mensalidade × OPERADORA)", "Copart. (% Copart × Desp. assist. média)", "Receitas (Net média + Copart.)"],
    parametros.map(x => [x.modalidade, n(x.mensalidadeMedia), n(x.netMedia), n(x.copartVida), { content: n(x.receitas), styles: { fontStyle: "bold" } }]),
    {
      foot: ["Total (média ponderada pelas vidas)", n(vidasTotal ? soma(x => x.vendas) / vidasTotal : 0), ponderada(x => x.netMedia), ponderada(x => x.copartVida), ponderada(x => x.receitas)],
      colunas: { 0: { fontStyle: "bold", halign: "left" }, ...direita(1, 4) },
      fonte: 9,
    },
  );
  // Nota inteira na mesma página.
  const notaParametros = "Vendas = 1ª mensalidade (Enfermaria por faixa etária) de cada vida vendida no ano. Mensalidade média = Vendas ÷ Vidas. OPERADORA, ADMINISTRADORA e AGENCIADORA = participação de cada uma no faturamento. Desp. assist. média = valor por vida/mês, base da coparticipação (% Copart sobre ela) e, na chave Média Assist., da despesa assistencial. Net média = Mensalidade média × Participação OPERADORA; Copart. = Desp. assist. média × % Copart; Receitas = Net média + Copart. (valores em R$ por vida/mês).";
  garantir(linhasDe(notaParametros, F.tabela) * alturaLinha(F.tabela) + 2);
  paragrafo(notaParametros, F.tabela, SECUNDARIO, "italic");

  // 2 a 5. Um tópico por ente.
  type Indicador = ReturnType<typeof relatorioMemoriaCalculo>[number]["indicadores"][number];
  // Linhas extras das contas longas (mês a mês) na coluna Cálculo, cerca de 60% da largura útil.
  const linhasExtras = (ind: Indicador) => ind.itens.reduce((t, it) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(F.tabela);
    return t + Math.max(0, (doc.splitTextToSize(textoPdf(it.calculo), usableW * 0.6 - 3) as string[]).length - 1);
  }, 0);
  const alturaIndicador = (ind: Indicador) => alturaLinha(F.indicador) + 1 + linhasDe(ind.formula, F.texto) * alturaLinha(F.texto) + 1.5 + alturaTabela(ind.itens.length + 1 + (ind.itens.length > 1 ? 1 : 0)) + linhasExtras(ind) * F.tabela * 0.3528 * 1.15;
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
          colunas: Object.fromEntries(Array.from({ length: cols }, (_, i) => [i, i === 0 ? { halign: "left", fontStyle: "bold", cellWidth: 19 } : { halign: "right" }])),
          // Quadros com muitas colunas (OPERADORA com Agenc. Externo e Próprio) em fonte menor, para os valores não quebrarem.
          fonte: cols > 7 ? 7.5 : undefined,
        },
      );
      if (mensal.colunas.includes("Vidas acumuladas")) paragrafo("Total de Vidas acumuladas = vidas projetadas acumuladas no fim de dezembro.", F.tabela, SECUNDARIO, "italic");
    }
  });

  // 6. Premissas.
  secao("6. Premissas");
  [
    `Agenciamento Externo: (100% − % Equipe Própria) × percentual ${bases} dos Indicadores variáveis × uma mensalidade de cada venda, pago no mês da venda; custo da OPERADORA e receita da ADMINISTRADORA no PCA e no PME ADM. (03 a 29 vidas) e da AGENCIADORA nas demais modalidades. Os indicadores que dependem dele aparecem uma vez para cada percentual.`,
    "Agenciamento Próprio: % Equipe Própria × % Agenc. Próprio × uma mensalidade de cada venda, igual nos dois cenários; custo da OPERADORA com a equipe própria, sem passar pela AGENCIADORA. Total Agenciamento = Externo + Próprio.",
    "Faturamento cumulativo de janeiro a dezembro, sem cancelamentos ou reajustes. Acomodação: Enfermaria.",
    "Distribuição etária: %CART fornecido em 26/10/2026, aplicado às quatro modalidades.",
    "Taxa de adesão paga pelo beneficiário diretamente à AGENCIADORA.",
    premissaDespesa(baseDespesaDos(cenarios)),
    "Coparticipação = vidas projetadas acumuladas em cada mês × Desp. assist. média × % Copart; o ano soma os valores mensais, não as vidas; paga pelo beneficiário e 100% da OPERADORA.",
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
  // A marca do AXIS ocupa o lugar da razão social do timbrado.
  aplicarMarcaAxis(doc, marcaAxis, (_p, w, h) => ({ x: w / 2, y: TIMBRADO_RAZAO_SOCIAL.linha * (h / 297), align: "center" }), 7.5);
  return doc;
}
