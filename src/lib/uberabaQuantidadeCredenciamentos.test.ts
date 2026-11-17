import { describe, expect, it } from "vitest";
import { ITENS_CREDENCIAMENTO, alterarItem, chaveItem, itensExibidos, somaItens, lerAutorizado, notasAgrupamento, linhasQuantidadeCredenciamentos } from "./uberabaQuantidadeCredenciamentos";

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
  it("abre 55 especialidades médicas do Guia Médico, sem repetição", () => {
    const nomes = ITENS_CREDENCIAMENTO.medicos.map((i) => i.nome);
    expect(nomes).toHaveLength(55);
    expect(new Set(nomes).size).toBe(55);
    expect(nomes).toContain("Cardiologia");
    expect(nomes).not.toContain("Psicologia");
  });
  it("diagnóstico e terapia trazem os quatro itens informados", () => {
    expect(ITENS_CREDENCIAMENTO.diagnostico.map((i) => i.nome)).toEqual(["Laboratório de Análises Clínicas", "Laboratório de Análises Patológicas", "Serviços de Imagem", "Serviços de Endoscopia/Colonoscopia"]);
    expect(ITENS_CREDENCIAMENTO["nao-medicos"].map((i) => i.nome)).toEqual(["Psicologia", "Fonoaudiologia", "Fisioterapia", "Acupuntura"]);
  });
  it("tela agrupa as pediátricas no nome genérico com asterisco: 55 → 46 especialidades (com Clínica Médica em Clínico Geral)", () => {
    const nomes = itensExibidos("medicos").map((i) => i.nome);
    expect(nomes).toHaveLength(46);
    expect(nomes).toContain("Alergia e Imunologia*");
    expect(nomes).not.toContain("Alergia e Imunologia");
    expect(nomes).not.toContain("Alergia e Imunologia Pediátrica");
    expect(nomes.filter((n) => /[^*]\*$/.test(n))).toEqual(["Alergia e Imunologia*", "Cardiologia*", "Endocrinologia*", "Gastroenterologia*", "Nefrologia*", "Neurologia*", "Nutrologia*", "Pneumologia*"]);
    expect(itensExibidos("medicos").find((i) => i.nome === "Cardiologia*")?.inclui).toEqual(["Cardiologia", "Cardiologia Pediátrica"]);
  });
  it("Cirurgia Pediátrica fica separada (não há Cirurgia genérica)", () => {
    expect(itensExibidos("medicos").map((i) => i.nome)).toContain("Cirurgia Pediátrica");
  });
  it("Clínica Médica fica agrupada em Clínico Geral**", () => {
    const itens = itensExibidos("medicos");
    expect(itens.map((i) => i.nome)).not.toContain("Clínica Médica");
    expect(itens.map((i) => i.nome)).not.toContain("Clínico Geral");
    expect(itens.find((i) => i.nome === "Clínico Geral**")?.inclui).toEqual(["Clínico Geral", "Clínica Médica"]);
    expect(notasAgrupamento()).toContain("** Inclui também Clínica Médica.");
  });
  it("quantidade digitada nos itens soma por tipo sem mudar o Autorizado do tipo", () => {
    let v = alterarItem({}, chaveItem("medicos", "Cardiologia*"), "3")!;
    v = alterarItem(v, chaveItem("medicos", "Clínico Geral**"), "10")!;
    v = alterarItem(v, chaveItem("diagnostico", "Serviços de Imagem"), "2")!;
    expect(somaItens("medicos", v)).toEqual({ soma: 13, preenchidos: 2 });
    expect(somaItens("diagnostico", v)).toEqual({ soma: 2, preenchidos: 1 });
    expect(alterarItem(v, chaveItem("medicos", "Cardiologia*"), "2,5")).toBeNull();
    expect(somaItens("medicos", alterarItem(v, chaveItem("medicos", "Cardiologia*"), "")!)).toEqual({ soma: 10, preenchidos: 1 });
    expect(linhasQuantidadeCredenciamentos().total.autorizado).toBe(139);
  });
});
