import { hostinger } from "@/lib/hostingerClient";

export type DreHRow = { ano: number; mes: number; tri: number; g1: string; g2: string; g3: string; g4: string; valor: number };

// Paginação sempre com ORDER BY estável: sem ordem fixa o banco repete/pula linhas entre páginas.
async function fetchAll(table: string, build: (q: any) => any): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(hostinger.from(table)).range(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const clean = (s: string | null) => (!s || s === "-" ? "" : s);

/**
 * DRE montado direto do balancete MV (demonstracoes_contabeis_oracle_mv), agrupado pelo plano 9D
 * (plano_contas_icontabil, _9d = cd_conta_contabil de 9 dígitos). Valor = movimento do mês
 * no sinal do DRE (crédito − débito), porque vl_movimento muda de sinal conforme a natureza da conta.
 */
export async function loadDreHostinger(ano = 2026, meses?: number[]): Promise<DreHRow[]> {
  const [plano, bal, cal] = await Promise.all([
    fetchAll("plano_contas_icontabil", (q) => q.select("_9d,n2,g1,g2,g3,g4").neq("g2", "-").order("_9d").order("conta").order("n2").order("g1").order("g2").order("g3").order("g4")),
    // Um mês por consulta (id da tabela é nulo): ordem estável por conta/débito/crédito
    Promise.all((meses ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).map((m) =>
      fetchAll("demonstracoes_contabeis_oracle_mv", (q) =>
        q.select("nr_mes,cd_conta_contabil,vl_debito,vl_credito").eq("nr_ano", ano).eq("nr_mes", m)
          .gte("cd_conta_contabil", 100000000).lte("cd_conta_contabil", 999999999)
          .order("cd_conta_contabil").order("vl_debito").order("vl_credito")))).then((a) => a.flat()),
    fetchAll("calendario_mensal", (q) => q.select("nr_mes,nr_trimestre").eq("nr_ano", ano).order("nr_mes", { ascending: true })),
  ]);
  const triDe = new Map<number, number>(cal.map((c) => [Number(c.nr_mes), Number(c.nr_trimestre)]));
  const pl = new Map<number, any>(plano.map((p) => [Number(p._9d), p]));
  const agg = new Map<string, DreHRow>();
  for (const r of bal) {
    const p = pl.get(Number(r.cd_conta_contabil));
    if (!p || !clean(p.g1)) continue;
    // Impostos Federais: somente contas do N2 61 (nunca o 69 – Apuração do Resultado)
    if (/IMPOSTOS FEDERAIS/i.test(p.g1) && !String(p.n2 || "").startsWith("61|")) continue;
    const mes = Number(r.nr_mes);
    const k = [mes, p.g1, p.g2, p.g3, p.g4].join("~");
    const row = agg.get(k) ?? { ano, mes, tri: triDe.get(mes) ?? Math.ceil(mes / 3), g1: clean(p.g1), g2: clean(p.g2), g3: clean(p.g3), g4: clean(p.g4), valor: 0 };
    row.valor += (Number(r.vl_credito) || 0) - (Number(r.vl_debito) || 0);
    agg.set(k, row);
  }
  return Array.from(agg.values()).filter((r) => Math.abs(r.valor) > 0.005);
}
