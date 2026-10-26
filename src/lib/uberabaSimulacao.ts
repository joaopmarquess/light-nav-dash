import produtos from '@/data/uberabaSimulacao/produtos.json';
import precos from '@/data/uberabaSimulacao/precos_enfermaria.json';
import condicoesImportadas from '@/data/uberabaSimulacao/condicoes_comerciais.json';
import meses from '@/data/uberabaSimulacao/distribuicao_mensal.json';
import faixasImportadas from '@/data/uberabaSimulacao/distribuicao_faixa_etaria.json';
import padroesImportados from '@/data/uberabaSimulacao/configuracao_padrao.json';

// Condição solicitada pelo usuário, separada dos arquivos históricos fornecidos.
const condicoes = [...condicoesImportadas, ...condicoesImportadas
  .filter(c => c.condicao === 'Bensaúde')
  .map(c => ({ ...c, condicao: 'Bensaúde Regra', agenciamento_parcela_1: 0.9,
    agenciamento_parcela_2: 0, agenciamento_parcela_3: 0,
    agenciamento_parcela_4: 0, agenciamento_parcela_5: 0 }))];
const vidasIniciais: Record<string, number> = { PCA: 1000, PME_ADMINISTRADO: 1000, PCE_50_99: 2000, PCE_100_MAIS: 4000 };
const padroes = padroesImportados.map(c => ({ ...c, condicao_comercial: 'Bensaúde Regra', total_vidas: vidasIniciais[c.produto_codigo] ?? c.total_vidas }));
// %CART da imagem fornecida em 26/10/2026, aplicado às quatro modalidades.
const percentuaisCart = [0.2850, 0.0610, 0.1058, 0.1137, 0.0976, 0.1000, 0.0857, 0.0634, 0.0388, 0.0490];
const faixas = faixasImportadas.map(f => ({ ...f, percentual_normalizado: percentuaisCart[f.faixa_numero - 1] }));

export const fontesSimulacao = { produtos, precos, condicoes, meses, faixas, padroes };
export const sinistralidadePadrao = 65;
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
export function calcularSimulacao(config: ConfigSimulacao) {
  if (!validarVidas(config.total_vidas)) throw new Error('Total de vidas deve ser inteiro entre 1 e 100000.');
  const sinistralidade = config.sinistralidade_percentual ?? sinistralidadePadrao;
  if (!validarSinistralidade(sinistralidade)) throw new Error('Informe uma sinistralidade percentual válida, maior ou igual a zero.');
  const produto = produtos.find(p => p.produto_codigo === config.produto_codigo);
  const condicao = condicoes.find(c => c.produto_codigo === config.produto_codigo && c.condicao === config.condicao_comercial);
  const tabela = precos.filter(p => p.produto_codigo === config.produto_codigo).sort((a,b) => a.faixa_numero-b.faixa_numero);
  if (!produto || !condicao || tabela.length !== 10 || !['SIGA', 'Bensaúde'].includes(config.tabela_preco)) throw new Error('Configuração não encontrada nos CSVs.');
  const mensalidades = tabela.map(p => config.tabela_preco === 'SIGA' ? p.preco_siga : p.preco_bensaude);
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