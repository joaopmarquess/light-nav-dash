import { describe, expect, it } from "vitest";
import { formatarPrazo, REFERENCIA_ULTIMO_DIA_PADRAO, COMPETENCIA_PADRAO, dataDaLinha, formatarCompetencia, lerCompetencia, lerDiaMes, avaliarImpactosFm, impactosFm, lerInteiro, periodoFm, ultimoDiaFm, simularDatasFm, ultimoDiaUtil , lerSimulacoesFm, novaSimulacaoFm, alterarSimulacaoFm, duplicarSimulacaoFm, ordenarSimulacoesFm, proximoNumeroFm, DESCRICAO_FM_MAX } from "./simularDatasFm";

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
    const linhas = simularDatasFm({ mes: 5, ano: 2027, dias: {} });
    expect(linhas.find((l) => l.id === "dare")!.data).toBe("15/06/2027");
  });
  it("REFERÊNCIA fixa de Dare (15), DIOPS (30) e Pagamento (30): valor digitado é ignorado", () => {
    const linhas = simularDatasFm({ ...COMPETENCIA_PADRAO, dias: { dare: 12, diops: 20, pagamento: 25 } });
    expect(linhas.filter((l) => ["dare", "diops", "pagamento"].includes(l.id)).map((l) => [l.dia, l.data])).toEqual([
      [15, "15/01/2027"], [30, "30/01/2027"], [30, "30/01/2027"],
    ]);
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
    expect(impactosFm({ ...COMPETENCIA_PADRAO, dias: {} })).toEqual({ peona: 0, fechamento: 10, dare: 0, diops: 15, pagamento: 15 });
    expect(impactosFm({ ...COMPETENCIA_PADRAO, dias: { arquivo: 20 }, arquivoMes: 12 }).peona).toBe(11); // 20/11 a 30/11
  });
  it("IMPACTOS em três níveis: Crítico, Moderado e Ideal", () => {
    const niveis = (arquivo: number, mes: number, extra: Partial<Record<"fechamento" | "dare" | "diops" | "pagamento", number>> = {}) =>
      Object.fromEntries(avaliarImpactosFm({ ...COMPETENCIA_PADRAO, dias: { arquivo, ...extra }, arquivoMes: mes }).map((i) => [i.id, i.status]));
    // Arquivo 20/12 + 21 → Fechamento 10/01: Dare 15/01 = 5 dias, DIOPS e Pagamento 30/01 = 20 dias, PEONA 11 dias.
    const f = { fechamento: 21 };
    expect(niveis(20, 12, f)).toEqual({ peona: "Moderado", fechamento: "Ideal", dare: "Moderado", diops: "Ideal", pagamento: "Ideal" });
    // Arquivo 20/12 + X → Dare 15/01 a 26 − X dias; DIOPS e Pagamento 30/01 a 41 − X dias.
    expect(niveis(20, 12, { fechamento: 22 })).toMatchObject({ dare: "Crítico" }); // 4 dias
    expect(niveis(20, 12, { fechamento: 17 })).toMatchObject({ dare: "Moderado" }); // 9 dias
    expect(niveis(20, 12, { fechamento: 16 })).toMatchObject({ dare: "Ideal" }); // 10 dias
    expect(niveis(20, 12, { fechamento: 27 })).toMatchObject({ diops: "Moderado", pagamento: "Moderado" }); // 14 dias
    expect(niveis(20, 12, { fechamento: 26 })).toMatchObject({ diops: "Ideal", pagamento: "Ideal" }); // 15 dias
  });
  it("FECHAMENTO: menos de 10 dias Crítico, 10 a 19 Moderado, 20 ou mais Ideal", () => {
    const fech = (fechamento: number) => avaliarImpactosFm({ ...COMPETENCIA_PADRAO, dias: { fechamento } }).find((i) => i.id === "fechamento")!;
    expect(fech(9)).toMatchObject({ dias: 9, status: "Crítico" });
    expect(fech(10)).toMatchObject({ dias: 10, status: "Moderado" });
    expect(fech(19)).toMatchObject({ dias: 19, status: "Moderado" });
    expect(fech(20)).toMatchObject({ dias: 20, status: "Ideal" });
  });
  it("PEONA: 0 Ideal, 1 a 15 Moderado, acima de 15 Crítico", () => {
    // Competência 12/2026 com Arquivo em dezembro: Arquivo dia N → Período de N/11 a (N−1)/12 → PEONA = 31 − N dias de novembro.
    const peona = (arquivo: number) => avaliarImpactosFm({ ...COMPETENCIA_PADRAO, dias: { arquivo }, arquivoMes: 12 }).find((i) => i.id === "peona")!;
    expect(avaliarImpactosFm({ ...COMPETENCIA_PADRAO, dias: {} }).find((i) => i.id === "peona")).toMatchObject({ dias: 0, status: "Ideal" });
    expect(peona(30)).toMatchObject({ dias: 1, status: "Moderado" });
    expect(peona(16)).toMatchObject({ dias: 15, status: "Moderado" });
    expect(peona(15)).toMatchObject({ dias: 16, status: "Crítico" });
  });
  it("PRAZO: Fechamento desde o Arquivo; Dare, DIOPS e Pagamento desde o Fechamento", () => {
    expect(simularDatasFm({ ...COMPETENCIA_PADRAO, dias: { arquivo: 20 }, arquivoMes: 12 }).map((l) => [l.rotulo, l.diasBase, l.base])).toEqual([
      ["Arquivo", 0, "Arquivo"], ["Fechamento", 10, "Arquivo"], ["Dare", 16, "Fechamento"], ["DIOPS", 31, "Fechamento"], ["Pagamento", 31, "Fechamento"],
    ]);
  });
  it("PRAZO com dois dígitos: 09 dias", () => {
    expect(formatarPrazo(9)).toBe("09");
    expect(formatarPrazo(0)).toBe("00");
    expect(formatarPrazo(21)).toBe("21");
    expect(formatarPrazo(-5)).toBe("−05");
  });
  it("IMPACTOS descrevem os dias com zero à esquerda", () => {
    const dare = avaliarImpactosFm({ ...COMPETENCIA_PADRAO, dias: { arquivo: 20, fechamento: 21 }, arquivoMes: 12 }).find((i) => i.id === "dare")!;
    expect(dare.descricao.startsWith("05 dias para fechar o Dare")).toBe(true);
  });
  it("Referência de Último Dia começa em 20", () => {
    expect(REFERENCIA_ULTIMO_DIA_PADRAO).toBe(20);
  });
});

describe("Controle de Simulações FM", () => {
  const agora = "2026-11-18T15:00:00.000Z";
  let n = 0;
  const id = () => `id${++n}`;
  it("migra a simulação única anterior para a primeira da lista", () => {
    const lista = lerSimulacoesFm(null, JSON.stringify({ mes: 11, ano: 2026, dias: { arquivo: 20, fechamento: 21 }, arquivoMes: 12 }), agora, id);
    expect(lista).toHaveLength(1);
    expect(lista[0].descricao).toBe("");
    expect(lista[0].numero).toBe(1);
    expect(lista[0].entrada).toEqual({ mes: 11, ano: 2026, dias: { arquivo: 20, fechamento: 21 }, arquivoMes: 12 });
  });
  it("sem lista nem legado começa vazia; lista guardada tem precedência", () => {
    expect(lerSimulacoesFm(null, null, agora, id)).toEqual([]);
    const guardada = JSON.stringify([{ id: "a", descricao: "Cenário A", criadaEm: agora, atualizadaEm: agora, entrada: { mes: 12, ano: 2026, dias: { dare: 3 } } }]);
    const lista = lerSimulacoesFm(guardada, JSON.stringify({ mes: 1, ano: 2027, dias: {} }), agora, id);
    expect(lista.map((s) => s.descricao)).toEqual(["Cenário A"]);
    expect(lista[0].entrada.dias).toEqual({}); // DARE tem REFERÊNCIA fixa
  });
  it("alterar a descrição limita o tamanho e marca a data de alteração", () => {
    const base = [novaSimulacaoFm("a", agora, 1), novaSimulacaoFm("b", agora, 2)];
    const depois = alterarSimulacaoFm(base, "b", { descricao: "x".repeat(DESCRICAO_FM_MAX + 50) }, "2026-11-19T10:00:00.000Z");
    expect(depois[1].descricao).toHaveLength(DESCRICAO_FM_MAX);
    expect(depois[1].atualizadaEm).toBe("2026-11-19T10:00:00.000Z");
    expect(depois[0]).toBe(base[0]);
    expect(ordenarSimulacoesFm(depois).map((s) => s.id)).toEqual(["a", "b"]);
  });
  it("duplicar copia as entradas com descrição '(cópia)' sem compartilhar os dias", () => {
    const s = novaSimulacaoFm("a", agora, 1, { mes: 12, ano: 2026, dias: { arquivo: 20 } }, "Cenário A");
    const c = duplicarSimulacaoFm(s, "b", agora, 2);
    expect(c.numero).toBe(2);
    expect(c.descricao).toBe("Cenário A (cópia)");
    expect(c.entrada).toEqual(s.entrada);
    c.entrada.dias.arquivo = 1;
    expect(s.entrada.dias.arquivo).toBe(20);
  });
  it("enumera os Cenários por ordem de inserção, sem reaproveitar números após excluir", () => {
    const lista = [novaSimulacaoFm("a", agora, 1), novaSimulacaoFm("b", agora, 2), novaSimulacaoFm("c", agora, 3)];
    expect(proximoNumeroFm([])).toBe(1);
    expect(proximoNumeroFm(lista.filter((s) => s.id !== "b"))).toBe(4);
    expect(ordenarSimulacoesFm([lista[2], lista[0], lista[1]]).map((s) => s.numero)).toEqual([1, 2, 3]);
  });
  it("numera, na ordem guardada, simulações salvas antes da enumeração", () => {
    const guardada = JSON.stringify([
      { id: "x", descricao: "X", entrada: {} },
      { id: "y", numero: 5, descricao: "Y", entrada: {} },
      { id: "z", descricao: "Z", entrada: {} },
    ]);
    expect(lerSimulacoesFm(guardada, null, agora, id).map((s) => [s.id, s.numero])).toEqual([["x", 6], ["y", 5], ["z", 7]]);
  });
});
