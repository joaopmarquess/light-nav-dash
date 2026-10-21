import { describe, expect, it } from "vitest";
import { dataPlanejadaUberaba, mesesPlanejadosUberaba, folhinhasUberaba } from "./uberabaCronograma";

describe("Cronograma Uberaba", () => {
  it.each([
    ["Outubro/2026", "31/10/2026", 4],
    ["Novembro/2026", "30/11/2026", 0],
    ["Dezembro/2026", "31/12/2026", 2],
    ["Janeiro/2027", "31/01/2027", 5],
  ])("circles the last day of %s on a correctly aligned calendar", (data, final, inicio) => {
    const folha = folhinhasUberaba().find((f) => f.data === data);
    expect(folha?.dataFinal).toBe(final);
    expect(folha?.inicioSemana).toBe(inicio);
  });
  it("groups the seven stages into their four supplied months", () => {
    expect(mesesPlanejadosUberaba().map(({ data, etapas }) => [data, etapas.length])).toEqual([
      ["Outubro/2026", 1], ["Novembro/2026", 3], ["Dezembro/2026", 1], ["Janeiro/2027", 2],
    ]);
  });
  it.each([
    ["Estudo", "Outubro/2026"],
    ["Hospital Mário Palmério", "Novembro/2026"],
    ["Modelo de Atuação", "Novembro/2026"],
    ["Plano de Marketing", "Novembro/2026"],
    ["Formalização", "Dezembro/2026"],
    ["Implantação", "Janeiro/2027"],
    ["Operação Iniciada", "Janeiro/2027"],
  ])("uses the supplied planned month for %s", (etapa, data) => {
    expect(dataPlanejadaUberaba(etapa)).toBe(data);
  });
});