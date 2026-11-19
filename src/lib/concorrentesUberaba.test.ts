import { describe, expect, it } from "vitest";
import { colunasConcorrentes, linhasConcorrentesPorFaixa, outrasBensaude } from "@/lib/concorrentesUberaba";

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
  it("chama as colunas da Hapvida de Hapvida 1 a 4", () => {
    expect(colunasConcorrentes().map((c) => c.rotulo).slice(2)).toEqual(["Hapvida 1", "Hapvida 2", "Hapvida 3", "Hapvida 4"]);
  });
  it("Outras Bensaúde: 3019 e 3020 em Enfermaria, venda 3019 00 a 18 = 134,14", () => {
    const { colunas, linhas } = outrasBensaude("venda", false);
    expect(colunas.map((c) => c.plano)).toEqual([3019, 3020]);
    expect(linhas).toHaveLength(10);
    expect(linhas[0].centavos[0]).toBe(13414);
    expect(linhas[9].centavos[0]).toBe(80468);
  });
  it("Outras Bensaúde: net 3019 00 a 18 = 103,28", () => {
    expect(outrasBensaude("net", false).linhas[0].centavos[0]).toBe(10328);
  });
  it("Outras Bensaúde com Apartamento aberto mostra Enfermaria e Apartamento de cada plano", () => {
    expect(outrasBensaude("venda", true).colunas.map((c) => c.rotulo)).toEqual(["3019 ENF.", "3019 APTO.", "3020 ENF.", "3020 APTO."]);
  });
});
