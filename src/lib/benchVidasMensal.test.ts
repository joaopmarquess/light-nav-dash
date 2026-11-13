import { describe, expect, it } from "vitest";
import { agregarMensal, base100, CAMPOS_MENSAL, compararMensal, DETALHAR_PADRAO, formatarSublinha, SUBLINHAS_MENSAL, opcoesCampo, ajustarFiltros, camposCompativeis, cuboPara, periodoPadrao, resumoMensal, totalPeriodo, type CatalogoMensal } from "./benchVidasMensal";

const catalogo = {
  valores: { uf: ["MG", "SP"], sexo: ["F", "M"], faixa: [], faixaReaj: [], vigencia: [], contratacao: ["Coletivo Empresarial", "Individual ou Familiar"], segmentacao: [], abrangencia: [], cobertura: ["Médico-hospitalar"], vinculo: ["Titular"], plano: [] },
  municipios: [["317010", "Uberaba", "MG"], ["354980", "São José do Rio Preto", "SP"]],
} as unknown as CatalogoMensal;
// Cubo A: [comp, uf, sexo, faixa, faixaReaj, vigencia, contratacao, segmentacao, abrangencia, cobertura, vinculo, ativos, aderidos, cancelados]
const A = [
  [202607, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100, 10, 5],
  [202607, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 50, 2, 1],
  [202608, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 105, 8, 3],
  [202608, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 51, 3, 2],
];
// Cubo M: [comp, municipio, contratacao, cobertura, vinculo, ativos, aderidos, cancelados]
const M = [[202608, 0, 0, 0, 0, 70, 4, 1], [202608, 1, 0, 0, 0, 35, 4, 2]];

describe("Bench Vidas Mensal", () => {
  it("o total de ativos no período é o último mês, nunca a soma dos meses", () => {
    const r = agregarMensal(A, "A", catalogo, { de: 202607, ate: 202608, detalhar: "uf", filtros: {} });
    expect(totalPeriodo(r.total, r.competencias, "ativos")).toBe(156);
  });
  it("adesões e cancelamentos do período somam os meses", () => {
    const r = agregarMensal(A, "A", catalogo, { de: 202607, ate: 202608, detalhar: "uf", filtros: {} });
    expect(totalPeriodo(r.total, r.competencias, "aderidos")).toBe(23);
    expect(totalPeriodo(r.total, r.competencias, "cancelados")).toBe(11);
    expect(totalPeriodo(r.total, r.competencias, "saldo")).toBe(12);
  });
  it("resumo usa ativos do primeiro e do último mês do período", () => {
    const r = agregarMensal(A, "A", catalogo, { de: 202607, ate: 202608, detalhar: "uf", filtros: {} });
    expect(resumoMensal(r.total, r.competencias)).toMatchObject({ ativosInicio: 150, ativosFim: 156, variacao: 6, aderidos: 23, cancelados: 11 });
  });
  it("filtro por campo considera só as linhas daquele valor", () => {
    const r = agregarMensal(A, "A", catalogo, { de: 202607, ate: 202608, detalhar: "uf", filtros: { contratacao: 1 } });
    expect(r.linhas.map(l => l.rotulo)).toEqual(["SP"]);
    expect(totalPeriodo(r.total, r.competencias, "ativos")).toBe(51);
  });
  it("no cubo de município, a UF vem do município", () => {
    const r = agregarMensal(M, "M", catalogo, { de: 202608, ate: 202608, detalhar: "municipio", filtros: { uf: 0 } });
    expect(r.linhas.map(l => l.rotulo)).toEqual(["Uberaba · MG"]);
  });
  it("município e plano usam cubos próprios", () => {
    expect(cuboPara("municipio", {})).toBe("M");
    expect(cuboPara("sexo", {})).toBe("A");
    expect(cuboPara("contratacao", { plano: 3 })).toBe("P");
  });
  it("ao detalhar por município, filtros que a ANS não cruza com município saem", () => {
    expect(ajustarFiltros("municipio", { sexo: 1, contratacao: 0 })).toEqual({ contratacao: 0 });
    expect(ajustarFiltros("sexo", { municipio: 0 })).toEqual({});
  });
  it("município só é oferecido como filtro quando o detalhamento existe no cubo de município", () => {
    expect(camposCompativeis("contratacao", {})).toContain("municipio");
    expect(camposCompativeis("sexo", {})).not.toContain("municipio");
  });
  it("período padrão: 12 meses até a última competência", () => {
    const comps = Array.from({ length: 65 }, (_, i) => { const m = 202105 + 0; const total = Math.floor(m / 100) * 12 + (m % 100) - 1 + i; return Math.floor(total / 12) * 100 + (total % 12) + 1; });
    expect(periodoPadrao(comps)).toEqual({ de: 202510, ate: 202609 });
  });
  it("Tipo Produto: Plano Odonto reúne toda segmentação com \"odonto\" no nome; Plano de Saúde, as demais", () => {
    const cat = { ...catalogo, valores: { ...catalogo.valores, segmentacao: ["Ambulatorial", "Ambulatorial + Hospitalar com obstetrícia + Odontológico", "Odontológico", "Referência"] } } as CatalogoMensal;
    const linhas = [0, 1, 2, 3].map((seg, i) => [202608, 0, 0, 0, 0, 0, 0, seg, 0, 0, 0, [10, 20, 30, 40][i], 0, 0]);
    const ativos = (tipoProduto: number) => agregarMensal(linhas, "A", cat, { de: 202608, ate: 202608, detalhar: "uf", filtros: { tipoProduto } }).total.get(202608)?.ativos;
    expect(ativos(0)).toBe(50);
    expect(ativos(1)).toBe(50);
    expect(opcoesCampo(cat, "tipoProduto").map(o => o.rotulo)).toEqual(["Plano de Saúde", "Plano Odonto"]);
  });
});

describe("Bench Vidas Mensal · Comparar", () => {
  const B = [[202607, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 40, 4, 0], [202608, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 50, 12, 2]];
  it("compara as operadoras no mesmo período, sem misturar os números de cada uma", () => {
    const r = compararMensal([{ reg: "1", linhas: A }, { reg: "2", linhas: B }], "A", catalogo, { de: 202607, ate: 202608, filtros: {} });
    expect(r.competencias).toEqual([202607, 202608]);
    expect(r.ops[0].resumo).toMatchObject({ ativosInicio: 150, ativosFim: 156, aderidos: 23, cancelados: 11 });
    expect(r.ops[1].resumo).toMatchObject({ ativosInicio: 40, ativosFim: 50, aderidos: 16, cancelados: 2, percentual: 25 });
  });
  it("aplica os mesmos filtros a todas as operadoras", () => {
    const r = compararMensal([{ reg: "1", linhas: A }, { reg: "2", linhas: B }], "A", catalogo, { de: 202607, ate: 202608, filtros: { uf: 1 } });
    expect(r.ops[0].resumo?.ativosFim).toBe(51);
    expect(r.ops[1].resumo).toBeNull();
  });
  it("base 100 parte dos ativos do primeiro mês de cada operadora", () => {
    const r = compararMensal([{ reg: "2", linhas: B }], "A", catalogo, { de: 202607, ate: 202608, filtros: {} });
    expect([...base100(r.ops[0].total, r.competencias).values()]).toEqual([100, 125]);
  });
});

describe("Bench Vidas Mensal · Contratação e segundo nível do grid", () => {
  it("Contratação vem antes de Município e é o detalhamento padrão", () => {
    const ids = CAMPOS_MENSAL.map(c => c.id);
    expect(ids.indexOf("contratacao")).toBeLessThan(ids.indexOf("municipio"));
    expect(ids[0]).toBe("contratacao");
    expect(DETALHAR_PADRAO).toBe("contratacao");
  });
  it("o segundo nível mostra Adesões, Cancelamentos e Ativos, nesta ordem", () => {
    expect(SUBLINHAS_MENSAL.map(s => s.rotulo)).toEqual(["Adesões", "Cancelamentos", "Ativos"]);
  });
  it("adesões levam +, cancelamentos levam - e ativos ficam sem sinal", () => {
    expect(formatarSublinha(2000, "aderidos")).toBe("+2.000");
    expect(formatarSublinha(1000, "cancelados")).toBe("-1.000");
    expect(formatarSublinha(41774, "ativos")).toBe("41.774");
    expect(formatarSublinha(0, "cancelados")).toBe("0");
  });
  it("sublinhas por contratação: movimentos somam o período e ativos são o último mês", () => {
    const r = agregarMensal(A, "A", catalogo, { de: 202607, ate: 202608, detalhar: "contratacao", filtros: {} });
    const individual = r.linhas.find(l => l.rotulo === "Individual ou Familiar")!;
    expect(SUBLINHAS_MENSAL.map(s => totalPeriodo(individual.meses, r.competencias, s.id))).toEqual([5, 3, 51]);
  });
});
