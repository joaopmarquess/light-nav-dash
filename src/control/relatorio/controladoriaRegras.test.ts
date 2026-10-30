import { describe, it, expect } from "vitest";
import { periodoRelatorio, avaliarDesvio } from "./controladoriaRegras";
import { itemDe, realizadosOrcamento } from "@/control/orcamentoRegras";
const row = { ano: 2026, mes: 8, tri: 3, g1: "1|EBITDA", g2: "1|OPERACIONAL", g3: "1|PRINCIPAL", g4: "1|FATURAMENTO", valor: 100 };
describe("Relatório de Controladoria", () => {
  it("combina ano/mês/trimestre sem ampliar o período", () => expect(periodoRelatorio(2026, 8, 3)).toEqual({ de: "2026-08-01", ate: "2026-08-31" }));
  it("bloqueia mês fora do trimestre", () => expect(() => periodoRelatorio(2026, 8, 2)).toThrow());
  it("usa o trimestre completo", () => expect(periodoRelatorio(2026, 0, 2)).toEqual({ de: "2026-04-01", ate: "2026-06-30" }));
  it("aumento de receita é favorável", () => expect(avaliarDesvio(100, 120, "receita").status).toBe("favorável"));
  it("aumento de despesa é desfavorável mesmo com valores negativos", () => expect(avaliarDesvio(-100, -120, "despesa").status).toBe("desfavorável"));
  it("natureza desconhecida não recebe favorabilidade", () => expect(avaliarDesvio(-100, -120, "indefinida").status).toBe("atenção"));
  it("reutiliza classificação de faturamento do CONTROL", () => expect(itemDe(row)).toBe("01|FATURAMENTO"));
  it("reconcilia realizado por item e mês sem confundir meses", () => { const r = realizadosOrcamento([row, { ...row, valor: 50 }]); expect(r.valor("01|FATURAMENTO", 8)).toBe(150); expect(r.meses.has(9)).toBe(false); });
});