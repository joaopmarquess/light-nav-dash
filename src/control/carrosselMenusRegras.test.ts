import { describe, expect, it } from "vitest";
import { ultimos12Sinistralidade, vidasPorUf } from "./carrosselMenusRegras";

describe("Slides de outros menus", () => {
  it("soma vidas por UF, ordena e agrupa o excedente em Outros", () => {
    const r = vidasPorUf([{ uf: "SP", ativos: 10 }, { uf: "MG", ativos: 5 }, { uf: "SP", ativos: 3 }, { uf: "GO", ativos: 1 }], 2);
    expect(r).toEqual([{ uf: "SP", vidas: 13 }, { uf: "MG", vidas: 5 }, { uf: "Outros", vidas: 1 }]);
  });
  it("mantém só os 12 meses até a competência válida, com sinistralidade", () => {
    const totais = Array.from({ length: 15 }, (_, i) => ({ nr_ano: 2025 + Math.floor(i / 12), nr_mes: (i % 12) + 1, rec_cpp: 0, rec_copart: 0, rec_total: 100, desp_total: 80 }));
    const r = ultimos12Sinistralidade(totais, { ano: 2026, mes: 2 });
    expect(r).toHaveLength(12);
    expect(r[0].mes).toBe("Mar/25");
    expect(r.at(-1)!.mes).toBe("Fev/26");
    expect(r[0].Sinistralidade).toBe(80);
  });
});
