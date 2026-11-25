/**
 * "Guardar como novo Default" (pedido de 25/11/2026): grava, neste navegador, os valores atuais de uma tela como padrão.
 * O padrão guardado fica entre o padrão original do código e os valores digitados: apagar um campo ou Restaurar volta a ele.
 */
const PREFIXO = "axis.defaultUsuario.";
type Leitor = Pick<Storage, "getItem"> | undefined;
type Gravador = Pick<Storage, "setItem"> | undefined;
const loja = () => { try { return globalThis.localStorage; } catch { return undefined; } };

export const chaveDefaultUsuario = (chave: string) => PREFIXO + chave;
export const EVENTO_DEFAULT_USUARIO = "axis-default-usuario-alterado";

/** Padrão guardado pelo usuário para a chave (ou undefined quando não há). */
export function lerDefaultUsuario<T>(chave: string, storage: Leitor = loja()): T | undefined {
  try {
    const bruto = storage?.getItem(chaveDefaultUsuario(chave));
    return bruto ? (JSON.parse(bruto) as T) : undefined;
  } catch { return undefined; }
}

export function guardarDefaultUsuario(chave: string, valor: unknown, storage: Gravador = loja()) {
  try { storage?.setItem(chaveDefaultUsuario(chave), JSON.stringify(valor)); } catch { /* navegador sem armazenamento */ }
  try { globalThis.dispatchEvent?.(new Event(EVENTO_DEFAULT_USUARIO)); } catch { /* sem janela */ }
}

/** Objeto padrão guardado mesclado com os valores digitados (os digitados prevalecem). */
export function comDefaultUsuario<T extends object>(chave: string, digitados: T, storage: Leitor = loja()): T {
  const d = lerDefaultUsuario<T>(chave, storage);
  return d && typeof d === "object" && !Array.isArray(d) ? { ...d, ...digitados } : digitados;
}
