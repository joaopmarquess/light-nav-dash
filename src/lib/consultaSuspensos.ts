export type SuspPeriodoValor = { de: string; ate: string };
export type SuspEstipulante = { nome_estipulante: string; vidas: number };

export function periodoInicialSuspensos(hoje = new Date()): SuspPeriodoValor {
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return { de: `${ano}-01-01`, ate: `${ano}-${mes}-${dia}` };
}

export function normalizarEstipulantes(rows: SuspEstipulante[]): SuspEstipulante[] {
  return rows.map((r) => ({ nome_estipulante: r.nome_estipulante?.trim() || "NÃO INFORMADO", vidas: Number(r.vidas) }))
    .sort((a, b) => b.vidas - a.vidas || a.nome_estipulante.localeCompare(b.nome_estipulante, "pt-BR"));
}