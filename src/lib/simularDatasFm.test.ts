import { describe, expect, it } from "vitest";
import { COMPETENCIA_PADRAO, dataDaLinha, formatarCompetencia, lerCompetencia, lerDiaMes, avaliarImpactosFm, impactosFm, lerInteiro, periodoFm, ultimoDiaFm, simularDatasFm, ultimoDiaUtil } from "./simularDatasFm";

describe("Simular Datas FM", () => {
  it("competência 12/2026 com os dias padrão reproduz o quadro fornecido, com Arquivo na primeira linha de datas", () => {
    const linhas = simularDatasFm({ ...COMPETENCIA_PADRAO, dias: {} });
    expect(linhas.map((l) => [l.rotulo, l.dia, l.data])).toEqual([
      ["Arquivo", 5, "05/01/2027"],
      ["Fechamento", 10, "10/02/2027"],
      ["Dare", 15, "15/01/2027"],
      ["DIOPS", 30, "30/01/2027"],
      ["Pagamento", 30, "30/01/2027"],
    ]);
  });
  it("linhas no mês seguinte, sem virar o ano fora de dezembro", () => {
    const linhas = simularDatasFm({ mes: 5, ano: 2027, dias: { fechamento: 12 } });
    expect(linhas.find((l) => l.id === "fechamento")!.data).toBe("12/07/2027");
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
  it("Período: do dia seguinte ao Último Dia, um mês antes, até o Último Dia", () => {
    expect(periodoFm({ ...COMPETENCIA_PADRAO, dias: {} })).toEqual({ de: "01/12/2026", ate: "31/12/2026" });
    expect(periodoFm({ mes: 1, ano: 2027, dias: {} })).toEqual({ de: "30/12/2026", ate: "29/01/2027" });
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
  it("Último Dia: Arquivo no mês da competência → dia do Arquivo − 1; senão, último dia útil da competência", () => {
    expect(ultimoDiaFm({ ...COMPETENCIA_PADRAO, dias: { arquivo: 28 }, arquivoMes: 12 }).data).toBe("27/12/2026");
    expect(periodoFm({ ...COMPETENCIA_PADRAO, dias: { arquivo: 28 }, arquivoMes: 12 })).toEqual({ de: "28/11/2026", ate: "27/12/2026" });
    expect(periodoFm({ ...COMPETENCIA_PADRAO, dias: { arquivo: 20 }, arquivoMes: 12 })).toEqual({ de: "20/11/2026", ate: "19/12/2026" });
    expect(periodoFm({ mes: 3, ano: 2027, dias: { arquivo: 31 }, arquivoMes: 3 })).toEqual({ de: "28/02/2027", ate: "30/03/2027" });
    expect(ultimoDiaFm({ ...COMPETENCIA_PADRAO, dias: { arquivo: 1 }, arquivoMes: 12 }).data).toBe("30/11/2026");
    expect(ultimoDiaFm({ ...COMPETENCIA_PADRAO, dias: { arquivo: 5 }, arquivoMes: 1 }).data).toBe("31/12/2026");
  });
  it("Fechamento usa o dia indicado no mês subsequente ao do Arquivo", () => {
    const fech = (e: Parameters<typeof simularDatasFm>[0]) => simularDatasFm(e).find((l) => l.id === "fechamento")!.data;
    expect(fech({ ...COMPETENCIA_PADRAO, dias: {} })).toBe("10/02/2027");
    expect(fech({ ...COMPETENCIA_PADRAO, dias: { arquivo: 20 }, arquivoMes: 12 })).toBe("10/01/2027");
    expect(fech({ ...COMPETENCIA_PADRAO, dias: { arquivo: 5, fechamento: 30 }, arquivoMes: 1 })).toBe("28/02/2027");
  });
  it("DIAS: Fechamento − Arquivo; Dare, DIOPS e Pagamento − Fechamento, em dias corridos", () => {
    const linhas = simularDatasFm({ ...COMPETENCIA_PADRAO, dias: {} });
    expect(linhas.map((l) => [l.rotulo, l.data, l.diasBase])).toEqual([
      ["Arquivo", "05/01/2027", 0],
      ["Fechamento", "10/02/2027", 36],
      ["Dare", "15/01/2027", -26],
      ["DIOPS", "30/01/2027", -11],
      ["Pagamento", "30/01/2027", -11],
    ]);
  });
  it("IMPACTOS: PEONA conta dias do Período fora da competência; DARE e DIOPS repetem a coluna DIAS", () => {
    expect(impactosFm({ ...COMPETENCIA_PADRAO, dias: {} })).toEqual({ peona: 0, dare: -26, diops: -11, pagamento: -11 });
    expect(impactosFm({ ...COMPETENCIA_PADRAO, dias: { arquivo: 20 }, arquivoMes: 12 }).peona).toBe(11); // 20/11 a 30/11
  });
  it("premissas dos IMPACTOS: DARE < 5 crítico, 5–9 abaixo do ideal, ≥ 10 ideal; DIOPS ideal ≥ 15; PEONA impacta com dias fora da competência", () => {
    const niveis = (arquivo: number, mes: number, extra: Partial<Record<"dare" | "diops" | "pagamento", number>> = {}) =>
      Object.fromEntries(avaliarImpactosFm({ ...COMPETENCIA_PADRAO, dias: { arquivo, ...extra }, arquivoMes: mes }).map((i) => [i.id, i.status]));
    // Arquivo 20/12 → Fechamento 10/01: Dare 15/01 = 5 dias, DIOPS 30/01 = 20 dias, PEONA 11 dias.
    expect(niveis(20, 12)).toEqual({ peona: "Com impacto", dare: "Abaixo do ideal", diops: "Ideal", pagamento: "Ideal" });
    expect(niveis(20, 12, { pagamento: 24 })).toMatchObject({ pagamento: "Abaixo do ideal" }); // 14 dias
    expect(niveis(20, 12, { pagamento: 25 })).toMatchObject({ pagamento: "Ideal" }); // 15 dias
    expect(niveis(20, 12, { dare: 14 })).toMatchObject({ dare: "Crítico" });
    expect(niveis(20, 12, { dare: 20 })).toMatchObject({ dare: "Ideal" });
    expect(niveis(20, 12, { diops: 24 })).toMatchObject({ diops: "Abaixo do ideal" });
    expect(niveis(5, 1)).toMatchObject({ peona: "Sem impacto" });
  });
  it("PRAZO: Fechamento desde o Arquivo; Dare, DIOPS e Pagamento desde o Fechamento", () => {
    expect(simularDatasFm({ ...COMPETENCIA_PADRAO, dias: { arquivo: 20 }, arquivoMes: 12 }).map((l) => [l.rotulo, l.diasBase, l.base])).toEqual([
      ["Arquivo", 0, "Arquivo"], ["Fechamento", 21, "Arquivo"], ["Dare", 5, "Fechamento"], ["DIOPS", 20, "Fechamento"], ["Pagamento", 20, "Fechamento"],
    ]);
  });
});
