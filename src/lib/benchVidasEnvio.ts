// Andamento do envio dos dados mensais da ANS, registrado pelo programa de envio a cada 30 s.
export interface EnvioRegistro {
  etapa: string; etapa_ordem: number; etapas: number; total: number; feitos: number; falhas: number;
  situacao: string; mensagem: string | null; progresso_em: string; atualizado_em: string;
}
export type EstadoEnvio = "andamento" | "sem_avanco" | "parado" | "concluido" | "erro";
/** Sem sinal do programa por mais tempo que isto = envio parado (o sinal chega a cada 30 s). */
export const SEM_SINAL_MS = 2 * 60_000;
/** Programa vivo, mas sem nenhum arquivo novo por mais tempo que isto = sem avanço. */
export const SEM_AVANCO_MS = 10 * 60_000;
/** Depois de concluído, o termômetro fica visível por este tempo. */
export const VISIVEL_APOS_FIM_MS = 24 * 60 * 60_000;

export function avaliarEnvio(r: EnvioRegistro, agora: number) {
  const total = Math.max(0, r.total), feitos = Math.min(Math.max(0, r.feitos), total || Math.max(0, r.feitos));
  const pendentes = Math.max(0, total - feitos);
  const percentual = total > 0 ? Math.floor((feitos / total) * 100) : 0;
  const semSinalMs = Math.max(0, agora - Date.parse(r.atualizado_em));
  const semAvancoMs = Math.max(0, agora - Date.parse(r.progresso_em));
  let estado: EstadoEnvio;
  if (r.situacao === "concluido") estado = "concluido";
  else if (r.situacao === "erro") estado = "erro";
  else if (semSinalMs > SEM_SINAL_MS) estado = "parado";
  else if (semAvancoMs > SEM_AVANCO_MS) estado = "sem_avanco";
  else estado = "andamento";
  const visivel = estado !== "concluido" || semSinalMs <= VISIVEL_APOS_FIM_MS;
  return { estado, total, feitos, pendentes, percentual, semSinalMs, semAvancoMs, visivel };
}
