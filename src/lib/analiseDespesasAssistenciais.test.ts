import { describe, it, expect } from "vitest";
import { arvoreAssistencial, competenciasAssistenciais, conciliacaoAssistencial, despesaContabilAssistencial, filtrarAssistencial, FONTE_ASSISTENCIAL, movimentoDaView, HOSPITAL_BENE, resumoAssistencial, tipoExecutor, type MovimentoAssistencial } from "./analiseDespesasAssistenciais";
const row = (extra: Partial<MovimentoAssistencial>): MovimentoAssistencial => ({ ideAssist: 1, bscmp: 202605, nrgui: 1, catipgui: "Consulta", cdcrdexe: 10, dscrdexe: HOSPITAL_BENE, cdcrdrec: 10, dscrdrec: HOSPITAL_BENE, vrevt: 100, ...extra });
describe("Análise de Despesas Assistenciais", () => {
  it("usa a view_eassistencial confirmada e preserva os valores pagos e prestadores", () => {
    expect(FONTE_ASSISTENCIAL).toBe("view_eassistencial");
    const r = movimentoDaView({ dt_competencia: 202610, nr_guia: 123, ds_tipo_atendimento: "SP/SADT - SOLICITAÇÃO", cd_prestador: 10, nm_prestador: HOSPITAL_BENE, cd_prestador_pagamento: 20, nm_prestador_pagamento: "Recebedor", vl_total_pago: "125.50" }, 1);
    expect(resumoAssistencial([r]).total).toBe(125.5);
    expect(r).toEqual(row({ bscmp: 202610, nrgui: 123, catipgui: "SP/SADT - SOLICITAÇÃO", cdcrdrec: 20, dscrdrec: "Recebedor", vrevt: "125.50" }));
  });
  it("mantém executor igual ao recebedor sem eliminar o movimento", () => {
    const rs = [row({}), row({ ideAssist: 2, vrevt: 50 })];
    expect(resumoAssistencial(rs).total).toBe(150);
    expect(arvoreAssistencial(rs, "credenciados")[0].filhos[0].filhos[0].valor).toBe(150);
  });
  it("preserva a classificação Benê existente baseada no executor", () => {
    expect(tipoExecutor(row({}))).toBe("É Benê");
    expect(tipoExecutor(row({ dscrdexe: "REDE", dscrdrec: HOSPITAL_BENE }))).toBe("Não é Benê");
    expect(tipoExecutor(row({ cdcrdexe: 924, dscrdexe: "ASSOCIACAO PORTUGUESA DE BENEFICENCIA DE SAO JOSE DO RIO PRETO" }))).toBe("É Benê");
    expect(tipoExecutor(row({ cdcrdexe: 20, dscrdexe: "OUTRO", cdcrdrec: 924 }))).toBe("Não é Benê");
  });
  it("filtra os dois grids com executor e tipo de guia sem somar subtotais duas vezes", () => {
    const rs = [row({}), row({ ideAssist: 2, catipgui: "Internação", vrevt: 300 }), row({ ideAssist: 3, cdcrdexe: 20, vrevt: 70 })];
    const selecionadas = filtrarAssistencial(rs, { executor: "codigo:10", guia: "Consulta" });
    expect(resumoAssistencial(selecionadas).total).toBe(100);
    expect(arvoreAssistencial(selecionadas, "guias")[0].percentual).toBe(1);
    expect(arvoreAssistencial(rs, "guias").reduce((s, r) => s + r.valor, 0)).toBe(470);
  });
  it("conta guias distintas por competência, não procedimentos", () => {
    expect(arvoreAssistencial([row({}), row({ ideAssist: 2 }), row({ ideAssist: 3, bscmp: 202606 })], "guias")[0].quantidade).toBe(2);
  });
  it("preserva tipos originais sem converter em categorias artificiais", () => {
    expect(arvoreAssistencial([row({ catipgui: "SP-SADT" }), row({ catipgui: "Terapia" })], "guias").map(r => r.nome).sort()).toEqual(["SP-SADT", "Terapia"]);
  });
  it("despesa líquida contábil preserva recuperações e exclui sintéticas", () => {
    const c = { tipo: "A", g3: "1|PRINCIPAL", g4: "3|DESP. ASSISTENCIAL", valor: -1000 };
    expect(despesaContabilAssistencial([c, { ...c, valor: 100 }, { ...c, tipo: "S", valor: -1000 }])).toBe(900);
    expect(despesaContabilAssistencial([])).toBeNull();
  });
  it("mostra diferença contábil sem ocultar divergência ou ausência", () => {
    expect(conciliacaoAssistencial(1000, 800)).toEqual({ diferenca: 200, percentual: 0.2 });
    expect(conciliacaoAssistencial(null, 800)).toEqual({ diferenca: null, percentual: null });
  });
  it("período inicial e final atravessam o ano sem incluir meses externos", () => {
    expect(competenciasAssistenciais("2025-12", "2026-02")).toEqual([202512, 202601, 202602]);
    expect(() => competenciasAssistenciais("2026-05", "2026-04")).toThrow();
  });
});