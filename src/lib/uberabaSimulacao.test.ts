import { describe, expect, it } from 'vitest';
import { PADRAO_PARAMETRO, equipePropriaPadrao, agencProprioPadrao, netVidaMes, receitaVidaMes, despesaMediaPadrao, copartPadrao, replicarParametro, coparticipacaoVidaMes, calcularSimulacao, calcularSimulacaoComercial, comercialDaFrente, consolidarSimulacao, consolidarFaixasSimulacao, csvSimulacao, distribuirResidual, fontesSimulacao as fonte, validarVidas, sinistralidadePadrao, resumoSimulacao, memoriaCalculo, relatorioMemoriaCalculo, parametrosMemoriaCalculo, simularPorBase, replicarSinistralidade, resultadoTotalEnte, ENTES_RESULTADO } from './uberabaSimulacao';
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
  it('Faturamento OPERADORA lista Faturamento × OPERADORA de cada produto e a soma', () => {
    const m = memoriaCalculo('bensaude.faturamento', rs, nomes);
    expect(m.passos).toHaveLength(5);
    expect(m.passos[0]).toBe(`PCA: Faturamento ${fmt(rs[0].anual.faturamento)} × OPERADORA 77,00% = ${fmt(rs[0].anual.bensaude)}`);
    expect(m.passos[3]).toContain('OPERADORA 95,00%');
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
    expect(memoriaCalculo('lancers.agenciamento', [rs[0]], ['PCA']).passos[0]).toBe(`PCA: Vendas ${fmt(vendas)} × (100% − Equipe Própria 0,00%) × Agenciamento 90,00% = ${fmt(rs[0].anual.agenciamento)}`);
  });
  it('ADMINISTRADORA usa 23% e AGENCIADORA do PJ+ usa 5%', () => {
    expect(memoriaCalculo('lancers.faturamento', [rs[0]], ['PCA']).passos[0]).toContain('ADMINISTRADORA 23,00%');
    expect(memoriaCalculo('siga.faturamento', [rs[3]], ['PJ+']).passos[0]).toContain('AGENCIADORA 5,00%');
  });
});

describe('Relatório da Memória de Cálculo (Resultado por Ente)', () => {
  const nomesR = ['PCA', 'PME ADM.', 'PCE ADM.', 'PJ+'];
  const configs = fonte.padroes.map(c => ({ ...c, sinistralidade_percentual: sinistralidadePadrao }));
  const cenarios = simularPorBase(configs, INDICES_PADRAO, indicadoresPadrao());
  const [contratual, promocional] = cenarios;
  const rsR = contratual.resultados;
  const rel = relatorioMemoriaCalculo(cenarios, nomesR);
  it('traz os quatro entes na ordem da tela, com os nomes OPERADORA, ADMINISTRADORA e AGENCIADORA', () => {
    expect(rel.map(e => e.titulo)).toEqual(['BENEFICIÁRIO', 'OPERADORA', 'ADMINISTRADORA', 'AGENCIADORA']);
  });
  it('dois cenários: Contratual e Promocional, com o mesmo faturamento e agenciamentos diferentes', () => {
    expect(cenarios.map(c => c.rotulo)).toEqual(['Contratual', 'Promocional']);
    const c = resumoSimulacao(contratual.resultados), p = resumoSimulacao(promocional.resultados);
    expect(p.bensaude.faturamento).toBeCloseTo(c.bensaude.faturamento, 6);
    expect(promocional.resultados[0].condicao.agenciamento_parcela_1).toBe(1.5);
    expect(contratual.resultados[0].condicao.agenciamento_parcela_1).toBe(0.9);
    expect(p.bensaude.agenciamento).toBeGreaterThan(c.bensaude.agenciamento);
  });
  it('só Agenciamento e os resultados que o contêm aparecem em dobro', () => {
    const rotulos = (i: number) => rel[i].indicadores.map(x => x.base ? `${x.label} · ${x.base}` : x.label);
    expect(rotulos(0)).toEqual(['Taxa de Adesão', 'Faturamento', 'Coparticipação', 'Total']);
    expect(rotulos(1)).toEqual(['Faturamento', '+ Coparticipação', '− Despesa Assistencial', '= Resultado Operacional', '− Agenciamento Externo · Contratual', '− Agenciamento Externo · Promocional', '− Agenciamento Próprio', '− Total Agenciamento · Contratual', '− Total Agenciamento · Promocional', '= Resultado Líquido · Contratual', '= Resultado Líquido · Promocional']);
    expect(rotulos(2)).toEqual(['Faturamento', 'Agenciamento Externo · Contratual', 'Agenciamento Externo · Promocional', 'Resultado · Contratual', 'Resultado · Promocional']);
    expect(rotulos(3)).toEqual(['Taxa de Adesão', 'Faturamento', 'Agenciamento Externo · Contratual', 'Agenciamento Externo · Promocional', 'Resultado · Contratual', 'Resultado · Promocional']);
    expect(rel.map(e => e.mensais.map(m => m.base))).toEqual([[undefined], ['Contratual', 'Promocional'], ['Contratual', 'Promocional'], ['Contratual', 'Promocional']]);
    const liqP = rel[1].indicadores.find(x => x.label === '= Resultado Líquido' && x.base === 'Promocional')!;
    expect(liqP.valorExibido).toBeCloseTo(resumoSimulacao(promocional.resultados).bensaude.liquido, 6);
  });
  it('cada indicador soma as contas por modalidade no mesmo valor da tela', () => {
    const r = resumoSimulacao(rsR);
    const fat = rel[1].indicadores[0];
    expect(fat.itens.map(i => i.modalidade)).toEqual(nomesR);
    expect(fat.itens.reduce((s, i) => s + i.valor, 0)).toBeCloseTo(r.bensaude.faturamento, 6);
    expect(fat.valorExibido).toBeCloseTo(r.bensaude.faturamento, 6);
    expect(rel[1].indicadores[2].valorExibido).toBeCloseTo(-r.bensaude.despesa, 6);
    expect(rel[1].indicadores.find(x => x.label === '= Resultado Líquido' && x.base === 'Contratual')!.itens).toEqual([{ modalidade: 'Consolidado', calculo: expect.any(String), valor: r.bensaude.liquido }]);
  });
  it('o total do ano da evolução mensal fecha com o anual e Vidas acumuladas termina em 10.000', () => {
    const r = resumoSimulacao(rsR);
    const b = rel[0].mensais[0];
    expect(b.linhas).toHaveLength(12);
    expect(b.total[b.colunas.indexOf('Vidas acumuladas') - 1]).toBe(10000);
    expect(b.total[b.colunas.indexOf('Total') - 1]).toBeCloseTo(r.beneficiario.total, 6);
    const s = rel[3].mensais[1];
    expect(s.total[s.colunas.indexOf('Resultado') - 1]).toBeCloseTo(resumoSimulacao(promocional.resultados).siga.resultado, 6);
  });
  it('parâmetros usam as vidas e percentuais do cenário, com os dois agenciamentos', () => {
    const p = parametrosMemoriaCalculo(cenarios, nomesR);
    expect(p.map(x => x.vidas)).toEqual([2000, 1000, 2000, 5000]);
    expect(p.map(x => x.agenciamentos)).toEqual([[0.9, 1.5], [0.9, 1.5], [0.9, 1.5], [0.9, 1]]);
    expect(p[0].lancers).toBeCloseTo(0.23, 9);
    expect(p[3].siga).toBeCloseTo(0.05, 9);
    expect(p.every(x => x.sinistralidade === 0.7)).toBe(true);
  });
  it('parâmetros do PDF trazem Net média, Copart. e Receitas com as fórmulas da tela', () => {
    const cfg = fonte.padroes.map(c => ({ ...c, sinistralidade_percentual: 70, despesa_media: despesaMediaPadrao, copart_percentual: copartPadrao }));
    const cs = simularPorBase(cfg, INDICES_PADRAO, indicadoresPadrao());
    const p = parametrosMemoriaCalculo(cs, nomesR);
    expect(p.every(x => x.despesaMedia === 190.45)).toBe(true);
    p.forEach((x, i) => {
      expect(x.netMedia).toBeCloseTo(x.mensalidadeMedia * x.bensaude, 9);
      expect(x.copartVida).toBeCloseTo(38.09, 9);
      expect(x.receitas).toBeCloseTo(x.netMedia + x.copartVida, 9);
      expect(x.receitas).toBeCloseTo(receitaVidaMes(cs[0].resultados[i]), 9);
    });
  });
});

describe('Replicar Sinistralidade do PCA', () => {
  it('copia o percentual do PCA para as demais modalidades', () => {
    const configs = fonte.padroes.map((c, i) => ({ ...c, sinistralidade_percentual: [62.5, 70, 80, 90][i] }));
    expect(replicarSinistralidade(configs, 'PCA').map(c => c.sinistralidade_percentual)).toEqual([62.5, 62.5, 62.5, 62.5]);
  });
  it('sem percentual digitado no PCA usa o padrão de 70%', () => {
    const configs = fonte.padroes.map((c, i) => ({ ...c, sinistralidade_percentual: i === 0 ? undefined : 55 }));
    expect(replicarSinistralidade(configs, 'PCA').every(c => c.sinistralidade_percentual === 70)).toBe(true);
  });
});

describe('Resultado total no título do quadro recolhido', () => {
  it('cada ente mostra o seu resultado final', () => {
    expect(ENTES_RESULTADO.map(e => resultadoTotalEnte(e).chave)).toEqual(['beneficiario.total', 'bensaude.liquido', 'lancers.resultado', 'siga.resultado']);
  });
});

describe('Desp. Assist. média e % Copart (pedido de 13/11/2026)', () => {
  const nomesR = ['PCA', 'PME ADM.', 'PCE ADM.', 'PJ+'];
  const configs = fonte.padroes.map(c => ({ ...c, sinistralidade_percentual: 70, despesa_media: despesaMediaPadrao, copart_percentual: copartPadrao }));
  const [contratual] = simularPorBase(configs, INDICES_PADRAO, indicadoresPadrao());
  const rs = contratual.resultados;
  it('padrões: Desp. Assist. média R$ 190,45 e % Copart 20%', () => {
    expect(despesaMediaPadrao).toBe(190.45);
    expect(copartPadrao).toBe(20);
  });
  it('coparticipação por vida/mês = 20% de 190,45 = 38,09', () => {
    expect(coparticipacaoVidaMes(configs[0])).toBeCloseTo(38.09, 9);
  });
  it('coparticipação do mês = vidas projetadas acumuladas × 38.09', () => {
    rs.forEach(r => r.mensal.forEach(m => expect(m.coparticipacao).toBeCloseTo(m.acumuladas * 38.09, 6)));
  });
  it('soma ao Total pago pelo beneficiário e entra 100% para a OPERADORA', () => {
    const r = resumoSimulacao(rs);
    expect(r.beneficiario.total).toBeCloseTo(r.beneficiario.adesao + r.beneficiario.faturamento + r.beneficiario.coparticipacao, 6);
    expect(r.bensaude.operacional).toBeCloseTo(r.bensaude.faturamento + r.bensaude.coparticipacao - r.bensaude.despesa, 6);
    expect(r.bensaude.coparticipacao).toBeCloseTo(r.beneficiario.coparticipacao, 9);
    expect(r.lancers.faturamento).toBeCloseTo(resumoSimulacao(simularPorBase(configs.map(c => ({ ...c, copart_percentual: 0 })), INDICES_PADRAO, indicadoresPadrao())[0].resultados).lancers.faturamento, 6);
  });
  it('a Desp. Assist. média não muda a despesa assistencial, que segue faturamento × sinistralidade', () => {
    const outra = simularPorBase(configs.map(c => ({ ...c, despesa_media: 500 })), INDICES_PADRAO, indicadoresPadrao())[0].resultados;
    expect(resumoSimulacao(outra).bensaude.despesa).toBeCloseTo(resumoSimulacao(rs).bensaude.despesa, 6);
  });
  it('Replicar copia Desp. Assist. média e % Copart do PCA', () => {
    const cs = configs.map((c, i) => ({ ...c, despesa_media: [300, 1, 2, 3][i], copart_percentual: [15, 1, 2, 3][i] }));
    expect(replicarParametro(cs, 'PCA', 'despesa_media').map(c => c.despesa_media)).toEqual([300, 300, 300, 300]);
    expect(replicarParametro(cs, 'PCA', 'copart_percentual').map(c => c.copart_percentual)).toEqual([15, 15, 15, 15]);
  });
  it('Receitas por vida/mês = Net média + copart. (38,09 com os padrões)', () => {
    rs.forEach(r => expect(receitaVidaMes(r)).toBeCloseTo(r.media * r.condicao.participacao_bensaude + 38.09, 9));
  });
  it('Net média = mensalidade média × participação OPERADORA (77% no PCA com 23% de ADMINISTRADORA)', () => {
    rs.forEach(r => expect(netVidaMes(r)).toBeCloseTo(r.media * r.condicao.participacao_bensaude, 9));
    expect(rs[0].condicao.participacao_bensaude).toBeCloseTo(0.77, 9);
    expect(netVidaMes(rs[0])).toBeCloseTo(rs[0].media * 0.77, 9);
  });
  it('memória de cálculo da coparticipação mostra a conta mês a mês, despesa média e %', () => {
    const m = memoriaCalculo('bensaude.coparticipacao', rs, nomesR);
    expect(m.itens[0].calculo).toContain('Desp. Assist. média 190,45 × % Copart 20,00%');
    expect(m.valor).toBeCloseTo(resumoSimulacao(rs).bensaude.coparticipacao, 6);
  });
});

describe('Chave PERCENTUAL / MÉDIA ASSIST. da Despesa Assistencial (pedido de 13/11/2026)', () => {
  const nomesR = ['PCA', 'PME ADM.', 'PCE ADM.', 'PJ+'];
  const configs = fonte.padroes.map(c => ({ ...c, sinistralidade_percentual: 70, despesa_media: 280.45, copart_percentual: 20 }));
  it('Percentual (padrão): despesa = faturamento × sinistralidade', () => {
    const [c] = simularPorBase(configs, INDICES_PADRAO, indicadoresPadrao());
    c.resultados.forEach(r => r.mensal.forEach(m => expect(m.despesa_assistencial).toBeCloseTo(m.faturamento * 0.7, 6)));
  });
  it('Média Assist.: despesa = vidas projetadas acumuladas × Desp. Assist. média, sem a sinistralidade', () => {
    const [c] = simularPorBase(configs.map(x => ({ ...x, sinistralidade_percentual: 10 })), INDICES_PADRAO, indicadoresPadrao(), 'media');
    c.resultados.forEach(r => r.mensal.forEach(m => expect(m.despesa_assistencial).toBeCloseTo(m.acumuladas * 280.45, 6)));
    const r = resumoSimulacao(c.resultados);
    expect(r.bensaude.operacional).toBeCloseTo(r.bensaude.faturamento + r.bensaude.coparticipacao - r.bensaude.despesa, 6);
    const m = memoriaCalculo('bensaude.despesa', c.resultados, nomesR);
    expect(m.formula).toContain('Média Assist.');
    expect(m.itens[0].calculo).toContain('Desp. Assist. média 280,45');
  });
  it('Média Assist.: memória mostra a despesa mês a mês e nunca soma as vidas acumuladas', () => {
    const [c] = simularPorBase(configs, INDICES_PADRAO, indicadoresPadrao(), 'media');
    const m = memoriaCalculo('bensaude.despesa', c.resultados, nomesR);
    const pca = m.itens[0].calculo;
    expect(pca).toContain('Jan 100 = 28.045,00');
    expect(pca).toContain('Dez 2.000 = 560.900,00');
    expect(pca).not.toContain('vidas-mês');
    expect(m.itens.every(it => !/11\.184|55\.920/.test(it.calculo))).toBe(true);
  });
  it('a chave vale para os dois cenários de agenciamento', () => {
    const cs = simularPorBase(configs, INDICES_PADRAO, indicadoresPadrao(), 'media');
    expect(cs.every(c => c.resultados.every(r => r.config.base_despesa === 'media'))).toBe(true);
  });
});

describe('Equipe Própria e Agenciamento Externo/Próprio (pedido de 13/11/2026)', () => {
  const nomesE = ['PCA', 'PME ADM.', 'PCE ADM.', 'PJ+'];
  const configs = fonte.padroes.map(c => ({ ...c, ...PADRAO_PARAMETRO }));
  const [contratual, promocional] = simularPorBase(configs, INDICES_PADRAO, indicadoresPadrao());
  const vendas = (r: (typeof contratual.resultados)[number]) => r.novasReceitas.reduce((s, v) => s + v, 0);
  it('padrões: % Equipe Própria 35% e % Agenc. Próprio 30%', () => {
    expect(equipePropriaPadrao).toBe(35);
    expect(agencProprioPadrao).toBe(30);
  });
  it('Agenciamento Externo = (100% − 35%) × vendas × agenciamento (90% contratual, 150% promocional no PCA)', () => {
    const c = contratual.resultados[0], p = promocional.resultados[0];
    expect(c.anual.agenciamento_externo).toBeCloseTo(vendas(c) * 0.65 * 0.9, 6);
    expect(p.anual.agenciamento_externo).toBeCloseTo(vendas(p) * 0.65 * 1.5, 6);
  });
  it('Agenciamento Próprio = 35% × vendas × 30%, igual nos dois cenários', () => {
    contratual.resultados.forEach((c, i) => {
      expect(c.anual.agenciamento_proprio).toBeCloseTo(vendas(c) * 0.35 * 0.3, 6);
      expect(promocional.resultados[i].anual.agenciamento_proprio).toBeCloseTo(c.anual.agenciamento_proprio, 6);
    });
  });
  it('Total Agenciamento = Externo + Próprio, custo da OPERADORA; o Externo é dividido entre ADMINISTRADORA e AGENCIADORA', () => {
    const r = resumoSimulacao(contratual.resultados);
    expect(r.bensaude.agenciamento).toBeCloseTo(r.bensaude.agenciamentoExterno + r.bensaude.agenciamentoProprio, 6);
    expect(r.bensaude.liquido).toBeCloseTo(r.bensaude.operacional - r.bensaude.agenciamento, 6);
    expect(r.lancers.agenciamento + r.siga.agenciamento).toBeCloseTo(r.bensaude.agenciamentoExterno, 6);
    expect(r.siga.resultado).toBeCloseTo(r.siga.adesao + r.siga.faturamento + r.siga.agenciamento, 6);
    expect(r.lancers.resultado).toBeCloseTo(r.lancers.faturamento + r.lancers.agenciamento, 6);
  });
  it('Agenciamento Externo do PCA e do PME ADM. vai para a ADMINISTRADORA; do PCE ADM. e do PJ+, para a AGENCIADORA', () => {
    for (const cenario of [contratual, promocional]) {
      const [pca, pme, pce, pj] = cenario.resultados;
      for (const x of [pca, pme]) { expect(x.anual.agenciamento_lancers).toBeCloseTo(x.anual.agenciamento_externo, 6); expect(x.anual.agenciamento_siga).toBe(0); }
      for (const x of [pce, pj]) { expect(x.anual.agenciamento_siga).toBeCloseTo(x.anual.agenciamento_externo, 6); expect(x.anual.agenciamento_lancers).toBe(0); }
      const r = resumoSimulacao(cenario.resultados);
      expect(r.lancers.agenciamento).toBeCloseTo(pca.anual.agenciamento_externo + pme.anual.agenciamento_externo, 6);
      expect(r.siga.agenciamento).toBeCloseTo(pce.anual.agenciamento_externo + pj.anual.agenciamento_externo, 6);
    }
  });
  it('memória de cálculo da ADMINISTRADORA e da AGENCIADORA somam só as modalidades creditadas a cada uma', () => {
    const adm = memoriaCalculo('lancers.agenciamento', contratual.resultados, nomesE);
    expect(adm.itens.map(i => i.valor > 0)).toEqual([true, true, false, false]);
    expect(adm.itens[2].calculo).toBe('Agenciamento creditado à AGENCIADORA');
    const ag = memoriaCalculo('siga.agenciamento', contratual.resultados, nomesE);
    expect(ag.itens.map(i => i.valor > 0)).toEqual([false, false, true, true]);
    expect(memoriaCalculo('lancers.resultado', contratual.resultados, nomesE).valor).toBeCloseTo(resumoSimulacao(contratual.resultados).lancers.resultado, 6);
  });
  it('Replicar copia % Equipe Própria e % Agenc. Próprio do PCA', () => {
    const cs = configs.map((c, i) => ({ ...c, equipe_propria_percentual: [40, 1, 2, 3][i], agenc_proprio_percentual: [25, 1, 2, 3][i] }));
    expect(replicarParametro(cs, 'PCA', 'equipe_propria_percentual').map(c => c.equipe_propria_percentual)).toEqual([40, 40, 40, 40]);
    expect(replicarParametro(cs, 'PCA', 'agenc_proprio_percentual').map(c => c.agenc_proprio_percentual)).toEqual([25, 25, 25, 25]);
  });
  it('memória de cálculo mostra as contas do Externo e do Próprio', () => {
    expect(memoriaCalculo('bensaude.agenciamentoExterno', contratual.resultados, nomesE).itens[0].calculo).toContain('(100% − Equipe Própria 35,00%) × Agenciamento 90,00%');
    expect(memoriaCalculo('bensaude.agenciamentoProprio', contratual.resultados, nomesE).itens[0].calculo).toContain('Equipe Própria 35,00% × Agenc. Próprio 30,00%');
  });
});
