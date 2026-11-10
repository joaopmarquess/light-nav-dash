import { describe, expect, it } from "vitest";
import { mesesPeriodo, PERIODO_EVOLUCAO_PRODUTOS, vidasPorMes } from "./evolucaoProdutos";

describe("Evolução Produtos — período", () => {
  const meses = mesesPeriodo(PERIODO_EVOLUCAO_PRODUTOS.de, PERIODO_EVOLUCAO_PRODUTOS.ate);
  it("vai de 10/2025 a 09/2026, 12 meses", () => {
    expect(meses).toHaveLength(12);
    expect(meses[0].rotulo).toBe("Out/25");
    expect(meses[11].rotulo).toBe("Set/26");
  });
  it("usa o último dia de cada mês", () => {
    expect(meses[0].dataFim).toBe("2025-10-31");
    expect(meses.find((m) => m.mes === 2)?.dataFim).toBe("2026-02-28");
    expect(meses[11].dataFim).toBe("2026-09-30");
  });
  it("não inventa vidas para mês sem dado", () => {
    const r = vidasPorMes(meses, [{ ano: 2025, mes: 10, total: "65191" }]);
    expect(r[0].vidas).toBe(65191);
    expect(r[1].vidas).toBeNull();
  });
});
