import { loadDreHostinger, loadMesesDemonstracoes } from "./dreHostinger";

/** Os indicadores usam exatamente o período realizado das Demonstrações. */
export async function carregarDreCarrossel(ano: number) {
  const meses = await loadMesesDemonstracoes(ano);
  const rows = meses.length ? await loadDreHostinger(ano, meses) : [];
  return { meses, rows };
}