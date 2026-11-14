import { describe, expect, it } from "vitest";
import { ajusteGrade, resumoPracas } from "./evolucaoPracasPdf";

describe("PDF do grid mês × praça — resumo", () => {
  it("variação do primeiro ao último mês com dado, ignorando a linha Total", () => {
    const r = resumoPracas([
      { rotulo: "01/2025", praca: 16441, regiao: 43142, total: 59583 },
      { rotulo: "10/2026", praca: 19167, regiao: 53175, total: 72342 },
      { rotulo: "11/2026", praca: null, regiao: null, total: null },
      { rotulo: "Total", praca: 1, regiao: 1, total: 2 },
    ]);
    expect(r.map((c) => [c.final, c.variacao, c.mesInicial, c.mesFinal])).toEqual([
      [19167, 2726, "01/2025", "10/2026"], [53175, 10033, "01/2025", "10/2026"], [72342, 12759, "01/2025", "10/2026"],
    ]);
    expect(r[2].variacaoPct).toBeCloseTo(0.2141, 4);
  });
});

describe("PDF do grid mês × praça — ajuste da grade", () => {
  it("usa 10 pt quando sobra espaço e reduz até caber; sem espaço suficiente mantém o padrão e continua na próxima página", () => {
    expect(ajusteGrade(300, 10)).toEqual({ fonte: 10, pad: 1.6 });
    const a = ajusteGrade(130, 23);
    expect(a.fonte * 0.3528 * 1.15 + a.pad * 2 + 0.3).toBeLessThanOrEqual(130 / 23);
    expect(ajusteGrade(40, 60)).toEqual({ fonte: 10, pad: 1.6 });
  });
});
