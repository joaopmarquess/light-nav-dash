// Regras dos slides de outros menus no carrossel do Control (pedido de 27/11/2026).
import type { TotalMesRpc } from "@/lib/sinistralidadeValida";
import type { Competencia } from "@/lib/sinistralidadeCompetencias";

const NOMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export const rotuloMes = (ano: number, mes: number) => `${NOMES[mes - 1]}/${String(ano).slice(2)}`;

/** Vidas ativas por UF, da maior para a menor; UFs além de `max` somam em "Outros". */
export function vidasPorUf(rows: { uf: string; ativos: number }[], max = 8) {
  const m = new Map<string, number>();
  for (const r of rows) { const uf = r.uf || "—"; m.set(uf, (m.get(uf) ?? 0) + (Number(r.ativos) || 0)); }
  const ord = [...m].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const topo = ord.slice(0, max).map(([uf, vidas]) => ({ uf, vidas }));
  const resto = ord.slice(max).reduce((s, [, v]) => s + v, 0);
  return resto > 0 ? [...topo, { uf: "Outros", vidas: resto }] : topo;
}

/** Últimos 12 meses até a competência válida: receitas, despesas e sinistralidade (%). */
export function ultimos12Sinistralidade(totais: TotalMesRpc[], ultima: Competencia) {
  const k = ultima.ano * 12 + ultima.mes;
  return totais
    .map((t) => ({ ano: Number(t.nr_ano), mes: Number(t.nr_mes), rec: Number(t.rec_total) || 0, desp: Number(t.desp_total) || 0 }))
    .filter((t) => { const x = t.ano * 12 + t.mes; return x <= k && x > k - 12; })
    .sort((a, b) => a.ano * 12 + a.mes - (b.ano * 12 + b.mes))
    .map((t) => ({ mes: rotuloMes(t.ano, t.mes), Receitas: t.rec, Despesas: t.desp, Sinistralidade: t.rec ? (t.desp / t.rec) * 100 : 0 }));
}
