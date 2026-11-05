type Linha = { item: string; mes: number; realizado: number };

/** Média aritmética das taxas entre meses consecutivos fechados, por item. */
export function projetadoV2(rows: Linha[], mesesFechados: ReadonlySet<number>) {
  const valores = new Map<string, Map<number, number>>();
  for (const r of rows) {
    if (!mesesFechados.has(r.mes)) continue;
    let serie = valores.get(r.item);
    if (!serie) { serie = new Map(); valores.set(r.item, serie); }
    serie.set(r.mes, (serie.get(r.mes) ?? 0) + r.realizado);
  }
  const meses = [...mesesFechados].sort((a, b) => a - b);
  const ultimo = meses.at(-1) ?? 0;
  const bases = new Map<string, { base: number; taxa: number }>();
  for (const [item, serie] of valores) {
    const taxas: number[] = [];
    for (const mes of meses) {
      if (!mesesFechados.has(mes - 1)) continue;
      const anterior = serie.get(mes - 1) ?? 0;
      const atual = serie.get(mes) ?? 0;
      // Base zero não define variação percentual; não inventar uma taxa.
      if (anterior === 0) continue;
      const taxa = atual / anterior - 1;
      if (Number.isFinite(taxa)) taxas.push(taxa);
    }
    bases.set(item, {
      base: serie.get(ultimo) ?? 0,
      taxa: taxas.length ? taxas.reduce((s, x) => s + x, 0) / taxas.length : 0,
    });
  }
  return (item: string, mes: number): number => {
    if (mesesFechados.has(mes)) return valores.get(item)?.get(mes) ?? 0;
    const b = bases.get(item);
    if (!b || !ultimo || mes <= ultimo) return 0;
    return b.base * (1 + b.taxa) ** (mes - ultimo);
  };
}