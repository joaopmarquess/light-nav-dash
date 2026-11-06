export type SuspPeriodoValor = { de: string; ate: string };
export type SuspEstipulante = { nome_estipulante: string; vidas: number };
export type SuspensaoRegistro = { cd_mat_alternativa: string; dt_ult_suspensao: string | null; dt_ult_reat_suspensao: string | null };

export function matriculasSuspensas(rows: SuspensaoRegistro[], periodo: SuspPeriodoValor): string[] {
  const ultimas = new Map<string, SuspensaoRegistro>();
  for (const r of rows) {
    const data = r.dt_ult_suspensao?.slice(0, 10);
    if (!data || data < periodo.de || data > periodo.ate) continue;
    const anterior = ultimas.get(r.cd_mat_alternativa);
    if (!anterior || String(r.dt_ult_suspensao) > String(anterior.dt_ult_suspensao)) ultimas.set(r.cd_mat_alternativa, r);
  }
  return [...ultimas.values()].filter((r) => {
    const susp = r.dt_ult_suspensao?.slice(0, 10) ?? "";
    const reat = r.dt_ult_reat_suspensao?.slice(0, 10);
    return !(reat && reat >= susp && reat <= periodo.ate);
  }).map((r) => r.cd_mat_alternativa);
}

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