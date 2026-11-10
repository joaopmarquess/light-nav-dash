// Home › Evolução Produtos: vidas ativas no último dia de cada mês.
// Regra de ativo = "Ativos em" (carteira_trial_geo / carteira_evolucao_mensal, view_ecarteira).
// beneficiarios e view_eard_mensal entram quando os níveis por produto forem abertos.

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
