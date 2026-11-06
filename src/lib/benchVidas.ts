import Papa from "papaparse";

export const TIPOS_VIDAS = ["saldo", "adesoes", "cancelamentos"] as const;
export type TipoVidas = typeof TIPOS_VIDAS[number];
export const PLANOS_VIDAS = ["PIF", "PCA", "PCE"] as const;
export type PlanoVidas = typeof PLANOS_VIDAS[number];
export const ROTULOS_VIDAS: Record<TipoVidas, string> = { saldo: "Saldo de vidas", adesoes: "Adesões", cancelamentos: "Cancelamentos" };
export type BenchVida = { operadora: string; nome: string; competencia: string; ano: number; mes: number; segmentacao: string; plano: PlanoVidas; tipo: TipoVidas; vidas: number };
export type MesVidas = { competencia: string; ano: number; mes: number; saldo: number; adesoes: number; cancelamentos: number; planos: Record<PlanoVidas, Record<TipoVidas, number>> };

export function parseBenchVidas(csv: string): BenchVida[] {
  const parsed = Papa.parse<Record<string, string>>(csv.replace(/^\uFEFF/, ""), { header: true, skipEmptyLines: true });
  if (parsed.errors.length) throw new Error("Não foi possível ler o CSV de vidas.");
  return parsed.data.map(r => {
    const competencia = r.mesano;
    const vidas = Number(r.vidas);
    if (!/^\d{4}(0[1-9]|1[0-2])$/.test(competencia) || !TIPOS_VIDAS.includes(r.tipo as TipoVidas) || !PLANOS_VIDAS.includes(r.contratacao as PlanoVidas) || !Number.isFinite(vidas) || vidas < 0 || !r["cod.operadora"] || !r.nome_ops) throw new Error("O CSV contém um registro de vidas inválido.");
    return { operadora: r["cod.operadora"], nome: r.nome_ops, competencia, ano: Number(competencia.slice(0, 4)), mes: Number(competencia.slice(4)), segmentacao: r.segmentacao, plano: r.contratacao as PlanoVidas, tipo: r.tipo as TipoVidas, vidas };
  });
}

export function mesesBenchVidas(dados: BenchVida[], operadora: string, ano: number, plano = "todos", segmentacao = "todos"): MesVidas[] {
  const meses = new Map<string, MesVidas>();
  dados.filter(r => r.operadora === operadora && r.ano === ano && (plano === "todos" || r.plano === plano) && (segmentacao === "todos" || r.segmentacao === segmentacao)).forEach(r => {
    let mes = meses.get(r.competencia);
    if (!mes) {
      mes = { competencia: r.competencia, ano: r.ano, mes: r.mes, saldo: 0, adesoes: 0, cancelamentos: 0, planos: { PIF: { saldo: 0, adesoes: 0, cancelamentos: 0 }, PCA: { saldo: 0, adesoes: 0, cancelamentos: 0 }, PCE: { saldo: 0, adesoes: 0, cancelamentos: 0 } } };
      meses.set(r.competencia, mes);
    }
    mes[r.tipo] += r.vidas;
    mes.planos[r.plano][r.tipo] += r.vidas;
  });
  return [...meses.values()].sort((a, b) => a.competencia.localeCompare(b.competencia));
}

// Saldo is a monthly snapshot supplied by the CSV, never a sum over months or net movement.
export function resumoBenchVidas(meses: MesVidas[]) {
  return { saldo: meses.at(-1)?.saldo ?? 0, adesoes: meses.reduce((s, m) => s + m.adesoes, 0), cancelamentos: meses.reduce((s, m) => s + m.cancelamentos, 0) };
}

export const nomeBenchVidas = (nome: string) => nome === "Bensaude" ? "Bensaúde" : nome === "unimed" ? "Unimed" : nome;
export const competenciaVidas = (competencia: string) => `${competencia.slice(4)}/${competencia.slice(0, 4)}`;