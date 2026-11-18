import { describe, expect, it } from "vitest";
import type { DreHRow } from "@/control/dreHostinger";
import { fimTrimestre, montarRelatorioTrimestral, trimestreAnterior, valorDre } from "./controladoriaTrimestral";

const r = (mes: number, g3: string, g4: string, valor: number): DreHRow => ({ ano: 2026, mes, tri: Math.ceil(mes / 3), g1: "1|EBITDA", g2: "1|OPERACIONAL", g3, g4, valor });
// Faturamento 100 e coparticipação 10 por mês, despesa assistencial −60 por mês; outubro fica fora (trimestre aberto).
const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].flatMap((m) => [r(m, "1|PRINCIPAL", "1|FATURAMENTO", 100), r(m, "1|PRINCIPAL", "2|COPARTICIPACAO", 10), r(m, "1|PRINCIPAL", "2|EVENTOS", -60)]);
const vidas = [{ PIF: 36804, PCA: 22461, PCE: 8551 }, { PIF: 36324, PCA: 23988, PCE: 9266 }, { PIF: 35800, PCA: 25660, PCE: 9884 }];
const vidasInicio = { PIF: 37000, PCA: 21000, PCE: 8000 }; // 4T2025: 66.000
const rel = montarRelatorioTrimestral({ ano: 2026, tris: [1, 2, 3], rows, vidasInicio, vidas, generatedAt: "2026-11-16T00:00:00Z" });

describe("Relatório de Controladoria trimestral", () => {
  it("vidas são as do último dia de cada trimestre", () => {
    expect([1, 2, 3, 4].map((t) => fimTrimestre(2026, t))).toEqual(["2026-03-31", "2026-06-30", "2026-09-30", "2026-12-31"]);
    expect(rel.period).toEqual({ de: "2026-01-01", ate: "2026-09-30" });
  });
  it("o início do período é o fim do trimestre anterior (1T → 4T do ano anterior)", () => {
    expect(trimestreAnterior(2026, 1)).toEqual({ ano: 2025, t: 4 });
    expect(trimestreAnterior(2026, 3)).toEqual({ ano: 2026, t: 2 });
  });
  it("quadro de vidas parte do 4T2025 e a variação dos trimestres soma a do período", () => {
    const t = rel.blocks[0].table!;
    expect(t.headers).toEqual(["Tipo de produto", "4T2025 (início)", "1T2026", "2T2026", "3T2026", "Variação"]);
    expect(t.rows.map((l) => l[0])).toEqual(["PIF", "PCA", "PCE", "Total", "Variação no trimestre"]);
    expect(t.rows[0]).toEqual(["PIF", "37.000", "36.804", "36.324", "35.800", "-1.200"]);
    expect(t.rows[3]).toEqual(["Total", "66.000", "67.816", "69.578", "71.344", "+5.344"]);
    // +1.816 + 1.762 + 1.766 = +5.344: o crescimento do 1T2026 entra na variação do período.
    expect(t.rows[4]).toEqual(["Variação no trimestre", "—", "+1.816", "+1.762", "+1.766", "+5.344"]);
  });
  it("quadro DRE: resultado por trimestre fechado e acumulado, sem o mês do trimestre aberto", () => {
    const t = rel.blocks[1].table!;
    expect(t.headers).toEqual(["Item (R$)", "1T2026", "2T2026", "3T2026", "Jan–Set/2026"]);
    expect(t.rows.slice(0, 3).map((l) => [l[0].trim(), ...l.slice(1)])).toEqual([
      ["Entradas Operacionais", "330,00", "330,00", "330,00", "990,00"],
      ["Faturamento", "300,00", "300,00", "300,00", "900,00"],
      ["Coparticipação", "30,00", "30,00", "30,00", "90,00"],
    ]);
    expect(t.rows.find((l) => l[0] === "(-) Despesas Assistenciais")).toEqual(["(-) Despesas Assistenciais", "(180,00)", "(180,00)", "(180,00)", "(540,00)"]);
    expect(t.rows.find((l) => l[0] === "(=) Resultado Líquido")).toEqual(["(=) Resultado Líquido", "150,00", "150,00", "150,00", "450,00"]);
    expect(t.rows[t.rows.length - 1]).toEqual(["Margem líquida (% fat.)", "50,00%", "50,00%", "50,00%", "50,00%"]);
  });
  it("sem trimestre fechado não gera relatório", () => {
    expect(() => montarRelatorioTrimestral({ ano: 2026, tris: [], rows, vidasInicio, vidas: [] })).toThrow();
  });
  it("negativos entre parênteses, como na tela", () => expect(valorDre(-1234.5)).toBe("(1.234,50)"));
  it("capa com a logomarca do Bensaúde, não a do AXIS", () => expect(rel.capa?.logo).toBe("bensaude"));
});
