import { describe, expect, it } from "vitest";
import { ITENS_CREDENCIAMENTO, alterarItem, chaveItem, itensExibidos, somaItens, lerAutorizado, lerValor, ajusteTecnico, replicarValorEspecialidades, notasAgrupamento, linhasQuantidadeCredenciamentos } from "./uberabaQuantidadeCredenciamentos";

describe("Quantidade de Credenciamentos", () => {
  it("tem os tipos de credenciado com a quantidade disponível, Hospitais logo após Especialidades", () => {
    const { linhas, total } = linhasQuantidadeCredenciamentos();
    expect(linhas.map((l) => [l.tipo, l.disponivel])).toEqual([
      ["Especialidades", 229],
      ["Hospitais", null],
      ["Serviços auxiliares de diagnóstico e terapia", 69],
    ]);
    expect(total.disponivel).toBe(298);
  });
  it("Qtde. padrão: Especialidades 200, Hospitais 6 e Diagnóstico e terapia 4", () => {
    const { linhas, total } = linhasQuantidadeCredenciamentos();
    expect(linhas.map((l) => l.autorizado)).toEqual([200, 6, 4]);
    expect(total.autorizado).toBe(210);
  });
  it("Ajuste técnico = 200 − 2 por especialidade (50 × 2 = 100) = 100 e acompanha os itens digitados", () => {
    expect(ajusteTecnico("medicos", 200, {})).toBe(100);
    expect(ajusteTecnico("medicos", 200, { [chaveItem("medicos", "Cardiologia*")]: 10 })).toBe(92);
    expect(ajusteTecnico("diagnostico", 15, {})).toBeNull();
  });
  it("Autorizado digitado substitui o Limite só no tipo editado", () => {
    const { linhas, total } = linhasQuantidadeCredenciamentos({ medicos: 150 });
    expect(linhas.map((l) => l.autorizado)).toEqual([150, 6, 4]);
    expect(total.autorizado).toBe(160);
  });
  it("Valor começa em R$ 300,00 por tipo e Adesão = Qtde. × Valor (total R$ 63.000,00)", () => {
    const { linhas, total } = linhasQuantidadeCredenciamentos();
    expect(linhas.map((l) => l.valor)).toEqual([300, 300, 300]);
    expect(linhas.map((l) => l.adesao)).toEqual([60000, 1800, 1200]);
    expect(total.adesao).toBe(63000);
  });
  it("Valor digitado muda só a Adesão do tipo editado", () => {
    const { linhas, total } = linhasQuantidadeCredenciamentos({ medicos: 100 }, { hospitais: 1500.5 });
    expect(linhas.map((l) => l.adesao)).toEqual([30000, 9003, 1200]);
    expect(total.adesao).toBe(40203);
  });
  it("Replicar copia o Valor de Especialidades para todos os tipos", () => {
    const valores = replicarValorEspecialidades({ medicos: 350, hospitais: 1500 });
    expect(valores).toEqual({ medicos: 350, hospitais: 350, diagnostico: 350 });
    expect(linhasQuantidadeCredenciamentos({}, valores).total.adesao).toBe(210 * 350);
    expect(replicarValorEspecialidades({ hospitais: 900 }).hospitais).toBe(300);
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
  it("abre 59 especialidades do Guia Médico, sem repetição", () => {
    const nomes = ITENS_CREDENCIAMENTO.medicos.map((i) => i.nome);
    expect(nomes).toHaveLength(59);
    expect(new Set(nomes).size).toBe(59);
    expect(nomes).toContain("Cardiologia");
    expect(nomes.slice(-4)).toEqual(["Psicologia", "Fonoaudiologia", "Fisioterapia", "Acupuntura"]);
  });
  it("o grupo removido não altera os totais mesmo com valores antigos salvos", () => {
    expect(linhasQuantidadeCredenciamentos({ "nao-medicos": 999 }, { "nao-medicos": 900 }).total.autorizado).toBe(210);
    expect(linhasQuantidadeCredenciamentos({ "nao-medicos": 999 }, { "nao-medicos": 900 }).total.adesao).toBe(63000);
  });
  it("diagnóstico e terapia trazem os quatro itens informados", () => {
    expect(ITENS_CREDENCIAMENTO.diagnostico.map((i) => i.nome)).toEqual(["Laboratório de Análises Clínicas", "Laboratório de Análises Patológicas", "Serviços de Imagem", "Serviços de Endoscopia/Colonoscopia"]);
    expect(ITENS_CREDENCIAMENTO["nao-medicos"].map((i) => i.nome)).toEqual(["Psicologia", "Fonoaudiologia", "Fisioterapia", "Acupuntura"]);
  });
  it("tela agrupa as pediátricas no nome genérico com asterisco: 59 → 50 especialidades (com Clínica Médica em Clínico Geral)", () => {
    const nomes = itensExibidos("medicos").map((i) => i.nome);
    expect(nomes).toHaveLength(50);
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
  it("Hospitais: seis itens com quantidade padrão 6", () => {
    expect(itensExibidos("hospitais").map((i) => i.nome)).toEqual(["Geral", "Pediátrico", "Oftalmológico", "Cardiológico", "Oncológico (Carece de Validação)", "Geral em município limítrofe"]);
    expect(somaItens("hospitais", {})).toEqual({ soma: 6, itens: 6, alterados: 0 });
  });
  it("inclui um hospital geral em município limítrofe", () => {
    const itens = itensExibidos("hospitais");
    const item = itens.find((i) => i.nome === "Geral em município limítrofe");
    expect(item).toBeDefined();
    expect(somaItens("hospitais", { [chaveItem("hospitais", "Geral em município limítrofe")]: 0 }).soma).toBe(5);
  });
  it("quantidade padrão dos itens: 2 por especialidade médica e 1 nos demais (100, 4 e 4)", () => {
    expect(somaItens("medicos", {})).toEqual({ soma: 100, itens: 50, alterados: 0 });
    expect(somaItens("diagnostico", {})).toEqual({ soma: 4, itens: 4, alterados: 0 });
    expect(somaItens("nao-medicos", {})).toEqual({ soma: 4, itens: 4, alterados: 0 });
  });
  it("quantidade digitada substitui o padrão do item sem mudar o Autorizado do tipo", () => {
    let v = alterarItem({}, chaveItem("medicos", "Cardiologia*"), "3")!;
    v = alterarItem(v, chaveItem("medicos", "Clínico Geral**"), "10")!;
    v = alterarItem(v, chaveItem("diagnostico", "Serviços de Imagem"), "0")!;
    expect(somaItens("medicos", v)).toEqual({ soma: 100 - 4 + 13, itens: 50, alterados: 2 });
    expect(somaItens("diagnostico", v)).toEqual({ soma: 3, itens: 4, alterados: 1 });
    expect(alterarItem(v, chaveItem("medicos", "Cardiologia*"), "2,5")).toBeNull();
    expect(somaItens("medicos", alterarItem(v, chaveItem("medicos", "Cardiologia*"), "")!).soma).toBe(100 - 2 + 10);
    expect(linhasQuantidadeCredenciamentos().total.autorizado).toBe(210);
  });
});

describe("Restaurar padrão do Credenciamento", () => {
  it("apaga Qtde., Valor e itens digitados: Adesão volta a R$ 63.000,00 e cada item ao padrão", async () => {
    const m = await import("./uberabaQuantidadeCredenciamentos");
    m.salvarAutorizados({ medicos: 10 });
    m.salvarValores({ medicos: 500 });
    m.salvarQuantidadesItens({ [m.chaveItem("hospitais", "X")]: 9 });
    m.restaurarCredenciamento();
    expect(m.linhasQuantidadeCredenciamentos(m.carregarAutorizados(), m.carregarValores()).total.adesao).toBe(63000);
    expect(m.carregarQuantidadesItens()).toEqual({});
  });
});
