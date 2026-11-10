// Home › Evolução Produtos: vidas ativas no último dia de cada mês.
// Regra de ativo = "Ativos em" (carteira_trial_geo / carteira_evolucao_mensal, view_ecarteira).
// Tipo de produto (carteira_evolucao_produtos): Fácil 50 = plano MV 168–173; demais pela recuperação
// (CONVENCIONAL / COPARTICIPACAO) da vigência mais recente da matrícula.

import { DEFASAGEM_DESPESAS_MESES } from "./sinistralidadeCompetencias";

export type AnoMes = { ano: number; mes: number };
/** Primeiro mês que a tela aceita (início do cálculo de vidas na carteira). */
export const INICIO_EVOLUCAO_PRODUTOS: AnoMes = { ano: 2019, mes: 1 };

const idxMes = (a: AnoMes) => a.ano * 12 + (a.mes - 1);
const deIdx = (i: number): AnoMes => ({ ano: Math.floor(i / 12), mes: (i % 12) + 1 });

/** Período inicial: os 12 meses até o último mês com despesas completas (mês atual − defasagem, em UTC). */
export function periodoPadrao(hoje: Date): { de: AnoMes; ate: AnoMes } {
  const ate = hoje.getUTCFullYear() * 12 + hoje.getUTCMonth() - DEFASAGEM_DESPESAS_MESES;
  return { de: deIdx(ate - 11), ate: deIdx(ate) };
}

/** "AAAA-MM" (valor do campo de mês) → AnoMes; inválido → null. */
export function lerAnoMes(v: string): AnoMes | null {
  const m = /^(\d{4})-(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const ano = Number(m[1]), mes = Number(m[2]);
  return mes >= 1 && mes <= 12 ? { ano, mes } : null;
}
export const anoMesCampo = (a: AnoMes) => `${a.ano}-${String(a.mes).padStart(2, "0")}`;

/** Mensagem de erro do filtro De/Até, ou null quando o período é válido. */
export function validarPeriodo(de: AnoMes | null, ate: AnoMes | null, hoje: Date): string | null {
  if (!de || !ate) return "Informe De e Até no formato mm/aaaa.";
  if (idxMes(de) > idxMes(ate)) return "O mês De deve ser anterior ou igual ao mês Até.";
  if (idxMes(de) < idxMes(INICIO_EVOLUCAO_PRODUTOS)) return "A base começa em 01/2019.";
  if (idxMes(ate) > hoje.getUTCFullYear() * 12 + hoje.getUTCMonth()) return "O mês Até não pode ser posterior ao mês atual.";
  return null;
}

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export type MesEvolucao = { ano: number; mes: number; dataFim: string; rotulo: string };

/** Meses do período (inclusivo), com o último dia do mês em UTC. */
export function mesesPeriodo(de: { ano: number; mes: number }, ate: { ano: number; mes: number }): MesEvolucao[] {
  const out: MesEvolucao[] = [];
  let a = de.ano, m = de.mes;
  while (a < ate.ano || (a === ate.ano && m <= ate.mes)) {
    out.push({
      ano: a,
      mes: m,
      dataFim: new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10),
      rotulo: `${MESES[m - 1]}/${String(a).slice(2)}`,
    });
    m += 1;
    if (m > 12) { m = 1; a += 1; }
  }
  return out;
}

export const TIPOS_PLANO = ["PIF", "PCA", "PCE"] as const;
export type TipoPlano = (typeof TIPOS_PLANO)[number];

type Num = number | string | null | undefined;
export type LinhaMensal = { ano: number; mes: number; total: Num; pif?: Num; pca?: Num; pce?: Num };

const num = (v: Num) => (v == null ? null : Number(v));

/** Junta as vidas por ano/mês aos meses do período; meses ou tipos sem dado ficam null (sem inferência). */
export function vidasPorMes(meses: MesEvolucao[], linhas: LinhaMensal[]) {
  const idx = new Map(linhas.map((l) => [`${l.ano}-${l.mes}`, l]));
  return meses.map((m) => {
    const l = idx.get(`${m.ano}-${m.mes}`);
    const porTipo: Record<TipoPlano, number | null> = { PIF: num(l?.pif), PCA: num(l?.pca), PCE: num(l?.pce) };
    return { ...m, vidas: num(l?.total), porTipo };
  });
}

export const TIPOS_PRODUTO = [
  { id: "CONV", rotulo: "Convencional", descricao: "Integral, sem coparticipação" },
  { id: "F50", rotulo: "Fácil 50", descricao: "Planos MV 168 a 173" },
  { id: "COP", rotulo: "Outros coparticipativos", descricao: "Com coparticipação, fora do Fácil 50" },
] as const;
export type TipoProduto = (typeof TIPOS_PRODUTO)[number]["id"];

export type LinhaProduto = { ano: number; mes: number; sigla: string; produto: string; vidas: Num };

type LinhaGrade = { ano: number; mes: number; sigla: string | null; produto: string | null; valor: Num };

/** Grade tipo de plano × tipo de produto por mês; mês sem linha fica null, combinação ausente em mês com dado = 0. */
function gradePorMes(meses: MesEvolucao[], linhas: LinhaGrade[]) {
  const idx = new Map<string, number>();
  const comDado = new Set<string>();
  const fora = new Map<string, number>();
  const siglas = new Set<string>(TIPOS_PLANO);
  const produtos = new Set<string>(TIPOS_PRODUTO.map((p) => p.id));
  for (const l of linhas) {
    const mes = `${Number(l.ano)}-${Number(l.mes)}`;
    comDado.add(mes);
    const sg = String(l.sigla ?? "").trim().toUpperCase();
    const pr = String(l.produto ?? "").trim().toUpperCase();
    const v = Number(l.valor) || 0;
    if (!siglas.has(sg) || !produtos.has(pr)) { fora.set(mes, (fora.get(mes) ?? 0) + v); continue; }
    const k = `${mes}|${sg}|${pr}`;
    idx.set(k, (idx.get(k) ?? 0) + v);
  }
  return meses.map((m) => {
    const chave = `${m.ano}-${m.mes}`;
    const tem = comDado.has(chave);
    const valores = {} as Record<TipoPlano, Record<TipoProduto, number | null>>;
    for (const t of TIPOS_PLANO) {
      valores[t] = {} as Record<TipoProduto, number | null>;
      for (const p of TIPOS_PRODUTO) valores[t][p.id] = tem ? idx.get(`${chave}|${t}|${p.id}`) ?? 0 : null;
    }
    return { ...m, valores, foraDosTotais: fora.get(chave) ?? 0 };
  });
}

/**
 * Vidas por tipo de plano e tipo de produto em cada mês. Mês sem nenhuma linha fica null (sem inferência);
 * em mês calculado, combinação ausente significa zero vidas.
 */
export function produtosPorMes(meses: MesEvolucao[], linhas: LinhaProduto[]): GradeComTotais[] {
  return comTotais(gradePorMes(meses, linhas.map((l) => ({ ano: l.ano, mes: l.mes, sigla: l.sigla, produto: l.produto, valor: l.vidas }))));
}

// Indicadores financeiros (evolucao_produtos_financeiro, view_eard_mensal):
// Receita = vl_rec_cpp; Coparticipação = vl_rec_copart + vl_rec_outros; Total Receitas = Receita + Coparticipação;
// Despesas = seis colunas de despesa; Saldo = Total Receitas − Despesas;
// Sinistralidade = Despesas ÷ Total Receitas, sempre como razão das somas (nunca soma de percentuais).
export type LinhaFinanceira = {
  nr_ano: number; nr_mes: number; sigla: string | null; produto: string | null;
  rec_cpp: Num; rec_copart: Num; rec_outros: Num; desp_total: Num; rec_total?: Num;
};
const n0 = (v: Num) => Number(v) || 0;
const coparticipacao = (l: LinhaFinanceira) => n0(l.rec_copart) + n0(l.rec_outros);
const totalReceitas = (l: LinhaFinanceira) => n0(l.rec_cpp) + coparticipacao(l);
export const INDICADORES_FINANCEIROS = {
  Receita: (l: LinhaFinanceira) => n0(l.rec_cpp),
  "Coparticipação": coparticipacao,
  "Total Receitas": totalReceitas,
  Despesas: (l: LinhaFinanceira) => n0(l.desp_total),
  Saldo: (l: LinhaFinanceira) => totalReceitas(l) - n0(l.desp_total),
} as const;
export type IndicadorFinanceiro = keyof typeof INDICADORES_FINANCEIROS | "Sinistralidade";

const gradeFin = (meses: MesEvolucao[], linhas: LinhaFinanceira[], valor: (l: LinhaFinanceira) => number) =>
  gradePorMes(meses, linhas.map((l) => ({ ano: l.nr_ano, mes: l.nr_mes, sigla: l.sigla, produto: l.produto, valor: valor(l) })));

/** Grade com subtotais por tipo e total geral prontos para exibição. */
export type GradeComTotais = ReturnType<typeof gradePorMes>[number] & {
  subtotais: Record<TipoPlano, number | null>; total: number | null;
};

/** Acrescenta subtotais (soma dos produtos) e total geral (soma dos tipos) a uma grade aditiva. */
export function comTotais(grade: ReturnType<typeof gradePorMes>): GradeComTotais[] {
  return grade.map((m) => ({
    ...m,
    subtotais: Object.fromEntries(TIPOS_PLANO.map((t) => [t, subtotalTipo(m.valores, t)])) as Record<TipoPlano, number | null>,
    total: totalGeral(m.valores),
  }));
}

const razao = (a: number | null, b: number | null) => (a == null || b == null || b === 0 ? null : a / b);

/**
 * Grade financeira por mês; valores fora de PIF/PCA/PCE ou sem produto ficam em foraDosTotais (sem inferência).
 * Sinistralidade (fração, 0,85 = 85%) divide Despesas por Total Receitas em cada célula, subtotal e total.
 */
export function financeiroPorMes(meses: MesEvolucao[], linhas: LinhaFinanceira[], indicador: IndicadorFinanceiro): GradeComTotais[] {
  if (indicador !== "Sinistralidade") return comTotais(gradeFin(meses, linhas, INDICADORES_FINANCEIROS[indicador]));
  const desp = comTotais(gradeFin(meses, linhas, INDICADORES_FINANCEIROS.Despesas));
  const rec = comTotais(gradeFin(meses, linhas, totalReceitas));
  return desp.map((d, i) => {
    const r = rec[i];
    const valores = {} as GradeComTotais["valores"];
    for (const t of TIPOS_PLANO) {
      valores[t] = {} as GradeComTotais["valores"][TipoPlano];
      for (const p of TIPOS_PRODUTO) valores[t][p.id] = razao(d.valores[t][p.id], r.valores[t][p.id]);
    }
    const subtotais = Object.fromEntries(TIPOS_PLANO.map((t) => [t, razao(d.subtotais[t], r.subtotais[t])])) as Record<TipoPlano, number | null>;
    return { ...d, valores, subtotais, total: razao(d.total, r.total), foraDosTotais: 0 };
  });
}

/** Indicadores que aceitam a chave Per capita (Receita até Saldo). */
export const INDICADORES_PER_CAPITA: readonly IndicadorFinanceiro[] = ["Receita", "Coparticipação", "Total Receitas", "Despesas", "Saldo"];

/**
 * Per capita: cada célula, subtotal e total dividido pelas vidas da mesma célula, subtotal e total do mês
 * (razão das somas). Sem vidas (null ou zero) fica null; nada é inferido.
 */
export function perCapita(valores: GradeComTotais[], vidas: GradeComTotais[]): GradeComTotais[] {
  const idx = new Map(vidas.map((v) => [`${v.ano}-${v.mes}`, v]));
  return valores.map((m) => {
    const v = idx.get(`${m.ano}-${m.mes}`);
    const out = {} as GradeComTotais["valores"];
    for (const t of TIPOS_PLANO) {
      out[t] = {} as GradeComTotais["valores"][TipoPlano];
      for (const p of TIPOS_PRODUTO) out[t][p.id] = razao(m.valores[t][p.id], v?.valores[t][p.id] ?? null);
    }
    const subtotais = Object.fromEntries(TIPOS_PLANO.map((t) => [t, razao(m.subtotais[t], v?.subtotais[t] ?? null)])) as Record<TipoPlano, number | null>;
    return { ...m, valores: out, subtotais, total: razao(m.total, v?.total ?? null), foraDosTotais: 0 };
  });
}

type ValoresMes = ReturnType<typeof gradePorMes>[number]["valores"];

/** Subtotal de um tipo de plano (soma dos três produtos); null quando o mês não tem dado. */
export function subtotalTipo(valores: ValoresMes, tipo: TipoPlano): number | null {
  const vs = TIPOS_PRODUTO.map((p) => valores[tipo][p.id]);
  return vs.some((v) => v == null) ? null : vs.reduce<number>((s, v) => s + (v as number), 0);
}

/** Total geral do mês (PIF + PCA + PCE); null quando o mês não tem dado. */
export function totalGeral(valores: ValoresMes): number | null {
  const vs = TIPOS_PLANO.map((t) => subtotalTipo(valores, t));
  return vs.some((v) => v == null) ? null : vs.reduce<number>((s, v) => s + (v as number), 0);
}
