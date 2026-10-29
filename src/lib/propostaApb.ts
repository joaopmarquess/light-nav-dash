// Proposta APB: agrega o snapshot de vidas ativas × preço de referência (CSV fornecido).
export interface LinhaApb { plano: string; rel: "Titular" | "Dependente"; acom: "Enfermaria" | "Apartamento"; faixa: string; vidas: number; preco: number }

export const FAIXAS_APB = ["00 a 18", "19 a 23", "24 a 28", "29 a 33", "34 a 38", "39 a 43", "44 a 48", "49 a 53", "54 a 58", "59 ou +"];
export const PLANOS_APB = ["2290", "2490", "2890"];

const num = (s: string) => Number((s || "0").replace(/\./g, "").replace(",", "."));

export function parseApb(csv: string): { data: string; linhas: LinhaApb[] } {
  const rows = csv.replace(/^\uFEFF/, "").trim().split(/\r?\n/).slice(1).map((l) => l.split(";"));
  const linhas = rows.map(([, plano, rel, acom, faixa, vidas, preco]) => ({
    plano,
    rel: rel.toLowerCase().startsWith("t") ? "Titular" : "Dependente",
    acom: /prata|enf/i.test(acom) ? "Enfermaria" : "Apartamento",
    faixa: FAIXAS_APB.find((f) => f.slice(0, 2) === faixa.slice(0, 2)) ?? faixa,
    vidas: num(vidas),
    preco: num(preco),
  })) as LinhaApb[];
  return { data: rows[0]?.[0] ?? "", linhas };
}

export interface FaixaApb { faixa: string; enfTit: number; enfDep: number; apTit: number; apDep: number; total: number; precoEnf: number | null; precoAp: number | null; mensalidade: number }

export function gridPlano(linhas: LinhaApb[], plano: string): { faixas: FaixaApb[]; total: FaixaApb } {
  const faixas = FAIXAS_APB.map((faixa) => {
    const ls = linhas.filter((l) => l.plano === plano && l.faixa === faixa);
    const v = (a: string, r: string) => ls.filter((l) => l.acom === a && l.rel === r).reduce((s, l) => s + l.vidas, 0);
    const p = (a: string) => ls.find((l) => l.acom === a)?.preco ?? null;
    const enfTit = v("Enfermaria", "Titular"), enfDep = v("Enfermaria", "Dependente"), apTit = v("Apartamento", "Titular"), apDep = v("Apartamento", "Dependente");
    const mensalidade = ls.reduce((s, l) => s + l.vidas * l.preco, 0);
    return { faixa, enfTit, enfDep, apTit, apDep, total: enfTit + enfDep + apTit + apDep, precoEnf: p("Enfermaria"), precoAp: p("Apartamento"), mensalidade };
  });
  const sum = (k: keyof FaixaApb) => faixas.reduce((s, f) => s + (f[k] as number), 0);
  return { faixas, total: { faixa: "Total", enfTit: sum("enfTit"), enfDep: sum("enfDep"), apTit: sum("apTit"), apDep: sum("apDep"), total: sum("total"), precoEnf: null, precoAp: null, mensalidade: sum("mensalidade") } };
}
