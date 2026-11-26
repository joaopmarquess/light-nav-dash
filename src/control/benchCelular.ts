import type { DreHRow } from "./dreHostinger";
import { dreMargin } from "./dreMargin";

export function resumoBenchCelular(rows: DreHRow[], trimestres: number[], faturamento: number) {
  const selecionadas = rows.filter(r => trimestres.includes(r.tri));
  const resultado = selecionadas.reduce((total, r) => total + r.valor, 0);
  return { rows: selecionadas, resultado, faturamento, margem: dreMargin(resultado, faturamento) };
}

export function gruposBenchCelular(rows: DreHRow[], nivel = 1): { id: string; nome: string; valor: number; rows: DreHRow[]; expansivel: boolean }[] {
  const campo = (r: DreHRow, n: number) => [r.g1, r.g2, r.g3, r.g4][n - 1] ?? "";
  const grupos = new Map<string, DreHRow[]>();
  for (const row of rows) {
    const chave = campo(row, nivel);
    const itens = grupos.get(chave) ?? [];
    itens.push(row); grupos.set(chave, itens);
  }
  return [...grupos].sort(([a], [b]) => a.localeCompare(b, "pt-BR", { numeric: true })).map(([id, itens]) => ({
    id, nome: id.includes("|") ? id.slice(id.indexOf("|") + 1) : id || "Sem detalhamento",
    valor: itens.reduce((total, r) => total + r.valor, 0), rows: itens,
    expansivel: nivel < 4 && itens.some(r => !!campo(r, nivel + 1)),
  }));
}