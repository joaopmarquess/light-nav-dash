import { describe, expect, it } from "vitest";
import type { DreHRow } from "@/control/dreHostinger";
import { fimTrimestre, montarRelatorioTrimestral, valorDre } from "./controladoriaTrimestral";

const r = (mes: number, g3: string, g4: string, valor: number): DreHRow => ({ ano: 2026, mes, tri: Math.ceil(mes / 3), g1: "1|EBITDA", g2: "1|OPERACIONAL", g3, g4, valor });
// Faturamento 100 por mês e despesa assistencial −60 por mês; outubro fica fora (trimestre aberto).
const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].flatMap((m) => [r(m, "1|PRINCIPAL", "1|FATURAMENTO", 100), r(m, "1|PRINCIPAL", "2|EVENTOS", -60)]);
const vidas = [{ PIF: 36804, PCA: 22461, PCE: 8551 }, { PIF: 36324, PCA: 23988, PCE: 9266 }, { PIF: 35800, PCA: 25660, PCE: 9884 }];
const rel = montarRelatorioTrimestral({ ano: 2026, tris: [1, 2, 3], rows, vidas, generatedAt: "2026-11-16T00:00:00Z" });

describe("Relatório de Controladoria trimestral", () => {
  it("vidas são as do último dia de cada trimestre", () => {
    expect([1, 2, 3, 4].map((t) => fimTrimestre(2026, t))).toEqual(["2026-03-31", "2026-06-30", "2026-09-30", "2026-12-31"]);
    expect(rel.period).toEqual({ de: "2026-01-01", ate: "2026-09-30" });
  });
  it("quadro de vidas: PIF, PCA, PCE e Total por trimestre", () => {
    const t = rel.blocks[0].table!;
    expect(t.headers).toEqual(["Tipo de produto", "1T2026", "2T2026", "3T2026"]);
    expect(t.rows.map((l) => l[0])).toEqual(["PIF", "PCA", "PCE", "Total"]);
    expect(t.rows[3]).toEqual(["Total", "67.816", "69.578", "71.344"]);
  });
  it("quadro DRE: resultado por trimestre fechado e acumulado, sem o mês do trimestre aberto", () => {
    const t = rel.blocks[1].table!;
    expect(t.headers).toEqual(["Item (R$)", "1T2026", "2T2026", "3T2026", "Jan–Set/2026"]);
    expect(t.rows[0]).toEqual(["Faturamento", "300,00", "300,00", "300,00", "900,00"]);
    expect(t.rows.find((l) => l[0] === "(-) Despesas Assistenciais")).toEqual(["(-) Despesas Assistenciais", "(180,00)", "(180,00)", "(180,00)", "(540,00)"]);
    expect(t.rows.find((l) => l[0] === "(=) Resultado Líquido")).toEqual(["(=) Resultado Líquido", "120,00", "120,00", "120,00", "360,00"]);
    expect(t.rows[t.rows.length - 1]).toEqual(["Margem líquida (% fat.)", "40,00%", "40,00%", "40,00%", "40,00%"]);
  });
  it("sem trimestre fechado não gera relatório", () => {
    expect(() => montarRelatorioTrimestral({ ano: 2026, tris: [], rows, vidas: [] })).toThrow();
  });
  it("negativos entre parênteses, como na tela", () => expect(valorDre(-1234.5)).toBe("(1.234,50)"));
});
