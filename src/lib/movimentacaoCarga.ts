import { resumoMovimentacao } from "./movimentacaoResumo";

export type PeriodoMovimentacao = { de: string; ate: string };
export type TotaisMovimentacao = { e: number; s: number; r: number; tp: number; tm: number };
export type CrescimentoMensal = PeriodoMovimentacao & { mes: string; crescimento: number };

export function crescimentoMensalMovimentacao(periodo: PeriodoMovimentacao, row: Record<string, unknown>): CrescimentoMensal {
  const t = somarTotaisMovimentacao([row]);
  return { ...periodo, mes: periodo.de.slice(0, 7), crescimento: resumoMovimentacao(t.e, t.s, t.r, t.tp, t.tm).crescimento };
}

export function mesesMovimentacao(periodo: PeriodoMovimentacao): PeriodoMovimentacao[] {
  const meses: PeriodoMovimentacao[] = [];
  for (let de = periodo.de; de <= periodo.ate;) {
    const [ano, mes] = de.split("-").map(Number);
    const proximo = new Date(Date.UTC(ano, mes, 1)).toISOString().slice(0, 10);
    const fim = new Date(Date.UTC(ano, mes, 0)).toISOString().slice(0, 10);
    meses.push({ de, ate: fim < periodo.ate ? fim : periodo.ate });
    de = proximo;
  }
  return meses;
}

export function somarTotaisMovimentacao(rows: Record<string, unknown>[]): TotaisMovimentacao {
  return rows.reduce<TotaisMovimentacao>((acc, row) => ({
    e: acc.e + Number(row.vendas ?? 0),
    s: acc.s + Number(row.cancelamentos ?? 0),
    r: acc.r + Number(row.reativacoes ?? 0),
    tp: acc.tp + Number(row.entradas_transferencia ?? 0),
    tm: acc.tm + Number(row.saidas_transferencia ?? 0),
  }), { e: 0, s: 0, r: 0, tp: 0, tm: 0 });
}