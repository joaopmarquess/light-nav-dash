/** Quantidade de Credenciamentos (Estudo Uberaba › Resultados Rede): Disponível e Limite vêm do helper de credenciamento; Autorizado é editado na tela e gravado neste navegador. */
import { cenarioCredenciamento, type GrupoCredenciamento } from "@/lib/uberabaCredenciamento";

export type AutorizadosCredenciamento = Partial<Record<GrupoCredenciamento, number>>;
export type LinhaQuantidadeCredenciamento = { id: GrupoCredenciamento; tipo: string; disponivel: number; autorizado: number; limite: number };

export const CHAVE_AUTORIZADOS_CREDENCIAMENTO = "uberaba.quantidadeCredenciamentos.autorizados.v1";

/** Autorizado começa pelo Limite de cada tipo; valor digitado (inteiro ≥ 0) prevalece. */
export function linhasQuantidadeCredenciamentos(autorizados: AutorizadosCredenciamento = {}) {
  const disponiveis = cenarioCredenciamento("Disponível").grupos;
  const limites = cenarioCredenciamento("Limite").grupos;
  const linhas: LinhaQuantidadeCredenciamento[] = disponiveis.map((g, i) => {
    const limite = limites[i].quantidade;
    const digitado = autorizados[g.id];
    return { id: g.id, tipo: g.titulo, disponivel: g.quantidade, limite, autorizado: digitado ?? limite };
  });
  const total = { disponivel: linhas.reduce((s, l) => s + l.disponivel, 0), autorizado: linhas.reduce((s, l) => s + l.autorizado, 0) };
  return { linhas, total };
}

/** Converte o texto digitado: vazio restaura o Limite (undefined); só inteiros não negativos são aceitos. */
export function lerAutorizado(texto: string): number | undefined | null {
  const t = texto.trim();
  if (t === "") return undefined;
  if (!/^\d+$/.test(t)) return null;
  return Number(t);
}

export function carregarAutorizados(): AutorizadosCredenciamento {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE_AUTORIZADOS_CREDENCIAMENTO) ?? "{}");
    const saida: AutorizadosCredenciamento = {};
    for (const id of ["medicos", "diagnostico", "nao-medicos"] as const) if (Number.isInteger(bruto?.[id]) && bruto[id] >= 0) saida[id] = bruto[id];
    return saida;
  } catch { return {}; }
}

export function salvarAutorizados(valores: AutorizadosCredenciamento) {
  try { localStorage.setItem(CHAVE_AUTORIZADOS_CREDENCIAMENTO, JSON.stringify(valores)); } catch { /* navegador sem armazenamento */ }
}
