/** Traduz falhas de leitura do servidor de dados (Hostinger) em mensagens claras para o usuário. */
export const MSG_SERVIDOR_INDISPONIVEL = "Servidor de dados indisponível no momento. Tente novamente em alguns minutos.";
export const MSG_TEMPO_ESGOTADO = "Tempo esgotado ao contactar o servidor de dados";

const INDISPONIVEL = /failed to fetch|fetch failed|networkerror|network request failed|load failed|tempo esgotado|err_connection|econn|enotfound|bad gateway|service unavailable|gateway time|\b50[234]\b|<html/i;

export function textoErro(e: unknown): string {
  if (e == null) return "";
  if (typeof e === "string") return e;
  if (typeof e === "object" && "message" in e) return String((e as { message: unknown }).message ?? "");
  return String(e);
}

export function servidorIndisponivel(e: unknown): boolean {
  const t = textoErro(e);
  return t !== "" && INDISPONIVEL.test(t);
}

/** Mensagem pronta para a tela: indisponibilidade vira aviso amigável; demais erros mantêm o detalhe. */
export function mensagemErroDados(e: unknown): string {
  const t = textoErro(e).trim();
  if (!t) return "Não foi possível carregar os dados.";
  if (servidorIndisponivel(t)) return MSG_SERVIDOR_INDISPONIVEL;
  return t.startsWith("Não foi possível") ? t : `Não foi possível carregar os dados: ${t}`;
}
