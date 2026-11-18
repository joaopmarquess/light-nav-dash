import { describe, expect, it } from "vitest";
import { ITENS_CREDENCIAMENTO, alterarItem, chaveItem, itensExibidos, somaItens, lerAutorizado, lerValor, replicarValorEspecialidades, notasAgrupamento, linhasQuantidadeCredenciamentos } from "./uberabaQuantidadeCredenciamentos";

describe("Quantidade de Credenciamentos", () => {
  it("tem os tipos de credenciado com a quantidade disponível, Hospitais logo após Especialidades médicas", () => {
    const { linhas, total } = linhasQuantidadeCredenciamentos();
    expect(linhas.map((l) => [l.tipo, l.disponivel])).toEqual([
      ["Especialidades médicas", 229],
      ["Hospitais", null],
      ["Serviços auxiliares de diagnóstico e terapia", 69],
      ["Serviços auxiliares e profissionais não médicos", 55],
    ]);
    expect(total.disponivel).toBe(353);
  });
  it("Autorizado começa pelo Limite (112, Hospitais 2, 15, 12)", () => {
    const { linhas, total } = linhasQuantidadeCredenciamentos();
    expect(linhas.map((l) => l.autorizado)).toEqual([112, 2, 15, 12]);
    expect(total.autorizado).toBe(141);
  });
  it("Autorizado digitado substitui o Limite só no tipo editado", () => {
    const { linhas, total } = linhasQuantidadeCredenciamentos({ medicos: 150 });
    expect(linhas.map((l) => l.autorizado)).toEqual([150, 2, 15, 12]);
    expect(total.autorizado).toBe(179);
  });
  it("Valor começa em R$ 200,00 por tipo e Adesão = Qtde. × Valor (total R$ 28.200,00)", () => {
    const { linhas, total } = linhasQuantidadeCredenciamentos();
    expect(linhas.map((l) => l.valor)).toEqual([200, 200, 200, 200]);
    expect(linhas.map((l) => l.adesao)).toEqual([22400, 400, 3000, 2400]);
    expect(total.adesao).toBe(28200);
  });
  it("Valor digitado muda só a Adesão do tipo editado", () => {
    const { linhas, total } = linhasQuantidadeCredenciamentos({ medicos: 100 }, { hospitais: 1500.5 });
    expect(linhas.map((l) => l.adesao)).toEqual([20000, 3001, 3000, 2400]);
    expect(total.adesao).toBe(28401);
  });
  it("Replicar copia o Valor de Especialidades médicas para todos os tipos", () => {
    const valores = replicarValorEspecialidades({ medicos: 350, hospitais: 1500 });
    expect(valores).toEqual({ medicos: 350, hospitais: 350, diagnostico: 350, "nao-medicos": 350 });
    expect(linhasQuantidadeCredenciamentos({}, valores).total.adesao).toBe(141 * 350);
    expect(replicarValorEspecialidades({ hospitais: 900 }).hospitais).toBe(200);
  });
  it("Valor aceita reais com vírgula; vazio restaura e inválido é recusado", () => {
    expect(lerValor("")).toBeUndefined();
    expect(lerValor("250,50")).toBe(250.5);
    expect(lerValor("1.250,00")).toBe(1250);
    expect(lerValor("-1")).toBeNull();
    expect(lerValor("abc")).toBeNull();
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
  it("Hospitais: Hospital Geral (1) e Hospital Pediátrico (1)", () => {
    expect(itensExibidos("hospitais").map((i) => i.nome)).toEqual(["Hospital Geral", "Hospital Pediátrico"]);
    expect(somaItens("hospitais", {})).toEqual({ soma: 2, itens: 2, alterados: 0 });
  });
  it("quantidade padrão dos itens: 2 por especialidade médica e 1 nos demais (92, 4 e 4)", () => {
    expect(somaItens("medicos", {})).toEqual({ soma: 92, itens: 46, alterados: 0 });
    expect(somaItens("diagnostico", {})).toEqual({ soma: 4, itens: 4, alterados: 0 });
    expect(somaItens("nao-medicos", {})).toEqual({ soma: 4, itens: 4, alterados: 0 });
  });
  it("quantidade digitada substitui o padrão do item sem mudar o Autorizado do tipo", () => {
    let v = alterarItem({}, chaveItem("medicos", "Cardiologia*"), "3")!;
    v = alterarItem(v, chaveItem("medicos", "Clínico Geral**"), "10")!;
    v = alterarItem(v, chaveItem("diagnostico", "Serviços de Imagem"), "0")!;
    expect(somaItens("medicos", v)).toEqual({ soma: 92 - 4 + 13, itens: 46, alterados: 2 });
    expect(somaItens("diagnostico", v)).toEqual({ soma: 3, itens: 4, alterados: 1 });
    expect(alterarItem(v, chaveItem("medicos", "Cardiologia*"), "2,5")).toBeNull();
    expect(somaItens("medicos", alterarItem(v, chaveItem("medicos", "Cardiologia*"), "")!).soma).toBe(92 - 2 + 10);
    expect(linhasQuantidadeCredenciamentos().total.autorizado).toBe(141);
  });
});
