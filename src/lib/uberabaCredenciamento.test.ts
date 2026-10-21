import { describe, expect, it } from "vitest";
import { GRUPOS_CREDENCIAMENTO, RESUMO_CREDENCIAMENTO, projetarCredenciamento, cenarioCredenciamento, MODO_CREDENCIAMENTO_PADRAO, type ReferenciaCredenciamento } from "./uberabaCredenciamento";
const referencia: ReferenciaCredenciamento = { grupo: "medicos", especialidade_categoria: "", quantidade_evo: 3, quantidade_unimed: 7, status_validacao: "", observacao: "" };
describe("Credenciamento Uberaba", () => {
  it("inicia em Disponível com os valores originais", () => {
    expect(MODO_CREDENCIAMENTO_PADRAO).toBe("Disponível");
    expect(cenarioCredenciamento().resumo).toEqual({ categorias: 77, quantidade: 353, total: 84400 });
  });
  it("Limite usa duas referências por especialidade médica", () => {
    expect(cenarioCredenciamento("Limite").grupos[0]).toMatchObject({ categorias: 56, quantidade: 112, valor: 200, total: 22400 });
  });
  it("Limite usa uma referência por categoria de serviço", () => {
    expect(cenarioCredenciamento("Limite").grupos[1]).toMatchObject({ categorias: 15, quantidade: 15, valor: 400, total: 6000 });
  });
  it("Limite usa duas referências por categoria profissional", () => {
    expect(cenarioCredenciamento("Limite").grupos[2]).toMatchObject({ categorias: 6, quantidade: 12, valor: 200, total: 2400 });
  });
  it("consolida o Limite sem alterar as categorias", () => {
    expect(cenarioCredenciamento("Limite").resumo).toEqual({ categorias: 77, quantidade: 139, total: 30800 });
  });
  it("Rio Preto usa 577 referências médicas em 56 especialidades", () => {
    expect(cenarioCredenciamento("Rio Preto").grupos[0]).toMatchObject({ categorias: 56, quantidade: 577, valor: null, total: null });
  });
  it("Rio Preto usa 20 referências em 15 categorias de diagnóstico", () => {
    expect(cenarioCredenciamento("Rio Preto").grupos[1]).toMatchObject({ categorias: 15, quantidade: 20, valor: null, total: null });
  });
  it("Rio Preto usa 30 referências em 6 categorias profissionais", () => {
    expect(cenarioCredenciamento("Rio Preto").grupos[2]).toMatchObject({ categorias: 6, quantidade: 30, valor: null, total: null });
  });
  it("Rio Preto consolida 77 categorias e 627 referências", () => {
    expect(cenarioCredenciamento("Rio Preto").resumo).toEqual({ categorias: 77, quantidade: 627, total: null });
  });
  it("prioriza EVO sem somar Unimed", () => {
    expect(projetarCredenciamento(referencia)).toMatchObject({ quantidade_considerada: 3, origem_quantidade: "EVO", valor_unitario: 200, valor_projetado: 600 });
  });
  it("usa Unimed somente quando EVO não tem disponibilidade", () => {
    expect(projetarCredenciamento({ ...referencia, quantidade_evo: 0 })).toMatchObject({ quantidade_considerada: 7, origem_quantidade: "Unimed" });
    expect(projetarCredenciamento({ ...referencia, quantidade_evo: null })).toMatchObject({ quantidade_considerada: 7, origem_quantidade: "Unimed" });
  });
  it("preserva as quantidades e valores médicos informados", () => {
    expect(GRUPOS_CREDENCIAMENTO[0]).toMatchObject({ categorias: 56, quantidade: 229, valor: 200, total: 45800 });
  });
  it("preserva as quantidades e valores de diagnóstico informados", () => {
    expect(GRUPOS_CREDENCIAMENTO[1]).toMatchObject({ categorias: 15, quantidade: 69, valor: 400, total: 27600 });
    expect(projetarCredenciamento({ ...referencia, grupo: "diagnostico" }).valor_projetado).toBe(1200);
  });
  it("preserva as quantidades e valores não médicos informados", () => {
    expect(GRUPOS_CREDENCIAMENTO[2]).toMatchObject({ categorias: 6, quantidade: 55, valor: 200, total: 11000 });
  });
  it("mantém os totais consolidados do anexo", () => {
    expect(RESUMO_CREDENCIAMENTO).toEqual({ categorias: 77, quantidade: 353, total: 84400 });
  });
});