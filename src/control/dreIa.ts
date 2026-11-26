import type { DreHRow } from "./dreHostinger";
import { resumoPainelDre, sinistralidadeOperacionalPainel } from "./drePainel";

export type ContaIa = DreHRow & { conta: string; descricao: string; tipo: string; debito: number; credito: number; saldoInicial: number; saldoFinal: number };
export type ConsultaDreIa = { cubo: "dre" | "contabil"; ano: number | null; mesDe: number | null; mesAte: number | null; grupo: "mes" | "trimestre" | "g1" | "g2" | "g3" | "g4" | "conta" | null; texto: string | null; conta: string | null; limite: number | null };
export type CuboDreIa = { ano: number; meses: number[]; rows: DreHRow[]; contas?: ContaIa[]; fonteContabil: string };
const normal = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const rotulo = (s: string) => s.replace(/^\d+\|/, "");
const isConta = (r: DreHRow): r is ContaIa => "conta" in r && "descricao" in r;

/** Consulta somente dados do cubo, sem SQL livre nem soma dos níveis da árvore. */
export function consultarCuboDre(cubo: CuboDreIa, q: ConsultaDreIa) {
  const de = q.mesDe ?? Math.min(...cubo.meses), ate = q.mesAte ?? Math.max(...cubo.meses);
  if (!Number.isInteger(de) || !Number.isInteger(ate) || de < 1 || ate > 12 || de > ate) throw new Error("Período inválido: use meses de 1 a 12.");
  if (q.ano !== null && q.ano !== cubo.ano) throw new Error("O ano consultado não corresponde ao cubo carregado.");
  if (q.cubo === "dre" && (q.conta || q.grupo === "conta")) throw new Error("Para contas contábeis, consulte o cubo Contábil.");
  if (q.cubo === "contabil" && !cubo.contas) throw new Error("O cubo Contábil não foi carregado.");
  const meses = cubo.meses.filter((m) => m >= de && m <= ate);
  const base = q.cubo === "dre" ? cubo.rows : (cubo.contas ?? []).filter((r) => r.tipo === "A");
  const rows = base.filter((r) => meses.includes(r.mes) && (!q.texto || normal([r.g1, r.g2, r.g3, r.g4, isConta(r) ? r.descricao : ""].join(" ")).includes(normal(q.texto))) && (!q.conta || (isConta(r) && r.conta.replace(/\D/g, "").startsWith(q.conta.replace(/\D/g, "")))));
  const somar = (rs: typeof rows) => rs.reduce((s, r) => s + r.valor, 0);
  const totaisContabeis = (rs: typeof rows, mesesPosicao = meses) => {
    const contas = rs as ContaIa[];
    const soma = (campo: "debito" | "credito" | "saldoInicial" | "saldoFinal", periodo?: number) => contas.filter((r) => periodo === undefined || r.mes === periodo).reduce((s, r) => s + r[campo], 0);
    return { realizado: somar(rs), debitos: soma("debito"), creditos: soma("credito"), saldoInicial: soma("saldoInicial", Math.min(...mesesPosicao)), saldoFinal: soma("saldoFinal", Math.max(...mesesPosicao)) };
  };
  const grupos = new Map<string, typeof rows>();
  if (q.grupo) for (const r of rows) {
    const chave = q.grupo === "mes" ? `${cubo.ano}-${String(r.mes).padStart(2, "0")}` : q.grupo === "trimestre" ? `${r.tri}T${String(cubo.ano).slice(-2)}` : q.grupo === "conta" && isConta(r) ? `${r.conta} · ${r.descricao}` : [r.g1, ...(q.grupo !== "g1" ? [r.g2] : []), ...(["g3", "g4"].includes(q.grupo) ? [r.g3] : []), ...(q.grupo === "g4" ? [r.g4] : [])].filter(Boolean).map(rotulo).join(" › ");
    const itens = grupos.get(chave) ?? []; itens.push(r); grupos.set(chave, itens);
  }
  const limite = Math.max(1, Math.min(100, Math.floor(q.limite ?? 30)));
  const lista = [...grupos].map(([grupo, itens]) => ({ grupo, valor: somar(itens), ...(q.cubo === "contabil" ? totaisContabeis(itens, q.grupo === "mes" || q.grupo === "trimestre" ? [...new Set(itens.map((r) => r.mes))] : meses) : {}) })).sort((a, b) => q.grupo === "mes" || q.grupo === "trimestre" ? a.grupo.localeCompare(b.grupo) : Math.abs(b.valor) - Math.abs(a.valor));
  const resumo = resumoPainelDre(rows);
  const entradas = resumo.linhas[0][1], despesas = resumo.linhas[1][1];
  return {
    cubo: q.cubo, fonte: q.cubo === "dre" ? "DRE da tela · balancete MV + plano 9D" : `public.${cubo.fonteContabil} · somente contas analíticas (A)`,
    ano: cubo.ano, meses, mesesSemFechamento: Array.from({ length: ate - de + 1 }, (_, i) => de + i).filter((m) => !meses.includes(m)), filtros: { texto: q.texto, conta: q.conta }, registros: rows.length,
    resultado: q.cubo === "dre" ? somar(rows) : null,
    faturamento: q.cubo === "dre" ? resumo.fat : null,
    demonstrativo: q.cubo === "dre" ? resumo.linhas.map(([indicador, valor]) => ({ indicador, valor, percentualFaturamento: resumo.pctFat(valor) === null ? null : (resumo.pctFat(valor) ?? 0) * 100 })) : null,
    sinistralidadeOperacional: q.cubo === "dre" ? sinistralidadeOperacionalPainel(entradas, despesas) : null,
    totais: q.cubo === "contabil" ? totaisContabeis(rows) : null,
    grupos: lista.slice(0, limite), totalGrupos: lista.length, gruposOmitidos: Math.max(0, lista.length - limite),
    observacao: q.cubo === "dre" ? "Resumo restrito aos filtros consultados; valores com sinal da DRE, crédito menos débito." : "REALIZADO preservado da fonte. Saldos são posições do primeiro/último mês, nunca somados entre meses. O cubo Contábil não substitui nem necessariamente reconcilia com o balancete MV da DRE.",
  };
}