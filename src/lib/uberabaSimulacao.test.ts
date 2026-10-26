import { describe, expect, it } from 'vitest';
import { calcularSimulacao, consolidarSimulacao, csvSimulacao, distribuirResidual, fontesSimulacao as fonte, validarVidas } from './uberabaSimulacao';
const padrao=fonte.padroes[0];
describe('Simulação comercial fornecida',()=>{
  it('aceita somente vidas inteiras entre 1 e 100000',()=>{
    expect([0,1,100000,100001,1.5,NaN].map(validarVidas)).toEqual([false,true,true,false,false,false]);
  });
  it('mantém os quatro padrões SIGA / Réplica Bensaúde / 5000',()=>{
    expect(fonte.padroes.map(c=>[c.tabela_preco,c.condicao_comercial,c.total_vidas])).toEqual(Array(4).fill(['SIGA','Réplica Bensaúde',5000]));
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
    const pme=calcularSimulacao({...fonte.padroes[1],condicao_comercial:'SIGA'});
    expect(pme.mensal[3].agenciamento).toBeCloseTo(pme.novasReceitas.slice(0,4).reduce((a,b)=>a+b,0)*.5,8);
    expect(pme.mensal[4].agenciamento).toBeCloseTo(pme.novasReceitas.slice(1,5).reduce((a,b)=>a+b,0)*.5,8);
  });
  it('aplica adesão sobre receita nova',()=>{
    const r=calcularSimulacao(padrao);
    expect(r.anual.adesao).toBeCloseTo(1976700.4785,4);
    expect(calcularSimulacao(fonte.padroes[2]).anual.adesao).toBe(0);
  });
  it('consolida quatro cenários individuais sem somar vidas acumuladas no tempo',()=>{
    const total=consolidarSimulacao(fonte.padroes.map(calcularSimulacao));
    expect(total.anual.vidas).toBe(20000);
    expect(total.anual.acumuladas).toBe(20000);
    expect(total.anual.faturamento).toBeCloseTo(41820567.70,2);
    expect(total.anual.bensaude).toBeCloseTo(35830498.29,2);
    expect(total.anual.agenciamento+total.anual.adesao).toBeCloseTo(11676457.92,2);
  });
  it('exporta cenários individuais atuais e consolidado em CSV pt-BR',()=>{
    const cenarios=fonte.padroes.map((c,i)=>calcularSimulacao({...c,total_vidas:i===0?1234:c.total_vidas}));
    const csv=csvSimulacao(cenarios);
    expect(csv).toContain('"1234"');
    expect(csv).toContain('"Consolidado"');
    expect(csv).toContain('"'+String(consolidarSimulacao(cenarios).anual.faturamento.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}))+'"');
  });
});