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
