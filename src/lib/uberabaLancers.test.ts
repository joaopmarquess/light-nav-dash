import { describe, expect, it } from "vitest";
import { LANCERS_SOURCES, precosLancers, rankingLancers, totalPotencialLancers } from "./uberabaLancers";

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
});