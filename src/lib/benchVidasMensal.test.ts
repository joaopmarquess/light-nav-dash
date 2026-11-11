import { describe, expect, it } from "vitest";
import { FILTROS_PADRAO_MENSAL, SEGMENTACAO_PLANO_SAUDE, agregarMensal, opcoesCampo, ajustarFiltros, camposCompativeis, cuboPara, periodoPadrao, resumoMensal, totalPeriodo, type CatalogoMensal } from "./benchVidasMensal";

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
  it("Segmentação: Plano de saúde reúne tudo menos Odontológico, e as duas opções vêm primeiro", () => {
    const cat = { ...catalogo, valores: { ...catalogo.valores, segmentacao: ["Ambulatorial", "Odontológico", "Referência"] } } as CatalogoMensal;
    const linhas = [
      [202608, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 1, 0],
      [202608, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 20, 2, 0],
      [202608, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 30, 3, 0],
    ];
    const saude = agregarMensal(linhas, "A", cat, { de: 202608, ate: 202608, detalhar: "uf", filtros: { segmentacao: SEGMENTACAO_PLANO_SAUDE } });
    expect(saude.total.get(202608)?.ativos).toBe(40);
    const odonto = agregarMensal(linhas, "A", cat, { de: 202608, ate: 202608, detalhar: "uf", filtros: { segmentacao: 1 } });
    expect(odonto.total.get(202608)?.ativos).toBe(20);
    expect(opcoesCampo(cat, "segmentacao").slice(0, 2).map(o => o.rotulo)).toEqual(["Plano de saúde", "Odontológico"]);
  });
  it("ao abrir, Segmentação vem em Plano de saúde (tudo menos Odontológico)", () => {
    expect(FILTROS_PADRAO_MENSAL).toEqual({ segmentacao: SEGMENTACAO_PLANO_SAUDE });
  });
});
