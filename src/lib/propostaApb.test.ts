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

import { COPART_PROPOSTA, projecaoAnual } from "./propostaApb";
describe("premissas da proposta", () => {
  it("copart 20%", () => expect(COPART_PROPOSTA).toBe(0.2));
  it("despesas fixas de 854 vidas = 2.907.276,96", () => expect(projecaoAnual(0, 854).despTotal).toBeCloseTo(2907276.96, 1));
});
import { idadeSomaPlanos } from "./propostaApb";
describe("idade média exata do snapshot", () => {
  it("854 vidas com média 38,87 anos", () => expect(idadeSomaPlanos(linhas, ["2290", "2490", "2890"]) / 854).toBeCloseTo(38.87, 2));
  it("GRUPO usa a soma dos três", () => expect(idadeSomaPlanos(linhas, ["GRUPO"])).toBe(33193));
  it("2290 tem média 58", () => expect(idadeSomaPlanos(linhas, ["2290"]) / 20).toBe(58));
});
