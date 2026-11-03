export function dreMargin(resultado: number, faturamento: number | undefined): number | null {
  if (faturamento === undefined || faturamento === 0) return null;
  return resultado / faturamento * 100;
}

export function formatDreMargin(margem: number | null): string {
  return margem === null ? "[—]" : `[${margem.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%]`;
}