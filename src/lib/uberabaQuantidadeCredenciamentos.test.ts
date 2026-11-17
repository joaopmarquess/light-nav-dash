import { describe, expect, it } from "vitest";
import { lerAutorizado, linhasQuantidadeCredenciamentos } from "./uberabaQuantidadeCredenciamentos";

describe("Quantidade de Credenciamentos", () => {
  it("tem os três tipos de credenciado com a quantidade disponível", () => {
    const { linhas, total } = linhasQuantidadeCredenciamentos();
    expect(linhas.map((l) => [l.tipo, l.disponivel])).toEqual([
      ["Especialidades médicas", 229],
      ["Serviços auxiliares de diagnóstico e terapia", 69],
      ["Serviços auxiliares e profissionais não médicos", 55],
    ]);
    expect(total.disponivel).toBe(353);
  });
  it("Autorizado começa pelo Limite (112, 15, 12)", () => {
    const { linhas, total } = linhasQuantidadeCredenciamentos();
    expect(linhas.map((l) => l.autorizado)).toEqual([112, 15, 12]);
    expect(total.autorizado).toBe(139);
  });
  it("Autorizado digitado substitui o Limite só no tipo editado", () => {
    const { linhas, total } = linhasQuantidadeCredenciamentos({ medicos: 150 });
    expect(linhas.map((l) => l.autorizado)).toEqual([150, 15, 12]);
    expect(total.autorizado).toBe(177);
  });
  it("campo vazio restaura o Limite e texto inválido é recusado", () => {
    expect(lerAutorizado("")).toBeUndefined();
    expect(lerAutorizado("40")).toBe(40);
    expect(lerAutorizado("-3")).toBeNull();
    expect(lerAutorizado("2,5")).toBeNull();
  });
});
