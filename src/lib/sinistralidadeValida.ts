// Última competência válida da view_eard_mensal (despesa total > R$ 20 milhões), compartilhada por
// Sinistralidade › Períodos, Evolução Produtos e Carteira › Painel (Assistencial).
import { hostinger } from "./hostingerClient";
import { ANO_INICIO_SINISTRALIDADE, ultimaCompetenciaValida, type Competencia } from "./sinistralidadeCompetencias";

export interface TotalMesRpc { nr_ano: number; nr_mes: number; rec_cpp: number; rec_copart: number; rec_total: number; desp_total: number }

const cacheAno = new Map<number, Promise<TotalMesRpc[]>>();
let cacheUltima: Promise<Competencia | null> | null = null;

/** Totais mensais (todos os planos) de um ano inteiro, com cache por ano. */
export function totaisDoAno(ano: number): Promise<TotalMesRpc[]> {
  let p = cacheAno.get(ano);
  if (!p) {
    p = Promise.resolve(hostinger.rpc("sinistralidade_mv_competencias", { p_ano: ano, p_ate_mes: 12 })).then(({ data, error }) => {
      if (error) throw new Error(error.message);
      return (data ?? []) as TotalMesRpc[];
    });
    p.catch(() => cacheAno.delete(ano));
    cacheAno.set(ano, p);
  }
  return p;
}

/** Procura, do ano atual para trás, o mês mais recente com despesas acima de R$ 20 milhões. */
export function carregarUltimaCompetenciaValida(hoje: Date = new Date()): Promise<Competencia | null> {
  if (!cacheUltima) {
    cacheUltima = (async () => {
      for (let ano = hoje.getUTCFullYear(); ano >= ANO_INICIO_SINISTRALIDADE; ano--) {
        const u = ultimaCompetenciaValida(await totaisDoAno(ano));
        if (u) return u;
      }
      return null;
    })();
    cacheUltima.catch(() => { cacheUltima = null; });
  }
  return cacheUltima;
}

/** Descarta os totais guardados (botão de atualizar). */
export function limparCacheSinistralidade() {
  cacheAno.clear();
  cacheUltima = null;
}
