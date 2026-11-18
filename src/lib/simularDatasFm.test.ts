import { describe, expect, it } from "vitest";
import { REFERENCIA_ULTIMO_DIA_PADRAO, COMPETENCIA_PADRAO, dataDaLinha, formatarCompetencia, lerCompetencia, lerDiaMes, avaliarImpactosFm, impactosFm, lerInteiro, periodoFm, ultimoDiaFm, simularDatasFm, ultimoDiaUtil } from "./simularDatasFm";

describe("Simular Datas FM", () => {
  it("competência 12/2026 com os dias padrão reproduz o quadro fornecido, com Arquivo na primeira linha de datas", () => {
    const linhas = simularDatasFm({ ...COMPETENCIA_PADRAO, dias: {} });
    expect(linhas.map((l) => [l.rotulo, l.dia, l.data])).toEqual([
      ["Arquivo", 5, "05/01/2027"],
      ["Fechamento", 10, "15/01/2027"],
      ["Dare", 15, "15/01/2027"],
      ["DIOPS", 30, "30/01/2027"],
      ["Pagamento", 30, "30/01/2027"],
    ]);
  });
  it("linhas no mês seguinte, sem virar o ano fora de dezembro", () => {
    const linhas = simularDatasFm({ mes: 5, ano: 2027, dias: { dare: 12 } });
    expect(linhas.find((l) => l.id === "dare")!.data).toBe("12/06/2027");
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
  it("Fechamento = data do Arquivo + REFERÊNCIA em dias corridos", () => {
    const fech = (e: Parameters<typeof simularDatasFm>[0]) => simularDatasFm(e).find((l) => l.id === "fechamento")!.data;
    expect(fech({ ...COMPETENCIA_PADRAO, dias: {} })).toBe("15/01/2027"); // 05/01 + 10
    expect(fech({ ...COMPETENCIA_PADRAO, dias: { arquivo: 20 }, arquivoMes: 12 })).toBe("30/12/2026"); // 20/12 + 10
    expect(fech({ ...COMPETENCIA_PADRAO, dias: { arquivo: 25, fechamento: 10 }, arquivoMes: 12 })).toBe("04/01/2027"); // vira o ano
    expect(fech({ ...COMPETENCIA_PADRAO, dias: { arquivo: 20, fechamento: 30 }, arquivoMes: 1 })).toBe("19/02/2027"); // vira o mês
  });
  it("DIAS: Fechamento − Arquivo; Dare, DIOPS e Pagamento − Fechamento, em dias corridos", () => {
    const linhas = simularDatasFm({ ...COMPETENCIA_PADRAO, dias: {} });
    expect(linhas.map((l) => [l.rotulo, l.data, l.diasBase])).toEqual([
      ["Arquivo", "05/01/2027", 0],
      ["Fechamento", "15/01/2027", 10],
      ["Dare", "15/01/2027", 0],
      ["DIOPS", "30/01/2027", 15],
      ["Pagamento", "30/01/2027", 15],
    ]);
  });
  it("IMPACTOS: PEONA conta dias do Período fora da competência; DARE e DIOPS repetem a coluna DIAS", () => {
    expect(impactosFm({ ...COMPETENCIA_PADRAO, dias: {} })).toEqual({ peona: 0, dare: 0, diops: 15, pagamento: 15 });
    expect(impactosFm({ ...COMPETENCIA_PADRAO, dias: { arquivo: 20 }, arquivoMes: 12 }).peona).toBe(11); // 20/11 a 30/11
  });
  it("premissas dos IMPACTOS: DARE < 5 crítico, 5–9 abaixo do ideal, ≥ 10 ideal; DIOPS ideal ≥ 15; PEONA impacta com dias fora da competência", () => {
    const niveis = (arquivo: number, mes: number, extra: Partial<Record<"fechamento" | "dare" | "diops" | "pagamento", number>> = {}) =>
      Object.fromEntries(avaliarImpactosFm({ ...COMPETENCIA_PADRAO, dias: { arquivo, ...extra }, arquivoMes: mes }).map((i) => [i.id, i.status]));
    // Arquivo 20/12 + 21 → Fechamento 10/01: Dare 15/01 = 5 dias, DIOPS 30/01 = 20 dias, PEONA 11 dias.
    const f = { fechamento: 21 };
    expect(niveis(20, 12, f)).toEqual({ peona: "Impacto Controlado", dare: "No limite", diops: "Ideal", pagamento: "Ideal" });
    expect(niveis(20, 12, { ...f, pagamento: 24 })).toMatchObject({ pagamento: "Abaixo do ideal" }); // 14 dias
    expect(niveis(20, 12, { ...f, pagamento: 25 })).toMatchObject({ pagamento: "Ideal" }); // 15 dias
    expect(niveis(20, 12, { ...f, dare: 14 })).toMatchObject({ dare: "Crítico" });
    expect(niveis(20, 12, { ...f, dare: 16 })).toMatchObject({ dare: "Abaixo do ideal" }); // 6 dias
    expect(niveis(20, 12, { ...f, dare: 20 })).toMatchObject({ dare: "Ideal" });
    expect(niveis(20, 12, { ...f, diops: 24 })).toMatchObject({ diops: "Abaixo do ideal" });
    expect(niveis(5, 1)).toMatchObject({ peona: "Sem Impacto" });
  });
  it("DARE com exatamente 5 dias fica No limite (amarelo)", () => {
    const dare = avaliarImpactosFm({ ...COMPETENCIA_PADRAO, dias: { arquivo: 20, fechamento: 21 }, arquivoMes: 12 }).find((i) => i.id === "dare")!;
    expect(dare).toMatchObject({ dias: 5, status: "No limite", nivel: "limite" });
  });
  it("PEONA: 0 Sem Impacto, abaixo de 10 dias Menor Impacto, 10 dias Impacto Controlado", () => {
    const peona = (arquivo: number) => avaliarImpactosFm({ ...COMPETENCIA_PADRAO, dias: { arquivo }, arquivoMes: 12 }).find((i) => i.id === "peona")!;
    expect(peona(22)).toMatchObject({ dias: 9, status: "Menor Impacto" }); // 22/11 a 21/12
    expect(peona(21)).toMatchObject({ dias: 10, status: "Impacto Controlado", nivel: "controlado" }); // 21/11 a 20/12, laranja
    expect(avaliarImpactosFm({ ...COMPETENCIA_PADRAO, dias: {} }).find((i) => i.id === "peona")).toMatchObject({ dias: 0, status: "Sem Impacto" });
  });
  it("PRAZO: Fechamento desde o Arquivo; Dare, DIOPS e Pagamento desde o Fechamento", () => {
    expect(simularDatasFm({ ...COMPETENCIA_PADRAO, dias: { arquivo: 20 }, arquivoMes: 12 }).map((l) => [l.rotulo, l.diasBase, l.base])).toEqual([
      ["Arquivo", 0, "Arquivo"], ["Fechamento", 10, "Arquivo"], ["Dare", 16, "Fechamento"], ["DIOPS", 31, "Fechamento"], ["Pagamento", 31, "Fechamento"],
    ]);
  });
  it("Referência de Último Dia começa em 20", () => {
    expect(REFERENCIA_ULTIMO_DIA_PADRAO).toBe(20);
  });
});
