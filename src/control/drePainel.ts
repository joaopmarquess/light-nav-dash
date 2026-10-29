import type { DreHRow } from "./dreHostinger";

/** Agrupamento do Painel da Controladoria (Control › Controladoria › Painel). */
export function grupoPainelDre(r: DreHRow): "ent" | "desp" | "demais" | "adm" | "fin" | null {
  if (/FINANCEIRO/i.test(r.g1)) return "fin";
  if (/PRINCIPAL/i.test(r.g3)) return /FATUR|COPART/i.test(r.g4) ? "ent" : "desp";
  if (/SECUND|COMERCIAL|IMPOSTOS DIRETOS|PROVIS/i.test(r.g3)) return "demais";
  if (/ADMINISTRATIVO/i.test(r.g2)) return "adm";
  return null; // demais linhas (Impostos Federais)
}

export function resumoPainelDre(rows: DreHRow[]) {
  const b = { ent: 0, desp: 0, demais: 0, adm: 0, fin: 0, imp: 0 };
  let fat = 0;
  for (const r of rows) {
    const k = grupoPainelDre(r) ?? "imp";
    b[k] += r.valor;
    if (k === "ent" && /FATUR/i.test(r.g4)) fat += r.valor;
  }
  const prim = b.ent + b.desp, tot = prim + b.demais, ebitda = tot + b.adm, rai = ebitda + b.fin, liq = rai + b.imp;
  const cards: [string, number, string][] = [
    ["Operacionais Primários", prim, "Entradas − Despesas Assistenciais"],
    ["Operacionais Secundários", b.demais, "Demais operacionais"],
    ["Operacionais Totais", tot, "Primários + Secundários"],
    ["EBITDA", ebitda, "Operacionais Totais + Despesas Administrativas"],
    ["Financeiro", b.fin, "Resultado financeiro"],
    ["Resultado antes dos Impostos", rai, "EBITDA + Financeiro"],
    ["Impostos Federais", b.imp, "Lançados no balancete"],
  ];
  const linhas: [string, number, 0 | 1 | 2][] = [
    ["Entradas Operacionais", b.ent, 0], ["(−) Despesas Assistenciais", b.desp, 0], ["(−) Demais Operacionais", b.demais, 0],
    ["(=) Operacionais Totais", tot, 1], ["(−) Despesas Administrativas", b.adm, 0], ["(=) EBITDA", ebitda, 1],
    ["(+) Financeiro", b.fin, 0], ["(=) Resultado antes dos Impostos", rai, 1], ["(−) Impostos Federais", b.imp, 0],
    ["(=) Resultado Líquido", liq, 2],
  ];
  return { fat, liq, cards, linhas, pctFat: (x: number) => (fat ? x / fat : null) };
}
