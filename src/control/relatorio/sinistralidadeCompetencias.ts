export const CAMPOS_DESP = ["vl_desp_consulta", "vl_desp_urgencia", "vl_desp_internacao", "vl_desp_terapia", "vl_desp_exame", "vl_desp_outros"] as const;
export const CAMPOS_REC = ["vl_rec_cpp", "vl_rec_copart", "vl_rec_outros"] as const;
export type LinhaEard = Partial<Record<(typeof CAMPOS_DESP)[number] | (typeof CAMPOS_REC)[number], number | string | null>>;

export interface SomaCompetencia {
  consulta: number; urgencia: number; internacao: number; terapia: number; exame: number; outros: number; despTotal: number;
  recCpp: number; recCopart: number; recTotal: number;
}

const n = (v: unknown) => Number(v ?? 0) || 0;

export function somaVazia(): SomaCompetencia {
  return { consulta: 0, urgencia: 0, internacao: 0, terapia: 0, exame: 0, outros: 0, despTotal: 0, recCpp: 0, recCopart: 0, recTotal: 0 };
}

/** Despesa total = consulta + urgência + internação + terapia + exame + outros; receita total = cpp + copart + outros. */
export function acumular(s: SomaCompetencia, linhas: LinhaEard[]): SomaCompetencia {
  const r = { ...s };
  for (const l of linhas) {
    const c = n(l.vl_desp_consulta), u = n(l.vl_desp_urgencia), o = n(l.vl_desp_outros);
    const it = n(l.vl_desp_internacao), te = n(l.vl_desp_terapia), ex = n(l.vl_desp_exame);
    const p = n(l.vl_rec_cpp), cp = n(l.vl_rec_copart), ro = n(l.vl_rec_outros);
    r.consulta += c; r.urgencia += u; r.internacao += it; r.terapia += te; r.exame += ex; r.outros += o;
    r.despTotal += c + u + it + te + ex + o;
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

/** Mês válido: competência (mm/aaaa) com despesa total acima de R$ 20 milhões. */
export const DESPESA_MINIMA_COMPETENCIA = 20_000_000;
/** Primeiro ano da base de sinistralidade. */
export const ANO_INICIO_SINISTRALIDADE = 2022;
export type Competencia = { ano: number; mes: number };
export type TotalCompetencia = { nr_ano: number | string; nr_mes: number | string; desp_total: number | string | null };

/** Última competência válida: a mais recente com despesa total acima de R$ 20 milhões (null se nenhuma). */
export function ultimaCompetenciaValida(totais: TotalCompetencia[]): Competencia | null {
  let k: number | null = null;
  for (const t of totais) {
    if (!((Number(t.desp_total) || 0) > DESPESA_MINIMA_COMPETENCIA)) continue;
    const i = Number(t.nr_ano) * 12 + Number(t.nr_mes) - 1;
    if (k == null || i > k) k = i;
  }
  return k == null ? null : { ano: Math.floor(k / 12), mes: (k % 12) + 1 };
}

/** Competência até a última válida (inclusive); os meses seguintes ainda não têm despesas completas. */
export const ateCompetencia = (ano: number, mes: number, ultima: Competencia) => ano * 12 + mes <= ultima.ano * 12 + ultima.mes;

/** Anos de 2022 até a última competência válida; o último ano vai até o mês dela. */
export function anosSinistralidade(ultima: Competencia): { ano: number; ateMes: number }[] {
  const lista = [];
  for (let y = ANO_INICIO_SINISTRALIDADE; y < ultima.ano; y++) lista.push({ ano: y, ateMes: 12 });
  lista.push({ ano: ultima.ano, ateMes: ultima.mes });
  return lista;
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
