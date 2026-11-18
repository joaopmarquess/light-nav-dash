/** Regras de apresentação de Carteira › Entradas/Saídas sobre as linhas já carregadas (não consulta a base). */
type Row = Record<string, unknown>;

/** Rótulo MM/AAAA de uma data ISO (AAAA-MM-DD…). */
export const mesAno = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Matrículas distintas por mês da data do movimento, em ordem cronológica e incluindo meses sem movimento entre De e Até. */
export function contagemMensal(rows: Row[], campo: string, de: string, ate: string): { mes: string; qtd: number }[] {
  const porMes = new Map<string, Set<string>>();
  for (const r of rows) {
    const d = String(r[campo] ?? "").slice(0, 7);
    if (d.length !== 7) continue;
    if (!porMes.has(d)) porMes.set(d, new Set());
    porMes.get(d)!.add(String(r.cd_mat_alternativa));
  }
  const out: { mes: string; qtd: number }[] = [];
  let [a, m] = [Number(de.slice(0, 4)), Number(de.slice(5, 7))];
  const [aF, mF] = [Number(ate.slice(0, 4)), Number(ate.slice(5, 7))];
  while (a < aF || (a === aF && m <= mF)) {
    const k = `${a}-${String(m).padStart(2, "0")}`;
    out.push({ mes: mesAno(k), qtd: porMes.get(k)?.size ?? 0 });
    m++; if (m > 12) { m = 1; a++; }
  }
  return out;
}
