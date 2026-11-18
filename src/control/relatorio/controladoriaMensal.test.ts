import { describe, expect, it } from "vitest";
import type { DreHRow } from "@/control/dreHostinger";
import { dividirQuadro } from "./controladoriaDados";
import { fimMes, montarRelatorioPeriodos, periodosRelatorio } from "./controladoriaTrimestral";

const r = (mes: number, g4: string, valor: number): DreHRow => ({ ano: 2026, mes, tri: Math.ceil(mes / 3), g1: "1|EBITDA", g2: "1|OPERACIONAL", g3: "1|PRINCIPAL", g4, valor });
const meses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const rows = meses.flatMap((m) => [r(m, "1|FATURAMENTO", 100), r(m, "2|COPARTICIPACAO", 10), r(m, "2|EVENTOS", -60)]);
const vidas = meses.map((m) => ({ PIF: 1000 + m, PCA: 500, PCE: 100 }));

describe("Relatório de Controladoria — períodos sem filtro (critério das Demonstrações)", () => {
  it("Mensal: uma coluna por mês realizado, partindo de dezembro do ano anterior", () => {
    const p = periodosRelatorio("Mensal", 2026, meses);
    expect(p.inicio).toEqual({ rotulo: "Dez/2025", fim: "2025-12-31" });
    expect(p.periodos.map((x) => x.rotulo)).toEqual(["Jan/2026", "Fev/2026", "Mar/2026", "Abr/2026", "Mai/2026", "Jun/2026", "Jul/2026", "Ago/2026", "Set/2026", "Out/2026"]);
    expect(fimMes(2026, 2)).toBe("2026-02-28");
  });
  it("Trimestral: só trimestres fechados (outubro sozinho não entra)", () => {
    const p = periodosRelatorio("Trimestral", 2026, meses);
    expect(p.inicio).toEqual({ rotulo: "4T2025", fim: "2025-12-31" });
    expect(p.periodos.map((x) => x.rotulo)).toEqual(["1T2026", "2T2026", "3T2026"]);
  });
  it("Mensal: quadros de vidas e DRE mês a mês, com o acumulado de todos os meses", () => {
    const rel = montarRelatorioPeriodos({ ano: 2026, periodos: periodosRelatorio("Mensal", 2026, meses), rows, vidasInicio: { PIF: 1000, PCA: 500, PCE: 100 }, vidas, generatedAt: "2026-11-18T00:00:00Z" });
    expect(rel.period).toEqual({ de: "2026-01-01", ate: "2026-10-31" });
    const v = rel.blocks[0].table!;
    expect(v.headers[1]).toBe("Dez/2025 (início)");
    expect(v.rows[4][0]).toBe("Variação no mês");
    expect(v.rows[0]).toEqual(["PIF", "1.000", ...meses.map((m) => (1000 + m).toLocaleString("pt-BR")), "+10"]);
    const d = rel.blocks[1].table!;
    expect(d.headers).toEqual(["Item (R$)", "Jan/2026", "Fev/2026", "Mar/2026", "Abr/2026", "Mai/2026", "Jun/2026", "Jul/2026", "Ago/2026", "Set/2026", "Out/2026", "Jan–Out/2026"]);
    expect(d.rows.find((l) => l[0] === "(=) Resultado Líquido")).toEqual(["(=) Resultado Líquido", ...meses.map(() => "50,00"), "500,00"]);
    expect(rel.capa?.subtitulo).toEqual(["Visão mensal", "Vidas e resultado"]);
  });
  it("PDF: quadro largo dividido em partes, repetindo a primeira coluna e sem perder colunas", () => {
    const t = { headers: ["Item", "a", "b", "c", "d", "e"], rows: [["x", "1", "2", "3", "4", "5"]], colunasPorQuadro: 2 };
    expect(dividirQuadro(t).map((q) => q.headers)).toEqual([["Item", "a", "b"], ["Item", "c", "d"], ["Item", "e"]]);
    expect(dividirQuadro(t).map((q) => q.rows[0])).toEqual([["x", "1", "2"], ["x", "3", "4"], ["x", "5"]]);
    expect(dividirQuadro({ ...t, colunasPorQuadro: undefined })).toHaveLength(1);
  });
});
