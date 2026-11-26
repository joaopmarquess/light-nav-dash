import { hostinger } from "@/lib/hostingerClient";
import { carregarContabilIa } from "@/control/dreIaCarga";
import { competenciasAssistenciais, despesaContabilAssistencial, type MovimentoAssistencial } from "./analiseDespesasAssistenciais";

export async function ultimaCompetenciaAssistencial() {
  const { data, error } = await hostinger.from("assistencial").select("bscmp").not("bscmp", "is", null).order("bscmp", { ascending: false }).limit(1);
  if (error) throw error;
  const n = Number(data?.[0]?.bscmp);
  return n ? `${Math.floor(n / 100)}-${String(n % 100).padStart(2, "0")}` : "";
}
export async function carregarAnaliseAssistencial(de: string, ate: string, signal: AbortSignal, progresso: (n: number) => void) {
  const meses = competenciasAssistenciais(de, ate);
  const rows: MovimentoAssistencial[] = [];
  const contabeis = new Map<number, number[]>();
  for (const m of meses) { const ano = Math.floor(m / 100); contabeis.set(ano, [...(contabeis.get(ano) ?? []), m % 100]); }
  const contabilidade = Promise.all([...contabeis].map(([ano, ms]) => carregarContabilIa(ano, ms))).then(rs => ({ valor: despesaContabilAssistencial(rs.flat()), erro: null as unknown })).catch(erro => ({ valor: null, erro }));
  try {
    for (const mes of meses) {
      let ultimo: number | null = null;
      while (true) {
        signal.throwIfAborted();
        let q = hostinger.from("assistencial").select("ideAssist,bscmp,nrgui,catipgui,cdcrdexe,dscrdexe,cdcrdrec,dscrdrec,vrevt").eq("bscmp", mes).order("ideAssist").limit(1000).abortSignal(signal);
        if (ultimo !== null) q = q.gt("ideAssist", ultimo);
        const { data, error } = await q;
        if (error) throw error;
        const lote = (data ?? []) as MovimentoAssistencial[];
        rows.push(...lote); progresso(rows.length);
        if (lote.length < 1000) break;
        const proximo = Number(lote[lote.length - 1]?.ideAssist);
        if (!Number.isFinite(proximo) || (ultimo !== null && proximo <= ultimo)) throw new Error("Não foi possível garantir a leitura completa da base assistencial.");
        ultimo = proximo;
      }
    }
    const c = await contabilidade; signal.throwIfAborted();
    return { rows, contabil: c.valor, erroContabil: c.erro };
  } catch (e) { await contabilidade; throw e; }
}