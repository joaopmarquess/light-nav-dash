import Papa from "papaparse";
import { valorDreAns, type BenchRow } from "./benchClassification";
import { dreMargin } from "./dreMargin";
export type COperator = { reg: string; nome: string; modalidade: string | null; uf: string | null };
export type CFile = { n: Record<string, string>; r: [number, number, number][]; saldosFinais?: true };
export type CPeriods = { years: number[]; year: number; quarters: number[]; source: string };
export const C_BENSAUDE = "366561";
export const C_SUGGESTED = ["335100", "327417", "350249"];
export function benchYears(years: number[]): number[] {
  return years.filter(year => year >= 2015);
}
/** Filter labels only; keep the authoritative CADOP name untouched. */
export function operatorFilterName(fullName: string): string {
  const name = fullName.trim().replace(/\s+/g, " ");
  const unimed = /\bunimed\b/i.exec(name);
  if (!unimed) return name.split(" ")[0] ?? "";
  const city = name.slice(unimed.index + unimed[0].length)
    .replace(/^\s*(?:[-–—:]\s*)?(?:de\s+)?/i, "")
    .split(/\s*[-–—,;()]\s*|\s+\b(?:cooperativa|coop\.?|sociedade|soc\.?|federa[çc][aã]o|central|trabalho|m[eé]dic[oa]|ltda\.?|s\.?\s*\/\s*a\.?)\b/i)[0]
    ?.trim();
  return city ? `UNIMED ${city}` : "UNIMED";
}
export function decodeAns(bytes: Uint8Array): string {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { return new TextDecoder("windows-1252").decode(bytes); }
}
const value = (row: Record<string, string>, key: string) => (row[key] ?? "").trim();
export function parseCatalog(text: string): COperator[] {
  return Papa.parse<Record<string, string>>(text, { header: true, delimiter: ";", skipEmptyLines: true, transformHeader: h => h.replace(/^\uFEFF/, "").trim().toUpperCase() }).data
    .filter(r => /^\d{6}$/.test(value(r, "REGISTRO_OPERADORA")))
    .map(r => ({ reg: value(r, "REGISTRO_OPERADORA"), nome: value(r, "NOME_FANTASIA") || value(r, "RAZAO_SOCIAL"), modalidade: value(r, "MODALIDADE") || null, uf: value(r, "UF") || null }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
function decimal(raw: string): number {
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const result = Number(normalized);
  if (!raw || !Number.isFinite(result)) throw new Error("Saldo inválido no arquivo da ANS.");
  return result;
}
/** Preserve 9D closing balances until all quarters are loaded; synthetic rows only name the hierarchy. */
export function aggregateQuarter(text: string, quarter: number): Record<string, CFile> {
  const result: Record<string, CFile> = {};
  const totals = new Map<string, Map<number, number>>();
  let valid = false;
  Papa.parse<Record<string, string>>(text, {
    header: true, delimiter: ";", skipEmptyLines: true, transformHeader: h => h.replace(/^\uFEFF/, "").trim().toUpperCase(),
    step: ({ data: row, meta }) => {
      if (!meta.fields?.includes("REG_ANS") || !meta.fields.includes("VL_SALDO_FINAL")) throw new Error("Colunas trimestrais da ANS não reconhecidas.");
      const reg = value(row, "REG_ANS").padStart(6, "0"), code = value(row, "CD_CONTA_CONTABIL");
      if (!/^\d{6}$/.test(reg) || !/^(3|4|61)\d*$/.test(code)) return;
      const file = result[reg] ?? (result[reg] = { n: {}, r: [], saldosFinais: true });
      if ([2, 3, 4, 5].includes(code.length)) { file.n[code] = value(row, "DESCRICAO"); return; }
      if (code.length !== 9) return;
      const closingBalance = decimal(value(row, "VL_SALDO_FINAL"));
      const sums = totals.get(reg) ?? new Map<number, number>();
      sums.set(Number(code), (sums.get(Number(code)) ?? 0) + closingBalance);
      totals.set(reg, sums); valid = true;
    },
  });
  if (!valid) throw new Error("Nenhuma conta DRE 9D encontrada no trimestre.");
  for (const [reg, sums] of totals) result[reg].r = [...sums].map(([code, movement]) => [code, quarter, Math.round(movement * 100) / 100]);
  return result;
}
export function mergeQuarters(files: Record<string, CFile>[], reg: string): CFile {
  const closings = new Map<number, Map<number, number>>();
  const available = new Set<number>();
  for (const file of files) {
    for (const op of Object.values(file)) {
      if (op.saldosFinais) for (const [, quarter] of op.r) available.add(quarter);
    }
    if (!file[reg]?.saldosFinais) continue;
    for (const [code, quarter, balance] of file[reg].r) {
      const accounts = closings.get(quarter) ?? new Map<number, number>();
      accounts.set(code, (accounts.get(code) ?? 0) + balance);
      closings.set(quarter, accounts);
    }
  }
  for (const quarter of available) {
    if (quarter > 1 && !available.has(quarter - 1)) throw new Error(`Saldo inicial do ${quarter}º trimestre indisponível: falta o arquivo do ${quarter - 1}º trimestre.`);
  }
  const merged: CFile = { n: {}, r: [] };
  for (const file of files) {
    const operator = file[reg];
    if (!operator) continue;
    Object.assign(merged.n, operator.n);
    if (!operator.saldosFinais) merged.r.push(...operator.r);
  }
  for (const [quarter, accounts] of [...closings].sort(([a], [b]) => a - b)) {
    // Include accounts that disappeared this quarter, so their prior balance is reversed.
    const previous = quarter === 1 ? new Map<number, number>() : closings.get(quarter - 1) ?? new Map<number, number>();
    for (const code of new Set([...accounts.keys(), ...previous.keys()])) {
      merged.r.push([code, quarter, Math.round(((accounts.get(code) ?? 0) - (previous.get(code) ?? 0)) * 100) / 100]);
    }
  }
  return merged;
}
export function faturamentoAns(file: CFile, periods: number[][]): number[] {
  return periods.map(quarters => file.r.reduce((total, [code, quarter, movement]) =>
    String(code).startsWith("3111") && quarters.includes(quarter) ? total + movement : total, 0));
}
export function operatorResults(files: Record<string, CFile>[], regs: string[], catalog: COperator[]) {
  const names = new Map(catalog.map(op => [op.reg, op.nome]));
  return [...new Set(regs)].map(reg => {
    const file = mergeQuarters(files, reg);
    const result = file.r.reduce((total, [code, , movement]) => total + (valorDreAns({ cd_conta_contabil: code, vl_movimento: movement } as BenchRow) ?? 0), 0);
    const faturamento = Math.round((faturamentoAns(file, [[...new Set(file.r.map(([, quarter]) => quarter))]])[0] ?? 0) * 100) / 100;
    const resultado = Math.round(result * 100) / 100;
    return { reg, nome: names.get(reg) ?? reg, resultado, faturamento, percentual: dreMargin(resultado, faturamento), disponivel: file.r.length > 0 };
  });
}