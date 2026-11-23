// Busca na base externa a sinistralidade dos contratos internos da tela de Inadimplência (regras em inadimplenciaSinistralidade.ts).
import { hostinger } from "./hostingerClient";
import { carregarUltimaCompetenciaValida } from "./sinistralidadeValida";
import { CAMPOS_DESP, CAMPOS_REC, type LinhaEard } from "./sinistralidadeCompetencias";
import { faixaMatAlternativa, periodoSinistralidade, somarPorContrato, type SomaContrato } from "./inadimplenciaSinistralidade";

const CONTRATOS_POR_CONSULTA = 40;
const MATRICULAS_POR_CONSULTA = 150;
const PARALELO = 4;

const lotes = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

async function emParalelo<T, R>(itens: T[], f: (x: T) => Promise<R>, aoAvancar: () => void): Promise<R[]> {
  const out: R[] = new Array(itens.length);
  let prox = 0;
  await Promise.all(Array.from({ length: Math.min(PARALELO, itens.length) }, async () => {
    while (prox < itens.length) { const i = prox++; out[i] = await f(itens[i]); aoAvancar(); }
  }));
  return out;
}

export type ResultadoSinistralidade = { periodo: { de: number; ate: number }; porContrato: Map<string, SomaContrato> };

/** Contratos internos → matrículas (beneficiarios) → receitas/despesas do período (view_eard_mensal). */
export async function carregarSinistralidadeContratos(
  contratos: string[], aoProgredir?: (feito: number, total: number) => void,
): Promise<ResultadoSinistralidade> {
  const ultima = await carregarUltimaCompetenciaValida();
  if (!ultima) throw new Error("Não há competência válida de sinistralidade na base.");
  const periodo = periodoSinistralidade(ultima);
  const lotesContrato = lotes([...new Set(contratos)].sort(), CONTRATOS_POR_CONSULTA);
  let feito = 0, total = lotesContrato.length * 2;
  const avancar = () => aoProgredir?.(++feito, total);

  const benef = (await emParalelo(lotesContrato, async (lote) => {
    const or = lote.map((ci) => { const f = faixaMatAlternativa(ci); return `and(cd_mat_alternativa.gte.${f.de},cd_mat_alternativa.lte.${f.ate})`; }).join(",");
    const { data, error } = await hostinger.from("beneficiarios").select("cd_matricula,cd_mat_alternativa").or(or).limit(5000);
    if (error) throw error;
    return (data ?? []) as { cd_matricula: number; cd_mat_alternativa: string }[];
  }, avancar)).flat();

  const lotesMat = lotes([...new Set(benef.map((b) => b.cd_matricula))], MATRICULAS_POR_CONSULTA);
  total = feito + lotesMat.length; aoProgredir?.(feito, total);
  const colunas = ["cd_matricula", ...CAMPOS_REC, ...CAMPOS_DESP].join(",");
  const eard = (await emParalelo(lotesMat, async (lote) => {
    const linhas: (LinhaEard & { cd_matricula: number })[] = [];
    for (let de = 0; ; de += 1000) {
      const { data, error } = await hostinger.from("view_eard_mensal").select(colunas).in("cd_matricula", lote)
        .gte("dt_competencia", periodo.de).lte("dt_competencia", periodo.ate)
        .order("cd_matricula").order("dt_competencia").range(de, de + 999);
      if (error) throw error;
      linhas.push(...((data ?? []) as unknown as (LinhaEard & { cd_matricula: number })[]));
      if (!data || data.length < 1000) break;
    }
    return linhas;
  }, avancar)).flat();

  return { periodo, porContrato: somarPorContrato(benef, eard) };
}
