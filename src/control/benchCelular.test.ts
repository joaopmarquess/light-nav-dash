import { describe, expect, it } from "vitest";
import { gruposBenchCelular, resumoBenchCelular } from "./benchCelular";
const rows = [
  { ano: 2026, mes: 1, tri: 1, g1: "31|Receitas", g2: "311|Planos", g3: "", g4: "", valor: 1000 },
  { ano: 2026, mes: 1, tri: 1, g1: "41|Despesas", g2: "411|Eventos", g3: "", g4: "", valor: -600 },
  { ano: 2026, mes: 2, tri: 2, g1: "31|Receitas", g2: "311|Planos", g3: "", g4: "", valor: 2000 },
];
describe("Bench no celular", () => {
  it("seleciona um trimestre sem somar outros períodos e calcula margem sobre o faturamento", () => {
    expect(resumoBenchCelular(rows, [1], 1000)).toMatchObject({ resultado: 400, margem: 40, faturamento: 1000 });
  });
  it("reconcilia acumulado e níveis sem duplicar valores", () => {
    expect(resumoBenchCelular(rows, [1, 2], 3000).resultado).toBe(2400);
    const grupos = gruposBenchCelular(rows);
    expect(grupos.reduce((total, g) => total + g.valor, 0)).toBe(2400);
    expect(gruposBenchCelular(grupos[0].rows, 2)[0].valor).toBe(3000);
  });
});