export const CAMPOS_DESP = ["vl_desp_consulta", "vl_desp_urgencia", "vl_desp_outros"] as const;
export const CAMPOS_REC = ["vl_rec_cpp", "vl_rec_copart", "vl_rec_outros"] as const;
export type LinhaEard = Partial<Record<(typeof CAMPOS_DESP)[number] | (typeof CAMPOS_REC)[number], number | string | null>>;

export interface SomaCompetencia {
  consulta: number; urgencia: number; outros: number; despTotal: number;
  recCpp: number; recCopart: number; recTotal: number;
}

const n = (v: unknown) => Number(v ?? 0) || 0;

export function somaVazia(): SomaCompetencia {
  return { consulta: 0, urgencia: 0, outros: 0, despTotal: 0, recCpp: 0, recCopart: 0, recTotal: 0 };
}

/** Despesa total = consulta + urgência + outros; receita total = cpp + copart + outros. */
export function acumular(s: SomaCompetencia, linhas: LinhaEard[]): SomaCompetencia {
  const r = { ...s };
  for (const l of linhas) {
    const c = n(l.vl_desp_consulta), u = n(l.vl_desp_urgencia), o = n(l.vl_desp_outros);
    const p = n(l.vl_rec_cpp), cp = n(l.vl_rec_copart), ro = n(l.vl_rec_outros);
    r.consulta += c; r.urgencia += u; r.outros += o; r.despTotal += c + u + o;
    r.recCpp += p; r.recCopart += cp; r.recTotal += p + cp + ro;
  }
  return r;
}

export function somarTotais(lista: SomaCompetencia[]): SomaCompetencia {
  return lista.reduce((t, s) => {
    (Object.keys(t) as (keyof SomaCompetencia)[]).forEach(k => { t[k] += s[k]; });
    return t;
  }, somaVazia());
}

/** Competências de janeiro do ano até o mês da data de referência (UTC). */
export function competenciasDoAno(hoje: Date): { ano: number; mes: number }[] {
  const ano = hoje.getUTCFullYear();
  return Array.from({ length: hoje.getUTCMonth() + 1 }, (_, i) => ({ ano, mes: i + 1 }));
}

/** Saldo = receita total − despesa total. */
export const saldoCompetencia = (s: SomaCompetencia) => s.recTotal - s.despTotal;
/** Sin = despesa total ÷ receita total (null sem receita). */
export const sinistralidade = (s: SomaCompetencia) => (s.recTotal ? s.despTotal / s.recTotal : null);

export interface MesSoma { ano: number; mes: number; soma: SomaCompetencia }
export interface AnoAgrupado { ano: number; soma: SomaCompetencia; meses: MesSoma[] }

/** Últimos 3 anos: dois anteriores completos e o atual até o mês anterior ao corrente (UTC); o mês corrente é ignorado. */
export function anosSinistralidade(hoje: Date): { ano: number; ateMes: number }[] {
  const a = hoje.getUTCFullYear();
  // Anos fechados desde 2022 (início da base) + ano corrente até o último mês fechado
  const lista = [];
  for (let y = 2022; y < a; y++) lista.push({ ano: y, ateMes: 12 });
  lista.push({ ano: a, ateMes: hoje.getUTCMonth() });
  return lista.filter(x => x.ateMes > 0);
}

/** Domínio vertical com a média da linha limite sempre no centro. */
export function dominioCentrado(valores: number[], limites: number[]): [number, number] {
  if (!limites.length) return [0, 1];
  const meio = limites.reduce((t, v) => t + v, 0) / limites.length;
  const d = Math.max(1, ...[...valores, ...limites].map(v => Math.abs(v - meio))) * 1.1;
  return [meio - d, meio + d];
}

/** Agrupa competências por ano (ordem crescente), somando os meses. */
export function agruparPorAno(meses: MesSoma[]): AnoAgrupado[] {
  const mapa = new Map<number, MesSoma[]>();
  for (const m of meses) mapa.set(m.ano, [...(mapa.get(m.ano) ?? []), m]);
  return [...mapa.entries()].sort(([a], [b]) => a - b).map(([ano, ms]) => {
    const ord = ms.sort((x, y) => x.mes - y.mes);
    return { ano, meses: ord, soma: somarTotais(ord.map(m => m.soma)) };
  });
}

/** Saldo equivalente a um Sin limite: receita total × (1 − limite). */
export const saldoLimiteSin = (s: SomaCompetencia, limite: number) => s.recTotal * (1 - limite);
