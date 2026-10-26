import { describe, expect, it } from 'vitest';
import { calcularSimulacao, consolidarSimulacao, csvSimulacao, distribuirResidual, fontesSimulacao as fonte, validarVidas, sinistralidadePadrao, resumoSimulacao } from './uberabaSimulacao';
import padroesHistoricos from '@/data/uberabaSimulacao/configuracao_padrao.json';
const padrao=padroesHistoricos[0];
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
    expect(r.beneficiario.total).toBeCloseTo(44735657.7085,4);
  });
  it('resultado líquido Bensaúde desconta agenciamento do operacional',()=>{
    const r=resumoSimulacao(padroesHistoricos.map(calcularSimulacao));
    expect(r.bensaude.operacional).toBeCloseTo(6556100.90,2);
    expect(r.bensaude.liquido).toBeCloseTo(-2205267.00,2);
  });
  it('resultado SIGA soma adesão, faturamento e agenciamento',()=>{
    const r=resumoSimulacao(padroesHistoricos.map(calcularSimulacao));
    expect(r.siga.resultado).toBeCloseTo(13334259.52,2);
  });
  it('distribui o faturamento entre Bensaúde, Lancers e SIGA sem incluir adesão',()=>{
    const r=calcularSimulacao(padrao);
    expect(r.anual.bensaude+r.anual.lancers+r.anual.siga).toBeCloseTo(11165978.70,2);
    r.mensal.forEach(m=>expect(m.bensaude+m.lancers+m.siga).toBeCloseTo(m.faturamento,8));
  });
  it('mantém agenciamento como custo comercial Bensaúde e receita SIGA, separado da adesão direta',()=>{
    const r=calcularSimulacao(padrao);
    expect(r.anual.agenciamento).toBeCloseTo(2787030.86,2);
    expect(r.anual.adesao).toBeCloseTo(1976700.4785,4);
    expect(consolidarSimulacao(padroesHistoricos.map(calcularSimulacao)).anual.agenciamento).toBeCloseTo(8761367.905,3);
  });
  it('Resultado Bensaúde é faturamento Bensaúde menos despesa assistencial, sem adesão ou agenciamento',()=>{
    const rs=padroesHistoricos.map(calcularSimulacao);
    rs.forEach(r=>r.mensal.forEach(m=>expect(m.resultado_bensaude).toBeCloseTo(m.bensaude-m.despesa_assistencial,8)));
    expect(rs[0].anual.resultado_bensaude).toBeCloseTo(781618.509,3);
    expect(consolidarSimulacao(rs).anual.resultado_bensaude).toBeCloseTo(6556100.90,2);
  });
  it('usa Sinistralidade padrão de 70% em todas as modalidades',()=>{
    expect(sinistralidadePadrao).toBe(70);
    padroesHistoricos.forEach(c=>{
      const r=calcularSimulacao(c);
      expect(r.anual.despesa_assistencial).toBeCloseTo(r.anual.faturamento * 0.70,7);
    });
    expect(calcularSimulacao(padrao).anual.despesa_assistencial).toBeCloseTo(7816185.09,2);
  });
  it('calcula Despesa Assistencial como Faturamento × Sinistralidade por modalidade',()=>{
    const percentuais = [80,90,100,110];
    const resultados = padroesHistoricos.map((c,i)=>calcularSimulacao({...c,sinistralidade_percentual:percentuais[i]}));
    resultados.forEach((r,i)=>{
      r.mensal.forEach(m=>expect(m.despesa_assistencial).toBeCloseTo(m.faturamento * percentuais[i] / 100,8));
      expect(r.anual.despesa_assistencial).toBeCloseTo(r.anual.faturamento * percentuais[i] / 100,7);
    });
    expect(resultados[0].anual.despesa_assistencial).toBeCloseTo(8932782.96,2);
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
    expect(r.faixaAnual).toEqual([908,408,408,408,408,408,531,531,531,459]);
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
    expect(r.anual.faturamento).toBeCloseTo(11165978.70,2);
  });
  it('aplica participações ao acumulado e valida soma de 100%',()=>{
    const r=calcularSimulacao(padrao);
    expect(r.anual.lancers).toBeCloseTo(2233195.74,2);
    expect(r.anual.siga).toBeCloseTo(334979.361,3);
    expect(r.anual.bensaude).toBeCloseTo(8597803.599,3);
    expect(r.participacoesValidas).toBe(true);
  });
  it('parcela agenciamento sobre receita nova com defasagem, contando janeiro a dezembro',()=>{
    const r=calcularSimulacao(padrao);
    expect(r.mensal[0].agenciamento).toBeCloseTo(r.novasReceitas[0]*.75,8);
    expect(r.mensal[1].agenciamento).toBeCloseTo((r.novasReceitas[0]+r.novasReceitas[1])*.75,8);
    expect(r.anual.agenciamento).toBeCloseTo(2787030.86,2);
    const pme=calcularSimulacao({...padroesHistoricos[1],condicao_comercial:'SIGA'});
    expect(pme.mensal[3].agenciamento).toBeCloseTo(pme.novasReceitas.slice(0,4).reduce((a,b)=>a+b,0)*.5,8);
    expect(pme.mensal[4].agenciamento).toBeCloseTo(pme.novasReceitas.slice(1,5).reduce((a,b)=>a+b,0)*.5,8);
  });
  it('aplica adesão sobre receita nova',()=>{
    const r=calcularSimulacao(padrao);
    expect(r.anual.adesao).toBeCloseTo(1976700.4785,4);
    expect(calcularSimulacao(padroesHistoricos[2]).anual.adesao).toBe(0);
  });
  it('consolida quatro cenários individuais sem somar vidas acumuladas no tempo',()=>{
    const total=consolidarSimulacao(padroesHistoricos.map(calcularSimulacao));
    expect(total.anual.vidas).toBe(20000);
    expect(total.anual.acumuladas).toBe(20000);
    expect(total.anual.faturamento).toBeCloseTo(41820567.70,2);
    expect(total.anual.bensaude).toBeCloseTo(35830498.29,2);
    expect(total.anual.agenciamento+total.anual.adesao).toBeCloseTo(11676457.9135,4);
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
  it('inicia as quatro modalidades com as vidas solicitadas', () => {
    expect(fonte.padroes.map(c => [c.produto_codigo, c.total_vidas])).toEqual([
      ['PCA', 1000], ['PME_ADMINISTRADO', 1000], ['PCE_50_99', 2000], ['PCE_100_MAIS', 4000],
    ]);
    expect(fonte.padroes.every(c => c.condicao_comercial === 'Bensaúde Regra')).toBe(true);
    expect(consolidarSimulacao(fonte.padroes.map(calcularSimulacao)).anual.vidas).toBe(8000);
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
