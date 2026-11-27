export type MovimentoAssistencial = {
  ideAssist: number; bscmp: number; nrgui: string | number | null; catipgui: string | null;
  cdcrdexe: string | number | null; dscrdexe: string | null;
  cdcrdrec: string | number | null; dscrdrec: string | null; vrevt: string | number | null;
};
export const FONTE_ASSISTENCIAL = "view_eassistencial";
export type RegistroViewAssistencial = {
  dt_competencia: number; nr_guia: string | number | null; ds_tipo_atendimento: string | null;
  cd_prestador: string | number | null; nm_prestador: string | null;
  cd_prestador_pagamento: string | number | null; nm_prestador_pagamento: string | null;
  vl_total_pago: string | number | null;
};
export function movimentoDaView(r: RegistroViewAssistencial, indice: number): MovimentoAssistencial {
  return { ideAssist: indice, bscmp: Number(r.dt_competencia), nrgui: r.nr_guia, catipgui: r.ds_tipo_atendimento,
    cdcrdexe: r.cd_prestador, dscrdexe: r.nm_prestador,
    cdcrdrec: r.cd_prestador_pagamento, dscrdrec: r.nm_prestador_pagamento, vrevt: r.vl_total_pago };
}
export type FiltroAssistencial = { tipo?: string; executor?: string; recebedor?: string; guia?: string };
export type NoAssistencial = { chave: string; nome: string; filtro: FiltroAssistencial; valor: number; quantidade: number; percentual: number; filhos: NoAssistencial[] };
export const HOSPITAL_BENE = "HOSP BENEF PORTUGUESA DE S J RIO PRETO";
// Benê = executor código 924 (confirmado pelo Dênis); o nome antigo exato segue aceito.
export const CODIGO_BENE = "924";
export const tipoExecutor = (r: MovimentoAssistencial) => String(r.cdcrdexe ?? "").trim() === CODIGO_BENE || r.dscrdexe === HOSPITAL_BENE ? "É Benê" : "Não é Benê";
export const chaveCredenciado = (codigo: string | number | null, nome: string | null) => codigo !== null && String(codigo) !== "0" ? `codigo:${codigo}` : `nome:${nome ?? ""}`;
export const tipoGuia = (r: MovimentoAssistencial) => r.catipgui?.trim() || "Sem tipo de guia informado";
export const valorAssistencial = (r: MovimentoAssistencial) => Number(r.vrevt) || 0;
export function filtrarAssistencial(rows: MovimentoAssistencial[], f: FiltroAssistencial) {
  return rows.filter(r => (!f.tipo || tipoExecutor(r) === f.tipo) && (!f.executor || chaveCredenciado(r.cdcrdexe, r.dscrdexe) === f.executor) && (!f.recebedor || chaveCredenciado(r.cdcrdrec, r.dscrdrec) === f.recebedor) && (!f.guia || tipoGuia(r) === f.guia));
}
export function resumoAssistencial(rows: MovimentoAssistencial[]) {
  const total = rows.reduce((s, r) => s + valorAssistencial(r), 0);
  const bene = rows.filter(r => tipoExecutor(r) === "É Benê").reduce((s, r) => s + valorAssistencial(r), 0);
  return { total, bene, naoBene: total - bene, registros: rows.length };
}
export function despesaContabilAssistencial(rows: { tipo: string; g3: string; g4: string; valor: number }[]) {
  const contas = rows.filter(r => r.tipo === "A" && r.g3 === "1|PRINCIPAL" && r.g4 === "3|DESP. ASSISTENCIAL");
  // Inverte o sinal da despesa líquida; recuperações positivas reduzem o total.
  return contas.length ? -contas.reduce((s, r) => s + r.valor, 0) : null;
}
export function conciliacaoAssistencial(contabil: number | null, assistencial: number) {
  const diferenca = contabil === null ? null : contabil - assistencial;
  return { diferenca, percentual: diferenca === null || !contabil ? null : diferenca / contabil };
}
export function competenciasAssistenciais(de: string, ate: string): number[] {
  const parse = (s: string) => /^\d{4}-\d{2}$/.test(s) && Number(s.slice(5)) >= 1 && Number(s.slice(5)) <= 12 ? Number(s.slice(0, 4)) * 12 + Number(s.slice(5)) - 1 : NaN;
  const a = parse(de), b = parse(ate);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a > b) throw new Error("Período base inválido.");
  return Array.from({ length: b - a + 1 }, (_, i) => { const n = a + i; return Math.floor(n / 12) * 100 + n % 12 + 1; });
}
export function arvoreAssistencial(rows: MovimentoAssistencial[], modo: "credenciados" | "guias"): NoAssistencial[] {
  const total = resumoAssistencial(rows).total;
  const agrupar = (base: MovimentoAssistencial[], nivel: number, filtro: FiltroAssistencial): NoAssistencial[] => {
    if (nivel === 3) return [];
    const grupos = new Map<string, { nome: string; campo: keyof FiltroAssistencial; valor: string; rows: MovimentoAssistencial[] }>();
    for (const r of base) {
      const campo = nivel === 0 ? (modo === "guias" ? "guia" : "tipo") : nivel === 1 ? "executor" : "recebedor";
      const valor = campo === "tipo" ? tipoExecutor(r) : campo === "guia" ? tipoGuia(r) : campo === "executor" ? chaveCredenciado(r.cdcrdexe, r.dscrdexe) : chaveCredenciado(r.cdcrdrec, r.dscrdrec);
      const nome = campo === "executor" ? r.dscrdexe || "Executor não informado" : campo === "recebedor" ? r.dscrdrec || "Recebedor não informado" : valor;
      const g = grupos.get(valor) ?? { nome, campo, valor, rows: [] }; g.rows.push(r); grupos.set(valor, g);
    }
    return [...grupos.values()].map(g => {
      const f = { ...filtro, [g.campo]: g.valor }, valor = resumoAssistencial(g.rows).total;
      return { chave: JSON.stringify(f), nome: g.nome, filtro: f, valor, quantidade: new Set(g.rows.filter(r => r.nrgui !== null).map(r => `${r.bscmp}|${tipoGuia(r)}|${r.nrgui}`)).size, percentual: total ? valor / total : 0, filhos: agrupar(g.rows, nivel + 1, f) };
    }).sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, "pt-BR"));
  };
  return agrupar(rows, 0, {});
}
/** Limite mensal (R$ 20 mi, mesmo corte da competência válida) abaixo do qual a base é tratada como incompleta. */
export const LIMITE_MES_COMPLETO = 20_000_000;
export type MesIncompleto = { competencia: number; fonte: "Contábil" | "Assistencial"; valor: number };
/** Lista meses do período cujo total, em cada fonte, está abaixo do limite (inclui meses sem nenhum dado). */
export function mesesIncompletos(meses: number[], contabilPorMes: Map<number, number> | null, rows: { bscmp: number; vrevt: string | number | null }[]): MesIncompleto[] {
  const assist = new Map<number, number>();
  for (const r of rows) assist.set(r.bscmp, (assist.get(r.bscmp) ?? 0) + (Number(r.vrevt) || 0));
  const out: MesIncompleto[] = [];
  for (const m of meses) {
    if (contabilPorMes) { const v = contabilPorMes.get(m) ?? 0; if (v < LIMITE_MES_COMPLETO) out.push({ competencia: m, fonte: "Contábil", valor: v }); }
    const a = assist.get(m) ?? 0; if (a < LIMITE_MES_COMPLETO) out.push({ competencia: m, fonte: "Assistencial", valor: a });
  }
  return out;
}
