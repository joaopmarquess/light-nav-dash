// Colunas da DRE (Control › Demonstrações): visão Mensal (padrão) ou Trimestral.
// Trimestres civis: 1T = jan–mar, 2T = abr–jun, 3T = jul–set, 4T = out–dez.
// Na visão Trimestral só entram trimestres fechados (os três meses disponíveis).
export type DreVisao = "Mensal" | "Trimestral";
export type DreColuna = { label: string; meses: number[]; kind: "mes" | "ano" };

export const NOMES_MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export const mesesDoTrimestre = (t: number) => [t * 3 - 2, t * 3 - 1, t * 3];

/** Trimestres (1–4) cujos três meses estão todos disponíveis. */
export function trimestresFechados(meses: number[]): number[] {
  const set = new Set(meses);
  return [1, 2, 3, 4].filter((t) => mesesDoTrimestre(t).every((m) => set.has(m)));
}

export const rotuloTrimestre = (t: number, ano: number) => `${t}T${ano}`;

export const periodoDre = (meses: number[], ano: number) =>
  meses.length ? `${NOMES_MESES[meses[0] - 1]}–${NOMES_MESES[meses[meses.length - 1] - 1]}/${ano}` : String(ano);

export function colunasDre(meses: number[], ano: number, visao: DreVisao = "Mensal"): DreColuna[] {
  if (visao === "Mensal") {
    return meses.length
      ? [...meses.map((m): DreColuna => ({ label: `${NOMES_MESES[m - 1]}/${ano}`, meses: [m], kind: "mes" })), { label: periodoDre(meses, ano), meses, kind: "ano" }]
      : [];
  }
  const tris = trimestresFechados(meses);
  if (!tris.length) return [];
  const acumulado = tris.flatMap(mesesDoTrimestre);
  return [
    ...tris.map((t): DreColuna => ({ label: rotuloTrimestre(t, ano), meses: mesesDoTrimestre(t), kind: "mes" })),
    { label: periodoDre(acumulado, ano), meses: acumulado, kind: "ano" },
  ];
}
