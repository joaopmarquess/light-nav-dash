import type { DreHRow } from "./dreHostinger";
import { itemDe } from "./orcamentoRegras";

export type OrcRow = { item: string; mes: number; previsto: number; realizado: number; projetado: number };
export type OrcVals = { previsto: number; realizado: number; projetado: number };

/** Realizado do balancete MV substitui o realizado apenas em meses com movimento (Control › Orçamento 2026 › DRE). */
export function aplicarRealizadoMv(rows: OrcRow[], mv: DreHRow[]): OrcRow[] {
  const real = new Map<string, number>(), meses = new Set<number>();
  const norm = (x: string) => x.replace(/\s+/g, "").toUpperCase();
  for (const r of mv) {
    const it = itemDe(r); if (!it) continue;
    const k = `${norm(it)}~${r.mes}`; real.set(k, (real.get(k) ?? 0) + r.valor);
    if (Math.abs(r.valor) >= 0.005) meses.add(r.mes);
  }
  return rows.map(r => ({ ...r, realizado: meses.has(r.mes) ? real.get(`${norm(r.item)}~${r.mes}`) ?? 0 : 0 }));
}

/** Linhas de topo da DRE do orçamento na visão padrão (grupos recolhidos). */
export function gruposOrcamentoDre(items: string[]): { label: string; items: string[] }[] {
  const find = (re: RegExp) => items.filter(i => re.test(i));
  const one = (re: RegExp) => { const i = items.find(x => re.test(x)); return i ? [i] : []; };
  const op = [...find(/\|\s*FATURAMENTO/i), ...find(/COPARTICIPA/i), ...find(/DESPESAS ASSISTENCIAIS/i),
    ...one(/IMPOSTOS DIRETOS/i), ...one(/PROVIS[ÕO]ES OPERACIONAIS/i), ...one(/COMERCIALIZA/i), ...one(/OUTRAS RECEITAS OPERACIONAIS/i)];
  const adm = [...one(/\|\s*PESSOAL/i), ...one(/MARKETING/i), ...one(/INFORM[ÁA]TICA/i), ...one(/DEMAIS DESPESAS ADMINISTRATIVAS/i)];
  const fin = one(/FINANCEIRO/i);
  const usados = new Set([...op, ...adm, ...fin]);
  const out: { label: string; items: string[] }[] = [];
  if (op.length) out.push({ label: "Operacional", items: op });
  if (adm.length) out.push({ label: "Despesas administrativas", items: adm });
  if (fin.length) out.push({ label: "Financeiro", items: fin });
  for (const i of items) if (!usados.has(i)) out.push({ label: i.replace(/^\d+\|/, ""), items: [i] });
  return out;
}

/** Valores por item/mês: meses sem nenhum realizado exibem o Projetado (padrão da tela). */
export function valoresOrcamento(rows: OrcRow[]) {
  const comReal = new Set(rows.filter(r => Math.abs(r.realizado) >= 0.005).map(r => r.mes));
  const soma = (items: string[], meses: number[]): OrcVals => rows.filter(r => items.includes(r.item) && meses.includes(r.mes)).reduce((t, r) => ({
    previsto: t.previsto + r.previsto, projetado: t.projetado + r.projetado,
    realizado: t.realizado + (comReal.has(r.mes) ? r.realizado : r.projetado),
  }), { previsto: 0, realizado: 0, projetado: 0 });
  return { comReal, soma };
}

export const impostosFederais = (x: number) => (x > 0 ? -x * 0.34 : 0);
export const resultadoLiquido = (x: number) => (x > 0 ? x * 0.66 : x);
