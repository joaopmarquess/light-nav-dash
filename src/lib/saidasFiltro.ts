export type FiltroSaidas = "cancelamentos" | "transferencias" | "reativados" | "suspensos" | "todos";
export const FILTRO_SAIDAS_DEFAULT: FiltroSaidas = "cancelamentos";
export function incluirSaida(
  filtro: FiltroSaidas, grupo: string | undefined,
  desligamento: string | null | undefined, reativacao: string | null | undefined,
  periodo: { de: string; ate: string },
): boolean {
  const g = (grupo ?? "").trim().toLocaleLowerCase("pt-BR");
  const suspenso = g === "suspensão";
  const transferencia = g === "transferência";
  const reat = reativacao?.slice(0, 10);
  const deslig = desligamento?.slice(0, 10);
  const reativado = Boolean(reat && deslig && reat >= deslig && reat >= periodo.de && reat <= periodo.ate);
  switch (filtro) {
    case "todos": return true;
    case "transferencias": return transferencia;
    case "reativados": return reativado;
    case "suspensos": return suspenso;
    default: return !suspenso && !transferencia && !reativado;
  }
}