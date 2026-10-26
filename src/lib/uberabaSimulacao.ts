import produtos from '@/data/uberabaSimulacao/produtos.json';
import precos from '@/data/uberabaSimulacao/precos_enfermaria.json';
import condicoes from '@/data/uberabaSimulacao/condicoes_comerciais.json';
import meses from '@/data/uberabaSimulacao/distribuicao_mensal.json';
import faixas from '@/data/uberabaSimulacao/distribuicao_faixa_etaria.json';
import padroes from '@/data/uberabaSimulacao/configuracao_padrao.json';

export const fontesSimulacao = { produtos, precos, condicoes, meses, faixas, padroes };
export type ConfigSimulacao = { produto_codigo: string; tabela_preco: string; condicao_comercial: string; total_vidas: number };
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
  { key: 'lancers', label: 'Parte da Lancers', integer: false },
  { key: 'siga', label: 'Parte da SIGA', integer: false },
  { key: 'bensaude', label: 'Parte do Bensaúde', integer: false },
  { key: 'agenciamento', label: 'Agenciamento SIGA', integer: false },
  { key: 'adesao', label: 'Taxa de adesão', integer: false },
] as const;
export type FinanceiroSimulacao = { vidas: number; acumuladas: number; faturamento: number; lancers: number; siga: number; bensaude: number; agenciamento: number; adesao: number };
export const numeroSimulacao = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const percentualSimulacao = (v: number) => `${numeroSimulacao(v * 100)}%`;
export const inteiroSimulacao = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
export function calcularSimulacao(config: ConfigSimulacao) {
  if (!validarVidas(config.total_vidas)) throw new Error('Total de vidas deve ser inteiro entre 1 e 100000.');
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
    return { vidas, acumuladas, faturamento, lancers: faturamento * condicao.participacao_lancers, siga: faturamento * condicao.participacao_siga, bensaude: faturamento * condicao.participacao_bensaude,
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
  return { vidas: sum('vidas'), acumuladas: rows.at(-1)?.acumuladas ?? 0, faturamento: sum('faturamento'), lancers: sum('lancers'), siga: sum('siga'), bensaude: sum('bensaude'), agenciamento: sum('agenciamento'), adesao: sum('adesao') };
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
  const rows: (string | number)[][] = [['Simulador Comercial Bensaúde|Uberaba'], ['Cenários selecionados'], ['Modalidade','Tabela de preço','Condição comercial','Total de vidas','Mensalidade média ponderada'],
    ...resultados.map(r=>[r.produto.produto_nome,r.config.tabela_preco,r.config.condicao_comercial,r.config.total_vidas,numeroSimulacao(r.media)])];
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