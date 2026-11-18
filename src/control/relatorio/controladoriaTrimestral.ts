// Relatório de Controladoria a partir de Control › Demonstrações › DRE › Trimestral.
// Capítulos em quadros por trimestre fechado: 1. Vidas (PIF/PCA/PCE no fim do trimestre) e 2. DRE (resultado por trimestre).
// Usa o mesmo layout do Relatório de Controladoria (comporPdfRelatorio) e as linhas DRE já carregadas na tela.
import { hostinger } from "@/lib/hostingerClient";
import type { DreHRow } from "@/control/dreHostinger";
import { grupoPainelDre, resumoPainelDre } from "@/control/drePainel";
import { DRE_FULL_NAME } from "@/control/dreLabels";
import { mesesDoTrimestre, NOMES_MESES, periodoDre, rotuloTrimestre, trimestresFechados, type DreVisao } from "@/control/dreTrimestres";
import { dinheiro, numero, percentual } from "./controladoriaRegras";
import type { ControladoriaReport, ReportBlock } from "./controladoriaDados";

export const TIPOS_VIDAS = ["PIF", "PCA", "PCE"] as const;
export type VidasTipo = Record<(typeof TIPOS_VIDAS)[number], number>;

/** Último dia do trimestre (UTC), mesma regra de "Ativos em" da Carteira. */
export const fimTrimestre = (ano: number, t: number) => new Date(Date.UTC(ano, t * 3, 0)).toISOString().slice(0, 10);

/** Valores como na tela da DRE: duas casas e negativos entre parênteses. */
export const valorDre = (v: number) => {
  const s = Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return Math.abs(v) < 0.005 ? "0,00" : v < 0 ? `(${s})` : s;
};

/** Trimestre imediatamente anterior (o anterior ao 1T é o 4T do ano anterior): ponto de partida das vidas. */
export const trimestreAnterior = (ano: number, t: number) => (t > 1 ? { ano, t: t - 1 } : { ano: ano - 1, t: 4 });

async function vidasEm(data: string): Promise<VidasTipo> {
  const { data: linhasRpc, error } = await hostinger.rpc("carteira_trial_siglas", { p_data: data, p_q: null, p_empresa: null, p_cidade: null });
  if (error) throw new Error(error.message);
  const linhas = (Array.isArray(linhasRpc) ? linhasRpc : []) as { sigla: string; vidas: number }[];
  const g = (s: string) => Number(linhas.find((r) => r.sigla === s)?.vidas ?? 0);
  return { PIF: g("PIF"), PCA: g("PCA"), PCE: g("PCE") };
}

/** Vidas no fim do trimestre anterior ao período (início) e no fim de cada trimestre fechado. */
export async function carregarVidasTrimestres(ano: number, tris: number[]): Promise<{ inicio: VidasTipo; vidas: VidasTipo[] }> {
  const ant = trimestreAnterior(ano, tris[0]);
  const [inicio, ...vidas] = await Promise.all([fimTrimestre(ant.ano, ant.t), ...tris.map((t) => fimTrimestre(ano, t))].map(vidasEm));
  return { inicio, vidas };
}

const assinado = (v: number) => (v > 0 ? `+${numero(v)}` : numero(v));

/** Recuo das linhas expandidas no quadro do PDF. */
export const SUBITEM = "      ";

const totalVidas = (v: VidasTipo) => v.PIF + v.PCA + v.PCE;

/** Mensal (Relatório › Relatório de Controladoria): último dia do mês (UTC) e o mês anterior (o anterior a janeiro é dezembro do ano anterior). */
export const fimMes = (ano: number, m: number) => new Date(Date.UTC(ano, m, 0)).toISOString().slice(0, 10);
export const mesAnterior = (ano: number, m: number) => (m > 1 ? { ano, m: m - 1 } : { ano: ano - 1, m: 12 });
export const rotuloMes = (m: number, ano: number) => `${NOMES_MESES[m - 1]}/${ano}`;

/** Colunas do relatório: cada mês realizado (Mensal) ou trimestre fechado (Trimestral), mais o ponto de partida das vidas. */
export type PeriodoRelatorio = { rotulo: string; meses: number[]; fim: string };
export type PeriodosRelatorio = { visao: DreVisao; inicio: { rotulo: string; fim: string }; periodos: PeriodoRelatorio[] };
export function periodosRelatorio(visao: DreVisao, ano: number, meses: number[]): PeriodosRelatorio {
  if (visao === "Trimestral") {
    const tris = trimestresFechados(meses);
    const ant = tris.length ? trimestreAnterior(ano, tris[0]) : trimestreAnterior(ano, 1);
    return { visao, inicio: { rotulo: rotuloTrimestre(ant.t, ant.ano), fim: fimTrimestre(ant.ano, ant.t) }, periodos: tris.map((t) => ({ rotulo: rotuloTrimestre(t, ano), meses: mesesDoTrimestre(t), fim: fimTrimestre(ano, t) })) };
  }
  const ms = [...meses].sort((a, b) => a - b);
  const ant = mesAnterior(ano, ms[0] ?? 1);
  return { visao, inicio: { rotulo: rotuloMes(ant.m, ant.ano), fim: fimMes(ant.ano, ant.m) }, periodos: ms.map((m) => ({ rotulo: rotuloMes(m, ano), meses: [m], fim: fimMes(ano, m) })) };
}

/** Vidas no ponto de partida e no último dia de cada coluna. */
export async function carregarVidasPeriodos(p: PeriodosRelatorio): Promise<{ inicio: VidasTipo; vidas: VidasTipo[] }> {
  const [inicio, ...vidas] = await Promise.all([p.inicio.fim, ...p.periodos.map((x) => x.fim)].map(vidasEm));
  return { inicio, vidas };
}

export function montarRelatorioTrimestral(o: { ano: number; tris: number[]; rows: DreHRow[]; vidasInicio: VidasTipo; vidas: VidasTipo[]; generatedAt?: string }): ControladoriaReport {
  const { ano, tris } = o;
  if (!tris.length) throw new Error(`Ainda não há trimestre fechado em ${ano}.`);
  return montarRelatorioPeriodos({ ...o, periodos: periodosRelatorio("Trimestral", ano, tris.flatMap(mesesDoTrimestre)) });
}

/** Textos que mudam entre as visões; o resto do relatório é o mesmo. */
const TEXTOS = {
  Trimestral: {
    coluna: "trimestre", colunas: "trimestres", cadaColuna: "cada trimestre fechado", porColuna: "Por trimestre", variacao: "Variação no trimestre", prep: "no",
    dreIntro: "Resultado por trimestre fechado conforme Control › Demonstrações › DRE (visão Trimestral), a partir do balancete MV e do plano de contas 9D.",
    dreNota: "Somente trimestres fechados (1T jan–mar, 2T abr–jun, 3T jul–set, 4T out–dez). Os valores são movimentos do período, não saldos de encerramento.",
    fonteVidas: "carteira_trial_siglas (vidas ativas no último dia do trimestre)", subtitulo: ["Visão trimestral", "Vidas e resultado"], semPeriodo: "trimestre fechado",
  },
  Mensal: {
    coluna: "mês", colunas: "meses", cadaColuna: "cada mês realizado", porColuna: "Por mês", variacao: "Variação no mês", prep: "em",
    dreIntro: "Resultado por mês realizado conforme Control › Demonstrações › DRE (visão Mensal), a partir do balancete MV e do plano de contas 9D.",
    dreNota: "Meses realizados conforme o critério das Demonstrações: de janeiro até o último mês em que as contas 41 superam R$ 20 milhões. Os valores são movimentos do mês, não saldos de encerramento.",
    fonteVidas: "carteira_trial_siglas (vidas ativas no último dia do mês)", subtitulo: ["Visão mensal", "Vidas e resultado"], semPeriodo: "mês realizado",
  },
} as const;

/** Monta o relatório (Vidas + DRE) para as colunas pedidas, Mensal ou Trimestral, com os mesmos quadros e textos nas duas visões. */
export function montarRelatorioPeriodos(o: { ano: number; periodos: PeriodosRelatorio; rows: DreHRow[]; vidasInicio: VidasTipo; vidas: VidasTipo[]; generatedAt?: string }): ControladoriaReport {
  const { ano, rows, vidas, vidasInicio } = o;
  const { visao, inicio, periodos } = o.periodos;
  const tx = TEXTOS[visao];
  if (!periodos.length) throw new Error(`Ainda não há ${tx.semPeriodo} em ${ano}.`);
  if (vidas.length !== periodos.length) throw new Error(`Vidas não correspondem aos ${tx.colunas}.`);
  const generatedAt = o.generatedAt ?? new Date().toISOString();
  const rotulos = periodos.map((p) => p.rotulo);
  const period = { de: `${ano}-${String(periodos[0].meses[0]).padStart(2, "0")}-01`, ate: periodos[periodos.length - 1].fim };
  const base = (id: string, title: string, sourceModule: ReportBlock["sourceModule"], sourceFunction: string): ReportBlock => ({ id, title, sourceModule, sourceFunction, period: { ...period }, generatedAt, status: "available", introduction: "", cards: [], paragraphs: [], considerations: [] });
  const primeiro = rotulos[0], ultimo = rotulos[rotulos.length - 1];
  // Mensal: no PDF, quadros com no máximo 6 colunas de valores (a tela mostra o quadro inteiro).
  const colunasPorQuadro = visao === "Mensal" ? 6 : undefined;

  // 1. Vidas ativas no último dia de cada coluna, por tipo de produto.
  const vidasBlock = base("vidas", "1. Vidas", "AXIS", tx.fonteVidas);
  const inicioRot = inicio.rotulo;
  const serie = [vidasInicio, ...vidas];
  const totais = serie.map(totalVidas);
  const fim = vidas[vidas.length - 1], tFim = totais[totais.length - 1], tIni = totais[0];
  const variacao = (k: keyof VidasTipo) => fim[k] - vidasInicio[k];
  vidasBlock.introduction = `Número de vidas ativas por tipo de produto no último dia de ${tx.cadaColuna}, conforme a regra de "Ativos em" da Carteira. ${visao === "Mensal" ? "Dezembro do ano anterior" : `O ${inicioRot}`} é o ponto de partida: a variação de cada ${tx.coluna} e a do período são medidas a partir dele.`;
  vidasBlock.cards = [
    { label: `Início · ${inicioRot}`, value: numero(tIni) },
    { label: `Vidas ativas · ${ultimo}`, value: numero(tFim) },
    { label: `Variação ${inicioRot} a ${ultimo}`, value: `${assinado(tFim - tIni)} (${percentual(tIni ? (tFim - tIni) / tIni : null)})` },
  ];
  vidasBlock.table = {
    headers: ["Tipo de produto", `${inicioRot} (início)`, ...rotulos, "Variação"],
    rows: [
      ...TIPOS_VIDAS.map((k) => [k, ...serie.map((v) => numero(v[k])), assinado(variacao(k))]),
      ["Total", ...totais.map(numero), assinado(tFim - tIni)],
      [tx.variacao, "—", ...totais.slice(1).map((t, i) => assinado(t - totais[i])), assinado(tFim - tIni)],
    ],
    numeric: true, colunasPorQuadro,
  };
  vidasBlock.paragraphs = [
    `A carteira passou de ${numero(tIni)} vidas ativas ${tx.prep} ${inicioRot} para ${numero(tFim)} ${tx.prep} ${ultimo}, variação de ${assinado(tFim - tIni)} vidas (${percentual(tIni ? (tFim - tIni) / tIni : null)}).`,
    `${tx.porColuna}: ${rotulos.map((r, i) => `${r} ${assinado(totais[i + 1] - totais[i])}`).join("; ")}. Por tipo de produto, entre ${inicioRot} e ${ultimo}: ${TIPOS_VIDAS.map((k) => `${k} ${assinado(variacao(k))}`).join("; ")}.`,
  ];
  vidasBlock.considerations = ["PIF = Individual/Familiar; PCA = Coletivo por Adesão; PCE = Coletivo Empresarial. Suspensos permanecem nas vidas ativas."];

  // 2. DRE por coluna: mesmas linhas do Painel, colunas como a visão da tela (Mensal ou Trimestral).
  const dre = base("dre", `2. ${DRE_FULL_NAME}`, "CONTROL", "loadDreHostinger / demonstracoes_contabeis_oracle_mv + plano_contas_icontabil");
  const acumMeses = periodos.flatMap((p) => p.meses);
  const colunas = [...periodos.map((p) => p.meses), acumMeses];
  const doPeriodo = colunas.map((ms) => rows.filter((r) => r.ano === ano && ms.includes(r.mes)));
  const resumos = doPeriodo.map(resumoPainelDre);
  // Entradas Operacionais expandidas: Faturamento e Coparticipação (mesma classificação do Painel).
  const copart = doPeriodo.map((rs) => rs.reduce((t, r) => t + (grupoPainelDre(r) === "ent" && /COPART/i.test(r.g4) ? r.valor : 0), 0));
  const acum = resumos[resumos.length - 1];
  const pfat = (r: ReturnType<typeof resumoPainelDre>, x: number) => percentual(r.pctFat(x));
  dre.introduction = tx.dreIntro;
  dre.cards = [{ label: `Resultado Líquido · ${periodoDre(acumMeses, ano)}`, value: dinheiro(acum.liq) }, { label: "Margem líquida", value: pfat(acum, acum.liq) }, { label: "Faturamento", value: dinheiro(acum.fat) }];
  dre.table = {
    headers: ["Item (R$)", ...rotulos, periodoDre(acumMeses, ano)],
    rows: [
      ...acum.linhas.flatMap(([l], i) => [
        [l.replace(/−/g, "-"), ...resumos.map((r) => valorDre(r.linhas[i][1]))],
        ...(i === 0 ? [[`${SUBITEM}Faturamento`, ...resumos.map((r) => valorDre(r.fat))], [`${SUBITEM}Coparticipação`, ...copart.map(valorDre)]] : []),
      ]),
      ["Margem líquida (% fat.)", ...resumos.map((r) => pfat(r, r.liq))],
    ],
    numeric: true, colunasPorQuadro: visao === "Mensal" ? 4 : undefined,
  };
  const liqs = resumos.slice(0, -1).map((r) => r.liq);
  const melhor = liqs.indexOf(Math.max(...liqs));
  dre.paragraphs = [
    `O resultado líquido acumulado de ${periodoDre(acumMeses, ano)} foi de ${dinheiro(acum.liq)}, com margem líquida de ${pfat(acum, acum.liq)} sobre o faturamento de ${dinheiro(acum.fat)}.`,
    `${tx.porColuna}: ${rotulos.map((r, i) => `${r} ${dinheiro(liqs[i])}`).join("; ")}.${periodos.length > 1 ? ` O maior resultado líquido foi ${tx.prep} ${rotulos[melhor]}.` : ""}`,
  ];
  dre.considerations = [tx.dreNota];

  const blocks = [vidasBlock, dre];
  return {
    period, generatedAt, blocks,
    conclusions: blocks.map((b) => `${b.title.replace(/^\d+\. /, "")}: ${b.paragraphs[0]}`),
    capa: { subtitulo: [...tx.subtitulo], topicos: `Carteira · ${DRE_FULL_NAME} · ${primeiro}${periodos.length > 1 ? ` a ${ultimo}` : ""}`,
      // Capa com a logomarca do Bensaúde, não a do AXIS (pedido de 18/11/2026).
      logo: "bensaude" },
  };
}
