export type BenchRow = { operadora: string; nr_ano: number; nr_trimestre: number; nr_semestre: number; cd_operadora_ans: number; cd_conta_contabil: number; ds_descricao: string; vl_saldo_inicial: number; vl_saldo_final: number; vl_movimento: number };
export type BenchPlanRow = { _9d: number | string; g1: string | null; g2: string | null; g3: string | null; g4: string | null; n2?: string | null; n3?: string | null; n4?: string | null; n5?: string | null };
export type ClassifiedBenchRow = BenchRow & { g1: string; g2: string; g3: string; g4: string; classificada: boolean };
const cleanGroup = (value: string | null) => !value || value === "-" ? "" : value;
export function ordenarOperadorasAns(operators: string[]): string[] {
  const priority = (name: string) => {
    if (/bensa[uú]de/i.test(name)) return 0;
    if (/unimed/i.test(name)) return 1;
    if (/austacl[ií]nicas/i.test(name)) return 2;
    if (/h\.?\s*b\.?\s*sa[uú]de/i.test(name)) return 3;
    return 4;
  };
  return [...new Set(operators)].sort((a, b) => priority(a) - priority(b) || a.localeCompare(b, "pt-BR"));
}
/** Unimed tries progressively shorter prefixes; only unanimous G1–G4 matches are safe. */
export function classificarBenchAns(rows: BenchRow[], plano: BenchPlanRow[]): ClassifiedBenchRow[] {
  const byCode = new Map(plano.map(p => [Number(p._9d), p]));
  const lengths = [9, 7, 6, 5, 4, 2];
  const indexes = lengths.map(length => ({ length, matches: new Map<string, BenchPlanRow | null>() }));
  const signature = (p: BenchPlanRow) => JSON.stringify([p.g1, p.g2, p.g3, p.g4].map(cleanGroup));
  for (const p of plano) {
    const code = String(p._9d).trim();
    if (!/^\d{2,9}$/.test(code) || !cleanGroup(p.g1) || !cleanGroup(p.g2)) continue;
    for (const { length, matches } of indexes) {
      if (code.length < length) continue;
      const prefix = code.slice(0, length);
      if (!matches.has(prefix)) matches.set(prefix, p);
      else {
        const current = matches.get(prefix);
        if (current && signature(current) !== signature(p)) matches.set(prefix, null);
      }
    }
  }
  return rows.map(row => {
    const exact = byCode.get(Number(row.cd_conta_contabil));
    let p: BenchPlanRow | undefined;
    if (/unimed/i.test(row.operadora ?? "")) {
      const code = String(row.cd_conta_contabil);
      for (const { length, matches } of indexes) {
        if (code.length < length) continue;
        const candidate = matches.get(code.slice(0, length));
        if (candidate) { p = candidate; break; }
      }
    } else if (exact && cleanGroup(exact.g1) && cleanGroup(exact.g2)) p = exact;
    const classificada = Boolean(p && cleanGroup(p.g1) && cleanGroup(p.g2));
    return { ...row, classificada, g1: classificada && p ? cleanGroup(p.g1) : "99|NÃO CLASSIFICADAS", g2: classificada && p ? cleanGroup(p.g2) : `${row.cd_conta_contabil}|${row.ds_descricao}`, g3: classificada && p ? cleanGroup(p.g3) : "", g4: classificada && p ? cleanGroup(p.g4) : "" };
  });
}
export function valorDreAns(row: BenchRow): number | null {
  const code = String(row.cd_conta_contabil);
  if (code.startsWith("3")) return Number(row.vl_movimento);
  if (code.startsWith("4") || code.startsWith("61")) return -Number(row.vl_movimento);
  return null;
}
export const formatAns = (n: number) => Math.abs(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/^/, n < 0 ? "(" : "") + (n < 0 ? ")" : "");

/** Accounting hierarchy for every operator, independent from management classifications. */
export function hierarquiaContabilAns(rows: BenchRow[], plano: BenchPlanRow[]): ClassifiedBenchRow[] {
  const names = new Map<string, string>();
  const conflicts = new Set<string>();
  for (const p of plano) {
    for (const depth of [2, 3, 4, 5] as const) {
      const value = p[`n${depth}`]?.trim();
      if (!value || value === "-") continue;
      const separator = value.indexOf("|");
      if (separator < 0) continue;
      const code = value.slice(0, separator).trim();
      const name = value.slice(separator + 1).trim();
      if (code.length !== depth || !/^\d+$/.test(code) || !name) continue;
      const previous = names.get(code);
      if (previous && previous !== name) conflicts.add(code);
      else names.set(code, name);
    }
  }
  // An actual synthetic account row may supply a missing name; never use a 9D leaf's description.
  for (const row of rows) {
    const code = String(row.cd_conta_contabil);
    if ([2, 3, 4, 5].includes(code.length) && !names.has(code)) names.set(code, row.ds_descricao);
  }
  return rows.map(row => {
    const code = String(row.cd_conta_contabil);
    const group = (depth: number) => {
      if (code.length < depth) return "";
      const prefix = code.slice(0, depth);
      const name = conflicts.has(prefix) ? undefined : names.get(prefix);
      return `${prefix}|${prefix} · ${name || "Nome não disponível"}`;
    };
    return { ...row, classificada: true, g1: group(2), g2: group(3), g3: group(4), g4: group(5) };
  });
}

export type BenchVision = "Contábil" | "Gerencial";
export function dadosVisaoAns(rows: BenchRow[], plano: BenchPlanRow[], vision: BenchVision = "Contábil"): ClassifiedBenchRow[] {
  return (vision === "Contábil" ? hierarquiaContabilAns(rows, plano) : classificarBenchAns(rows, plano))
    .filter(row => valorDreAns(row) !== null);
}