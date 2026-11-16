// Relatório de Controladoria a partir de Control › Demonstrações › DRE › Trimestral.
// Capítulos em quadros por trimestre fechado: 1. Vidas (PIF/PCA/PCE no fim do trimestre) e 2. DRE (resultado por trimestre).
// Usa o mesmo layout do Relatório de Controladoria (comporPdfRelatorio) e as linhas DRE já carregadas na tela.
import { hostinger } from "@/lib/hostingerClient";
import type { DreHRow } from "@/control/dreHostinger";
import { resumoPainelDre } from "@/control/drePainel";
import { DRE_FULL_NAME } from "@/control/dreLabels";
import { mesesDoTrimestre, periodoDre, rotuloTrimestre } from "@/control/dreTrimestres";
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

export async function carregarVidasTrimestres(ano: number, tris: number[]): Promise<VidasTipo[]> {
  return Promise.all(tris.map(async (t) => {
    const { data, error } = await hostinger.rpc("carteira_trial_siglas", { p_data: fimTrimestre(ano, t), p_q: null, p_empresa: null, p_cidade: null });
    if (error) throw new Error(error.message);
    const linhas = (Array.isArray(data) ? data : []) as { sigla: string; vidas: number }[];
    const g = (s: string) => Number(linhas.find((r) => r.sigla === s)?.vidas ?? 0);
    return { PIF: g("PIF"), PCA: g("PCA"), PCE: g("PCE") };
  }));
}

const totalVidas = (v: VidasTipo) => v.PIF + v.PCA + v.PCE;

export function montarRelatorioTrimestral(o: { ano: number; tris: number[]; rows: DreHRow[]; vidas: VidasTipo[]; generatedAt?: string }): ControladoriaReport {
  const { ano, tris, rows, vidas } = o;
  if (!tris.length) throw new Error(`Ainda não há trimestre fechado em ${ano}.`);
  if (vidas.length !== tris.length) throw new Error("Vidas não correspondem aos trimestres.");
  const generatedAt = o.generatedAt ?? new Date().toISOString();
  const rotulos = tris.map((t) => rotuloTrimestre(t, ano));
  const period = { de: `${ano}-${String(mesesDoTrimestre(tris[0])[0]).padStart(2, "0")}-01`, ate: fimTrimestre(ano, tris[tris.length - 1]) };
  const base = (id: string, title: string, sourceModule: ReportBlock["sourceModule"], sourceFunction: string): ReportBlock => ({ id, title, sourceModule, sourceFunction, period: { ...period }, generatedAt, status: "available", introduction: "", cards: [], paragraphs: [], considerations: [] });
  const primeiro = rotulos[0], ultimo = rotulos[rotulos.length - 1];

  // 1. Vidas ativas no último dia de cada trimestre, por tipo de produto.
  const vidasBlock = base("vidas", "1. Vidas", "AXIS", "carteira_trial_siglas (vidas ativas no último dia do trimestre)");
  const totais = vidas.map(totalVidas);
  const fim = vidas[vidas.length - 1], tFim = totais[totais.length - 1], tIni = totais[0];
  vidasBlock.introduction = "Número de vidas ativas por tipo de produto no último dia de cada trimestre fechado, conforme a regra de \"Ativos em\" da Carteira.";
  vidasBlock.cards = tris.length > 1
    ? [{ label: `Vidas ativas · ${primeiro}`, value: numero(tIni) }, { label: `Vidas ativas · ${ultimo}`, value: numero(tFim) }, { label: `Variação ${primeiro} a ${ultimo}`, value: numero(tFim - tIni) }]
    : [{ label: `Vidas ativas · ${ultimo}`, value: numero(tFim) }];
  vidasBlock.table = { headers: ["Tipo de produto", ...rotulos], rows: [...TIPOS_VIDAS.map((k) => [k, ...vidas.map((v) => numero(v[k]))]), ["Total", ...totais.map(numero)]], numeric: true };
  vidasBlock.paragraphs = tris.length > 1
    ? [`A carteira passou de ${numero(tIni)} vidas ativas no ${primeiro} para ${numero(tFim)} no ${ultimo}, variação de ${numero(tFim - tIni)} vidas (${percentual(tIni ? (tFim - tIni) / tIni : null)}).`,
       `Por tipo de produto, entre ${primeiro} e ${ultimo}: ${TIPOS_VIDAS.map((k) => `${k} de ${numero(vidas[0][k])} para ${numero(fim[k])}`).join("; ")}.`]
    : [`No ${ultimo}, a carteira tinha ${numero(tFim)} vidas ativas: ${TIPOS_VIDAS.map((k) => `${k} ${numero(fim[k])}`).join("; ")}.`];
  vidasBlock.considerations = ["PIF = Individual/Familiar; PCA = Coletivo por Adesão; PCE = Coletivo Empresarial. Suspensos permanecem nas vidas ativas."];

  // 2. DRE por trimestre: mesmas linhas do Painel, colunas como a visão Trimestral da tela.
  const dre = base("dre", `2. ${DRE_FULL_NAME}`, "CONTROL", "loadDreHostinger / demonstracoes_contabeis_oracle_mv + plano_contas_icontabil");
  const acumMeses = tris.flatMap(mesesDoTrimestre);
  const colunas = [...tris.map((t) => mesesDoTrimestre(t)), acumMeses];
  const resumos = colunas.map((ms) => resumoPainelDre(rows.filter((r) => r.ano === ano && ms.includes(r.mes))));
  const acum = resumos[resumos.length - 1];
  const pfat = (r: ReturnType<typeof resumoPainelDre>, x: number) => percentual(r.pctFat(x));
  dre.introduction = `Resultado por trimestre fechado conforme Control › Demonstrações › DRE (visão Trimestral), a partir do balancete MV e do plano de contas 9D.`;
  dre.cards = [{ label: `Resultado Líquido · ${periodoDre(acumMeses, ano)}`, value: dinheiro(acum.liq) }, { label: "Margem líquida", value: pfat(acum, acum.liq) }, { label: "Faturamento", value: dinheiro(acum.fat) }];
  dre.table = {
    headers: ["Item (R$)", ...rotulos, periodoDre(acumMeses, ano)],
    rows: [
      ["Faturamento", ...resumos.map((r) => valorDre(r.fat))],
      ...acum.linhas.map(([l], i) => [l.replace(/−/g, "-"), ...resumos.map((r) => valorDre(r.linhas[i][1]))]),
      ["Margem líquida (% fat.)", ...resumos.map((r) => pfat(r, r.liq))],
    ],
    numeric: true,
  };
  const liqs = resumos.slice(0, -1).map((r) => r.liq);
  const melhor = liqs.indexOf(Math.max(...liqs));
  dre.paragraphs = [
    `O resultado líquido acumulado de ${periodoDre(acumMeses, ano)} foi de ${dinheiro(acum.liq)}, com margem líquida de ${pfat(acum, acum.liq)} sobre o faturamento de ${dinheiro(acum.fat)}.`,
    `Por trimestre: ${rotulos.map((r, i) => `${r} ${dinheiro(liqs[i])}`).join("; ")}.${tris.length > 1 ? ` O maior resultado líquido foi no ${rotulos[melhor]}.` : ""}`,
  ];
  dre.considerations = ["Somente trimestres fechados (1T jan–mar, 2T abr–jun, 3T jul–set, 4T out–dez). Os valores são movimentos do período, não saldos de encerramento."];

  const blocks = [vidasBlock, dre];
  return {
    period, generatedAt, blocks,
    conclusions: blocks.map((b) => `${b.title.replace(/^\d+\. /, "")}: ${b.paragraphs[0]}`),
    capa: { subtitulo: ["Visão trimestral", "Vidas e resultado"], topicos: `Carteira · ${DRE_FULL_NAME} · ${primeiro}${tris.length > 1 ? ` a ${ultimo}` : ""}` },
  };
}
