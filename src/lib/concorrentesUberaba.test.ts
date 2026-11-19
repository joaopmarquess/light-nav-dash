import { describe, expect, it } from "vitest";
import { colunasConcorrentes, linhasConcorrentesPorFaixa } from "@/lib/concorrentesUberaba";

describe("Concorrentes Uberaba", () => {
  it("lista os seis produtos na ordem enviada", () => {
    expect(colunasConcorrentes().map((c) => c.numero)).toEqual([11, 21, 31, 32, 33, 34]);
  });
  it("põe uma linha por faixa, de 00 a 18 a 59 ou +", () => {
    const linhas = linhasConcorrentesPorFaixa();
    expect(linhas).toHaveLength(10);
    expect(linhas[0].faixa).toBe("00 a 18");
    expect(linhas[9].faixa).toBe("59 ou +");
  });
  it("mantém os valores enviados (Unimed 00 a 18 = 278,82; Hapvida Normal 2 59 ou + = 634,49)", () => {
    const linhas = linhasConcorrentesPorFaixa();
    expect(linhas[0].centavos[0]).toBe(27882);
    expect(linhas[9].centavos[5]).toBe(63449);
    expect(linhas[7].centavos[1]).toBe(49935);
  });
});
