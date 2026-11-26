import { describe, expect, it } from "vitest";
import type { EntradaDatasFm } from "./simularDatasFm";
import { formatarPrazo, normalizarEntradaFm, COMPETENCIA_PADRAO, dataDaLinha, formatarCompetencia, lerCompetencia, lerDiaMes, avaliarImpactosFm, impactosFm, lerInteiro, periodoFm, ultimoDiaFm, simularDatasFm, ultimoDiaUtil , lerSimulacoesFm, novaSimulacaoFm, gravarSimulacaoFm, simulacaoAlteradaFm, duplicarSimulacaoFm, ordenarSimulacoesFm, proximoNumeroFm, DESCRICAO_FM_MAX, prazoFolhaFm, blocosPeriodoFm, hospitalBeneFm, beneNoBlocoFm, blocosRedeFm } from "./simularDatasFm";

// Entrada do quadro fornecido antes do novo padrão: Arquivo 05/01 e Fechamento 10.
const QUADRO = { ...COMPETENCIA_PADRAO, dias: { arquivo: 5, fechamento: 10 }, arquivoMes: 1 };

describe("Simular Datas FM", () => {
  it("padrão dos cenários: Arquivo 20/competência e Fechamento 25", () => {
    expect(simularDatasFm({ ...COMPETENCIA_PADRAO, dias: {} }).map((l) => [l.rotulo, l.dia, l.data])).toEqual([
      ["Arquivo", 20, "20/12/2026"],
      ["Fechamento", 25, "14/01/2027"], // 20/12 + 25 dias
      ["DeRE", 15, "15/01/2027"],
      ["DIOPS", 30, "30/01/2027"],
      ["Pagamento", 30, "30/01/2027"],
    ]);
    expect(simularDatasFm({ mes: 3, ano: 2027, dias: {} }).find((l) => l.id === "arquivo")).toMatchObject({ diaMes: "20/03", data: "20/03/2027" });
    expect(periodoFm({ ...COMPETENCIA_PADRAO, dias: {} })).toEqual({ de: "20/11/2026", ate: "19/12/2026" });
  });
  it("competência 12/2026 com Arquivo 05/01 e Fechamento 10 reproduz o quadro fornecido", () => {
    const linhas = simularDatasFm(QUADRO);
    expect(linhas.map((l) => [l.rotulo, l.dia, l.data])).toEqual([
      ["Arquivo", 5, "05/01/2027"],
      ["Fechamento", 10, "15/01/2027"],
      ["DeRE", 15, "15/01/2027"],
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
    expect(periodoFm(QUADRO)).toEqual({ de: "01/12/2026", ate: "31/12/2026" });
    expect(periodoFm({ mes: 1, ano: 2027, dias: { arquivo: 5 }, arquivoMes: 2 })).toEqual({ de: "30/12/2026", ate: "29/01/2027" });
  });
  it("Arquivo pede dia/mês: padrão 20 da competência; mês anterior ao da competência vira o ano", () => {
    const arq = (e: Parameters<typeof simularDatasFm>[0]) => simularDatasFm(e).find((l) => l.id === "arquivo")!;
    expect(arq({ ...COMPETENCIA_PADRAO, dias: {} })).toMatchObject({ diaMes: "20/12", data: "20/12/2026" });
    expect(arq(QUADRO)).toMatchObject({ diaMes: "05/01", data: "05/01/2027" });
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
    expect(fech(QUADRO)).toBe("15/01/2027"); // 05/01 + 10
    expect(fech({ ...COMPETENCIA_PADRAO, dias: { arquivo: 20, fechamento: 10 }, arquivoMes: 12 })).toBe("30/12/2026"); // 20/12 + 10
    expect(fech({ ...COMPETENCIA_PADRAO, dias: { arquivo: 25, fechamento: 10 }, arquivoMes: 12 })).toBe("04/01/2027"); // vira o ano
    expect(fech({ ...COMPETENCIA_PADRAO, dias: { arquivo: 20, fechamento: 30 }, arquivoMes: 1 })).toBe("19/02/2027"); // vira o mês
  });
  it("DIAS: Fechamento − Arquivo; Dare, DIOPS e Pagamento − Fechamento, em dias corridos", () => {
    const linhas = simularDatasFm(QUADRO);
    expect(linhas.map((l) => [l.rotulo, l.data, l.diasBase])).toEqual([
      ["Arquivo", "05/01/2027", 0],
      ["Fechamento", "15/01/2027", 10],
      ["DeRE", "15/01/2027", 0],
      ["DIOPS", "30/01/2027", 15],
      ["Pagamento", "30/01/2027", 15],
    ]);
  });
  it("IMPACTOS: PEONA conta dias do Período fora da competência; DARE e DIOPS repetem a coluna DIAS", () => {
    expect(impactosFm(QUADRO)).toEqual({ peona: 0, fechamento: 10, dare: 0, diops: 15, pagamento: 15 });
    expect(impactosFm({ ...COMPETENCIA_PADRAO, dias: {} })).toEqual({ peona: 11, fechamento: 25, dare: 1, diops: 16, pagamento: 16 });
    expect(impactosFm({ ...COMPETENCIA_PADRAO, dias: { arquivo: 20 }, arquivoMes: 12 }).peona).toBe(11); // 20/11 a 30/11
  });
  it("IMPACTOS em três níveis: Crítico, Moderado e Ideal", () => {
    const niveis = (arquivo: number, mes: number, extra: Partial<Record<"fechamento" | "dare" | "diops" | "pagamento", number>> = {}) =>
      Object.fromEntries(avaliarImpactosFm({ ...COMPETENCIA_PADRAO, dias: { arquivo, ...extra }, arquivoMes: mes }).filter((i) => i.id !== "peonaBene").map((i) => [i.id, i.status]));
    // Arquivo 20/12 + 21 → Fechamento 10/01: Dare 15/01 = 5 dias, DIOPS e Pagamento 30/01 = 20 dias, PEONA 11 dias.
    const f = { fechamento: 21 };
    expect(niveis(20, 12, f)).toEqual({ peona: "Aceito", fechamento: "Ideal", dare: "Ideal", diops: "Ideal", pagamento: "Ideal" });
    // Arquivo 20/12 + X → Dare 15/01 a 26 − X dias; DIOPS e Pagamento 30/01 a 41 − X dias.
    // DARE (pedido de 18/11/2026): até 02 dias Crítico; 03 a 04 Moderado; 05 ou mais Ideal.
    expect(niveis(20, 12, { fechamento: 26 })).toMatchObject({ dare: "Crítico" }); // 0 dias
    expect(niveis(20, 12, { fechamento: 24 })).toMatchObject({ dare: "Crítico" }); // 2 dias
    expect(niveis(20, 12, { fechamento: 23 })).toMatchObject({ dare: "Moderado" }); // 3 dias
    expect(niveis(20, 12, { fechamento: 22 })).toMatchObject({ dare: "Moderado" }); // 4 dias
    expect(niveis(20, 12, { fechamento: 21 })).toMatchObject({ dare: "Ideal" }); // 5 dias
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
  it("PEONA: 0 a 4 Ideal, 5 a 12 Aceito, 13 a 15 Moderado, acima de 15 Crítico", () => {
    // Competência 12/2026 com Arquivo em dezembro: Arquivo dia N → Período de N/11 a (N−1)/12 → PEONA = 31 − N dias de novembro.
    const peona = (arquivo: number) => avaliarImpactosFm({ ...COMPETENCIA_PADRAO, dias: { arquivo }, arquivoMes: 12 }).find((i) => i.id === "peona")!;
    expect(avaliarImpactosFm(QUADRO).find((i) => i.id === "peona")).toMatchObject({ dias: 0, status: "Ideal" });
    expect(peona(30)).toMatchObject({ dias: 1, status: "Ideal" });
    expect(peona(27)).toMatchObject({ dias: 4, status: "Ideal" });
    expect(peona(26)).toMatchObject({ dias: 5, status: "Aceito", nivel: "aceito" });
    expect(peona(19)).toMatchObject({ dias: 12, status: "Aceito" });
    expect(peona(18)).toMatchObject({ dias: 13, status: "Moderado" });
    expect(peona(16)).toMatchObject({ dias: 15, status: "Moderado" });
    expect(peona(15)).toMatchObject({ dias: 16, status: "Crítico" });
  });
  it("PRAZO: Fechamento desde o Arquivo; Dare, DIOPS e Pagamento desde o Fechamento", () => {
    expect(simularDatasFm({ ...COMPETENCIA_PADRAO, dias: { arquivo: 20, fechamento: 10 }, arquivoMes: 12 }).map((l) => [l.rotulo, l.diasBase, l.base])).toEqual([
      ["Arquivo", 0, "Arquivo"], ["Fechamento", 10, "Arquivo"], ["DeRE", 16, "Fechamento"], ["DIOPS", 31, "Fechamento"], ["Pagamento", 31, "Fechamento"],
    ]);
  });
  it("Lista: dias entre o Arquivo e o Fechamento para Fechar a Folha", () => {
    expect(prazoFolhaFm({ ...COMPETENCIA_PADRAO, dias: { arquivo: 20, fechamento: 5 }, arquivoMes: 12 })).toBe("05 dias para Fechar a Folha");
    expect(prazoFolhaFm({ ...COMPETENCIA_PADRAO, dias: {} })).toBe("25 dias para Fechar a Folha");
    expect(prazoFolhaFm({ ...COMPETENCIA_PADRAO, dias: { fechamento: 1 } })).toBe("01 dia para Fechar a Folha");
  });
  it("PRAZO com dois dígitos: 09 dias", () => {
    expect(formatarPrazo(9)).toBe("09");
    expect(formatarPrazo(0)).toBe("00");
    expect(formatarPrazo(21)).toBe("21");
    expect(formatarPrazo(-5)).toBe("−05");
  });
  it("IMPACTOS descrevem os dias com zero à esquerda", () => {
    const dare = avaliarImpactosFm({ ...COMPETENCIA_PADRAO, dias: { arquivo: 20, fechamento: 21 }, arquivoMes: 12 }).find((i) => i.id === "dare")!;
    expect(dare.descricao.startsWith("05 dias para fechar o DeRE")).toBe(true);
  });
  it("Referência de Último Dia retirada: valor guardado antes é descartado", () => {
    expect(normalizarEntradaFm({ mes: 12, ano: 2026, dias: {}, referenciaUltimoDia: 20 })).toEqual({ mes: 12, ano: 2026, dias: {} });
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
  it("Gravar substitui o Cenário existente e insere o novo no fim", () => {
    const base = [novaSimulacaoFm("a", agora, 1), novaSimulacaoFm("b", agora, 2)];
    const editada = gravarSimulacaoFm(base, { ...base[1], descricao: "x".repeat(DESCRICAO_FM_MAX + 50) }, "2026-11-19T10:00:00.000Z");
    expect(editada).toHaveLength(2);
    expect(editada[1].descricao).toHaveLength(DESCRICAO_FM_MAX);
    expect(editada[1].atualizadaEm).toBe("2026-11-19T10:00:00.000Z");
    expect(editada[0]).toBe(base[0]);
    const inserida = gravarSimulacaoFm(base, novaSimulacaoFm("c", agora, 3), "2026-11-19T11:00:00.000Z");
    expect(inserida.map((s) => s.id)).toEqual(["a", "b", "c"]);
    expect(inserida[2].criadaEm).toBe("2026-11-19T11:00:00.000Z");
    expect(ordenarSimulacoesFm(inserida).map((s) => s.id)).toEqual(["a", "b", "c"]);
  });
  it("Cenário novo sempre tem o que gravar; existente só quando algo mudou", () => {
    const s = novaSimulacaoFm("a", agora, 1, { mes: 12, ano: 2026, dias: { arquivo: 20 } }, "A");
    expect(simulacaoAlteradaFm(undefined, s)).toBe(true);
    expect(simulacaoAlteradaFm(s, { ...s, entrada: { ...s.entrada, dias: { ...s.entrada.dias } } })).toBe(false);
    expect(simulacaoAlteradaFm(s, { ...s, descricao: "B" })).toBe(true);
    expect(simulacaoAlteradaFm(s, { ...s, entrada: { ...s.entrada, dias: { arquivo: 21 } } })).toBe(true);
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
    // Excluído o último (03), o número 03 não volta: vale o último número gravado.
    expect(proximoNumeroFm(lista.filter((s) => s.id !== "c"), 3)).toBe(4);
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

describe("Simular em blocos", () => {
  it("aceita somente um, dois ou quatro blocos, descartando quantidades inválidas", () => {
    for (const quantidadeBlocos of [3, 5, 2.5, 0]) {
      expect(normalizarEntradaFm({ ...COMPETENCIA_PADRAO, dias: {}, blocos: true, quantidadeBlocos }).quantidadeBlocos).toBe(4);
    }
  });
  it("quatro blocos explícitos preservam exatamente a divisão atual", () => {
    const entrada = { ...COMPETENCIA_PADRAO, dias: {} };
    expect(blocosPeriodoFm({ ...entrada, quantidadeBlocos: 4 })).toEqual(blocosPeriodoFm(entrada));
    expect(blocosPeriodoFm({ ...entrada, quantidadeBlocos: 4 })).toHaveLength(4);
  });
  it("dois blocos unem os grupos 1+2 e 3+4 sem redistribuir dias", () => {
    expect(blocosPeriodoFm({ ...COMPETENCIA_PADRAO, dias: {}, quantidadeBlocos: 2 })).toEqual([
      { bloco: 1, de: "20/11/2026", ate: "05/12/2026", dias: 16, arquivo: "06/12/2026" },
      { bloco: 2, de: "06/12/2026", ate: "19/12/2026", dias: 14, arquivo: "20/12/2026" },
    ]);
  });
  it("mantém a quantidade escolhida após gravar e ler o cenário", () => {
    const s = novaSimulacaoFm("blocos", "2026-11-24T20:12:00Z", 1, { ...COMPETENCIA_PADRAO, dias: {}, blocos: true, quantidadeBlocos: 2 });
    const lista = lerSimulacoesFm(JSON.stringify([s]), null, s.criadaEm, () => "novo");
    expect(lista[0].entrada.quantidadeBlocos).toBe(2);
    expect(blocosPeriodoFm(lista[0].entrada)).toHaveLength(2);
  });
  it("splits the default 30-day Período into 4 blocks of about 7 days, from its start to its end", () => {
    const b = blocosPeriodoFm({ ...COMPETENCIA_PADRAO, dias: {} });
    expect(b.map((x) => [x.de, x.ate, x.dias])).toEqual([
      ["20/11/2026", "27/11/2026", 8], ["28/11/2026", "05/12/2026", 8], ["06/12/2026", "12/12/2026", 7], ["13/12/2026", "19/12/2026", 7],
    ]);
  });
  it("sets each block's Arquivo to the day after the block ends", () => {
    const b = blocosPeriodoFm({ ...COMPETENCIA_PADRAO, dias: {} });
    expect(b.map((x) => x.arquivo)).toEqual(["28/11/2026", "06/12/2026", "13/12/2026", "20/12/2026"]);
  });
  it("gives Hospital Benê the whole Período with the scenario Arquivo as its deadline", () => {
    expect(hospitalBeneFm({ ...COMPETENCIA_PADRAO, dias: {} })).toEqual({ de: "20/11/2026", ate: "19/12/2026", dias: 30, arquivo: "20/12/2026" });
    expect(hospitalBeneFm({ mes: 1, ano: 2027, dias: { arquivo: 5 }, arquivoMes: 2 }).arquivo).toBe("05/02/2027");
  });
  it("keeps the option when saved and drops it when off", () => {
    expect(normalizarEntradaFm({ mes: 12, ano: 2026, dias: {}, blocos: true }).blocos).toBe(true);
    expect("blocos" in normalizarEntradaFm({ mes: 12, ano: 2026, dias: {}, blocos: false })).toBe(false);
  });
});

describe("Benê nos blocos", () => {
  it("só vale com blocos ligados e é preservado ao normalizar", () => {
    expect(beneNoBlocoFm({ blocos: true, beneNoBloco: true })).toBe(true);
    expect(beneNoBlocoFm({ blocos: true })).toBe(false);
    expect(normalizarEntradaFm({ ...COMPETENCIA_PADRAO, dias: {}, blocos: true, beneNoBloco: true }).beneNoBloco).toBe(true);
    expect(normalizarEntradaFm({ ...COMPETENCIA_PADRAO, dias: {}, beneNoBloco: true }).beneNoBloco).toBeUndefined();
  });
});

describe("1 bloco", () => {
  it("cobre o Período inteiro", () => {
    const e = { ...COMPETENCIA_PADRAO, dias: {}, quantidadeBlocos: 1 };
    const b = blocosPeriodoFm(e), quatro = blocosPeriodoFm({ ...e, quantidadeBlocos: 4 });
    expect(b).toHaveLength(1);
    expect(b[0].de).toBe(quatro[0].de);
    expect(b[0].ate).toBe(quatro[3].ate);
  });
});

describe("Arquivo da Rede e do Benê digitados", () => {
  it("Rede muda todos os blocos; Benê muda a Parte 2", () => {
    const e = { ...COMPETENCIA_PADRAO, dias: {}, blocos: true };
    const base = blocosPeriodoFm(e), b = blocosRedeFm({ ...e, arquivoRede: { dia: 25, mes: base[3].arquivo.split("/").map(Number)[1] } });
    expect(b.map((x) => x.arquivo.slice(0, 2))).toEqual(["25", "25", "25", "25"]);
    expect(b.map((x) => x.de)).toEqual(base.map((x) => x.de));
    expect(hospitalBeneFm({ ...e, arquivoBene: { dia: 3, mes: 2 } }).arquivo.slice(0, 5)).toBe("03/02");
  });
});

describe("PEONA em duas partes", () => {
  it("sempre mostra Benê e Rede", () => {
    const r = avaliarImpactosFm({ ...COMPETENCIA_PADRAO, dias: {} }).filter((i) => i.id.startsWith("peona")).map((i) => i.rotulo);
    expect(r).toEqual(["PEONA BENÊ", "PEONA REDE"]);
  });
});

describe("Período do Benê pelo próprio Arquivo", () => {
  it("Arquivo do Benê 20/12 difere de 15/12 no Período e no PEONA BENÊ", () => {
    const e: EntradaDatasFm = { ...COMPETENCIA_PADRAO, mes: 12, ano: 2026, dias: { arquivo: 15 }, arquivoMes: 12, blocos: true };
    const b15 = hospitalBeneFm(e), b20 = hospitalBeneFm({ ...e, arquivoBene: { dia: 20, mes: 12 } });
    expect(b15.ate).toBe("14/12/2026");
    expect(b20.ate).toBe("19/12/2026");
    expect(b20.de).toBe("20/11/2026");
    const pb = (x: typeof e) => avaliarImpactosFm(x).find((i) => i.id === "peonaBene")!.dias;
    expect(pb(e)).toBe(16);
    expect(pb({ ...e, arquivoBene: { dia: 20, mes: 12 } })).toBe(11);
  });
});

describe("Prazos contam do maior Arquivo", () => {
  it("Arquivo do Benê 20/12 empurra Fechamento; PEONA Rede segue o Arquivo do cenário", () => {
    const e: EntradaDatasFm = { ...COMPETENCIA_PADRAO, mes: 12, ano: 2026, dias: { arquivo: 15 }, arquivoMes: 12, blocos: true };
    const f = (x: EntradaDatasFm) => simularDatasFm(x).find((l) => l.id === "fechamento")!;
    const com = { ...e, arquivoBene: { dia: 20, mes: 12 } };
    expect(utc(f(com).data) - utc(f(e).data)).toBe(5 * 86400000);
    expect(f(com).diasBase).toBe(f(e).diasBase);
    const peona = (x: EntradaDatasFm, id: string) => avaliarImpactosFm(x).find((i) => i.id === id)!.dias;
    expect(peona(com, "peona")).toBe(peona(e, "peona"));
    expect(peona(com, "peonaBene")).toBe(11);
  });
});
const utc = (d: string) => { const [a, b, c] = d.split("/").map(Number); return Date.UTC(c, b - 1, a); };
