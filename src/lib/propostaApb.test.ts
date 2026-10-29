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
});
