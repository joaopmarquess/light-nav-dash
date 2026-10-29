// Proposta APB: agrega o snapshot de vidas ativas × preço de referência (CSV fornecido).
export interface LinhaApb { plano: string; rel: "Titular" | "Dependente"; acom: "Enfermaria" | "Apartamento"; faixa: string; vidas: number; preco: number; idadeSoma: number }

export const FAIXAS_APB = ["00 a 18", "19 a 23", "24 a 28", "29 a 33", "34 a 38", "39 a 43", "44 a 48", "49 a 53", "54 a 58", "59 ou +"];
export const PLANOS_APB = ["2290", "2490", "2890"];

// Tabela de preços fornecida (Enfermaria, Apartamento) por faixa, válida mesmo sem vidas.
export const PRECOS_APB: Record<string, [number, number][]> = {
  "2290": [[356.68, 535.03], [356.68, 535.03], [492.26, 738.41], [492.26, 738.41], [492.26, 738.41], [492.26, 738.41], [552.85, 738.41], [552.85, 829.29], [552.85, 829.29], [695.51, 1043.28]],
  "2490": [[224.86, 337.3], ...Array.from({ length: 9 }, () => [326.99, 490.5] as [number, number])],
  "2890": [[122.27, 184.16], [143.27, 214.91], [167.19, 250.79], [184.24, 276.37], [215, 322.52], [245.74, 368.64], [301.03, 451.58], [375.38, 563.12], [498.12, 747.26], [736.47, 1104.82]],
};
/** Titulares do 2890: preço único para todas as idades (Enfermaria, Apartamento). */
export const PRECO_TITULAR_2890: [number, number] = [249.17, 373.76];

// Tabela proposta (Enfermaria, Apartamento) — mesma para todos os planos no modo "Transformar".
export const PRECOS_PROPOSTA: [number, number][] = [[110.53, 165.79], [128.99, 193.47], [150.53, 225.77], [165.88, 248.79], [193.58, 290.33], [221.26, 331.84], [271.04, 406.5], [337.98, 506.9], [448.5, 672.65], [663.1, 994.51]];
export const PLANO_NOVO = "3990";
export const PLANO_GRUPO = "GRUPO";
export const COPART_PROPOSTA = 0.2; // copart = 20% da receita CPP
/** Ticket mensal histórico: copart anual / 12 / vidas da mesma fonte Menu; ausência não é zero. */
export function ticketCopartAtual(linhas: { vidas: number; recCopart: number }[] | null): number | null {
  if (!linhas?.length) return null;
  const vidas = linhas.reduce((s, l) => s + l.vidas, 0);
  return vidas > 0 ? linhas.reduce((s, l) => s + l.recCopart, 0) / 12 / vidas : null;
}
/** Despesa anual fixa da proposta (R$ 2.950.000,00). */
export const DESPESA_FIXA_PROPOSTA = 2_950_000;

/** Projeção anual por faixa: CPP = mensalidade × 12; copart = CPP × 20%; receita total = CPP + copart;
 *  sinistralidade = despesa fixa ÷ receita total geral; despesas da faixa = receita total da faixa × sinistralidade. */
export function projecaoFaixas(mensalidades: number[], sinFixa?: number, copart = COPART_PROPOSTA) {
  const base = mensalidades.map((m) => { const recCpp = m * 12, recCopart = recCpp * copart; return { recCpp, recCopart, recTotal: recCpp + recCopart }; });
  const total = base.reduce((t, b) => t + b.recTotal, 0);
  const sin = sinFixa ?? (total ? DESPESA_FIXA_PROPOSTA / total : 0);
  return { sin, faixas: base.map((b) => ({ ...b, despTotal: b.recTotal * sin })) };
}

const num = (s: string) => Number((s || "0").replace(/\./g, "").replace(",", "."));

export function parseApb(csv: string): { data: string; linhas: LinhaApb[] } {
  const rows = csv.replace(/^\uFEFF/, "").trim().split(/\r?\n/).slice(1).map((l) => l.split(";"));
  const linhas = rows.map(([, plano, rel, acom, faixa, vidas, preco, idade]) => ({
    plano,
    rel: rel.toLowerCase().startsWith("t") ? "Titular" : "Dependente",
    acom: /prata|enf/i.test(acom) ? "Enfermaria" : "Apartamento",
    faixa: FAIXAS_APB.find((f) => f.slice(0, 2) === faixa.slice(0, 2)) ?? faixa,
    vidas: num(vidas),
    preco: num(preco),
    idadeSoma: num(idade ?? "0"),
  })) as LinhaApb[];
  // 2890: titulares com preço linear (00 a 999 anos); dependentes seguem a tabela por faixa.
  for (const l of linhas) if (l.plano === "2890" && l.rel === "Titular") l.preco = PRECO_TITULAR_2890[l.acom === "Enfermaria" ? 0 : 1];
  return { data: rows[0]?.[0] ?? "", linhas };
}

export interface FaixaApb { faixa: string; enfTit: number; enfDep: number; apTit: number; apDep: number; total: number; precoEnf: number | null; precoAp: number | null; mensalidade: number }

export function gridPlano(linhas: LinhaApb[], plano: string, precos?: [number, number][]): { faixas: FaixaApb[]; total: FaixaApb } {
  const faixas = FAIXAS_APB.map((faixa, i) => {
    const ls = linhas.filter((l) => l.plano === plano && l.faixa === faixa);
    const v = (a: string, r: string) => ls.filter((l) => l.acom === a && l.rel === r).reduce((s, l) => s + l.vidas, 0);
    const p = (a: string) => precos?.[i]?.[a === "Enfermaria" ? 0 : 1] ?? PRECOS_APB[plano]?.[i]?.[a === "Enfermaria" ? 0 : 1] ?? ls.find((l) => l.acom === a)?.preco ?? null;
    const enfTit = v("Enfermaria", "Titular"), enfDep = v("Enfermaria", "Dependente"), apTit = v("Apartamento", "Titular"), apDep = v("Apartamento", "Dependente");
    const mensalidade = ls.reduce((s, l) => s + l.vidas * (precos ? precos[i][l.acom === "Enfermaria" ? 0 : 1] : l.preco), 0);
    return { faixa, enfTit, enfDep, apTit, apDep, total: enfTit + enfDep + apTit + apDep, precoEnf: p("Enfermaria"), precoAp: p("Apartamento"), mensalidade };
  });
  const sum = (k: keyof FaixaApb) => faixas.reduce((s, f) => s + (f[k] as number), 0);
  return { faixas, total: { faixa: "Total", enfTit: sum("enfTit"), enfDep: sum("enfDep"), apTit: sum("apTit"), apDep: sum("apDep"), total: sum("total"), precoEnf: null, precoAp: null, mensalidade: sum("mensalidade") } };
}

/** Soma das idades exatas (dt_nascimento na data_referencia do mesmo snapshot das vidas); GRUPO/3990 somam todos os planos. */
export const idadeSomaPlanos = (linhas: LinhaApb[], planos: string[]) => {
  const todos = planos.some((p) => !PLANOS_APB.includes(p));
  return linhas.filter((l) => todos || planos.includes(l.plano)).reduce((t, l) => t + l.idadeSoma, 0);
};

/** Nível 4: titulares fornecidos por faixa (total 1.242) + 15% de dependentes (186).
 *  Titulares: dentro de cada faixa, acomodação na proporção atual dos titulares daquela faixa
 *  (sem titulares na faixa, usa a proporção de todas as vidas da faixa). Dependentes: distribuição atual dos dependentes. Maior resto. */
export const VIDAS_N4 = [5, 47, 165, 189, 172, 201, 218, 115, 75, 55];
export const DEP_PCT_N4 = 0.15;
function ratear(linhas: LinhaApb[], out: LinhaApb[], idx: number[], alvo: number) {
  const base = idx.reduce((t, i) => t + linhas[i].vidas, 0);
  if (!base) return false;
  const q = idx.map((i) => ({ i, x: (linhas[i].vidas * alvo) / base }));
  q.forEach(({ i, x }) => { out[i].vidas += Math.floor(x); });
  let resto = alvo - q.reduce((t, { x }) => t + Math.floor(x), 0);
  [...q].sort((a, b) => (b.x % 1) - (a.x % 1)).forEach(({ i }) => { if (resto > 0) { out[i].vidas++; resto--; } });
  return true;
}
export function escalarVidas(linhas: LinhaApb[], titPorFaixa = VIDAS_N4, depPct = DEP_PCT_N4): LinhaApb[] {
  const out = linhas.map((l) => ({ ...l, vidas: 0, idadeSoma: 0 }));
  const all = linhas.map((_, i) => i);
  FAIXAS_APB.forEach((faixa, fi) => {
    const daFaixa = all.filter((i) => linhas[i].faixa === faixa);
    const tit = daFaixa.filter((i) => linhas[i].rel === "Titular");
    if (!ratear(linhas, out, tit, titPorFaixa[fi] ?? 0)) {
      // sem titulares atuais na faixa: cria titulares com a proporção de acomodação da faixa
      const peso = (a: string) => daFaixa.filter((i) => linhas[i].acom === a).reduce((t, i) => t + linhas[i].vidas, 0);
      const alvo = titPorFaixa[fi] ?? 0, pe = peso("Enfermaria"), pa = peso("Apartamento");
      const enf = pe + pa ? Math.round((alvo * pe) / (pe + pa)) : alvo;
      const preco = (a: string) => linhas.find((l) => l.faixa === faixa && l.acom === a)?.preco ?? 0;
      if (enf) out.push({ plano: linhas[0].plano, rel: "Titular", acom: "Enfermaria", faixa, vidas: enf, preco: preco("Enfermaria"), idadeSoma: 0 });
      if (alvo - enf) out.push({ plano: linhas[0].plano, rel: "Titular", acom: "Apartamento", faixa, vidas: alvo - enf, preco: preco("Apartamento"), idadeSoma: 0 });
    }
  });
  const totTit = titPorFaixa.reduce((a, b) => a + b, 0);
  ratear(linhas, out, all.filter((i) => linhas[i].rel === "Dependente"), Math.round(totTit * depPct));
  out.forEach((l, i) => { const o = linhas[i]; if (o) l.idadeSoma = o.vidas ? (o.idadeSoma / o.vidas) * l.vidas : 0; });
  return out.filter((l) => l.vidas > 0);
}

/** Nível 5: vidas do Nível 4 no plano 3990; titulares com preço linear (qualquer idade) e dependentes com tabela por faixa, ambos editáveis. */
export function gridsN5(linhas: LinhaApb[], linear: [number, number], dep: [number, number][]) {
  const ls = linhas.map((l) => ({ ...l, plano: PLANO_NOVO }));
  const tit = gridPlano(ls.filter((l) => l.rel === "Titular"), PLANO_NOVO, FAIXAS_APB.map(() => linear));
  const dp = gridPlano(ls.filter((l) => l.rel === "Dependente"), PLANO_NOVO, dep);
  const g = gridPlano(ls, PLANO_NOVO, dep);
  const faixas = g.faixas.map((f, i) => ({ ...f, precoEnf: null, precoAp: null, mensalidade: tit.faixas[i].mensalidade + dp.faixas[i].mensalidade }));
  return { tit, dep: dp, todos: { faixas, total: { ...g.total, mensalidade: tit.total.mensalidade + dp.total.mensalidade } } };
}

/** Nível 5: Apartamento = Enfermaria × 1,5. */
export const FATOR_APTO_N5 = 1.5;
export const tabelaLinear = (enf: number): [number, number] => [enf, enf * FATOR_APTO_N5];
/** Dependentes: só a Enfermaria 00 a 18 é digitada; demais faixas seguem a variação % da tabela proposta; Apartamento = Enfermaria × 1,5. */
export const tabelaDependente = (enf0018: number): [number, number][] =>
  PRECOS_PROPOSTA.map(([e]) => tabelaLinear(enf0018 * (e / PRECOS_PROPOSTA[0][0])));
