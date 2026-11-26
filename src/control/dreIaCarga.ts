import { hostinger } from "@/lib/hostingerClient";
import { loadDreHostinger, loadMesesDemonstracoes } from "./dreHostinger";
import type { ContaIa, CuboDreIa, ConsultaDreIa } from "./dreIa";

export const FONTE_CONTABIL_IA = "icontabil";
export async function carregarContabilIa(ano: number, meses: number[]): Promise<ContaIa[]> {
  const linhas: ContaIa[] = [];
  for (const mes of meses) for (let inicio = 0; ; inicio += 1000) {
    const { data, error } = await hostinger.from(FONTE_CONTABIL_IA)
      .select("nr_ano,nr_mes,nr_trimestre,cd_contabil,cd_reduzido,ds_conta,tp_conta,g1,g2,g3,g4,realizado,vl_debito,vl_credito,vl_saldo_inicial,vl_saldo_final")
      .eq("nr_ano", ano).eq("nr_mes", mes).eq("tp_conta", "A")
      .order("cd_contabil").order("cd_reduzido").order("vl_debito").order("vl_credito").order("realizado").range(inicio, inicio + 999);
    if (error) throw new Error(`Não foi possível carregar o cubo Contábil: ${error.message}`);
    for (const r of data ?? []) linhas.push({ ano, mes, tri: Number(r.nr_trimestre) || Math.ceil(mes / 3), conta: String(r.cd_contabil ?? ""), descricao: String(r.ds_conta ?? ""), tipo: String(r.tp_conta ?? ""), g1: String(r.g1 ?? ""), g2: String(r.g2 ?? ""), g3: String(r.g3 ?? ""), g4: String(r.g4 ?? ""), valor: Number(r.realizado) || 0, debito: Number(r.vl_debito) || 0, credito: Number(r.vl_credito) || 0, saldoInicial: Number(r.vl_saldo_inicial) || 0, saldoFinal: Number(r.vl_saldo_final) || 0 });
    if (!data || data.length < 1000) break;
  }
  return linhas;
}

/** Cache isolado da instância do chat; a DRE atual reaproveita exatamente as linhas da tela. */
export function criarConsultaDreIa(atual: () => CuboDreIa | null) {
  const cache = new Map<string, Promise<CuboDreIa>>();
  return async (q: ConsultaDreIa): Promise<CuboDreIa> => {
    const tela = atual();
    if (!tela) throw new Error("A DRE ainda está carregando.");
    const ano = q.ano ?? tela.ano;
    if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) throw new Error("Ano inválido.");
    const chave = `${ano}:${q.cubo}`;
    let pedido = cache.get(chave);
    if (!pedido) {
      pedido = (async () => {
        const meses = ano === tela.ano ? tela.meses : await loadMesesDemonstracoes(ano);
        if (!meses.length) throw new Error(`Não há meses fechados disponíveis na DRE de ${ano}.`);
        return { ano, meses, fonteContabil: FONTE_CONTABIL_IA, rows: q.cubo === "dre" ? (ano === tela.ano ? tela.rows : await loadDreHostinger(ano, meses)) : [], ...(q.cubo === "contabil" ? { contas: await carregarContabilIa(ano, meses) } : {}) };
      })();
      cache.set(chave, pedido);
      pedido.catch(() => cache.delete(chave));
    }
    return pedido;
  };
}