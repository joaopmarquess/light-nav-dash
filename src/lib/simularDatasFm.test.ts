import { describe, expect, it } from "vitest";
import { COMPETENCIA_PADRAO, dataDaLinha, lerInteiro, simularDatasFm } from "./simularDatasFm";

describe("Simular Datas FM", () => {
  it("competência 12/2026 com os dias padrão reproduz o quadro fornecido, com Arquivo na primeira linha de datas", () => {
    const linhas = simularDatasFm({ ...COMPETENCIA_PADRAO, dias: {} });
    expect(linhas.map((l) => [l.rotulo, l.dia, l.data])).toEqual([
      ["Arquivo", 5, "05/01/2027"],
      ["De", 1, "01/12/2026"],
      ["Até", 30, "30/12/2026"],
      ["Fechamento", 10, "10/01/2027"],
      ["Dare", 15, "15/01/2027"],
      ["DIOPS", 30, "30/01/2027"],
      ["Pagamento", 30, "30/01/2027"],
    ]);
  });
  it("De/Até no mês da competência; demais no mês seguinte, sem virar o ano fora de dezembro", () => {
    const linhas = simularDatasFm({ mes: 5, ano: 2027, dias: { fechamento: 12 } });
    expect(linhas.find((l) => l.id === "ate")!.data).toBe("30/05/2027");
    expect(linhas.find((l) => l.id === "fechamento")!.data).toBe("12/06/2027");
  });
  it("dia além do fim do mês vira o último dia (30 em fevereiro)", () => {
    expect(dataDaLinha(1, 2027, 30, true)).toEqual({ data: "28/02/2027", ajustado: true });
    expect(dataDaLinha(1, 2028, 30, true)).toEqual({ data: "29/02/2028", ajustado: true });
  });
  it("lê inteiros no intervalo; vazio restaura e fora do intervalo é recusado", () => {
    expect(lerInteiro("", 1, 31)).toBeUndefined();
    expect(lerInteiro("15", 1, 31)).toBe(15);
    expect(lerInteiro("32", 1, 31)).toBeNull();
    expect(lerInteiro("0", 1, 31)).toBeNull();
  });
});
