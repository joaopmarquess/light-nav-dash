// Código 274 é transferência: registros gravados com nome de pessoa passam a exibir
// "TRANSFERENCIA DE CONTRATO". Só altera a cópia em tela; a base original fica intacta.
export const NOME_TRANSFERENCIA = "TRANSFERENCIA DE CONTRATO";
export function normalizarVendedor<T extends Record<string, any>>(r: T): T {
  return Number(r?.cd_vendedor) === 274 ? { ...r, nm_vendedor: NOME_TRANSFERENCIA } : r;
}
