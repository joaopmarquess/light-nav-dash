import { describe, expect, it } from "vitest";
import { projetarPorVariacaoMedia } from "./projecaoOrcamento";

describe("projetarPorVariacaoMedia", () => {
  it("soma a média das variações dos meses realizados a cada mês futuro", () => {
    const rows = [100, 120, 150].map((v, i) => ({ item: "A", mes: i + 1, realizado: v, projetado: 0 }))
      .concat([4, 5].map((mes) => ({ item: "A", mes, realizado: 0, projetado: 999 })));
    const out = projetarPorVariacaoMedia(rows, 3);
    expect(out.find((r) => r.mes === 4)?.projetado).toBe(175);
    expect(out.find((r) => r.mes === 5)?.projetado).toBe(200);
    expect(out.find((r) => r.mes === 2)?.projetado).toBe(0);
  });
});
