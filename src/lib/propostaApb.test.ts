import { describe, it, expect } from "vitest";
import csv from "@/data/propostaApb/vidas_precos_2026-10-29.csv?raw";
import { parseApb, gridPlano } from "./propostaApb";

const { linhas } = parseApb(csv);

describe("Proposta APB", () => {
  it("totaliza 854 vidas", () => expect(linhas.reduce((s, l) => s + l.vidas, 0)).toBe(854));
  it("vidas por plano", () => {
    expect(gridPlano(linhas, "2290").total.total).toBe(20);
    expect(gridPlano(linhas, "2490").total.total).toBe(198);
    expect(gridPlano(linhas, "2890").total.total).toBe(636);
  });
  it("mensalidade = vidas × preço", () => {
    expect(gridPlano(linhas, "2290").total.mensalidade).toBeCloseTo(12715.41, 2);
    expect(gridPlano(linhas, "2890").total.mensalidade).toBeCloseTo(163424.21, 2);
  });
  it("preço aparece mesmo sem vidas", () => {
    const f = gridPlano(linhas, "2290").faixas[9];
    expect(f.apTit + f.apDep).toBe(0);
    expect(f.precoAp).toBe(1043.28);
  });
});

import { COPART_PROPOSTA, projecaoFaixas } from "./propostaApb";
describe("premissas da proposta", () => {
  it("copart 20%", () => expect(COPART_PROPOSTA).toBe(0.2));
  it("despesas somam 2.950.000 e seguem receita × sinistralidade", () => {
    const r = projecaoFaixas([100, 300]);
    expect(r.faixas[0].recCopart).toBeCloseTo(240, 6);
    expect(r.faixas.reduce((t, f) => t + f.despTotal, 0)).toBeCloseTo(2950000, 4);
    expect(r.faixas[1].despTotal).toBeCloseTo(r.faixas[1].recTotal * r.sin, 6);
  });
});
import { idadeSomaPlanos } from "./propostaApb";
describe("idade média exata do snapshot", () => {
  it("854 vidas com média 38,87 anos", () => expect(idadeSomaPlanos(linhas, ["2290", "2490", "2890"]) / 854).toBeCloseTo(38.87, 2));
  it("GRUPO usa a soma dos três", () => expect(idadeSomaPlanos(linhas, ["GRUPO"])).toBe(33193));
  it("2290 tem média 58", () => expect(idadeSomaPlanos(linhas, ["2290"]) / 20).toBe(58));
});

import { escalarVidas } from "./propostaApb";
describe("Nível 4", () => {
  const n4 = escalarVidas(linhas);
  const soma = (f: (l: (typeof n4)[number]) => boolean) => n4.filter(f).reduce((t, l) => t + l.vidas, 0);
  it("1.242 titulares", () => expect(soma((l) => l.rel === "Titular")).toBe(1242));
  it("186 dependentes (15%)", () => expect(soma((l) => l.rel === "Dependente")).toBe(186));
  it("titulares 44 a 48 = 218 e 00 a 18 = 5", () => {
    expect(soma((l) => l.rel === "Titular" && l.faixa === "44 a 48")).toBe(218);
    expect(soma((l) => l.rel === "Titular" && l.faixa === "00 a 18")).toBe(5);
  });
});
