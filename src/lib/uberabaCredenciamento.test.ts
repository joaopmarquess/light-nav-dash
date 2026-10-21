import { describe, expect, it } from "vitest";
import { GRUPOS_CREDENCIAMENTO, RESUMO_CREDENCIAMENTO, projetarCredenciamento, type ReferenciaCredenciamento } from "./uberabaCredenciamento";
const referencia: ReferenciaCredenciamento = { grupo: "medicos", especialidade_categoria: "", quantidade_evo: 3, quantidade_unimed: 7, status_validacao: "", observacao: "" };
describe("Credenciamento Uberaba", () => {
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