import { hostinger } from "@/lib/hostingerClient";
import { fetchAll, loadDreHostinger, loadMesesDemonstracoes } from "./dreHostinger";
import type { ContaIa, CuboDreIa, ConsultaDreIa } from "./dreIa";

/** Cubo Contábil: balancete MV atualizável (mesma fonte das Demonstrações), contas de 9 dígitos do plano 9D. */
export const FONTE_CONTABIL_IA = "demonstracoes_contabeis_oracle_mv";
const limpa = (s: unknown) => (!s || s === "-" ? "" : String(s));
let planoCache: Promise<Map<number, any>> | null = null;
const plano = () => (planoCache ??= fetchAll("plano_contas_icontabil", (q) => q.select("_9d,conta,g1,g2,g3,g4").order("_9d").order("conta"))
  .then((ps) => new Map(ps.map((p) => [Number(p._9d), p]))).catch((e) => { planoCache = null; throw e; }));

export async function carregarContabilIa(ano: number, meses: number[]): Promise<ContaIa[]> {
  try {
    const pl = await plano();
    const linhas: ContaIa[] = [];
    for (const mes of meses) {
      const bal = await fetchAll(FONTE_CONTABIL_IA, (q) => q.select("cd_conta_contabil,vl_debito,vl_credito,vl_saldo_inicial,vl_saldo_final").eq("nr_ano", ano).eq("nr_mes", mes)
        .gte("cd_conta_contabil", 100000000).lte("cd_conta_contabil", 999999999).order("cd_conta_contabil").order("vl_debito").order("vl_credito"));
      for (const r of bal) {
        const p = pl.get(Number(r.cd_conta_contabil));
        const debito = Number(r.vl_debito) || 0, credito = Number(r.vl_credito) || 0;
        linhas.push({ ano, mes, tri: Math.ceil(mes / 3), conta: String(r.cd_conta_contabil), descricao: String(p?.conta ?? ""), tipo: "A", g1: limpa(p?.g1), g2: limpa(p?.g2), g3: limpa(p?.g3), g4: limpa(p?.g4), valor: credito - debito, debito, credito, saldoInicial: Number(r.vl_saldo_inicial) || 0, saldoFinal: Number(r.vl_saldo_final) || 0 });
      }
    }
    return linhas;
  } catch (e) { throw new Error(`Não foi possível carregar o cubo Contábil: ${e instanceof Error ? e.message : String(e)}`); }
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