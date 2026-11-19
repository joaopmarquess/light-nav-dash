import { describe, expect, it } from "vitest";
import { LANCERS_SOURCES, precosLancers, rankingLancers, tabelaCompletaEnfermaria, totalPotencialLancers } from "./uberabaLancers";
import { INDICES_PADRAO } from "./uberabaTabelasComerciais";

describe("Dados dos anexos Lancers", () => {
  it("preserva o preço de referência Prata Adesão nas dez faixas", () => {
    expect(precosLancers("enfermaria")[0].valores).toEqual([134.14,156.53,182.67,201.29,234.91,268.50,328.91,410.15,544.26,804.68]);
  });
  it("preserva o preço de referência Ouro PME nas dez faixas", () => {
    expect(precosLancers("apartamento")[0].valores).toEqual([188.93,220.49,257.30,283.54,330.89,378.20,463.28,577.71,766.61,1133.44]);
  });
  it("calcula o ranking da enfermaria apenas contra os seis concorrentes", () => {
    expect(Array.from({ length: 10 }, (_, i) => rankingLancers("enfermaria", i))).toEqual([3,3,4,3,3,3,3,3,1,3]);
  });
  it("calcula o ranking do apartamento e sua exceção 54–58", () => {
    expect(Array.from({ length: 10 }, (_, i) => rankingLancers("apartamento", i))).toEqual([5,5,5,5,5,5,5,5,3,5]);
  });
  it("preserva o total conservador de 1.939 vidas", () => { expect(totalPotencialLancers("conservador")).toBe(1939); });
  it("preserva o total base de 6.008 vidas", () => { expect(totalPotencialLancers("base")).toBe(6008); });
  it("identifica as quatro promoções Hapvida vencidas em cada acomodação", () => {
    for (const accommodation of ["enfermaria", "apartamento"] as const) {
      expect(precosLancers(accommodation).filter(p => p.promocaoVencida).map(p => p.nome)).toEqual([
        "Hapvida Nosso Plano · copart. parcial", "Hapvida Nosso Médico · copart. parcial", "Hapvida Nosso Plano · com copart.", "Hapvida Nosso Médico · com copart.",
      ]);
    }
  });
  it("mantém a coparticipação do Bensaúde sem converter ausência em zero", () => {
    expect(LANCERS_SOURCES.precos.tables[4].rows[0][1]).toBe("Consultas: R$ 41,36");
    expect(LANCERS_SOURCES.precos.tables[4].rows[6][4]).toBe("não consta");
  });
  it("inclui na tabela completa da Enfermaria a Referencial e as quatro tabelas do Proj. Uberaba, após as três linhas Bensaúde", () => {
    const t = tabelaCompletaEnfermaria();
    expect(t.rows.length).toBe(14);
    expect(t.rows.slice(3, 8).map(r => r[1])).toEqual([
      "Proj. Uberaba · Referencial (100%)", "Proj. Uberaba · PCA (95%)", "Proj. Uberaba · PME ADM. (90%)", "Proj. Uberaba · PCE ADM. (85%)", "Proj. Uberaba · PJ+ (75%)",
    ]);
    expect(t.rows[3].slice(2)).toEqual(["175,00","204,22","238,32","262,62","306,46","350,27","429,07","535,04","709,99","1.049,70"]);
    expect(t.rows[4][2]).toBe("166,25");
    expect(t.rows[7][2]).toBe("131,25");
    expect(t.rows[8][1]).toBe(LANCERS_SOURCES.precos.tables[1].rows[3][0]);
    expect(t.headers[0]).toBe("Nº");
    expect(t.rows.map(r => r[0])).toEqual(Array.from({ length: 14 }, (_, i) => String(i + 1)));
  });
  it("usa o índice atual dos Resultados Comerciais nas linhas do Proj. Uberaba", () => {
    expect(tabelaCompletaEnfermaria({ ...INDICES_PADRAO, pcaAdm: 100 }).rows[4][2]).toBe("175,00");
  });
  it("não altera o anexo Lancers", () => {
    tabelaCompletaEnfermaria();
    expect(LANCERS_SOURCES.precos.tables[1].rows.length).toBe(9);
  });
});
