export type ReportPeriod = { de: string; ate: string };
export function periodoRelatorio(ano: number, mes = 0, trimestre = 0): ReportPeriod {
  if (!Number.isInteger(ano) || ano < 1900 || ano > 2200) throw new Error("Ano inválido.");
  if (mes < 0 || mes > 12 || trimestre < 0 || trimestre > 4) throw new Error("Período inválido.");
  if (mes && trimestre && Math.ceil(mes / 3) !== trimestre) throw new Error("O mês não pertence ao trimestre selecionado.");
  const inicio = mes || (trimestre ? (trimestre - 1) * 3 + 1 : 1);
  const fim = mes || (trimestre ? trimestre * 3 : 12);
  return { de: `${ano}-${String(inicio).padStart(2, "0")}-01`, ate: new Date(Date.UTC(ano, fim, 0)).toISOString().slice(0, 10) };
}
export const numero = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
export const dinheiro = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const percentual = (v: number | null) => v === null ? "—" : `${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
export const dataBR = (v: string) => v.split("-").reverse().join("/");
/** Natureza explícita: não infere receita/despesa pelo sinal do valor. */
export function avaliarDesvio(previsto: number, realizado: number, natureza: "receita" | "despesa" | "indefinida") {
  const desvio = realizado - previsto;
  if (natureza === "indefinida" || Math.abs(desvio) < 0.005) return { desvio, status: "atenção" as const };
  const favoravel = natureza === "receita" ? realizado > previsto : Math.abs(realizado) < Math.abs(previsto);
  return { desvio, status: favoravel ? "favorável" as const : "desfavorável" as const };
}