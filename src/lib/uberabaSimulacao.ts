import produtos from '@/data/uberabaSimulacao/produtos.json';
import precos from '@/data/uberabaSimulacao/precos_enfermaria.json';
import condicoesImportadas from '@/data/uberabaSimulacao/condicoes_comerciais.json';
import meses from '@/data/uberabaSimulacao/distribuicao_mensal.json';
import faixasImportadas from '@/data/uberabaSimulacao/distribuicao_faixa_etaria.json';
import padroesImportados from '@/data/uberabaSimulacao/configuracao_padrao.json';
import { MODELO_INDICADORES, derivarIndicadores, derivarVitalicio, tabelaIndexada, type FrenteId, type Indices, type IndicadoresPorFrente } from '@/lib/uberabaTabelasComerciais';

// Condição solicitada pelo usuário, separada dos arquivos históricos fornecidos.
// Ajuste solicitado: "Bensaúde" no PME com agenciamento de 150% (75% + 75%).
const condicoesBase = condicoesImportadas.map(c => c.condicao === 'Bensaúde' && c.produto_codigo === 'PME_ADMINISTRADO'
  ? { ...c, agenciamento_parcela_1: 0.75, agenciamento_parcela_2: 0.75, agenciamento_parcela_3: 0, agenciamento_parcela_4: 0, agenciamento_parcela_5: 0 }
  : c);
const condicoes = [...condicoesBase, ...condicoesImportadas
  .filter(c => c.condicao === 'Bensaúde')
  .map(c => ({ ...c, condicao: 'Bensaúde Regra', agenciamento_parcela_1: 0.9,
    agenciamento_parcela_2: 0, agenciamento_parcela_3: 0,
    agenciamento_parcela_4: 0, agenciamento_parcela_5: 0 }))];
// Vidas iniciais pedidas em 13/11/2026: 10.000 no total, 5.000 no PJ+ e 2.000 no PCA (PME e PCE ADM. mantidos).
const vidasIniciais: Record<string, number> = { PCA: 2000, PME_ADMINISTRADO: 1000, PCE_50_99: 2000, PCE_100_MAIS: 5000 };
const padroes = padroesImportados.map(c => ({ ...c, condicao_comercial: 'Bensaúde Regra', total_vidas: vidasIniciais[c.produto_codigo] ?? c.total_vidas }));
// %CART da imagem fornecida em 26/10/2026, aplicado às quatro modalidades.
const percentuaisCart = [0.2850, 0.0610, 0.1058, 0.1137, 0.0976, 0.1000, 0.0857, 0.0634, 0.0388, 0.0490];
const faixas = faixasImportadas.map(f => ({ ...f, percentual_normalizado: percentuaisCart[f.faixa_numero - 1] }));

export const fontesSimulacao = { produtos, precos, condicoes, meses, faixas, padroes };
export const sinistralidadePadrao = 70;
export type ConfigSimulacao = { produto_codigo: string; tabela_preco: string; condicao_comercial: string; total_vidas: number; sinistralidade_percentual?: number };
export function validarSinistralidade(value: number) {
  return Number.isFinite(value) && value >= 0;
}
export const limitesVidas = { min: 1, max: 100000 };
export function validarVidas(value: number) {
  return Number.isInteger(value) && value >= limitesVidas.min && value <= limitesVidas.max;
}
export function distribuirResidual(total: number, percentuais: number[]) {
  const values = percentuais.slice(0, -1).map(p => Math.round(total * p));
  return [...values, total - values.reduce((s, v) => s + v, 0)];
}
export const indicadoresSimulacao = [
  { key: 'vidas', label: 'Vidas vendidas no mês', integer: true },
  { key: 'acumuladas', label: 'Vidas acumuladas', integer: true },
  { key: 'faturamento', label: 'Faturamento cumulativo', integer: false },
  { key: 'bensaude', label: 'Faturamento Bensaúde', integer: false },
  { key: 'lancers', label: 'Faturamento Lancers', integer: false },
  { key: 'siga', label: 'Faturamento SIGA', integer: false },
  { key: 'agenciamento', label: 'Agenciamento · custo Bensaúde / receita SIGA', integer: false },
  { key: 'adesao', label: 'Taxa de adesão · beneficiário → SIGA', integer: false },
  { key: 'despesa_assistencial', label: 'Despesa Assistencial · Bensaúde', integer: false },
  { key: 'resultado_bensaude', label: 'Resultado Bensaúde', integer: false },
] as const;
export type FinanceiroSimulacao = { vidas: number; acumuladas: number; faturamento: number; despesa_assistencial: number; lancers: number; siga: number; bensaude: number; agenciamento: number; adesao: number; resultado_bensaude: number };
export const numeroSimulacao = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const percentualSimulacao = (v: number) => `${numeroSimulacao(v * 100)}%`;
export const inteiroSimulacao = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
export type CondicaoSimulacao = (typeof condicoes)[number];
/** Preços (Enfermaria, em reais, por faixa) e condição usados numa modalidade. */
export type ComercialSimulacao = { mensalidades: number[]; condicao: CondicaoSimulacao };

/** Cenário dos CSVs fornecidos (tabela de preço e condição comercial selecionadas). */
export function calcularSimulacao(config: ConfigSimulacao) {
  const condicao = condicoes.find(c => c.produto_codigo === config.produto_codigo && c.condicao === config.condicao_comercial);
  const tabela = precos.filter(p => p.produto_codigo === config.produto_codigo).sort((a,b) => a.faixa_numero-b.faixa_numero);
  if (!condicao || tabela.length !== 10 || !['SIGA', 'Bensaúde'].includes(config.tabela_preco)) throw new Error('Configuração não encontrada nos CSVs.');
  return simular(config, { condicao, mensalidades: tabela.map(p => config.tabela_preco === 'SIGA' ? p.preco_siga : p.preco_bensaude) });
}

/** Modalidade da simulação → tabela de Resultados Comerciais (PCA, PME ADM., PCE ADM., PJ+). */
export const FRENTE_DO_PRODUTO: Record<string, FrenteId> = { PCA: 'pcaAdm', PME_ADMINISTRADO: 'pmeAdm', PCE_50_99: 'pceAdm', PCE_100_MAIS: 'pce100' };
export const ORIGEM_RESULTADOS_COMERCIAIS = 'Resultados Comerciais';

/**
 * Pedido de 13/11/2026: sem seleção de tabela ou condição; tudo vem da tabela correspondente em Resultados Comerciais.
 * Mensalidade = Enfermaria da tabela (Referência × índice). Agenciamento = Contratual ou Promocional (chave), numa parcela.
 * Taxa de adesão = Taxa de adesão (PJ+ não tem). Bensaúde = Operadora; Lancers = Administradora; SIGA = Agenciadora.
 */
/** Chave da Simulação de resultados: qual percentual de Agenciamento dos Indicadores variáveis entra no cálculo. */
export type BaseAgenciamento = 'contratual' | 'promocional';
export const BASES_AGENCIAMENTO: { id: BaseAgenciamento; rotulo: string }[] = [{ id: 'contratual', rotulo: 'Contratual' }, { id: 'promocional', rotulo: 'Promocional' }];

export function comercialDaFrente(produtoCodigo: string, indices: Indices, indicadores: IndicadoresPorFrente, agenciamento: BaseAgenciamento = 'contratual'): ComercialSimulacao {
  const id = FRENTE_DO_PRODUTO[produtoCodigo];
  if (!id) throw new Error('Modalidade sem tabela em Resultados Comerciais.');
  const i = indicadores[id];
  const vitalicio = MODELO_INDICADORES[id] === 'vitalicio';
  const operadora = (vitalicio ? derivarVitalicio(i) : derivarIndicadores(i)).operadora;
  return {
    mensalidades: tabelaIndexada(indices[id]).map(l => l.enfermariaCentavos / 100),
    condicao: {
      produto_codigo: produtoCodigo, condicao: ORIGEM_RESULTADOS_COMERCIAIS,
      participacao_bensaude: operadora / 100,
      participacao_lancers: vitalicio ? 0 : i.spread / 100,
      participacao_siga: vitalicio ? i.spread / 100 : 0,
      agenciamento_parcela_1: i[agenciamento] / 100, agenciamento_parcela_2: 0, agenciamento_parcela_3: 0, agenciamento_parcela_4: 0, agenciamento_parcela_5: 0,
      taxa_adesao: vitalicio ? 0 : i.adesao / 100,
    },
  };
}

/** Cenário com preços e percentuais de Resultados Comerciais. */
export function calcularSimulacaoComercial(config: ConfigSimulacao, comercial: ComercialSimulacao) {
  return simular({ ...config, tabela_preco: ORIGEM_RESULTADOS_COMERCIAIS, condicao_comercial: ORIGEM_RESULTADOS_COMERCIAIS }, comercial);
}

/** Cenário do Resultado por Ente calculado com um dos percentuais de Agenciamento (Contratual ou Promocional). */
export type CenarioAgenciamento = { base: BaseAgenciamento; rotulo: string; resultados: ResultadoSimulacao[] };
/**
 * Pedido de 13/11/2026: o Resultado por Ente mostra dois blocos, um com o Agenciamento Contratual e outro com o Promocional,
 * com as mesmas vidas, sinistralidades, preços e participações.
 */
export function simularPorBase(configuracoes: ConfigSimulacao[], indices: Indices, indicadores: IndicadoresPorFrente): CenarioAgenciamento[] {
  return BASES_AGENCIAMENTO.map(b => ({ base: b.id, rotulo: b.rotulo,
    resultados: configuracoes.map(c => calcularSimulacaoComercial(c, comercialDaFrente(c.produto_codigo, indices, indicadores, b.id))) }));
}

/** Ícone "Replicar" (Sinistralidade): copia o percentual da modalidade de origem (PCA) para todas as demais. */
export function replicarSinistralidade(configuracoes: ConfigSimulacao[], origem: string): ConfigSimulacao[] {
  const fonteConfig = configuracoes.find(c => c.produto_codigo === origem);
  if (!fonteConfig) return configuracoes;
  const valor = fonteConfig.sinistralidade_percentual ?? sinistralidadePadrao;
  return configuracoes.map(c => ({ ...c, sinistralidade_percentual: valor }));
}

function simular(config: ConfigSimulacao, { condicao, mensalidades }: ComercialSimulacao) {
  if (!validarVidas(config.total_vidas)) throw new Error('Total de vidas deve ser inteiro entre 1 e 100000.');
  const sinistralidade = config.sinistralidade_percentual ?? sinistralidadePadrao;
  if (!validarSinistralidade(sinistralidade)) throw new Error('Informe uma sinistralidade percentual válida, maior ou igual a zero.');
  const produto = produtos.find(p => p.produto_codigo === config.produto_codigo);
  if (!produto || mensalidades.length !== 10) throw new Error('Configuração não encontrada nos CSVs.');
  const vidasMes = distribuirResidual(config.total_vidas, [...meses].sort((a,b)=>a.mes_numero-b.mes_numero).map(m=>m.percentual_anual));
  const faixasMes = vidasMes.map(v => distribuirResidual(v, [...faixas].sort((a,b)=>a.faixa_numero-b.faixa_numero).map(f=>f.percentual_normalizado)));
  const novasReceitas = faixasMes.map(values => values.reduce((s,v,i) => s + v * mensalidades[i], 0));
  const parcelas = [condicao.agenciamento_parcela_1, condicao.agenciamento_parcela_2, condicao.agenciamento_parcela_3, condicao.agenciamento_parcela_4, condicao.agenciamento_parcela_5];
  let faturamento = 0, acumuladas = 0;
  const mensal: FinanceiroSimulacao[] = vidasMes.map((vidas,i) => {
    faturamento += novasReceitas[i]; acumuladas += vidas;
    return { vidas, acumuladas, faturamento, resultado_bensaude: faturamento * condicao.participacao_bensaude - faturamento * sinistralidade / 100, despesa_assistencial: faturamento * sinistralidade / 100, lancers: faturamento * condicao.participacao_lancers, siga: faturamento * condicao.participacao_siga, bensaude: faturamento * condicao.participacao_bensaude,
      agenciamento: parcelas.reduce((s,p,j) => s + p * (novasReceitas[i-j] ?? 0), 0), adesao: novasReceitas[i] * condicao.taxa_adesao };
  });
  const anual = totalizarSimulacao(mensal);
  const faixaAnual = faixas.map((_, i) => faixasMes.reduce((s,m) => s + m[i], 0));
  const somaParticipacoes = condicao.participacao_lancers + condicao.participacao_siga + condicao.participacao_bensaude;
  return { config, produto, condicao, mensalidades, vidasMes, faixasMes, novasReceitas, mensal, anual, faixaAnual,
    media: novasReceitas.reduce((s,v)=>s+v,0)/config.total_vidas,
    participacoesValidas: Math.abs(somaParticipacoes-1)<1e-9,
    residualNegativo: faixasMes.some(m => m.some(v=>v<0)) || vidasMes.some(v=>v<0) };
}
export type ResultadoSimulacao = ReturnType<typeof calcularSimulacao>;
export function consolidarFaixasSimulacao(resultados: ResultadoSimulacao[]) {
  const totalEntradas = resultados.reduce((s, r) => s + r.config.total_vidas, 0);
  const linhas = faixas.map((f, i) => {
    const entradas = resultados.reduce((s, r) => s + r.faixaAnual[i], 0);
    const tmm = resultados.reduce((s, r) => s + r.faixaAnual[i] * r.mensalidades[i], 0);
    return { faixa: f.faixa_etaria.replace(/^Faixa \d+ — /, ''), entradas, percentual: totalEntradas > 0 ? entradas / totalEntradas : 0, tmm, ticket: entradas > 0 ? tmm / entradas : 0 };
  });
  const tmm = linhas.reduce((s, l) => s + l.tmm, 0);
  return { linhas, total: { entradas: totalEntradas, percentual: totalEntradas > 0 ? 1 : 0, tmm, ticket: totalEntradas > 0 ? tmm / totalEntradas : 0 } };
}
export function totalizarSimulacao(rows: FinanceiroSimulacao[]): FinanceiroSimulacao {
  const sum = (key: keyof FinanceiroSimulacao) => rows.reduce((s,r) => s+r[key],0);
  return { vidas: sum('vidas'), acumuladas: rows.at(-1)?.acumuladas ?? 0, faturamento: sum('faturamento'), despesa_assistencial: sum('despesa_assistencial'), lancers: sum('lancers'), siga: sum('siga'), bensaude: sum('bensaude'), agenciamento: sum('agenciamento'), adesao: sum('adesao'), resultado_bensaude: sum('resultado_bensaude') };
}
export function consolidarSimulacao(resultados: ResultadoSimulacao[]) {
  const mensal = meses.map((_,i) => {
    const rows = resultados.map(r=>r.mensal[i]);
    return { ...totalizarSimulacao(rows), acumuladas: rows.reduce((s,r)=>s+r.acumuladas,0) };
  });
  return { mensal, anual: totalizarSimulacao(mensal) };
}
export function csvSimulacao(resultados: ResultadoSimulacao[]) {
  const consolidated = consolidarSimulacao(resultados);
  const rows: (string | number)[][] = [['Simulador Comercial Bensaúde|Uberaba'], ['Cenários selecionados'], ['Modalidade','Tabela de preço','Condição comercial','Total de vidas','Mensalidade média ponderada','Sinistralidade'],
    ...resultados.map(r=>[r.produto.produto_nome,r.config.tabela_preco,r.config.condicao_comercial,r.config.total_vidas,numeroSimulacao(r.media),percentualSimulacao((r.config.sinistralidade_percentual ?? sinistralidadePadrao)/100)])];
  for (const r of resultados) {
    rows.push([], [r.produto.produto_nome, 'Distribuição etária'], ['Faixa etária', ...meses.map(m=>m.mes),'Total anual','Percentual efetivo','Mensalidade']);
    faixas.forEach((f,i)=>rows.push([f.faixa_etaria, ...r.faixasMes.map(m=>m[i]),r.faixaAnual[i],percentualSimulacao(r.faixaAnual[i]/r.config.total_vidas),numeroSimulacao(r.mensalidades[i])]));
  }
  for (const r of [...resultados.map(r=>({nome:r.produto.produto_nome,...r})), {nome:'Consolidado',...consolidated}]) {
    rows.push([], [r.nome], ['Mês',...indicadoresSimulacao.map(i=>i.label)]);
    r.mensal.forEach((m,j)=>rows.push([meses[j].mes,...indicadoresSimulacao.map(i=>i.integer ? m[i.key] : numeroSimulacao(m[i.key]))]));
    rows.push(['Total anual / vidas acumuladas finais',...indicadoresSimulacao.map(i=>i.integer ? r.anual[i.key] : numeroSimulacao(r.anual[i.key]))]);
  }
  return '\uFEFF' + rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n');
}
export function resumoSimulacao(resultados: ResultadoSimulacao[]) {
  const { anual: a } = consolidarSimulacao(resultados);
  return {
    beneficiario: { adesao: a.adesao, faturamento: a.faturamento, total: a.adesao + a.faturamento },
    bensaude: { faturamento: a.bensaude, despesa: a.despesa_assistencial, operacional: a.bensaude - a.despesa_assistencial, agenciamento: a.agenciamento, liquido: a.bensaude - a.despesa_assistencial - a.agenciamento },
    lancers: { faturamento: a.lancers },
    siga: { adesao: a.adesao, faturamento: a.siga, agenciamento: a.agenciamento, resultado: a.adesao + a.siga + a.agenciamento },
  };
}
/** Indicadores do quadro Resultado por Ente (Simulação de resultados). */
export type IndicadorEnte =
  | 'beneficiario.adesao' | 'beneficiario.faturamento' | 'beneficiario.total'
  | 'bensaude.faturamento' | 'bensaude.despesa' | 'bensaude.operacional' | 'bensaude.agenciamento' | 'bensaude.liquido'
  | 'lancers.faturamento'
  | 'siga.adesao' | 'siga.faturamento' | 'siga.agenciamento' | 'siga.resultado';
/** Linha da memória de cálculo: modalidade (ou "Consolidado"), conta sem o resultado e o resultado. */
export type ItemMemoria = { modalidade: string; calculo: string; valor: number };
export type MemoriaCalculo = { formula: string; passos: string[]; itens: ItemMemoria[]; valor: number };

/**
 * Memória de cálculo de um indicador do Resultado por Ente, com os valores do cenário atual.
 * `nomes` acompanha `resultados` (uma sigla por modalidade); com mais de uma modalidade, lista cada uma e a soma.
 * `passos` é o texto da dica na tela; `itens` traz as mesmas contas separadas para o relatório em PDF.
 */
export function memoriaCalculo(indicador: IndicadorEnte, resultados: ResultadoSimulacao[], nomes: string[]): MemoriaCalculo {
  const n = numeroSimulacao, p = percentualSimulacao;
  const r = resumoSimulacao(resultados);
  const vendas = (x: ResultadoSimulacao) => x.novasReceitas.reduce((s, v) => s + v, 0);
  const porModalidade = (calculo: (x: ResultadoSimulacao) => string, valor: (x: ResultadoSimulacao) => number, total: number) => {
    const itens = resultados.map((x, i) => ({ modalidade: nomes[i] ?? x.config.produto_codigo, calculo: calculo(x), valor: valor(x) }));
    const passos = itens.map(it => `${it.modalidade}: ${it.calculo} = ${n(it.valor)}`);
    return { passos: resultados.length > 1 ? [...passos, `Soma: ${n(total)}`] : passos, itens, valor: total };
  };
  const consolidado = (calculo: string, total: number) => ({ passos: [`${calculo} = ${n(total)}`], itens: [{ modalidade: 'Consolidado', calculo, valor: total }], valor: total });
  const adesao = () => porModalidade(x => `Vendas ${n(vendas(x))} × Taxa de adesão ${p(x.condicao.taxa_adesao)}`, x => x.anual.adesao, r.beneficiario.adesao);
  const agenciamento = () => porModalidade(x => {
    const c = x.condicao;
    const soParcela1 = [c.agenciamento_parcela_2, c.agenciamento_parcela_3, c.agenciamento_parcela_4, c.agenciamento_parcela_5].every(v => !v);
    return soParcela1 ? `Vendas ${n(vendas(x))} × Agenciamento ${p(c.agenciamento_parcela_1)}` : 'Parcelas de agenciamento sobre as vendas';
  }, x => x.anual.agenciamento, r.bensaude.agenciamento);
  const participacao = (rotulo: string, pct: (x: ResultadoSimulacao) => number, valor: (x: ResultadoSimulacao) => number, total: number) =>
    porModalidade(x => `Faturamento ${n(x.anual.faturamento)} × ${rotulo} ${p(pct(x))}`, valor, total);
  const vendasDef = 'Vendas = 1ª mensalidade (Enfermaria por faixa etária) de cada vida vendida no ano.';
  switch (indicador) {
    case 'beneficiario.adesao': case 'siga.adesao':
      return { formula: 'Taxa de Adesão = Vendas × Taxa de adesão do produto (paga pelo beneficiário à AGENCIADORA). ' + vendasDef, ...adesao() };
    case 'beneficiario.faturamento':
      return { formula: 'Faturamento = soma, de janeiro a dezembro, das mensalidades de todas as vidas vendidas até cada mês (carteira acumulada, sem cancelamentos ou reajustes).',
        ...porModalidade(x => `${inteiroSimulacao(x.config.total_vidas)} vidas × mensalidade média ${n(x.media)}, acumuladas mês a mês`, x => x.anual.faturamento, r.beneficiario.faturamento) };
    case 'beneficiario.total':
      return { formula: 'Total = Taxa de Adesão + Faturamento.', ...consolidado(`${n(r.beneficiario.adesao)} + ${n(r.beneficiario.faturamento)}`, r.beneficiario.total) };
    case 'bensaude.faturamento':
      return { formula: 'Faturamento OPERADORA = Faturamento × Participação OPERADORA.', ...participacao('OPERADORA', x => x.condicao.participacao_bensaude, x => x.anual.bensaude, r.bensaude.faturamento) };
    case 'bensaude.despesa':
      return { formula: 'Despesa Assistencial = Faturamento × Sinistralidade (%) da modalidade.', ...participacao('Sinistralidade', x => (x.config.sinistralidade_percentual ?? sinistralidadePadrao) / 100, x => x.anual.despesa_assistencial, r.bensaude.despesa) };
    case 'bensaude.operacional':
      return { formula: 'Resultado Operacional = Faturamento OPERADORA − Despesa Assistencial.', ...consolidado(`${n(r.bensaude.faturamento)} − ${n(r.bensaude.despesa)}`, r.bensaude.operacional) };
    case 'bensaude.agenciamento': case 'siga.agenciamento':
      return { formula: `Agenciamento = Vendas × percentual de Agenciamento do produto (${indicador === 'siga.agenciamento' ? 'receita da AGENCIADORA' : 'custo da OPERADORA'}), pago no mês da venda. ` + vendasDef, ...agenciamento() };
    case 'bensaude.liquido':
      return { formula: 'Resultado Líquido = Resultado Operacional − Agenciamento.', ...consolidado(`${n(r.bensaude.operacional)} − ${n(r.bensaude.agenciamento)}`, r.bensaude.liquido) };
    case 'lancers.faturamento':
      return { formula: 'Faturamento ADMINISTRADORA = Faturamento × Participação ADMINISTRADORA.', ...participacao('ADMINISTRADORA', x => x.condicao.participacao_lancers, x => x.anual.lancers, r.lancers.faturamento) };
    case 'siga.faturamento':
      return { formula: 'Faturamento AGENCIADORA = Faturamento × Participação AGENCIADORA.', ...participacao('AGENCIADORA', x => x.condicao.participacao_siga, x => x.anual.siga, r.siga.faturamento) };
    case 'siga.resultado':
      return { formula: 'Resultado = Taxa de Adesão + Faturamento AGENCIADORA + Agenciamento.', ...consolidado(`${n(r.siga.adesao)} + ${n(r.siga.faturamento)} + ${n(r.siga.agenciamento)}`, r.siga.resultado) };
  }
}

type Resumo = ReturnType<typeof resumoSimulacao>;
type Mensal = FinanceiroSimulacao;
/** Indicador do quadro Resultado por Ente: chave da memória, rótulo da tela e valor exibido (despesas com sinal negativo). */
/** `agenciamento`: o valor depende do percentual de Agenciamento (aparece em dobro no relatório, Contratual e Promocional). */
export type LinhaEnte = { chave: IndicadorEnte; label: string; valor: (r: Resumo) => number; destaque?: boolean; agenciamento?: boolean };
/** Coluna da evolução mensal do ente no relatório da memória de cálculo. */
export type ColunaMensalEnte = { label: string; valor: (m: Mensal) => number; inteiro?: boolean; agenciamento?: boolean };
/** Quadros do Resultado por Ente, compartilhados pela tela e pelo relatório em PDF (nomes dos entes pedidos em 13/11/2026). */
export const ENTES_RESULTADO: { titulo: string; linhas: LinhaEnte[]; mensal: ColunaMensalEnte[] }[] = [
  { titulo: 'Beneficiário', linhas: [
    { chave: 'beneficiario.adesao', label: 'Taxa de Adesão', valor: r => r.beneficiario.adesao },
    { chave: 'beneficiario.faturamento', label: 'Faturamento', valor: r => r.beneficiario.faturamento },
    { chave: 'beneficiario.total', label: 'Total', valor: r => r.beneficiario.total, destaque: true },
  ], mensal: [
    { label: 'Vidas vendidas', valor: m => m.vidas, inteiro: true },
    { label: 'Vidas acumuladas', valor: m => m.acumuladas, inteiro: true },
    { label: 'Taxa de Adesão', valor: m => m.adesao },
    { label: 'Faturamento', valor: m => m.faturamento },
    { label: 'Total', valor: m => m.adesao + m.faturamento },
  ] },
  { titulo: 'OPERADORA', linhas: [
    { chave: 'bensaude.faturamento', label: 'Faturamento', valor: r => r.bensaude.faturamento },
    { chave: 'bensaude.despesa', label: '− Despesa Assistencial', valor: r => -r.bensaude.despesa },
    { chave: 'bensaude.operacional', label: '= Resultado Operacional', valor: r => r.bensaude.operacional, destaque: true },
    { chave: 'bensaude.agenciamento', label: '− Agenciamento', valor: r => -r.bensaude.agenciamento, agenciamento: true },
    { chave: 'bensaude.liquido', label: '= Resultado Líquido', valor: r => r.bensaude.liquido, destaque: true, agenciamento: true },
  ], mensal: [
    { label: 'Faturamento', valor: m => m.bensaude },
    { label: 'Despesa Assist.', valor: m => -m.despesa_assistencial },
    { label: 'Res. Operacional', valor: m => m.bensaude - m.despesa_assistencial },
    { label: 'Agenciamento', valor: m => -m.agenciamento, agenciamento: true },
    { label: 'Res. Líquido', valor: m => m.bensaude - m.despesa_assistencial - m.agenciamento, agenciamento: true },
  ] },
  { titulo: 'ADMINISTRADORA', linhas: [{ chave: 'lancers.faturamento', label: 'Faturamento', valor: r => r.lancers.faturamento, destaque: true }], mensal: [
    { label: 'Faturamento total', valor: m => m.faturamento },
    { label: 'Faturamento ADMINISTRADORA', valor: m => m.lancers },
  ] },
  { titulo: 'AGENCIADORA', linhas: [
    { chave: 'siga.adesao', label: 'Taxa de Adesão', valor: r => r.siga.adesao },
    { chave: 'siga.faturamento', label: 'Faturamento', valor: r => r.siga.faturamento },
    { chave: 'siga.agenciamento', label: 'Agenciamento', valor: r => r.siga.agenciamento, agenciamento: true },
    { chave: 'siga.resultado', label: 'Resultado', valor: r => r.siga.resultado, destaque: true, agenciamento: true },
  ], mensal: [
    { label: 'Taxa de Adesão', valor: m => m.adesao },
    { label: 'Faturamento', valor: m => m.siga },
    { label: 'Agenciamento', valor: m => m.agenciamento, agenciamento: true },
    { label: 'Resultado', valor: m => m.adesao + m.siga + m.agenciamento, agenciamento: true },
  ] },
];

/** Resultado total do ente (última linha do quadro), mostrado no título quando o quadro está recolhido. */
export function resultadoTotalEnte(ente: (typeof ENTES_RESULTADO)[number]): LinhaEnte {
  return ente.linhas[ente.linhas.length - 1];
}

/**
 * Conteúdo do relatório da memória de cálculo: por ente, cada indicador com fórmula e contas, e a evolução mensal consolidada.
 * Pedido de 13/11/2026: só os indicadores (e evoluções mensais) que dependem do Agenciamento aparecem em dobro,
 * um por cenário (Contratual e Promocional), com `base` = rótulo do cenário; os demais aparecem uma vez (valores iguais nos dois).
 */
export function relatorioMemoriaCalculo(cenarios: CenarioAgenciamento[], nomes: string[]) {
  const por = (c: CenarioAgenciamento) => ({ c, total: resumoSimulacao(c.resultados), mensal: consolidarSimulacao(c.resultados).mensal });
  const todos = cenarios.map(por);
  return ENTES_RESULTADO.map(ente => ({
    titulo: ente.titulo,
    indicadores: ente.linhas.flatMap(l => (l.agenciamento ? todos : todos.slice(0, 1)).map(({ c, total }) => ({
      label: l.label, base: l.agenciamento ? c.rotulo : undefined, destaque: !!l.destaque, valorExibido: l.valor(total), ...memoriaCalculo(l.chave, c.resultados, nomes),
    }))),
    mensais: (ente.mensal.some(col => col.agenciamento) ? todos : todos.slice(0, 1)).map(({ c, mensal }) => ({
      base: ente.mensal.some(col => col.agenciamento) ? c.rotulo : undefined,
      colunas: ['Mês', ...ente.mensal.map(col => col.label)],
      linhas: mensal.map((m, i) => ({ mes: meses[i].mes, valores: ente.mensal.map(col => col.valor(m)) })),
      // Vidas acumuladas: o total é a carteira do fim do ano, não a soma dos meses.
      total: ente.mensal.map(col => col.label === 'Vidas acumuladas' ? mensal.at(-1)?.acumuladas ?? 0 : mensal.reduce((s, m) => s + col.valor(m), 0)),
      inteiros: ente.mensal.map(col => !!col.inteiro),
    })),
  }));
}

/** Quadro de parâmetros do relatório: uma linha por modalidade, com o Agenciamento de cada cenário (na ordem de `cenarios`). */
export function parametrosMemoriaCalculo(cenarios: CenarioAgenciamento[], nomes: string[]) {
  const base = cenarios[0]?.resultados ?? [];
  return base.map((r, i) => ({
    modalidade: nomes[i] ?? r.config.produto_codigo,
    vidas: r.config.total_vidas,
    mensalidadeMedia: r.media,
    vendas: r.novasReceitas.reduce((s, v) => s + v, 0),
    agenciamentos: cenarios.map(c => c.resultados[i].condicao.agenciamento_parcela_1),
    adesao: r.condicao.taxa_adesao,
    bensaude: r.condicao.participacao_bensaude,
    lancers: r.condicao.participacao_lancers,
    siga: r.condicao.participacao_siga,
    sinistralidade: (r.config.sinistralidade_percentual ?? sinistralidadePadrao) / 100,
  }));
}
