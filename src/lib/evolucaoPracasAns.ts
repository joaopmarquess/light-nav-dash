import { agregarMensal, TIPOS_PRODUTO, type CatalogoMensal } from "@/lib/benchVidasMensal";
import { carregarVidasMensal } from "@/lib/benchVidasMensalDados";
import type { LinhaPracaMes } from "@/lib/evolucaoProdutos";

/** Bensaúde na ANS: mesma OPS e mesmo filtro "Tipo Produto: Plano de Saúde" do Bench Vidas Mensal. */
export const OPS_BENSAUDE_ANS = "366561";
export const TIPO_PLANO_SAUDE = TIPOS_PRODUTO.indexOf("Plano de Saúde");

/** A ANS só tem o total de Plano de Saúde do Bensaúde: só compara vidas, com Tipo e Produto em "Todos". */
export function podeIncluirAns(o: { visao: string; tipo: string | null; produto: string | null }) {
  return o.visao === "Vidas" && !o.tipo && !o.produto;
}

const competencia = (rotulo: string) => { const m = /^(\d{2})\/(\d{4})$/.exec(rotulo); return m ? Number(m[2]) * 100 + Number(m[1]) : null; };

/** Ativos de Plano de Saúde por mês ("MM/AAAA"), na mesma soma da linha Total do Bench Vidas Mensal. */
export function ansPlanoSaudePorMes(linhasAns: number[][], catalogo: CatalogoMensal, de: number, ate: number): Map<string, number> {
  const r = agregarMensal(linhasAns, "A", catalogo, { de, ate, detalhar: "contratacao", filtros: { tipoProduto: TIPO_PLANO_SAUDE } });
  return new Map(r.competencias.map((c) => [`${String(c % 100).padStart(2, "0")}/${Math.floor(c / 100)}`, r.total.get(c)!.ativos]));
}

export type LinhaPracaAns = LinhaPracaMes & { ans: number | null; diferenca: number | null; diferencaPct: number | null };
/** Acrescenta a ANS e a diferença Total Geral − ANS (% sobre a ANS); mês sem um dos dois fica sem diferença. */
export function comAns(linhas: LinhaPracaMes[], ans: Map<string, number>): LinhaPracaAns[] {
  return linhas.filter((l) => competencia(l.rotulo) != null).map((l) => {
    const a = ans.get(l.rotulo) ?? null;
    const diferenca = a != null && l.total != null ? l.total - a : null;
    return { ...l, ans: a, diferenca, diferencaPct: diferenca != null && a ? diferenca / a : null };
  });
}

/** Carrega os arquivos mensais da ANS só dos anos do grid (o catálogo, grande, vem sob demanda). */
export async function carregarAnsPlanoSaude(linhas: LinhaPracaMes[]): Promise<Map<string, number>> {
  const comps = linhas.map((l) => competencia(l.rotulo)).filter((c): c is number => c != null);
  if (!comps.length) return new Map();
  const de = Math.min(...comps), ate = Math.max(...comps);
  const anos: number[] = []; for (let a = Math.floor(de / 100); a <= Math.floor(ate / 100); a++) anos.push(a);
  const [catalogo, dados] = await Promise.all([
    import("@/data/benchVidas/mensal/catalogo.json").then((m) => m.default as unknown as CatalogoMensal),
    carregarVidasMensal(OPS_BENSAUDE_ANS, anos, "A"),
  ]);
  return ansPlanoSaudePorMes(dados, catalogo, de, ate);
}
