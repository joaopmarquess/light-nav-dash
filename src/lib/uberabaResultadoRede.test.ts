import { describe, expect, it } from "vitest";
import { MESES_RESULTADO_REDE, distribuirAdesao, resultadoRede, vidasSimulacaoPadrao, vidasVendidasPorMes } from "./uberabaResultadoRede";
import { PARAMETROS_REDE_PADRAO } from "./uberabaParametrosRede";

describe("Resultado de Resultados Rede", () => {
  it("meses de 01/2027 a 12/2027", () => {
    expect(MESES_RESULTADO_REDE).toHaveLength(12);
    expect(MESES_RESULTADO_REDE[0]).toBe("01/2027");
    expect(MESES_RESULTADO_REDE[11]).toBe("12/2027");
  });
  it("Adesão do Credenciamento dividida em 2 meses; demais meses 0", () => {
    expect(distribuirAdesao(28200)).toEqual([14100, 14100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const centavos = distribuirAdesao(100.01);
    expect(centavos.slice(0, 2)).toEqual([50, 50.01]);
  });
  it("vidas vendidas da simulação padrão somam 10.000 no ano", () => {
    const vidas = vidasSimulacaoPadrao();
    expect(Object.values(vidas).reduce((s, v) => s + v, 0)).toBe(10000);
    expect(vidasVendidasPorMes(vidas).reduce((s, v) => s + v, 0)).toBe(10000);
  });
  it("Padrão da imagem: seis parcelas de R$ 15.000 de janeiro a junho e zero por vida depois", () => {
    const { linhas, total } = resultadoRede(60000, PARAMETROS_REDE_PADRAO, vidasSimulacaoPadrao());
    expect(linhas.slice(0, 6).map((l) => l.mensalidade)).toEqual([15000, 15000, 15000, 15000, 15000, 15000]);
    expect(linhas.slice(6).map((l) => l.mensalidade)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(total.mensalidade).toBe(90000);
    expect(total.total).toBe(150000);
  });
  it("Total = Adesão + Mensalidade por mês e no ano", () => {
    const { linhas, total } = resultadoRede(45800, PARAMETROS_REDE_PADRAO, vidasSimulacaoPadrao());
    expect(linhas[0].total).toBe(37900);
    expect(linhas[2].total).toBe(15000);
    expect(linhas[11].total).toBe(0);
    expect(total.total).toBe(total.adesao + total.mensalidade);
  });
  it("Parcelas fixas e Valor por vida alterados mudam a Mensalidade", () => {
    const { linhas } = resultadoRede(0, { parcelasFixas: 3, iniciarEm: 1, valorParcela: 20000, valorPorVida: 2 }, { PCA: 1000 });
    expect(linhas.slice(0, 3).map((l) => l.mensalidade)).toEqual([20000, 20000, 20000]);
    expect(linhas[3].mensalidade).toBe(linhas[3].vidasAcumuladas * 2);
    expect(linhas[11].mensalidade).toBe(2000);
  });
});
