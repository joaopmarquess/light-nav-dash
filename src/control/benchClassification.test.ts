import { describe, expect, it } from "vitest";
import { classificarBenchAns, dadosVisaoAns, hierarquiaContabilAns, ordenarOperadorasAns, valorDreAns, type BenchRow } from "./benchClassification";
const row = (code: number, value: number) => ({ cd_conta_contabil: code, vl_movimento: value } as BenchRow);
describe("DRE ANS", () => {
  it.each(["Bensaúde", "Unimed Rio Preto", "Austaclínicas", "H.B. Saúde"])("%s inicia Contábil e pode usar G1–G4 no Gerencial", operadora => {
    const rows = [{ ...row(311111011, 123), operadora }];
    const plano = [{ _9d: 311111011, g1: "1|EBITDA", g2: "1|OPERACIONAL", g3: "1|PRINCIPAL", g4: "1|FATURAMENTO", n2: "31|Receitas", n3: "311|Contraprestações", n4: "3111|Planos", n5: "31111|Preestabelecido" }];
    expect(dadosVisaoAns(rows, plano)[0]).toMatchObject({ g1: "31|31 · Receitas", g2: "311|311 · Contraprestações", g3: "3111|3111 · Planos", g4: "31111|31111 · Preestabelecido" });
    expect(dadosVisaoAns(rows, plano, "Gerencial")[0]).toMatchObject({ g1: "1|EBITDA", g2: "1|OPERACIONAL", g3: "1|PRINCIPAL", g4: "1|FATURAMENTO" });
    expect(valorDreAns(dadosVisaoAns(rows, plano)[0])).toBe(123);
    expect(valorDreAns(dadosVisaoAns(rows, plano, "Gerencial")[0])).toBe(123);
  });
  it.each([["g1", 2, "31 · Receitas"], ["g2", 3, "311 · Contraprestações"], ["g3", 4, "3111 · Planos"], ["g4", 5, "31111 · Preestabelecido"]] as const)("Unimed usa %s por conta %iD", (field, depth, label) => {
    const result = hierarquiaContabilAns([row(311111099, 123)], [{ _9d: 311111011, g1: "EBITDA", g2: "OPERACIONAL", g3: "PRINCIPAL", g4: "FATURAMENTO", n2: "31|Receitas", n3: "311|Contraprestações", n4: "3111|Planos", n5: "31111|Preestabelecido" }]);
    expect(result[0][field]).toBe(`${String(311111099).slice(0, depth)}|${label}`);
    expect(valorDreAns(result[0])).toBe(123);
  });
  it("não atribui descrição analítica 9D ao nome de uma conta sintética", () => {
    const result = hierarquiaContabilAns([{ ...row(411111011, 250), ds_descricao: "Descrição analítica" }], []);
    expect(result[0].g1).toBe("41|41 · Nome não disponível");
    expect(valorDreAns(result[0])).toBe(-250);
  });
  it.each([
    [9, 311111099], [7, 311111011], [6, 311111811],
    [5, 311118011], [4, 311181011], [2, 319991011],
  ])("classifica Unimed por %iD na sequência solicitada", (digits, planCode) => {
    const groups = { g1: "1|EBITDA", g2: "1|OPERACIONAL", g3: "1|PRINCIPAL", g4: "1|FATURAMENTO" };
    expect(String(planCode).slice(0, digits)).toBe(String(311111099).slice(0, digits));
    const classified = classificarBenchAns([{ ...row(311111099, 123), operadora: "Unimed Rio Preto" }], [{ _9d: planCode, ...groups }]);
    expect(classified[0]).toMatchObject({ ...groups, classificada: true });
    expect(valorDreAns(classified[0])).toBe(123);
  });
  it("prioriza 7D sobre correspondências divergentes de 6D e menores", () => {
    const groups = { g1: "1|EBITDA", g2: "1|OPERACIONAL", g3: "1|PRINCIPAL" };
    const classified = classificarBenchAns([{ ...row(311111099, 100), operadora: "Unimed Rio Preto" }], [
      { _9d: 311111011, ...groups, g4: "1|FATURAMENTO" },
      { _9d: 311111811, ...groups, g4: "2|COPARTICIPAÇÃO" },
    ]);
    expect(classified[0]).toMatchObject({ g4: "1|FATURAMENTO", classificada: true });
  });
  it("gera G1–G4 da Unimed com correspondência 5D única", () => {
    const groups = { g1: "1|EBITDA", g2: "1|OPERACIONAL", g3: "1|PRINCIPAL", g4: "1|FATURAMENTO" };
    const classified = classificarBenchAns([{ ...row(311111099, 100), operadora: "Unimed Rio Preto" }], [{ _9d: 311111011, ...groups }, { _9d: 311111021, ...groups }]);
    expect(classified[0]).toMatchObject({ ...groups, classificada: true });
    expect(valorDreAns(classified[0])).toBe(100);
  });
  it("não escolhe um grupo quando contas 5D da Unimed têm classificações conflitantes", () => {
    const groups = { g1: "1|EBITDA", g2: "1|OPERACIONAL", g3: "1|PRINCIPAL" };
    const classified = classificarBenchAns([{ ...row(411111099, 250), operadora: "Unimed Rio Preto" }], [{ _9d: 411111011, ...groups, g4: "3|DESP. ASSISTENCIAL" }, { _9d: 411111013, ...groups, g4: "2|COPARTICIPAÇÃO" }]);
    expect(classified[0]).toMatchObject({ g1: "99|NÃO CLASSIFICADAS", classificada: false });
    expect(valorDreAns(classified[0])).toBe(-250);
  });
  it("preserva correspondência exata 9D antes do fallback 5D da Unimed", () => {
    const groups = { g1: "1|EBITDA", g2: "1|OPERACIONAL", g3: "1|PRINCIPAL" };
    const classified = classificarBenchAns([{ ...row(411111011, 100), operadora: "Unimed Rio Preto" }], [{ _9d: 411111011, ...groups, g4: "3|DESP. ASSISTENCIAL" }, { _9d: 411111013, ...groups, g4: "2|COPARTICIPAÇÃO" }]);
    expect(classified[0]).toMatchObject({ g4: "3|DESP. ASSISTENCIAL", classificada: true });
  });
  it("não aplica fallback 5D às demais operadoras", () => {
    const classified = classificarBenchAns([{ ...row(311111099, 100), operadora: "Bensaúde" }], [{ _9d: 311111011, g1: "1|EBITDA", g2: "1|OPERACIONAL", g3: "1|PRINCIPAL", g4: "1|FATURAMENTO" }]);
    expect(classified[0].classificada).toBe(false);
  });
  it("ordena OPS em Bensaúde, Unimed, Austaclínicas e H.B. Saúde", () => {
    expect(ordenarOperadorasAns(["H.B. Saúde", "Austaclínicas", "Bensaúde", "Unimed Rio Preto", "Bensaúde"]))
      .toEqual(["Bensaúde", "Unimed Rio Preto", "Austaclínicas", "H.B. Saúde"]);
  });
  it("usa os quatro campos do mesmo plano 9D de Demonstrações", () => {
    const classified = classificarBenchAns([row(311111011, 100)], [{ _9d: "311111011", g1: "1|OPERACIONAL", g2: "1|OPERACIONAL", g3: "1|PRINCIPAL", g4: "1|FATURAMENTO" }]);
    expect(classified[0]).toMatchObject({ g1: "1|OPERACIONAL", g2: "1|OPERACIONAL", g3: "1|PRINCIPAL", g4: "1|FATURAMENTO", classificada: true });
    expect(valorDreAns(classified[0])).toBe(100);
  });
  it("não inventa classificação nem perde valores de contas sem correspondência", () => {
    const classified = classificarBenchAns([row(411111011, 250)], []);
    expect(classified[0]).toMatchObject({ g1: "99|NÃO CLASSIFICADAS", g3: "", g4: "", classificada: false });
    expect(valorDreAns(classified[0])).toBe(-250);
  });
  it("preserva receitas e contraprestações negativas", () => { expect(valorDreAns(row(311111011, 4477776.22))).toBe(4477776.22); expect(valorDreAns(row(321119011, -747425.09))).toBe(-747425.09); });
  it("deduz despesas e preserva recuperações", () => { expect(valorDreAns(row(411111011, 100))).toBe(-100); expect(valorDreAns(row(411111012, -20))).toBe(20); });
  it("deduz impostos 61 sem duplicar apuração 69 ou balanço", () => { expect(valorDreAns(row(611119011, 100))).toBe(-100); expect(valorDreAns(row(691119011, 100))).toBeNull(); expect(valorDreAns(row(121119011, 1500))).toBeNull(); });
});