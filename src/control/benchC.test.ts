import { describe, expect, it } from "vitest";
import { aggregateQuarter, mergeQuarters, parseCatalog, operatorFilterName, operatorResults, faturamentoAns, benchYears } from "./benchC";
describe("Bench C oficial", () => {
  it("oferece histórico desde 2015, excluindo anos anteriores", () => {
    expect(benchYears([2026, 2025, 2019, 2018, 2017, 2016, 2015, 2014, 2001])).toEqual([2026, 2025, 2019, 2018, 2017, 2016, 2015]);
  });
  it("totaliza faturamento apenas do nível 3 3111 por trimestre e acumulado", () => {
    expect(faturamentoAns({ n: {}, r: [[311111011, 1, 1000], [311121011, 1, -100], [311111011, 2, 500], [311211011, 1, 999], [411111011, 2, 300], [311111011, 3, 700]] }, [[1], [2], [1, 2]])).toEqual([900, 500, 1400]);
  });
  it("compara o resultado acumulado somente das OPS do filtro com os mesmos sinais do DRE", () => {
    const results = operatorResults([
      { "366561": { n: {}, r: [[311111011, 1, 1000], [411111011, 1, 300], [611119011, 1, 50]] }, "335100": { n: {}, r: [[311111011, 1, 200]] }, "999999": { n: {}, r: [[311111011, 1, 9999]] } },
      { "366561": { n: {}, r: [[311111011, 2, 500], [411111011, 2, 100]] }, "335100": { n: {}, r: [[411111011, 2, 300]] } },
    ], ["366561", "335100", "123456"], []);
    expect(results.map(op => [op.reg, op.resultado, op.disponivel])).toEqual([["366561", 1050, true], ["335100", -100, true], ["123456", 0, false]]);
    expect(results.map(op => [op.faturamento, op.percentual])).toEqual([[1500, 70], [200, -50], [0, null]]);
  });
  it("abrevia operadoras pelo primeiro nome sem alterar o nome de origem", () => {
    expect(operatorFilterName("BENSAUDE PLANO DE ASSISTENCIA MEDICA HOSPITALAR LTDA")).toBe("BENSAUDE");
    expect(operatorFilterName("HAPVIDA SAO JOSE DO RIO PRETO")).toBe("HAPVIDA");
  });
  it("preserva Unimed e a cidade, retirando a descrição jurídica", () => {
    expect(operatorFilterName("UNIMED SAO JOSE DO RIO PRETO")).toBe("UNIMED SAO JOSE DO RIO PRETO");
    expect(operatorFilterName("Unimed de Ribeirão Preto - Cooperativa de Trabalho Médico")).toBe("UNIMED Ribeirão Preto");
    expect(operatorFilterName("UNIMED SÃO PAULO COOPERATIVA DE TRABALHO MÉDICO")).toBe("UNIMED SÃO PAULO");
  });
  it("usa registro e nome fantasia do CADOP, com razão social se ausente", () => {
    expect(parseCatalog('REGISTRO_OPERADORA;NOME_FANTASIA;RAZAO_SOCIAL;MODALIDADE;UF\n366561;Bensaúde;Razão;Medicina;SP\n335100;;Unimed Rio Preto;Cooperativa;SP')).toMatchObject([{ reg: "366561", nome: "Bensaúde" }, { reg: "335100", nome: "Unimed Rio Preto" }]);
  });
  it("agrega saldos finais somente 9D, sem duplicar sintéticas", () => {
    const file = aggregateQuarter('REG_ANS;CD_CONTA_CONTABIL;DESCRICAO;VL_SALDO_INICIAL;VL_SALDO_FINAL\n366561;31;Receitas;0,00;500,00\n366561;311111011;Analítica;100,00;350,00\n366561;311111011;Analítica;0,00;50,00\n366561;411111011;Despesa;10,00;90,00\n366561;691119011;Apuração;0,00;900,00', 2);
    expect(file["366561"]).toEqual({ n: { "31": "Receitas" }, r: [[311111011, 2, 400], [411111011, 2, 90]], saldosFinais: true });
  });
  it("usa saldo inicial 0,00 no primeiro trimestre mesmo quando informado", () => {
    const csv = 'REG_ANS;CD_CONTA_CONTABIL;DESCRICAO;VL_SALDO_INICIAL;VL_SALDO_FINAL\n366561;311111011;Receita;100,00;350,00';
    expect(mergeQuarters([aggregateQuarter(csv, 1)], "366561").r).toEqual([[311111011, 1, 350]]);
  });
  const legacyQuarter = (quarter: number, closing: number) => aggregateQuarter(`REG_ANS;CD_CONTA_CONTABIL;DESCRICAO;VL_SALDO_FINAL\n366561;311111011;Receita;${closing}`, quarter);
  it("usa saldo final do primeiro como saldo inicial do segundo", () => {
    expect(mergeQuarters([legacyQuarter(1, 100), legacyQuarter(2, 350)], "366561").r).toEqual([[311111011, 1, 100], [311111011, 2, 250]]);
  });
  it("usa saldo final do segundo como saldo inicial do terceiro", () => {
    expect(mergeQuarters([legacyQuarter(3, 300), legacyQuarter(1, 100), legacyQuarter(2, 350)], "366561").r).toEqual([[311111011, 1, 100], [311111011, 2, 250], [311111011, 3, -50]]);
  });
  it("usa saldo final do terceiro como saldo inicial do quarto", () => {
    const merged = mergeQuarters([legacyQuarter(1, 100), legacyQuarter(2, 350), legacyQuarter(3, 300), legacyQuarter(4, 900)], "366561");
    expect(merged.r).toEqual([[311111011, 1, 100], [311111011, 2, 250], [311111011, 3, -50], [311111011, 4, 600]]);
    expect(faturamentoAns(merged, [[1, 2, 3, 4]])).toEqual([900]);
  });
  it("rejeita arquivo predecessor ausente em vez de assumir zero", () => {
    expect(() => mergeQuarters([legacyQuarter(1, 100), legacyQuarter(3, 300)], "366561")).toThrow("falta o arquivo do 2º trimestre");
  });
  it("reúne saldos pela mesma conta e operadora sem misturar registros", () => {
    const header = 'REG_ANS;CD_CONTA_CONTABIL;DESCRICAO;VL_SALDO_FINAL\n';
    const q1 = aggregateQuarter(`${header}366561;311111011;Receita;100\n366561;411111011;Despesa;20\n335100;311111011;Receita;999`, 1);
    const q2 = aggregateQuarter(`${header}366561;311111011;Receita;350\n366561;411111011;Despesa;70\n335100;311111011;Receita;1999`, 2);
    expect(mergeQuarters([q1, q2], "366561").r).toEqual([[311111011, 1, 100], [411111011, 1, 20], [311111011, 2, 250], [411111011, 2, 50]]);
    expect(operatorResults([q1, q2], ["366561", "335100"], []).map(op => [op.resultado, op.faturamento])).toEqual([[280, 350], [1999, 1999]]);
  });
  it("aceita saldo inicial ausente nos arquivos antigos", () => {
    const legacy = 'REG_ANS;CD_CONTA_CONTABIL;DESCRICAO;VL_SALDO_FINAL\n366561;311111011;Contraprestação Emitida;183605,77';
    expect(aggregateQuarter(legacy, 1)["366561"]?.r).toEqual([[311111011, 1, 183605.77]]);
    expect(aggregateQuarter(legacy, 2)["366561"]?.r).toEqual([[311111011, 2, 183605.77]]);
  });
  it("ignora coluna inicial vazia ou não informada ao preservar saldos finais", () => {
    const header = 'REG_ANS;CD_CONTA_CONTABIL;DESCRICAO;VL_SALDO_INICIAL;VL_SALDO_FINAL\n';
    for (const initial of ["", "não informado", "NÃO INFORMADO"]) {
      const csv = `${header}366561;311111011;Contraprestação Emitida;${initial};181637,96`;
      expect(aggregateQuarter(csv, 1)["366561"]?.r).toEqual([[311111011, 1, 181637.96]]);
      expect(aggregateQuarter(csv, 2)["366561"]?.r).toEqual([[311111011, 2, 181637.96]]);
    }
  });
  it("valida saldo final sem depender do saldo inicial do CSV", () => {
    const header = 'REG_ANS;CD_CONTA_CONTABIL;DESCRICAO;VL_SALDO_INICIAL;VL_SALDO_FINAL\n';
    expect(aggregateQuarter(`${header}366561;311111011;Receita;100,00;350,00`, 1)["366561"]?.r).toEqual([[311111011, 1, 350]]);
    expect(() => aggregateQuarter(`${header}366561;311111011;Receita;0,00;inválido`, 1)).toThrow("Saldo inválido no arquivo da ANS.");
  });
  it("separa operadores e trimestres ao reunir os arquivos oficiais", () => {
    expect(mergeQuarters([{ "366561": { n: {}, r: [[311111011, 1, 100]] }, "335100": { n: {}, r: [[311111011, 1, 999]] } }, { "366561": { n: {}, r: [[311111011, 2, 250]] } }], "366561").r).toEqual([[311111011, 1, 100], [311111011, 2, 250]]);
  });
});