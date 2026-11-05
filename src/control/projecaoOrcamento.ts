type R = { item: string; mes: number; realizado: number; projetado: number };

/**
 * Projetado dos meses após o último realizado: valor anterior + média das variações
 * mensais entre os meses realizados (1..ultimo) de cada item. Com menos de 2 meses
 * realizados, a variação média é zero (repete o último realizado).
 */
export function projetarPorVariacaoMedia<T extends R>(rows: T[], ultimo: number): T[] {
  if (ultimo <= 0) return rows;
  const porItem = new Map<string, Map<number, number>>();
  for (const r of rows) {
    if (r.mes > ultimo) continue;
    const m = porItem.get(r.item) ?? new Map<number, number>();
    m.set(r.mes, (m.get(r.mes) ?? 0) + r.realizado);
    porItem.set(r.item, m);
  }
  const proj = new Map<string, number>();
  for (const [item, m] of porItem) {
    const vals = Array.from({ length: ultimo }, (_, i) => m.get(i + 1) ?? 0);
    const deltas = vals.slice(1).map((v, i) => v - vals[i]);
    const media = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
    let atual = vals[vals.length - 1];
    for (let mes = ultimo + 1; mes <= 12; mes++) { atual += media; proj.set(`${item}~${mes}`, atual); }
  }
  const usados = new Set<string>();
  return rows.map((r) => {
    if (r.mes <= ultimo) return r;
    const k = `${r.item}~${r.mes}`;
    // Itens duplicados no mesmo mês: o valor projetado entra uma única vez
    const v = usados.has(k) ? 0 : proj.get(k) ?? 0;
    usados.add(k);
    return { ...r, projetado: v };
  });
}
