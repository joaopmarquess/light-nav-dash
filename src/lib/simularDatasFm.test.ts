import { describe, expect, it } from "vitest";
import { COMPETENCIA_PADRAO, dataDaLinha, formatarCompetencia, lerCompetencia, lerDiaMes, lerInteiro, periodoFm, simularDatasFm, ultimoDiaUtil } from "./simularDatasFm";

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
  it("Competência padrão 12/2026 no formato MM/AAAA", () => {
    expect(formatarCompetencia(COMPETENCIA_PADRAO.mes, COMPETENCIA_PADRAO.ano)).toBe("12/2026");
    expect(lerCompetencia("01/2027")).toEqual({ mes: 1, ano: 2027 });
    expect(lerCompetencia("13/2026")).toBeNull();
    expect(lerCompetencia("2026-12")).toBeNull();
  });
  it("Último Dia = último dia útil do mês da competência", () => {
    expect(ultimoDiaUtil(12, 2026)).toEqual({ dia: 31, data: "31/12/2026" }); // quinta-feira
    expect(ultimoDiaUtil(1, 2027).data).toBe("29/01/2027"); // 30 e 31 caem no fim de semana
    expect(ultimoDiaUtil(10, 2026).data).toBe("30/10/2026"); // 31 é sábado
    expect(ultimoDiaUtil(4, 2027).data).toBe("30/04/2027");
  });
  it("feriado nacional no fim do mês é pulado (Sexta-feira Santa em 29/03/2024)", () => {
    expect(ultimoDiaUtil(3, 2024).data).toBe("28/03/2024");
  });
  it("Período vai do Último Dia − 30 dias até o Último Dia", () => {
    expect(periodoFm(12, 2026)).toEqual({ de: "01/12/2026", ate: "31/12/2026" });
    expect(periodoFm(1, 2027)).toEqual({ de: "30/12/2026", ate: "29/01/2027" });
  });
  it("Arquivo pede dia/mês: padrão 05 do mês seguinte; mês anterior ao da competência vira o ano", () => {
    const arq = (e: Parameters<typeof simularDatasFm>[0]) => simularDatasFm(e).find((l) => l.id === "arquivo")!;
    expect(arq({ ...COMPETENCIA_PADRAO, dias: {} })).toMatchObject({ diaMes: "05/01", data: "05/01/2027" });
    expect(arq({ ...COMPETENCIA_PADRAO, dias: { arquivo: 8 }, arquivoMes: 2 }).data).toBe("08/02/2027");
    expect(arq({ ...COMPETENCIA_PADRAO, dias: { arquivo: 28 }, arquivoMes: 12 }).data).toBe("28/12/2026");
    expect(lerDiaMes("05/01")).toEqual({ dia: 5, mes: 1 });
    expect(lerDiaMes("")).toBeUndefined();
    expect(lerDiaMes("05/13")).toBeNull();
    expect(lerDiaMes("5")).toBeNull();
  });
});
