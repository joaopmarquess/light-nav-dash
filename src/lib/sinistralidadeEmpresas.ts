export interface LinhaEmp { plano: string; faixa: string; vidas: number; recCpp: number; recCopart: number; recTotal: number; despTotal: number }

export const FAIXAS_EMP = ["00 a 18", "19 a 23", "24 a 28", "29 a 33", "34 a 38", "39 a 43", "44 a 48", "49 a 53", "54 a 58", "59 ou +"];

/** "0 a 18 anos" -> "00 a 18"; "59 anos ou mais" -> "59 ou +". */
export function normFaixa(s: string | null): string {
  const n = Number((s ?? "").match(/\d+/)?.[0]);
  if (!Number.isFinite(n) || !s) return "Sem faixa";
  return FAIXAS_EMP.find((f) => Number(f.slice(0, 2)) === n) ?? "Sem faixa";
}

/** Aceita "2290, 2490 2890" e retorna somente códigos de 4 dígitos. */
export const parsePlanos = (s: string) => [...new Set(s.split(/[^\d]+/).filter((x) => /^\d{4}$/.test(x)))];

export const competencia = (mesAno: string) => Number(mesAno.replace("-", "")); // "2026-01" -> 202601

export interface FaixaEmp { faixa: string; vidas: number; recCpp: number; recCopart: number; recTotal: number; despTotal: number; saldo: number; sin: number | null }

export function gridFaixas(linhas: LinhaEmp[]): { faixas: FaixaEmp[]; total: FaixaEmp } {
  const mk = (faixa: string, ls: LinhaEmp[]): FaixaEmp => {
    const s = (k: keyof LinhaEmp) => ls.reduce((a, l) => a + (l[k] as number), 0);
    const recTotal = s("recTotal"), despTotal = s("despTotal");
    return { faixa, vidas: s("vidas"), recCpp: s("recCpp"), recCopart: s("recCopart"), recTotal, despTotal, saldo: recTotal - despTotal, sin: recTotal ? despTotal / recTotal : null };
  };
  const extras = [...new Set(linhas.map((l) => l.faixa))].filter((f) => !FAIXAS_EMP.includes(f));
  const faixas = [...FAIXAS_EMP, ...extras].map((f) => mk(f, linhas.filter((l) => l.faixa === f)));
  return { faixas, total: mk("Total", linhas) };
}
