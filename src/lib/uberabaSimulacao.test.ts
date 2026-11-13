import { describe, expect, it } from 'vitest';
import { calcularSimulacao, calcularSimulacaoComercial, comercialDaFrente, consolidarSimulacao, consolidarFaixasSimulacao, csvSimulacao, distribuirResidual, fontesSimulacao as fonte, validarVidas, sinistralidadePadrao, resumoSimulacao, memoriaCalculo } from './uberabaSimulacao';
import padroesHistoricos from '@/data/uberabaSimulacao/configuracao_padrao.json';
import { INDICES_PADRAO, indicadoresPadrao, tabelaIndexada } from './uberabaTabelasComerciais';
const padrao=padroesHistoricos[0];
describe('Resumo consolidado por faixa etária', () => {
  it('soma entradas e mensalidades por faixa das quatro modalidades, sem faturamento acumulado', () => {
    const resultados=fonte.padroes.map(calcularSimulacao);
    const resumo=consolidarFaixasSimulacao(resultados);
    expect(resumo.total.entradas).toBe(10000);
    resumo.linhas.forEach((l,i)=>{
      expect(l.entradas).toBe(resultados.reduce((s,r)=>s+r.faixaAnual[i],0));
      expect(l.tmm).toBeCloseTo(resultados.reduce((s,r)=>s+r.faixaAnual[i]*r.mensalidades[i],0),7);
      expect(l.percentual).toBe(l.entradas/10000);
      expect(l.ticket).toBeCloseTo(l.tmm/l.entradas,8);
    });
    expect(resumo.total.tmm).toBeCloseTo(resultados.reduce((s,r)=>s+r.novasReceitas.reduce((a,v)=>a+v,0),0),7);
    expect(resumo.total.ticket).toBeCloseTo(resumo.total.tmm/10000,8);
    expect(resumo.total.percentual).toBe(1);
  });
  it('recalcula após alterar as vidas e retorna zero sem entradas', () => {
    const resultados=fonte.padroes.map((c,i)=>calcularSimulacao({...c,total_vidas:i===0?1500:c.total_vidas}));
    expect(consolidarFaixasSimulacao(resultados).total.entradas).toBe(9500);
    expect(consolidarFaixasSimulacao([]).total).toEqual({entradas:0,percentual:0,tmm:0,ticket:0});
  });
});
describe('Simulação comercial fornecida',()=>{
  it('agenciamento aplica cada percentual a uma mensalidade por venda, sem recorrência da carteira',()=>{
    for (const condicao of fonte.condicoes) {
      const original = padroesHistoricos.find(c=>c.produto_codigo===condicao.produto_codigo);
      if (!original) throw new Error('Modalidade sem configuração padrão.');
      // Uma venda em dezembro: uma vida na faixa residual 59+, uma única mensalidade.
      const r=calcularSimulacao({...original,condicao_comercial:condicao.condicao,total_vidas:1});
      const preco=fonte.precos.find(p=>p.produto_codigo===condicao.produto_codigo && p.faixa_numero===10);
      if (!preco) throw new Error('Mensalidade da faixa 59+ não encontrada.');
      expect(r.vidasMes).toEqual([0,0,0,0,0,0,0,0,0,0,0,1]);
      expect(r.anual.agenciamento).toBeCloseTo(preco.preco_siga*condicao.agenciamento_parcela_1,8);
    }
    const pca=calcularSimulacao(padrao);
    // Janeiro reaparece apenas na segunda parcela (75%); não volta nos meses seguintes.
    expect(pca.mensal[2].agenciamento).toBeCloseTo((pca.novasReceitas[1]+pca.novasReceitas[2])*0.75,8);
    expect(pca.anual.agenciamento).toBeCloseTo(pca.novasReceitas.reduce((s,v,i)=>s+v*(i===11?0.75:1.5),0),8);
  });
  it('total Beneficiário soma adesão e faturamento',()=>{
    const r=resumoSimulacao(padroesHistoricos.map(calcularSimulacao));
    expect(r.beneficiario.total).toBeCloseTo(35852729.1741,4);
  });
  it('resultado líquido Bensaúde desconta agenciamento do operacional',()=>{
    const r=resumoSimulacao(padroesHistoricos.map(c => calcularSimulacao({...c, sinistralidade_percentual: 70})));
    expect(r.bensaude.operacional).toBeCloseTo(5281309.0539,2);
    expect(r.bensaude.liquido).toBeCloseTo(-1726321.5236,2);
  });
  it('resultado SIGA soma adesão, faturamento e agenciamento',()=>{
    const r=resumoSimulacao(padroesHistoricos.map(calcularSimulacao));
    expect(r.siga.resultado).toBeCloseTo(10654850.0207,2);
  });
  it('distribui o faturamento entre Bensaúde, Lancers e SIGA sem incluir adesão',()=>{
    const r=calcularSimulacao(padrao);
    expect(r.anual.bensaude+r.anual.lancers+r.anual.siga).toBeCloseTo(8870385.94,2);
    r.mensal.forEach(m=>expect(m.bensaude+m.lancers+m.siga).toBeCloseTo(m.faturamento,8));
  });
  it('mantém agenciamento como custo comercial Bensaúde e receita SIGA, separado da adesão direta',()=>{
    const r=calcularSimulacao(padrao);
    expect(r.anual.agenciamento).toBeCloseTo(2211634.545,2);
    expect(r.anual.adesao).toBeCloseTo(1567978.4241,4);
    expect(consolidarSimulacao(padroesHistoricos.map(calcularSimulacao)).anual.agenciamento).toBeCloseTo(7007630.5775,3);
  });
  it('Resultado Bensaúde é faturamento Bensaúde menos despesa assistencial, sem adesão ou agenciamento',()=>{
    const rs=padroesHistoricos.map(c => calcularSimulacao({...c, sinistralidade_percentual: 70}));
    rs.forEach(r=>r.mensal.forEach(m=>expect(m.resultado_bensaude).toBeCloseTo(m.bensaude-m.despesa_assistencial,8)));
    expect(rs[0].anual.resultado_bensaude).toBeCloseTo(620927.0158,3);
    expect(consolidarSimulacao(rs).anual.resultado_bensaude).toBeCloseTo(5281309.0539,2);
  });
  it('usa Sinistralidade padrão de 70% em todas as modalidades',()=>{
    expect(sinistralidadePadrao).toBe(70);
    fonte.padroes.forEach(c=>{
      const r=calcularSimulacao(c);
      expect(r.anual.despesa_assistencial).toBeCloseTo(r.anual.faturamento * 0.7,7);
    });
    expect(calcularSimulacao(padrao).anual.despesa_assistencial).toBeCloseTo(8870385.94*0.7,2);
  });
  it('calcula Despesa Assistencial como Faturamento × Sinistralidade por modalidade',()=>{
    const percentuais = [80,90,100,110];
    const resultados = padroesHistoricos.map((c,i)=>calcularSimulacao({...c,sinistralidade_percentual:percentuais[i]}));
    resultados.forEach((r,i)=>{
      r.mensal.forEach(m=>expect(m.despesa_assistencial).toBeCloseTo(m.faturamento * percentuais[i] / 100,8));
      expect(r.anual.despesa_assistencial).toBeCloseTo(r.anual.faturamento * percentuais[i] / 100,7);
    });
    expect(resultados[0].anual.despesa_assistencial).toBeCloseTo(7096308.752,2);
    const consolidado=consolidarSimulacao(resultados);
    expect(consolidado.anual.despesa_assistencial).toBeCloseTo(resultados.reduce((s,r)=>s+r.anual.despesa_assistencial,0),7);
    consolidado.mensal.forEach((m,i)=>expect(m.despesa_assistencial).toBeCloseTo(resultados.reduce((s,r)=>s+r.mensal[i].despesa_assistencial,0),8));
    expect(calcularSimulacao({...padrao,sinistralidade_percentual:0}).anual.despesa_assistencial).toBe(0);
  });
  it('aceita somente vidas inteiras entre 1 e 100000',()=>{
    expect([0,1,100000,100001,1.5,NaN].map(validarVidas)).toEqual([false,true,true,false,false,false]);
  });
  it('mantém os quatro padrões SIGA / Réplica Bensaúde / 5000',()=>{
    expect(padroesHistoricos.map(c=>[c.tabela_preco,c.condicao_comercial,c.total_vidas])).toEqual(Array(4).fill(['SIGA','Réplica Bensaúde',5000]));
  });
  it('ajusta dezembro e faixa 10, reconciliando vidas',()=>{
    const r=calcularSimulacao(padrao);
    expect(r.vidasMes).toEqual([250,280,310,340,370,400,430,460,480,490,500,690]);
    expect(r.faixaAnual).toEqual([1426,305,529,568,487,500,428,317,195,245]);
    for(const total of [1,7,10,99,5000,100000]){
      const s=calcularSimulacao({...padrao,total_vidas:total});
      expect(s.vidasMes.reduce((a,b)=>a+b,0)).toBe(total);
      s.faixasMes.forEach((m,i)=>expect(m.reduce((a,b)=>a+b,0)).toBe(s.vidasMes[i]));
    }
    expect(distribuirResidual(1,fonte.meses.map(m=>m.percentual_anual))).toEqual([0,0,0,0,0,0,0,0,0,0,0,1]);
  });
  it('usa Enfermaria e muda os preços para a tabela selecionada',()=>{
    expect(calcularSimulacao(padrao).mensalidades[0]).toBe(166.06);
    expect(calcularSimulacao({...padrao,tabela_preco:'Bensaúde'}).mensalidades[0]).toBe(157.5);
    expect(fonte.produtos.every(p=>p.acomodacao==='Enfermaria')).toBe(true);
  });
  it('acumula receita nova e soma faturamentos mensais no ano',()=>{
    const r=calcularSimulacao(padrao);
    expect(r.mensal[0].faturamento).toBeCloseTo(r.novasReceitas[0],8);
    expect(r.mensal[1].faturamento).toBeCloseTo(r.novasReceitas[0]+r.novasReceitas[1],8);
    expect(r.anual.faturamento).toBeCloseTo(8870385.94,2);
  });
  it('aplica participações ao acumulado e valida soma de 100%',()=>{
    const r=calcularSimulacao(padrao);
    expect(r.anual.lancers).toBeCloseTo(1774077.188,2);
    expect(r.anual.siga).toBeCloseTo(266111.5782,3);
    expect(r.anual.bensaude).toBeCloseTo(6830197.1738,3);
    expect(r.participacoesValidas).toBe(true);
  });
  it('parcela agenciamento sobre receita nova com defasagem, contando janeiro a dezembro',()=>{
    const r=calcularSimulacao(padrao);
    expect(r.mensal[0].agenciamento).toBeCloseTo(r.novasReceitas[0]*.75,8);
    expect(r.mensal[1].agenciamento).toBeCloseTo((r.novasReceitas[0]+r.novasReceitas[1])*.75,8);
    expect(r.anual.agenciamento).toBeCloseTo(2211634.545,2);
    const pme=calcularSimulacao({...padroesHistoricos[1],condicao_comercial:'SIGA'});
    expect(pme.mensal[3].agenciamento).toBeCloseTo(pme.novasReceitas.slice(0,4).reduce((a,b)=>a+b,0)*.5,8);
    expect(pme.mensal[4].agenciamento).toBeCloseTo(pme.novasReceitas.slice(1,5).reduce((a,b)=>a+b,0)*.5,8);
  });
  it('aplica adesão sobre receita nova',()=>{
    const r=calcularSimulacao(padrao);
    expect(r.anual.adesao).toBeCloseTo(1567978.4241,4);
    expect(calcularSimulacao(padroesHistoricos[2]).anual.adesao).toBe(0);
  });
  it('consolida quatro cenários individuais sem somar vidas acumuladas no tempo',()=>{
    const total=consolidarSimulacao(padroesHistoricos.map(calcularSimulacao));
    expect(total.anual.vidas).toBe(20000);
    expect(total.anual.acumuladas).toBe(20000);
    expect(total.anual.faturamento).toBeCloseTo(33537601.89,2);
    expect(total.anual.bensaude).toBeCloseTo(28757630.3769,2);
    expect(total.anual.agenciamento+total.anual.adesao).toBeCloseTo(9322757.8616,4);
  });
  it('exporta cenários individuais atuais e consolidado em CSV pt-BR',()=>{
    const cenarios=padroesHistoricos.map((c,i)=>calcularSimulacao({...c,total_vidas:i===0?1234:c.total_vidas}));
    const csv=csvSimulacao(cenarios);
    expect(csv).toContain('"1234"');
    expect(csv).toContain('"Consolidado"');
    expect(csv).toContain('"'+String(consolidarSimulacao(cenarios).anual.faturamento.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}))+'"');
  });
});

describe('Bensaúde Regra e cenário solicitado', () => {
  it('inicia com 10.000 vidas: 5.000 no PJ+ e 2.000 no PCA', () => {
    expect(fonte.padroes.map(c => [c.produto_codigo, c.total_vidas])).toEqual([
      ['PCA', 2000], ['PME_ADMINISTRADO', 1000], ['PCE_50_99', 2000], ['PCE_100_MAIS', 5000],
    ]);
    expect(fonte.padroes.every(c => c.condicao_comercial === 'Bensaúde Regra')).toBe(true);
    expect(consolidarSimulacao(fonte.padroes.map(calcularSimulacao)).anual.vidas).toBe(10000);
  });
  it.each(['PCA', 'PME_ADMINISTRADO', 'PCE_50_99', 'PCE_100_MAIS'])('%s calcula 90%% de uma mensalidade por venda', codigo => {
    const config = fonte.padroes.find(c => c.produto_codigo === codigo);
    if (!config) throw new Error('Configuração ausente');
    const r = calcularSimulacao(config);
    expect([r.condicao.agenciamento_parcela_1, r.condicao.agenciamento_parcela_2, r.condicao.agenciamento_parcela_3, r.condicao.agenciamento_parcela_4, r.condicao.agenciamento_parcela_5]).toEqual([0.9, 0, 0, 0, 0]);
    r.mensal.forEach((m, i) => expect(m.agenciamento).toBeCloseTo(r.novasReceitas[i] * 0.9, 8));
    expect(r.anual.agenciamento).toBeCloseTo(r.novasReceitas.reduce((s, v) => s + v, 0) * 0.9, 7);
  });
  it.each([
    ['PCA', 0.77, 0.2, 0.03, 0.99],
    ['PME_ADMINISTRADO', 0.96, 0, 0.04, 0],
    ['PCE_50_99', 0.96, 0, 0.04, 0],
    ['PCE_100_MAIS', 0.95, 0, 0.05, 0],
  ] as const)('%s mantém as participações e adesão de Bensaúde', (codigo, bensaude, lancers, siga, adesao) => {
    const config = fonte.padroes.find(c => c.produto_codigo === codigo);
    if (!config) throw new Error('Configuração ausente');
    const r = calcularSimulacao(config);
    expect([r.condicao.participacao_bensaude, r.condicao.participacao_lancers, r.condicao.participacao_siga, r.condicao.taxa_adesao]).toEqual([bensaude, lancers, siga, adesao]);
    expect(r.anual.bensaude).toBeCloseTo(r.anual.faturamento * bensaude, 7);
    expect(r.anual.lancers).toBeCloseTo(r.anual.faturamento * lancers, 7);
    expect(r.anual.siga).toBeCloseTo(r.anual.faturamento * siga, 7);
  });
});


describe('Distribuição etária %CART da imagem', () => {
  it('usa os dez percentuais fornecidos na ordem das faixas, somando 100%', () => {
    expect(fonte.faixas.map(f => f.percentual_normalizado)).toEqual([0.2850,0.0610,0.1058,0.1137,0.0976,0.1000,0.0857,0.0634,0.0388,0.0490]);
    expect(fonte.faixas.reduce((s,f) => s+f.percentual_normalizado,0)).toBeCloseTo(1,12);
  });
  it.each(['PCA','PME_ADMINISTRADO','PCE_50_99','PCE_100_MAIS'])('%s aplica %CART às entradas mensais e mantém o residual em 59+', codigo => {
    const config=fonte.padroes.find(c=>c.produto_codigo===codigo);
    if (!config) throw new Error('Configuração ausente');
    const r=calcularSimulacao(config);
    r.faixasMes.forEach((faixas,i)=>{
      expect(faixas.slice(0,9)).toEqual([.285,.061,.1058,.1137,.0976,.1,.0857,.0634,.0388].map(p=>Math.round(r.vidasMes[i]*p)));
      expect(faixas.reduce((s,v)=>s+v,0)).toBe(r.vidasMes[i]);
    });
  });
});

describe('Simulação de resultados com as tabelas de Resultados Comerciais', () => {
  const simular = (codigo: string, indices = INDICES_PADRAO, indicadores = indicadoresPadrao()) => {
    const config = fonte.padroes.find(c => c.produto_codigo === codigo);
    if (!config) throw new Error('Configuração ausente');
    return calcularSimulacaoComercial(config, comercialDaFrente(codigo, indices, indicadores));
  };
  it.each([
    ['PCA', 'pcaAdm'], ['PME_ADMINISTRADO', 'pmeAdm'], ['PCE_50_99', 'pceAdm'], ['PCE_100_MAIS', 'pce100'],
  ] as const)('%s usa a Enfermaria da tabela correspondente', (codigo, frente) => {
    expect(simular(codigo).mensalidades).toEqual(tabelaIndexada(INDICES_PADRAO[frente]).map(l => l.enfermariaCentavos / 100));
    expect(simular(codigo, { ...INDICES_PADRAO, [frente]: 100 }).mensalidades[0]).toBe(175);
  });
  it.each([
    // Bensaúde = Operadora, Lancers = Administradora, SIGA = Agenciadora, agenciamento = Contratual, adesão = Taxa de adesão.
    ['PCA', 0.77, 0.23, 0, 0.9, 0.99],
    ['PME_ADMINISTRADO', 0.77, 0.23, 0, 0.9, 0.5],
    ['PCE_50_99', 0.77, 0.23, 0, 0.9, 0.5],
    ['PCE_100_MAIS', 0.95, 0, 0.05, 0.9, 0],
  ] as const)('%s usa os Indicadores variáveis padrão', (codigo, bensaude, lancers, siga, agenciamento, adesao) => {
    const r = simular(codigo);
    expect([r.condicao.participacao_bensaude, r.condicao.participacao_lancers, r.condicao.participacao_siga, r.condicao.agenciamento_parcela_1, r.condicao.taxa_adesao]).toEqual([bensaude, lancers, siga, agenciamento, adesao]);
    expect([r.condicao.agenciamento_parcela_2, r.condicao.agenciamento_parcela_3, r.condicao.agenciamento_parcela_4, r.condicao.agenciamento_parcela_5]).toEqual([0, 0, 0, 0]);
    expect(r.participacoesValidas).toBe(true);
  });
  it('acompanha a alteração dos Indicadores variáveis', () => {
    const ind = indicadoresPadrao();
    ind.pcaAdm = { ...ind.pcaAdm, spread: 30, contratual: 120, adesao: 40 };
    ind.pce100 = { ...ind.pce100, spread: 8 };
    const pca = simular('PCA', INDICES_PADRAO, ind);
    expect([pca.condicao.participacao_bensaude, pca.condicao.participacao_lancers, pca.condicao.agenciamento_parcela_1, pca.condicao.taxa_adesao]).toEqual([0.7, 0.3, 1.2, 0.4]);
    pca.mensal.forEach((m, i) => expect(m.agenciamento).toBeCloseTo(pca.novasReceitas[i] * 1.2, 8));
    const pj = simular('PCE_100_MAIS', INDICES_PADRAO, ind);
    expect([pj.condicao.participacao_bensaude, pj.condicao.participacao_siga]).toEqual([0.92, 0.08]);
  });
  it.each([
    ['PCA', 0.9, 1.5], ['PME_ADMINISTRADO', 0.9, 1.5], ['PCE_50_99', 0.9, 1.5], ['PCE_100_MAIS', 0.9, 1],
  ] as const)('%s usa Contratual por padrão e Promocional pela chave', (codigo, contratual, promocional) => {
    expect(comercialDaFrente(codigo, INDICES_PADRAO, indicadoresPadrao()).condicao.agenciamento_parcela_1).toBe(contratual);
    expect(comercialDaFrente(codigo, INDICES_PADRAO, indicadoresPadrao(), 'contratual').condicao.agenciamento_parcela_1).toBe(contratual);
    const config = fonte.padroes.find(c => c.produto_codigo === codigo)!;
    const r = calcularSimulacaoComercial(config, comercialDaFrente(codigo, INDICES_PADRAO, indicadoresPadrao(), 'promocional'));
    expect(r.condicao.agenciamento_parcela_1).toBe(promocional);
    r.mensal.forEach((m, i) => expect(m.agenciamento).toBeCloseTo(r.novasReceitas[i] * promocional, 8));
  });
  it('soma 10.000 vidas no padrão', () => {
    const rs = fonte.padroes.map(c => simular(c.produto_codigo));
    expect(consolidarSimulacao(rs).anual.vidas).toBe(10000);
  });
});

describe('Memória de cálculo do Resultado por Ente', () => {
  const rs = fonte.padroes.map(c => calcularSimulacaoComercial(c, comercialDaFrente(c.produto_codigo, INDICES_PADRAO, indicadoresPadrao())));
  const nomes = ['PCA', 'PME ADM.', 'PCE ADM.', 'PJ+'];
  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  it('Faturamento Bensaúde lista Faturamento × Operadora de cada produto e a soma', () => {
    const m = memoriaCalculo('bensaude.faturamento', rs, nomes);
    expect(m.passos).toHaveLength(5);
    expect(m.passos[0]).toBe(`PCA: Faturamento ${fmt(rs[0].anual.faturamento)} × Operadora 77,00% = ${fmt(rs[0].anual.bensaude)}`);
    expect(m.passos[3]).toContain('Operadora 95,00%');
    expect(m.passos[4]).toBe(`Soma: ${fmt(resumoSimulacao(rs).bensaude.faturamento)}`);
  });
  it('Despesa usa a Sinistralidade de 70% e uma modalidade não mostra soma', () => {
    const m = memoriaCalculo('bensaude.despesa', [rs[3]], ['PJ+']);
    expect(m.passos).toEqual([`PJ+: Faturamento ${fmt(rs[3].anual.faturamento)} × Sinistralidade 70,00% = ${fmt(rs[3].anual.despesa_assistencial)}`]);
  });
  it('Resultado Líquido = Operacional − Agenciamento com os valores do cenário', () => {
    const r = resumoSimulacao(rs);
    expect(memoriaCalculo('bensaude.liquido', rs, nomes).passos).toEqual([`${fmt(r.bensaude.operacional)} − ${fmt(r.bensaude.agenciamento)} = ${fmt(r.bensaude.liquido)}`]);
  });
  it('Agenciamento = Vendas × percentual Contratual (90%)', () => {
    const vendas = rs[0].novasReceitas.reduce((s, v) => s + v, 0);
    expect(memoriaCalculo('siga.agenciamento', [rs[0]], ['PCA']).passos[0]).toBe(`PCA: Vendas ${fmt(vendas)} × Agenciamento 90,00% = ${fmt(rs[0].anual.agenciamento)}`);
  });
  it('Lancers usa Administradora 23% e SIGA do PJ+ usa Agenciadora 5%', () => {
    expect(memoriaCalculo('lancers.faturamento', [rs[0]], ['PCA']).passos[0]).toContain('Administradora 23,00%');
    expect(memoriaCalculo('siga.faturamento', [rs[3]], ['PJ+']).passos[0]).toContain('Agenciadora 5,00%');
  });
});
