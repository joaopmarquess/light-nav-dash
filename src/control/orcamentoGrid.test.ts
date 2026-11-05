import { describe, expect, it } from "vitest";
import { medidasOrcamento } from "./orcamentoGrid";
describe("medidas do orçamento", () => {
  const fechados = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  it("inclui as quatro medidas em setembro realizado", () => {
    expect(medidasOrcamento([9], fechados)).toEqual(["previsto", "projetado", "v2", "efetivo"]);
  });
  it("não oferece realizado em outubro, novembro ou dezembro", () => {
    for (const mes of [10, 11, 12]) expect(medidasOrcamento([mes], fechados)).toEqual(["previsto", "projetado", "v2"]);
  });
  it("mantém realizado nos totais com meses fechados mas não em intervalo apenas futuro", () => {
    expect(medidasOrcamento([1, 9, 10], fechados)).toContain("efetivo");
    expect(medidasOrcamento([10, 11, 12], fechados)).not.toContain("efetivo");
  });
});