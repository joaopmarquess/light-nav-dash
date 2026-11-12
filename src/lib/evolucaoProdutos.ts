// Home › Evolução Produtos: vidas ativas no último dia de cada mês.
// Regra de ativo = "Ativos em" (carteira_trial_geo / carteira_evolucao_mensal, view_ecarteira).
// Tipo de produto (carteira_evolucao_produtos): Fácil 50 = plano MV 168–173; demais pela recuperação
// (CONVENCIONAL / COPARTICIPACAO) da vigência mais recente da matrícula.

export type AnoMes = { ano: number; mes: number };
/** Primeiro mês que a tela aceita (início do cálculo de vidas na carteira). */
export const INICIO_EVOLUCAO_PRODUTOS: AnoMes = { ano: 2019, mes: 1 };

const idxMes = (a: AnoMes) => a.ano * 12 + (a.mes - 1);
const deIdx = (i: number): AnoMes => ({ ano: Math.floor(i / 12), mes: (i % 12) + 1 });

/** Período inicial: os 12 meses até a última competência válida (despesas da base acima de R$ 20 milhões). */
export function periodoPadrao(ultimaValida: AnoMes): { de: AnoMes; ate: AnoMes } {
  const ate = idxMes(ultimaValida);
  return { de: deIdx(ate - 11), ate: deIdx(ate) };
}

/** "mm/aaaa" → AnoMes; incompleto ou inválido → null. */
export function lerAnoMes(v: string): AnoMes | null {
  const m = /^(\d{2})\/(\d{4})$/.exec(v.trim());
  if (!m) return null;
  const mes = Number(m[1]), ano = Number(m[2]);
  return mes >= 1 && mes <= 12 ? { ano, mes } : null;
}
/** AnoMes → "mm/aaaa". */
export const anoMesCampo = (a: AnoMes) => `${String(a.mes).padStart(2, "0")}/${a.ano}`;
/** Máscara de digitação mm/aaaa: só dígitos, barra automática após o mês. */
export function mascaraAnoMes(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 6);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

/** Meses que a tela sempre mostra: o mês final escolhido e os 11 anteriores. */
export const MESES_PERIODO = 12;

/** Período de 12 meses que termina no mês final escolhido (ex.: 09/2026 → 10/2025 a 09/2026). */
export function periodoAte(ate: AnoMes): { de: AnoMes; ate: AnoMes } {
  return { de: deIdx(idxMes(ate) - (MESES_PERIODO - 1)), ate };
}

/** Mensagem de erro do mês final, ou null quando é válido. */
export function validarAte(ate: AnoMes | null, hoje: Date): string | null {
  if (!ate) return "Informe o mês final no formato mm/aaaa.";
  if (idxMes(periodoAte(ate).de) < idxMes(INICIO_EVOLUCAO_PRODUTOS)) return `A base começa em 01/2019; o mês final deve ser ${anoMesCampo(deIdx(idxMes(INICIO_EVOLUCAO_PRODUTOS) + MESES_PERIODO - 1))} ou posterior.`;
  if (idxMes(ate) > hoje.getUTCFullYear() * 12 + hoje.getUTCMonth()) return "O mês final não pode ser posterior ao mês atual.";
  return null;
}

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export type MesEvolucao = { ano: number; mes: number; dataFim: string; rotulo: string };

/** Meses do período (inclusivo), com o último dia do mês em UTC. */
export function mesesPeriodo(de: { ano: number; mes: number }, ate: { ano: number; mes: number }): MesEvolucao[] {
  const out: MesEvolucao[] = [];
  let a = de.ano, m = de.mes;
  while (a < ate.ano || (a === ate.ano && m <= ate.mes)) {
    out.push({
      ano: a,
      mes: m,
      dataFim: new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10),
      rotulo: `${MESES[m - 1]}/${String(a).slice(2)}`,
    });
    m += 1;
    if (m > 12) { m = 1; a += 1; }
  }
  return out;
}

export const TIPOS_PLANO = ["PIF", "PCA", "PCE"] as const;
export type TipoPlano = (typeof TIPOS_PLANO)[number];

type Num = number | string | null | undefined;
export type LinhaMensal = { ano: number; mes: number; total: Num; pif?: Num; pca?: Num; pce?: Num };

const num = (v: Num) => (v == null ? null : Number(v));

/** Junta as vidas por ano/mês aos meses do período; meses ou tipos sem dado ficam null (sem inferência). */
export function vidasPorMes(meses: MesEvolucao[], linhas: LinhaMensal[]) {
  const idx = new Map(linhas.map((l) => [`${l.ano}-${l.mes}`, l]));
  return meses.map((m) => {
    const l = idx.get(`${m.ano}-${m.mes}`);
    const porTipo: Record<TipoPlano, number | null> = { PIF: num(l?.pif), PCA: num(l?.pca), PCE: num(l?.pce) };
    return { ...m, vidas: num(l?.total), porTipo };
  });
}

export const TIPOS_PRODUTO = [
  { id: "CONV", rotulo: "Convencional", descricao: "Integral, sem coparticipação" },
  { id: "F50", rotulo: "Fácil 50", descricao: "Planos MV 168 a 173" },
  { id: "COP", rotulo: "Outros coparticipativos", descricao: "Com coparticipação, fora do Fácil 50" },
] as const;
export type TipoProduto = (typeof TIPOS_PRODUTO)[number]["id"];

export type LinhaProduto = { ano: number; mes: number; sigla: string; produto: string; vidas: Num };

type LinhaGrade = { ano: number; mes: number; sigla: string | null; produto: string | null; valor: Num };

/** Grade tipo de plano × tipo de produto por mês; mês sem linha fica null, combinação ausente em mês com dado = 0. */
function gradePorMes(meses: MesEvolucao[], linhas: LinhaGrade[]) {
  const idx = new Map<string, number>();
  const comDado = new Set<string>();
  const fora = new Map<string, number>();
  const siglas = new Set<string>(TIPOS_PLANO);
  const produtos = new Set<string>(TIPOS_PRODUTO.map((p) => p.id));
  for (const l of linhas) {
    const mes = `${Number(l.ano)}-${Number(l.mes)}`;
    comDado.add(mes);
    const sg = String(l.sigla ?? "").trim().toUpperCase();
    const pr = String(l.produto ?? "").trim().toUpperCase();
    const v = Number(l.valor) || 0;
    if (!siglas.has(sg) || !produtos.has(pr)) { fora.set(mes, (fora.get(mes) ?? 0) + v); continue; }
    const k = `${mes}|${sg}|${pr}`;
    idx.set(k, (idx.get(k) ?? 0) + v);
  }
  return meses.map((m) => {
    const chave = `${m.ano}-${m.mes}`;
    const tem = comDado.has(chave);
    const valores = {} as Record<TipoPlano, Record<TipoProduto, number | null>>;
    for (const t of TIPOS_PLANO) {
      valores[t] = {} as Record<TipoProduto, number | null>;
      for (const p of TIPOS_PRODUTO) valores[t][p.id] = tem ? idx.get(`${chave}|${t}|${p.id}`) ?? 0 : null;
    }
    return { ...m, valores, foraDosTotais: fora.get(chave) ?? 0 };
  });
}

/**
 * Vidas por tipo de plano e tipo de produto em cada mês. Mês sem nenhuma linha fica null (sem inferência);
 * em mês calculado, combinação ausente significa zero vidas.
 */
export function produtosPorMes(meses: MesEvolucao[], linhas: LinhaProduto[], produto: TipoProduto | null = null): GradeComTotais[] {
  return comTotais(gradePorMes(meses, linhas.map((l) => ({ ano: l.ano, mes: l.mes, sigla: l.sigla, produto: l.produto, valor: l.vidas }))), produto);
}

// Indicadores financeiros (evolucao_produtos_financeiro, view_eard_mensal):
// Receita = vl_rec_cpp + vl_rec_outros; Coparticipação = vl_rec_copart; Total Receitas = Receita + Coparticipação;
// Despesas = seis colunas de despesa; Saldo = Total Receitas − Despesas;
// Sinistralidade = Despesas ÷ Total Receitas, sempre como razão das somas (nunca soma de percentuais).
export type LinhaFinanceira = {
  nr_ano: number; nr_mes: number; sigla: string | null; produto: string | null;
  rec_cpp: Num; rec_copart: Num; rec_outros: Num; desp_total: Num; rec_total?: Num;
};
const n0 = (v: Num) => Number(v) || 0;
/** Valores em R$ só até a última competência válida; meses seguintes (despesas incompletas) ficam "Sem dado". */
export const financeiroAteUltimaValida = <T extends LinhaFinanceira>(linhas: T[], ultima: AnoMes): T[] =>
  linhas.filter((l) => idxMes({ ano: Number(l.nr_ano), mes: Number(l.nr_mes) }) <= idxMes(ultima));
const receita = (l: LinhaFinanceira) => n0(l.rec_cpp) + n0(l.rec_outros);
const coparticipacao = (l: LinhaFinanceira) => n0(l.rec_copart);
const totalReceitas = (l: LinhaFinanceira) => receita(l) + coparticipacao(l);
export const INDICADORES_FINANCEIROS = {
  Receita: receita,
  "Coparticipação": coparticipacao,
  "Total Receitas": totalReceitas,
  Despesas: (l: LinhaFinanceira) => n0(l.desp_total),
  Saldo: (l: LinhaFinanceira) => totalReceitas(l) - n0(l.desp_total),
} as const;
export type IndicadorFinanceiro = keyof typeof INDICADORES_FINANCEIROS | "Sinistralidade";

const gradeFin = (meses: MesEvolucao[], linhas: LinhaFinanceira[], valor: (l: LinhaFinanceira) => number) =>
  gradePorMes(meses, linhas.map((l) => ({ ano: l.nr_ano, mes: l.nr_mes, sigla: l.sigla, produto: l.produto, valor: valor(l) })));

/** Grade com subtotais por tipo e total geral prontos para exibição. */
export type GradeComTotais = ReturnType<typeof gradePorMes>[number] & {
  subtotais: Record<TipoPlano, number | null>; total: number | null;
};

/**
 * Acrescenta subtotais (soma dos produtos) e total geral (soma dos tipos) a uma grade aditiva.
 * Com um produto selecionado, subtotais e total somam somente esse produto.
 */
export function comTotais(grade: ReturnType<typeof gradePorMes>, produto: TipoProduto | null = null): GradeComTotais[] {
  return grade.map((m) => ({
    ...m,
    subtotais: Object.fromEntries(TIPOS_PLANO.map((t) => [t, subtotalTipo(m.valores, t, produto)])) as Record<TipoPlano, number | null>,
    total: totalGeral(m.valores, produto),
  }));
}

const razao = (a: number | null, b: number | null) => (a == null || b == null || b === 0 ? null : a / b);

/**
 * Grade financeira por mês; valores fora de PIF/PCA/PCE ou sem produto ficam em foraDosTotais (sem inferência).
 * Sinistralidade (fração, 0,85 = 85%) divide Despesas por Total Receitas em cada célula, subtotal e total.
 */
export function financeiroPorMes(meses: MesEvolucao[], linhas: LinhaFinanceira[], indicador: IndicadorFinanceiro, produto: TipoProduto | null = null): GradeComTotais[] {
  if (indicador !== "Sinistralidade") return comTotais(gradeFin(meses, linhas, INDICADORES_FINANCEIROS[indicador]), produto);
  const desp = comTotais(gradeFin(meses, linhas, INDICADORES_FINANCEIROS.Despesas), produto);
  const rec = comTotais(gradeFin(meses, linhas, totalReceitas), produto);
  return desp.map((d, i) => {
    const r = rec[i];
    const valores = {} as GradeComTotais["valores"];
    for (const t of TIPOS_PLANO) {
      valores[t] = {} as GradeComTotais["valores"][TipoPlano];
      for (const p of TIPOS_PRODUTO) valores[t][p.id] = razao(d.valores[t][p.id], r.valores[t][p.id]);
    }
    const subtotais = Object.fromEntries(TIPOS_PLANO.map((t) => [t, razao(d.subtotais[t], r.subtotais[t])])) as Record<TipoPlano, number | null>;
    return { ...d, valores, subtotais, total: razao(d.total, r.total), foraDosTotais: 0 };
  });
}

/** Indicadores que aceitam a chave Per capita (Receita até Saldo). */
export const INDICADORES_PER_CAPITA: readonly IndicadorFinanceiro[] = ["Receita", "Coparticipação", "Total Receitas", "Despesas", "Saldo"];

/**
 * Per capita: cada célula, subtotal e total dividido pelas vidas da mesma célula, subtotal e total do mês
 * (razão das somas). Sem vidas (null ou zero) fica null; nada é inferido.
 */
export function perCapita(valores: GradeComTotais[], vidas: GradeComTotais[]): GradeComTotais[] {
  const idx = new Map(vidas.map((v) => [`${v.ano}-${v.mes}`, v]));
  return valores.map((m) => {
    const v = idx.get(`${m.ano}-${m.mes}`);
    const out = {} as GradeComTotais["valores"];
    for (const t of TIPOS_PLANO) {
      out[t] = {} as GradeComTotais["valores"][TipoPlano];
      for (const p of TIPOS_PRODUTO) out[t][p.id] = razao(m.valores[t][p.id], v?.valores[t][p.id] ?? null);
    }
    const subtotais = Object.fromEntries(TIPOS_PLANO.map((t) => [t, razao(m.subtotais[t], v?.subtotais[t] ?? null)])) as Record<TipoPlano, number | null>;
    return { ...m, valores: out, subtotais, total: razao(m.total, v?.total ?? null), foraDosTotais: 0 };
  });
}

type ValoresMes = ReturnType<typeof gradePorMes>[number]["valores"];

/** Subtotal de um tipo de plano (soma dos três produtos, ou só do produto selecionado); null quando o mês não tem dado. */
export function subtotalTipo(valores: ValoresMes, tipo: TipoPlano, produto: TipoProduto | null = null): number | null {
  const vs = TIPOS_PRODUTO.filter((p) => !produto || p.id === produto).map((p) => valores[tipo][p.id]);
  return vs.some((v) => v == null) ? null : vs.reduce<number>((s, v) => s + (v as number), 0);
}

/** Total geral do mês (PIF + PCA + PCE, ou só o produto selecionado); null quando o mês não tem dado. */
export function totalGeral(valores: ValoresMes, produto: TipoProduto | null = null): number | null {
  const vs = TIPOS_PLANO.map((t) => subtotalTipo(valores, t, produto));
  return vs.some((v) => v == null) ? null : vs.reduce<number>((s, v) => s + (v as number), 0);
}

/** Células de uma coluna da grade (valores, subtotais e total). */
export type Celulas = Pick<GradeComTotais, "valores" | "subtotais" | "total">;

const somaMeses = (vs: (number | null)[]) =>
  vs.length === 0 || vs.some((v) => v == null) ? null : vs.reduce<number>((s, v) => s + (v as number), 0);

/** Coluna Total: soma do período em cada célula; se algum mês não tem dado, a célula fica null (sem inferência). */
export function somaPeriodo(grade: GradeComTotais[]): Celulas {
  const valores = {} as Celulas["valores"];
  for (const t of TIPOS_PLANO) {
    valores[t] = {} as Celulas["valores"][TipoPlano];
    for (const p of TIPOS_PRODUTO) valores[t][p.id] = somaMeses(grade.map((m) => m.valores[t][p.id]));
  }
  const subtotais = Object.fromEntries(TIPOS_PLANO.map((t) => [t, somaMeses(grade.map((m) => m.subtotais[t]))])) as Record<TipoPlano, number | null>;
  return { valores, subtotais, total: somaMeses(grade.map((m) => m.total)) };
}

function razaoCelulas(a: Celulas, b: Celulas): Celulas {
  const valores = {} as Celulas["valores"];
  for (const t of TIPOS_PLANO) {
    valores[t] = {} as Celulas["valores"][TipoPlano];
    for (const p of TIPOS_PRODUTO) valores[t][p.id] = razao(a.valores[t][p.id], b.valores[t][p.id]);
  }
  const subtotais = Object.fromEntries(TIPOS_PLANO.map((t) => [t, razao(a.subtotais[t], b.subtotais[t])])) as Record<TipoPlano, number | null>;
  return { valores, subtotais, total: razao(a.total, b.total) };
}

/**
 * Grade completa de uma visão: meses + coluna Total do período. Valores aditivos somam o período;
 * Sinistralidade e Per capita usam a razão das somas do período (nunca soma de razões).
 * Com produto selecionado, subtotais e totais (de linha e de coluna) consideram só esse produto.
 */
export function montarGrade(
  meses: MesEvolucao[],
  visao: "Vidas" | IndicadorFinanceiro,
  dados: { vidas: LinhaProduto[] | null; fin: LinhaFinanceira[] | null },
  opcoes: { perCapita?: boolean; produto?: TipoProduto | null } = {},
): { meses: GradeComTotais[]; periodo: Celulas | null } | null {
  const produto = opcoes.produto ?? null;
  const vidas = dados.vidas ? produtosPorMes(meses, dados.vidas, produto) : null;
  // Vidas são posição de fim de mês: não se somam no período, então a coluna Total fica vazia.
  if (visao === "Vidas") return vidas ? { meses: vidas, periodo: null } : null;
  if (!dados.fin) return null;
  const fin = dados.fin;
  if (visao === "Sinistralidade") {
    const desp = somaPeriodo(financeiroPorMes(meses, fin, "Despesas", produto));
    const rec = somaPeriodo(financeiroPorMes(meses, fin, "Total Receitas", produto));
    return { meses: financeiroPorMes(meses, fin, "Sinistralidade", produto), periodo: razaoCelulas(desp, rec) };
  }
  const g = financeiroPorMes(meses, fin, visao, produto);
  if (!opcoes.perCapita || !INDICADORES_PER_CAPITA.includes(visao)) return { meses: g, periodo: somaPeriodo(g) };
  if (!vidas) return null;
  return { meses: perCapita(g, vidas), periodo: razaoCelulas(somaPeriodo(g), somaPeriodo(vidas)) };
}

// ───────────── Visão Cidade (UF) ─────────────
// Fonte: supabase/sql/evolucao_produtos_cidades.sql. Cidade = município do plano (código IBGE), a mesma da
// Área Geográfica; somando as cidades, cada mês bate com a grade Tipo × Produto (mesmas regras e totais).

export type LinhaVidasCidade = LinhaProduto & { uf: string | null; cidade: string | null };
export type LinhaFinanceiraCidade = LinhaFinanceira & { uf: string | null; cidade: string | null };
/** Filtros da visão por cidade: tipo de plano e tipo de produto (null = todos). */
export type FiltroCidade = { tipo?: TipoPlano | null; produto?: TipoProduto | null };

export const UF_NAO_INFORMADA = "UF não informada";
export const CIDADE_NAO_INFORMADA = "Cidade não informada";
const txt = (v: string | null | undefined) => (v == null || String(v).trim() === "" ? null : String(v).trim().toUpperCase());
/** Rótulo "CIDADE (UF)"; sem cidade informada fica "Cidade não informada" (nada é inferido). */
export const rotuloCidade = (cidade: string | null, uf: string | null) =>
  txt(cidade) ? `${txt(cidade)} (${txt(uf) ?? "—"})` : CIDADE_NAO_INFORMADA;

type LinhaBaseCidade = { ano: number; mes: number; sigla: string | null; produto: string | null; uf: string | null; cidade: string | null; valor: Num };
type ChaveCidade = { k: string; uf: string | null; cidade: string | null };
/** Soma aditiva por cidade e mês. Mês sem nenhuma linha = null; cidade ausente em mês com dado = 0. */
type Aditiva = { chaves: Map<string, ChaveCidade>; mes: (Map<string, number> | null)[]; fora: number[] };

function aditivaCidades(meses: MesEvolucao[], linhas: LinhaBaseCidade[], filtro: FiltroCidade): Aditiva {
  const pos = new Map(meses.map((m, i) => [`${m.ano}-${m.mes}`, i]));
  const mes: (Map<string, number> | null)[] = meses.map(() => null);
  const fora = meses.map(() => 0);
  const chaves = new Map<string, ChaveCidade>();
  const siglas = new Set<string>(TIPOS_PLANO);
  const produtos = new Set<string>(TIPOS_PRODUTO.map((p) => p.id));
  for (const l of linhas) {
    const i = pos.get(`${Number(l.ano)}-${Number(l.mes)}`);
    if (i == null) continue;
    const m = (mes[i] ??= new Map());
    const v = Number(l.valor) || 0;
    const sg = String(l.sigla ?? "").trim().toUpperCase();
    const pr = String(l.produto ?? "").trim().toUpperCase();
    if (!siglas.has(sg) || !produtos.has(pr)) { fora[i] += v; continue; }
    if ((filtro.tipo && sg !== filtro.tipo) || (filtro.produto && pr !== filtro.produto)) continue;
    const uf = txt(l.uf), cidade = txt(l.cidade);
    const k = `${uf ?? ""}|${cidade ?? ""}`;
    m.set(k, (m.get(k) ?? 0) + v);
    if (v !== 0 && !chaves.has(k)) chaves.set(k, { k, uf, cidade });
  }
  return { chaves, mes, fora };
}

const somaChaves = (ad: Aditiva, ks: string[], i: number) => {
  const m = ad.mes[i];
  return m == null ? null : ks.reduce((s, k) => s + (m.get(k) ?? 0), 0);
};

/** Praça = São José do Rio Preto (SP); Região = todas as demais cidades (inclusive cidade não informada). */
export const PRACA = { uf: "SP", cidade: "SAO JOSE DO RIO PRETO" } as const;
export const GRUPOS_CIDADE = [
  { id: "PRACA", rotulo: "Praça" },
  { id: "REGIAO", rotulo: "Região" },
] as const;
export type GrupoCidadeId = (typeof GRUPOS_CIDADE)[number]["id"];
const semAcento = (v: string | null) => (v == null ? null : v.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
export const grupoDaCidade = (cidade: string | null, uf: string | null): GrupoCidadeId =>
  semAcento(txt(cidade)) === PRACA.cidade && txt(uf) === PRACA.uf ? "PRACA" : "REGIAO";
const rotuloGrupo = (id: GrupoCidadeId) => GRUPOS_CIDADE.find((g) => g.id === id)!.rotulo;

/** Linha da grade: um valor por mês e a coluna Total do período (null = sem dado ou, em Vidas, sem soma). */
export type LinhaCidades = { valores: (number | null)[]; periodo: number | null };
export type GrupoCidades = {
  id: GrupoCidadeId; rotulo: string;
  cidades: { uf: string | null; cidade: string | null; rotulo: string; linha: LinhaCidades }[];
  subtotal: LinhaCidades;
};
export type GradeCidades = { meses: MesEvolucao[]; grupos: GrupoCidades[]; total: LinhaCidades; fora: number[] };

/**
 * Grade Cidade (UF) × mês para uma visão. Cidades em dois grupos — Praça (São José do Rio Preto) e Região
 * (demais) — com Subtotal por grupo e Total Geral. Valores aditivos somam o período; Vidas não somam (coluna
 * Total null). Sinistralidade e Per capita usam a razão das somas em cada célula, subtotal, total e período.
 * Ordem: Praça, Região; cidades pelas vidas no último mês, da maior para a menor; cidade não informada por último.
 */
export function montarGradeCidades(
  meses: MesEvolucao[],
  visao: "Vidas" | IndicadorFinanceiro,
  dados: { vidas: LinhaVidasCidade[] | null; fin: LinhaFinanceiraCidade[] | null },
  opcoes: { perCapita?: boolean } & FiltroCidade = {},
): GradeCidades | null {
  if (!dados.vidas) return null;
  const filtro: FiltroCidade = { tipo: opcoes.tipo ?? null, produto: opcoes.produto ?? null };
  const vidas = aditivaCidades(meses, dados.vidas.map((l) => ({ ...l, valor: l.vidas })), filtro);
  let num: Aditiva, den: Aditiva | null = null;
  if (visao === "Vidas") num = vidas;
  else {
    if (!dados.fin) return null;
    const fin = dados.fin;
    const ad = (f: (l: LinhaFinanceira) => number) => aditivaCidades(meses, fin.map((l) => ({ ...l, ano: l.nr_ano, mes: l.nr_mes, valor: f(l) })), filtro);
    if (visao === "Sinistralidade") { num = ad(INDICADORES_FINANCEIROS.Despesas); den = ad(totalReceitas); }
    else {
      num = ad(INDICADORES_FINANCEIROS[visao]);
      if (opcoes.perCapita && INDICADORES_PER_CAPITA.includes(visao)) den = vidas;
    }
  }
  const linha = (ks: string[]): LinhaCidades => {
    const n = meses.map((_, i) => somaChaves(num, ks, i));
    if (!den) return { valores: n, periodo: visao === "Vidas" ? null : somaMeses(n) };
    const d = meses.map((_, i) => somaChaves(den as Aditiva, ks, i));
    return { valores: n.map((v, i) => razao(v, d[i])), periodo: razao(somaMeses(n), somaMeses(d)) };
  };
  const todas = new Map([...num.chaves, ...(den?.chaves ?? [])]);
  const ultimo = meses.length - 1;
  const peso = (ks: string[]) => (ultimo < 0 ? 0 : somaChaves(vidas, ks, ultimo) ?? 0);
  const ordem = (xs: ChaveCidade[]) =>
    xs.sort((a, b) => Number(a.cidade == null) - Number(b.cidade == null) || peso([b.k]) - peso([a.k]) || (a.cidade ?? "").localeCompare(b.cidade ?? "", "pt-BR"));
  const grupos: GrupoCidades[] = GRUPOS_CIDADE.map((g) => ({ g, cs: [...todas.values()].filter((c) => grupoDaCidade(c.cidade, c.uf) === g.id) }))
    .filter(({ cs }) => cs.length > 0)
    .map(({ g, cs }) => ({
      id: g.id,
      rotulo: g.rotulo,
      cidades: ordem(cs).map((c) => ({ uf: c.uf, cidade: c.cidade, rotulo: rotuloCidade(c.cidade, c.uf), linha: linha([c.k]) })),
      subtotal: linha(cs.map((c) => c.k)),
    }));
  // Total Geral pela soma de tudo o que entrou no filtro (inclui cidades zeradas no período).
  const tudo = [...new Set(num.mes.flatMap((m) => (m ? [...m.keys()] : [])).concat(den ? den.mes.flatMap((m) => (m ? [...m.keys()] : [])) : []))];
  const fora = den || visao === "Vidas" ? meses.map(() => 0) : num.fora;
  return { meses, grupos, total: linha(tudo), fora };
}

// ───────────── Modelo de dados (XLSX) ─────────────

/** Linha do modelo de dados: cidade × mês × tipo × produto, com as medidas aditivas (null = sem dado). */
export type LinhaModeloCidade = {
  competencia: string; ano: number; mes: number; grupo: string; uf: string | null; cidade: string | null; cidadeUf: string;
  tipo: TipoPlano; produto: string;
  vidas: number | null; receita: number | null; coparticipacao: number | null; totalReceitas: number | null; despesas: number | null; saldo: number | null;
};

/**
 * Tabela plana (modelo de dados) com os filtros escolhidos, nas mesmas regras do grid: só PIF/PCA/PCE e
 * produtos conhecidos; mês sem linha na fonte fica null; combinação ausente em mês com dado vale 0.
 * Total Receitas = Receita + Coparticipação; Saldo = Total Receitas − Despesas.
 */
export function modeloDadosCidades(
  meses: MesEvolucao[],
  dados: { vidas: LinhaVidasCidade[]; fin: LinhaFinanceiraCidade[] | null },
  filtro: FiltroCidade = {},
): LinhaModeloCidade[] {
  const pos = new Map(meses.map((m, i) => [`${m.ano}-${m.mes}`, i]));
  const siglas = new Set<string>(TIPOS_PLANO);
  const produtos = new Set<string>(TIPOS_PRODUTO.map((p) => p.id));
  type Acc = { i: number; uf: string | null; cidade: string | null; tipo: TipoPlano; produto: TipoProduto; vidas: number; rec: number; cop: number; desp: number };
  const acc = new Map<string, Acc>();
  const comVidas = new Set<number>(), comFin = new Set<number>();
  const somar = (ano: number, mes: number, sigla: string | null, produto: string | null, uf: string | null, cidade: string | null, origem: Set<number>, f: (a: Acc) => void) => {
    const i = pos.get(`${Number(ano)}-${Number(mes)}`);
    if (i == null) return;
    origem.add(i);
    const sg = String(sigla ?? "").trim().toUpperCase(), pr = String(produto ?? "").trim().toUpperCase();
    if (!siglas.has(sg) || !produtos.has(pr)) return;
    if ((filtro.tipo && sg !== filtro.tipo) || (filtro.produto && pr !== filtro.produto)) return;
    const u = txt(uf), c = txt(cidade);
    const k = `${i}|${u ?? ""}|${c ?? ""}|${sg}|${pr}`;
    let a = acc.get(k);
    if (!a) acc.set(k, (a = { i, uf: u, cidade: c, tipo: sg as TipoPlano, produto: pr as TipoProduto, vidas: 0, rec: 0, cop: 0, desp: 0 }));
    f(a);
  };
  for (const l of dados.vidas) somar(l.ano, l.mes, l.sigla, l.produto, l.uf, l.cidade, comVidas, (a) => { a.vidas += Number(l.vidas) || 0; });
  for (const l of dados.fin ?? []) somar(l.nr_ano, l.nr_mes, l.sigla, l.produto, l.uf, l.cidade, comFin, (a) => {
    a.rec += receita(l); a.cop += coparticipacao(l); a.desp += n0(l.desp_total);
  });
  const ordemGrupo = (id: GrupoCidadeId) => GRUPOS_CIDADE.findIndex((g) => g.id === id);
  const ordemProduto = (id: TipoProduto) => TIPOS_PRODUTO.findIndex((p) => p.id === id);
  return [...acc.values()]
    .sort((a, b) => a.i - b.i
      || ordemGrupo(grupoDaCidade(a.cidade, a.uf)) - ordemGrupo(grupoDaCidade(b.cidade, b.uf))
      || Number(a.cidade == null) - Number(b.cidade == null)
      || (a.uf ?? "").localeCompare(b.uf ?? "", "pt-BR") || (a.cidade ?? "").localeCompare(b.cidade ?? "", "pt-BR")
      || TIPOS_PLANO.indexOf(a.tipo) - TIPOS_PLANO.indexOf(b.tipo) || ordemProduto(a.produto) - ordemProduto(b.produto))
    .map((a) => {
      const m = meses[a.i];
      const fin = comFin.has(a.i);
      const totalRec = fin ? a.rec + a.cop : null;
      return {
        competencia: anoMesCampo(m), ano: m.ano, mes: m.mes,
        grupo: rotuloGrupo(grupoDaCidade(a.cidade, a.uf)), uf: a.uf, cidade: a.cidade, cidadeUf: rotuloCidade(a.cidade, a.uf),
        tipo: a.tipo, produto: TIPOS_PRODUTO[ordemProduto(a.produto)].rotulo,
        vidas: comVidas.has(a.i) ? a.vidas : null,
        receita: fin ? a.rec : null, coparticipacao: fin ? a.cop : null, totalReceitas: totalRec,
        despesas: fin ? a.desp : null, saldo: totalRec == null ? null : totalRec - a.desp,
      };
    });
}
