export const MEDIDAS = {
  previsto: "Previsto", projetado: "Projetado", v2: "Projetado v2", efetivo: "Realizado",
} as const;
export type Medida = keyof typeof MEDIDAS;
export function medidasOrcamento(meses: number[], fechados: ReadonlySet<number>): Medida[] {
  const medidas: Medida[] = ["previsto", "projetado", "v2"];
  if (meses.some((mes) => fechados.has(mes))) medidas.push("efetivo");
  return medidas;
}