import { hostinger } from "@/lib/hostingerClient";
import { carregarContabilIa } from "@/control/dreIaCarga";
import { competenciasAssistenciais, despesaContabilAssistencial, FONTE_ASSISTENCIAL, movimentoDaView, type RegistroViewAssistencial, type MovimentoAssistencial } from "./analiseDespesasAssistenciais";

export async function ultimaCompetenciaAssistencial() {
  const { data, error } = await hostinger.from(FONTE_ASSISTENCIAL).select("dt_competencia").not("dt_competencia", "is", null).order("dt_competencia", { ascending: false }).limit(1);
  if (error) throw error;
  const n = Number(data?.[0]?.dt_competencia);
  return n ? `${Math.floor(n / 100)}-${String(n % 100).padStart(2, "0")}` : "";
}
export async function carregarAnaliseAssistencial(de: string, ate: string, signal: AbortSignal, progresso: (n: number) => void) {
  const meses = competenciasAssistenciais(de, ate);
  const rows: MovimentoAssistencial[] = [];
  const contabeis = new Map<number, number[]>();
  for (const m of meses) { const ano = Math.floor(m / 100); contabeis.set(ano, [...(contabeis.get(ano) ?? []), m % 100]); }
  const contabilidade = Promise.all([...contabeis].map(([ano, ms]) => carregarContabilIa(ano, ms))).then(rs => { const todas = rs.flat(); const porMes = new Map<number, number>(); for (const m of meses) porMes.set(m, despesaContabilAssistencial(todas.filter(r => r.ano * 100 + r.mes === m)) ?? 0); return { valor: despesaContabilAssistencial(todas), porMes, erro: null as unknown }; }).catch(erro => ({ valor: null, porMes: null, erro }));
  try {
    for (const mes of meses) {
      // Fast path: server-side monthly summary (supabase/sql/assistencial_resumo_mes.sql) in one response.
      const resumo = await hostinger.rpc("assistencial_resumo_mes", { p_competencia: mes }).abortSignal(signal);
      if (!resumo.error && Array.isArray(resumo.data)) {
        const inicio = rows.length;
        (resumo.data as unknown[][]).forEach((a, i) => rows.push(movimentoDaView({ dt_competencia: mes, nr_guia: a[0], ds_tipo_atendimento: a[1], cd_prestador: a[2], nm_prestador: a[3], cd_prestador_pagamento: a[4], nm_prestador_pagamento: a[5], vl_total_pago: a[6] } as RegistroViewAssistencial, inicio + i)));
        progresso(rows.length); continue;
      }
      let offset = 0;
      while (true) {
        signal.throwIfAborted();
        // The view has no event ID: page by offset with an order covering every selected field.
        const q = hostinger.from(FONTE_ASSISTENCIAL)
          .select("dt_competencia,nr_guia,ds_tipo_atendimento,cd_prestador,nm_prestador,cd_prestador_pagamento,nm_prestador_pagamento,vl_total_pago")
          .eq("dt_competencia", mes).order("nr_guia").order("ds_tipo_atendimento")
          .order("cd_prestador").order("nm_prestador").order("cd_prestador_pagamento")
          .order("nm_prestador_pagamento").order("vl_total_pago")
          .range(offset, offset + 999).abortSignal(signal);
        const { data, error } = await q;
        if (error) throw error;
        const lote = (data ?? []) as RegistroViewAssistencial[];
        const inicio = rows.length;
        rows.push(...lote.map((r, i) => movimentoDaView(r, inicio + i))); progresso(rows.length);
        if (lote.length < 1000) break;
        offset += lote.length;
      }
    }
    const c = await contabilidade; signal.throwIfAborted();
    return { rows, meses, contabil: c.valor, contabilPorMes: c.porMes, erroContabil: c.erro };
  } catch (e) { await contabilidade; throw e; }
}