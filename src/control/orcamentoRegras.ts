import type { DreHRow } from "./dreHostinger";

/** Classificação compartilhada com o orçamento vigente do CONTROL. */
export function itemDe(r: DreHRow): string | null {
  if (/FINANCEIRO/i.test(r.g1)) return "12|FINANCEIRO";
  if (/PRINCIPAL/i.test(r.g3)) {
    if (/FATUR/i.test(r.g4)) return "01|FATURAMENTO";
    if (/COPART/i.test(r.g4)) return "02|COPARTICIPAÇÃO";
    return "03|DESPESAS ASSISTENCIAIS";
  }
  if (/SECUND/i.test(r.g3)) return "04|OUTRAS RECEITAS OPERACIONAIS";
  if (/COMERCIAL/i.test(r.g3)) return "05|COMERCIALIZAÇÃO";
  if (/IMPOSTOS DIRETOS/i.test(r.g3)) return "06|IMPOSTOS DIRETOS";
  if (/PROVIS/i.test(r.g3)) return "07|PROVISÕES OPERACIONAIS";
  if (/ADMINISTRATIVO/i.test(r.g2)) {
    if (/PESSOAL/i.test(r.g3)) return "08|PESSOAL";
    if (/MARKETING/i.test(r.g3)) return "09|MARKETING";
    if (/TECNOLOGIA/i.test(r.g3)) return "10|INFORMÁTICA";
    return "11|DEMAIS DESPESAS ADMINISTRATIVAS";
  }
  return null;
}

export function realizadosOrcamento(mv: DreHRow[]) {
  const valores = new Map<string, number>();
  const meses = new Set<number>();
  const chave = (item: string, mes: number) => `${item.replace(/\s+/g, "").toUpperCase()}~${mes}`;
  for (const row of mv) {
    const item = itemDe(row);
    if (!item) continue;
    const k = chave(item, row.mes);
    valores.set(k, (valores.get(k) ?? 0) + row.valor);
    if (Math.abs(row.valor) >= 0.005) meses.add(row.mes);
  }
  return { meses, valor: (item: string, mes: number) => valores.get(chave(item, mes)) ?? 0 };
}