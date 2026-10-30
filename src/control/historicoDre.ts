import dados from "@/control/data/historicoDre.json";
import type { DreHRow } from "@/control/dreHostinger";

export const HISTORICO_ANOS = Array.from({ length: 9 }, (_, i) => 2018 + i);
export const HISTORICO_ROWS: DreHRow[] = dados;

export function historicoDoAno(ano: number) {
  const rows = HISTORICO_ROWS.filter((r) => r.ano === ano);
  const meses = Array.from(new Set(rows.map((r) => r.mes))).sort((a, b) => a - b);
  return { rows, meses };
}