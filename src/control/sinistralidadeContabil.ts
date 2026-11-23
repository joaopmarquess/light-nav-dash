import { hostinger } from "@/lib/hostingerClient";
import { C_BENSAUDE, mergeQuarters, sinistralidadeContabilAns, type CFile } from "@/control/benchC";
import { loadCPeriods, loadCQuarter } from "@/control/benchCLoader";

/** Movimentos do balancete MV (crédito − débito) no formato das contas ANS: [conta, mês, valor]. */
export function arquivoContasMv(movs: { nr_mes: number | string; cd_conta_contabil: number | string; vl_debito: number | string | null; vl_credito: number | string | null }[]): CFile {
  return { n: {}, r: movs.map((m) => [Number(m.cd_conta_contabil), Number(m.nr_mes), (Number(m.vl_credito) || 0) - (Number(m.vl_debito) || 0)]) };
}

async function contasMes(ano: number, mes: number, de: number, ate: number) {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await hostinger.from("demonstracoes_contabeis_oracle_mv")
      .select("nr_mes,cd_conta_contabil,vl_debito,vl_credito").eq("nr_ano", ano).eq("nr_mes", mes)
      .gte("cd_conta_contabil", de).lte("cd_conta_contabil", ate)
      .order("cd_conta_contabil").order("vl_debito").order("vl_credito").range(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const cache = new Map<string, Promise<number | null>>();
const lembrar = (k: string, f: () => Promise<number | null>) => {
  if (!cache.has(k)) cache.set(k, f().catch((e) => { cache.delete(k); throw e; }));
  return cache.get(k) as Promise<number | null>;
};

/** Demonstrações: contas 411 ÷ contas 311 do balancete MV nos meses do período. */
export const sinistralidadeContabilMv = (ano: number, meses: number[]) => lembrar(`mv:${ano}:${meses.join(",")}`, async () => {
  if (!meses.length) return null;
  const movs = (await Promise.all(meses.flatMap((m) => [contasMes(ano, m, 311000000, 311999999), contasMes(ano, m, 411000000, 411999999)]))).flat();
  return sinistralidadeContabilAns(arquivoContasMv(movs), [meses])[0];
});

/** Histórico: contas 411 ÷ contas 311 do Bensaúde nos arquivos trimestrais da ANS (mesma fonte do Bench), no ano todo. */
export const sinistralidadeContabilAnsAno = (ano: number) => lembrar(`ans:${ano}`, async () => {
  const periodos = await loadCPeriods(ano);
  if (periodos.year !== ano || !periodos.quarters.length) return null;
  const arquivos = await Promise.all(periodos.quarters.map((q) => loadCQuarter(ano, q)));
  return sinistralidadeContabilAns(mergeQuarters(arquivos, C_BENSAUDE), [periodos.quarters])[0];
});
