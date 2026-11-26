// Motor central do Simulador Facchini: todas as fórmulas ficam aqui; telas apenas exibem.
// Cálculos em precisão total; arredondamento só na apresentação.
export const REGRA_VERSAO = "facchini-1.0";
export const FAIXAS = ["00 a 18","19 a 23","24 a 28","29 a 33","34 a 38","39 a 43","44 a 48","49 a 53","54 a 58","59 ou mais"] as const;
export const GRUPOS = [
  { nome: "Mais jovens", faixas: [0, 1, 2] },
  { nome: "Adultos médios", faixas: [3, 4, 5, 6, 7] },
  { nome: "Mais velhos", faixas: [8, 9] },
];
export type Faixa = { titulares: number; dependentes: number };
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
export const div = (a: number, b: number) => (b ? a / b : 0);

/* ---------- portfolioEngine ---------- */
export function faixaPorIdade(idade: number): number {
  if (idade < 19) return 0;
  if (idade >= 59) return 9;
  return Math.floor((idade - 19) / 5) + 1;
}
export function idadeNaData(nasc: Date, base: Date): number {
  let i = base.getUTCFullYear() - nasc.getUTCFullYear();
  const m = base.getUTCMonth() - nasc.getUTCMonth();
  if (m < 0 || (m === 0 && base.getUTCDate() < nasc.getUTCDate())) i--;
  return i;
}
/** Aceita DD/MM/AAAA e AAAA-MM-DD; rejeita datas inválidas. */
export function parseData(txt: string): Date | null {
  const s = (txt ?? "").trim();
  let d: number, m: number, a: number;
  let r = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (r) { d = +r[1]; m = +r[2]; a = +r[3]; }
  else if ((r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s))) { a = +r[1]; m = +r[2]; d = +r[3]; }
  else return null;
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? dt : null;
}
export function resumoCarteira(faixas: Faixa[]) {
  const f = FAIXAS.map((_, i) => ({ titulares: n(faixas[i]?.titulares), dependentes: n(faixas[i]?.dependentes) }));
  const linhas = f.map((x) => ({ ...x, vidas: x.titulares + x.dependentes }));
  const titulares = linhas.reduce((s, x) => s + x.titulares, 0);
  const dependentes = linhas.reduce((s, x) => s + x.dependentes, 0);
  const vidas = titulares + dependentes;
  const grupos = GRUPOS.map((g) => {
    const t = g.faixas.reduce((s, i) => s + linhas[i].titulares, 0);
    const d = g.faixas.reduce((s, i) => s + linhas[i].dependentes, 0);
    return { nome: g.nome, titulares: t, dependentes: d, vidas: t + d, percentual: div(t + d, vidas) };
  });
  return { linhas, titulares, dependentes, vidas, grupos };
}
/** Projeta dependentes a partir dos titulares e da taxa de dependência (ex.: 0,30). */
export function projetarDependentes(titulares: number[], taxa: number): Faixa[] {
  return FAIXAS.map((_, i) => ({ titulares: n(titulares[i]), dependentes: n(titulares[i]) * taxa }));
}

/* ---------- pricingEngine ---------- */
export function producao(faixas: Faixa[], precos: number[]) {
  const r = resumoCarteira(faixas);
  const porFaixa = r.linhas.map((l, i) => {
    const p = n(precos[i]);
    return { ...l, preco: p, prodTitulares: l.titulares * p, prodDependentes: l.dependentes * p, total: l.vidas * p };
  });
  const prodTitulares = porFaixa.reduce((s, x) => s + x.prodTitulares, 0);
  const prodDependentes = porFaixa.reduce((s, x) => s + x.prodDependentes, 0);
  const total = prodTitulares + prodDependentes;
  return {
    ...r, porFaixa, prodTitulares, prodDependentes, total,
    ticketTitular: div(prodTitulares, r.titulares),
    ticketDependente: div(prodDependentes, r.dependentes),
    ticketGrupo: div(total, r.vidas),
  };
}
export function ajustarTabela(precos: number[], percentual: number) { return precos.map((p) => p * (1 + percentual)); }
export function linear(faixas: Faixa[], precos: number[], adicional = 0) {
  const p = producao(faixas, precos);
  const base = p.ticketGrupo;
  return { linear: base, adicional, resultado: base * (1 + adicional), producaoTotal: p.total * (1 + adicional), tabela: ajustarTabela(precos, adicional) };
}
export type ParamMargem = { fatorProduto: number; inferior: number; divisorSuperior: number; superior: number };
export const MARGEM_PADRAO: ParamMargem = { fatorProduto: 1, inferior: 0.49, divisorSuperior: 0.48, superior: 0.51 };
export function margem(ticketProposto: number, ticketCheia: number, p: ParamMargem = MARGEM_PADRAO) {
  const minimo = div(ticketProposto, p.fatorProduto) * p.inferior;
  const maximo = div(minimo, p.divisorSuperior) * p.superior;
  const fatorEfetivo = div(ticketProposto, ticketCheia);
  return { minimo, maximo, ticketProposto, ticketCheia, fatorEfetivo, descontoEfetivo: (1 - fatorEfetivo) * 100 };
}

/* ---------- rn63ValidationEngine ---------- */
export function rn63(precos: number[], limiteMultiplo = 6) {
  const p1 = n(precos[0]), p7 = n(precos[6]), p10 = n(precos[9]);
  const incompleta = !p1 || !p7 || !p10;
  const r1_7 = div(p7, p1), r7_10 = div(p10, p7), r10_1 = div(p10, p1);
  const st = (ok: boolean) => (incompleta ? "Atenção" : ok ? "OK" : "Não permitido");
  return { r1_7, r7_10, r10_1, validacao1: st(r7_10 <= r1_7), validacao2: st(r10_1 <= limiteMultiplo) } as const;
}

/* ---------- financialProjectionEngine ---------- */
export type BaseAdesao = "titulares" | "dependentes" | "todas" | "manual";
export type Premissas = {
  produtividade: number; limiteProdutividade: number; sinistralidade: number; coparticipacao: number;
  taxaAdesaoValor: number; taxaAdesaoAtiva: boolean; taxaAdesaoBase: BaseAdesao; taxaAdesaoManual: number;
  patrocinioTitular: number; patrocinioDependente: number;
  mesesCoparticipacaoAno1: number; coparticipacaoAno2: number; produtividadeMesesAno1: number; produtividadeMesesAno2: number;
  limiteRn63: number;
};
export const PREMISSAS_PADRAO: Premissas = {
  produtividade: 0.15, limiteProdutividade: 20000, sinistralidade: 0.9, coparticipacao: 0.15,
  taxaAdesaoValor: 25, taxaAdesaoAtiva: true, taxaAdesaoBase: "titulares", taxaAdesaoManual: 0,
  patrocinioTitular: 0.5, patrocinioDependente: 0,
  mesesCoparticipacaoAno1: 8, coparticipacaoAno2: 1, produtividadeMesesAno1: 1, produtividadeMesesAno2: 0,
  limiteRn63: 6,
};
export const sinistralidadeLiquida = (s: number, c: number) => s - s * c;
export function produtividadeAplicada(prodMensal: number, pct: number, limite: number) {
  const calculada = prodMensal * pct;
  return { calculada, aplicada: Math.min(calculada, limite) };
}
export function projecao(faixas: Faixa[], precos: number[], pr: Premissas) {
  const p = producao(faixas, precos);
  const mensal = p.total, anual = mensal * 12;
  const prodv = produtividadeAplicada(mensal, pr.produtividade, pr.limiteProdutividade);
  const vidasAdesao = pr.taxaAdesaoBase === "titulares" ? p.titulares : pr.taxaAdesaoBase === "dependentes" ? p.dependentes : pr.taxaAdesaoBase === "todas" ? p.vidas : pr.taxaAdesaoManual;
  const adesao = pr.taxaAdesaoAtiva ? pr.taxaAdesaoValor * vidasAdesao : 0;
  const empresaT = p.prodTitulares * pr.patrocinioTitular, empresaD = p.prodDependentes * pr.patrocinioDependente;
  const empresa = empresaT + empresaD;
  const col = (producao: number, produtividade: number, adesaoV: number, copart: number) => {
    const despesa = producao * pr.sinistralidade * -1;
    const liquida = despesa + copart;
    const saldo = producao + produtividade + adesaoV + liquida;
    return { producao, produtividade, adesao: adesaoV, despesa, coparticipacao: copart, liquida, saldo, margem: div(saldo, producao) };
  };
  const colunas = {
    mes1: col(mensal, -prodv.aplicada, adesao, 0),
    ano1: col(anual, -prodv.aplicada * pr.produtividadeMesesAno1, adesao, mensal * pr.coparticipacao * pr.mesesCoparticipacaoAno1),
    ano2: col(anual, -prodv.aplicada * pr.produtividadeMesesAno2, 0, anual * pr.coparticipacao * pr.coparticipacaoAno2),
  };
  return {
    producao: p, produtividade: prodv, adesao, vidasAdesao,
    sinistralidadeLiquida: sinistralidadeLiquida(pr.sinistralidade, pr.coparticipacao),
    patrocinio: { empresaTitulares: empresaT, empresaDependentes: empresaD, empresa, beneficiarios: mensal - empresa, pctEmpresa: div(empresa, mensal), pctBeneficiarios: div(mensal - empresa, mensal) },
    colunas, rn63: rn63(precos, pr.limiteRn63),
  };
}

/* ---------- formatação (apenas exibição) ---------- */
export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const pct = (v: number, c = 2) => `${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c })}%`;
export const qtd = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
export const fator = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
