// Home › Evolução Produtos: vidas ativas no último dia de cada mês.
// Regra de ativo = "Ativos em" (carteira_trial_geo / carteira_evolucao_mensal, view_ecarteira).
// Tipo de produto (carteira_evolucao_produtos): Fácil 50 = plano MV 168–173; demais pela recuperação
// (CONVENCIONAL / COPARTICIPACAO) da vigência mais recente da matrícula.

export const PERIODO_EVOLUCAO_PRODUTOS = { de: { ano: 2025, mes: 10 }, ate: { ano: 2026, mes: 9 } } as const;

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

/**
 * Vidas por tipo de plano e tipo de produto em cada mês. Mês sem nenhuma linha fica null (sem inferência);
 * em mês calculado, combinação ausente significa zero vidas.
 */
export function produtosPorMes(meses: MesEvolucao[], linhas: LinhaProduto[]) {
  const idx = new Map<string, number>();
  const comDado = new Set<string>();
  for (const l of linhas) {
    comDado.add(`${l.ano}-${l.mes}`);
    const k = `${l.ano}-${l.mes}|${String(l.sigla).trim().toUpperCase()}|${String(l.produto).trim().toUpperCase()}`;
    idx.set(k, (idx.get(k) ?? 0) + (Number(l.vidas) || 0));
  }
  return meses.map((m) => {
    const chave = `${m.ano}-${m.mes}`;
    const tem = comDado.has(chave);
    const valores = {} as Record<TipoPlano, Record<TipoProduto, number | null>>;
    for (const t of TIPOS_PLANO) {
      valores[t] = {} as Record<TipoProduto, number | null>;
      for (const p of TIPOS_PRODUTO) valores[t][p.id] = tem ? idx.get(`${chave}|${t}|${p.id}`) ?? 0 : null;
    }
    return { ...m, valores };
  });
}

type ValoresMes = ReturnType<typeof produtosPorMes>[number]["valores"];

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
