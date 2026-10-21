import { describe, expect, it } from "vitest";
import { dataPlanejadaUberaba } from "./uberabaCronograma";

describe("Cronograma Uberaba", () => {
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