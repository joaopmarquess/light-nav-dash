import { describe, expect, it } from "vitest";
import { dreMargin } from "./dreMargin";

describe("percentual de Resultado sobre Faturamento", () => {
  it("calcula Resultado dividido por Faturamento em percentual", () => {
    expect(dreMargin(120, 1000)).toBe(12);
    expect(dreMargin(-120, 1000)).toBe(-12);
    expect(dreMargin(0, 1000)).toBe(0);
  });
  it("não divide por faturamento zero ou ausente", () => {
    expect(dreMargin(120, 0)).toBeNull();
    expect(dreMargin(120, undefined)).toBeNull();
  });
});