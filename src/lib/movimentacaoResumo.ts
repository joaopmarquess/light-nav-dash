export function resumoMovimentacao(vendas: number, cancelamentos: number, reativacoes: number, entradasTransferencia: number, saidasTransferencia: number) {
  const transferenciasLiquidas = entradasTransferencia - saidasTransferencia;
  return { transferenciasLiquidas, crescimento: vendas - cancelamentos + reativacoes + transferenciasLiquidas };
}

export const podeCalcularMovimentacao = (periodo: { de: string; ate: string } | null): periodo is { de: string; ate: string } =>
  Boolean(periodo?.de && periodo.ate && periodo.de <= periodo.ate);