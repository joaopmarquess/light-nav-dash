import { describe, it, expect } from "vitest";
import { comporCodigoAlternativo, registroAtual, statusInfo, resumoEard, porCompetencia, periodoAssistencial, resultadoAssistencial, faixaFamilia, membrosFamilia, type EardRow } from "./painelBeneficiario";

const mes = (c: number, cpp: number, outros: number): EardRow => ({ dt_competencia: c, vl_rec_cpp: cpp, vl_rec_copart: 0, vl_rec_outros: 0, vl_desp_consulta: 0, vl_desp_urgencia: 0, vl_desp_internacao: 0, vl_desp_terapia: 0, vl_desp_exame: 0, vl_desp_outros: outros });

describe("painel beneficiário", () => {
  it("Plano ocupa os quatro primeiros dígitos", () => {
    expect(comporCodigoAlternativo("2490", "123456", "78").slice(0, 4)).toBe("2490");
  });
  it("Contrato ocupa seis dígitos a partir do quinto", () => {
    expect(comporCodigoAlternativo("2490", "123456", "78").slice(4, 10)).toBe("123456");
  });
  it("Dep ocupa os dois últimos dígitos", () => {
    expect(comporCodigoAlternativo("2490", "123456", "78").slice(-2)).toBe("78");
  });
  it("completa entradas curtas com zeros à esquerda em cada parte", () => {
    expect(comporCodigoAlternativo("12", "345", "6")).toBe("001200034506");
  });
  it("Dep vazio busca o titular 00", () => {
    expect(comporCodigoAlternativo("2490", "123456", "")).toBe("249012345600");
  });
  it("não pesquisa sem Plano ou Contrato", () => {
    expect(() => comporCodigoAlternativo("", "123456", "00")).toThrow();
    expect(() => comporCodigoAlternativo("2490", "", "00")).toThrow();
  });
  it("rejeita campos acima do limite ou não numéricos", () => {
    expect(() => comporCodigoAlternativo("12345", "123456", "00")).toThrow();
    expect(() => comporCodigoAlternativo("2490", "1234567", "00")).toThrow();
    expect(() => comporCodigoAlternativo("2490", "123456", "123")).toThrow();
    expect(() => comporCodigoAlternativo("ABCD", "123456", "00")).toThrow();
  });
  it("situação atual é o movimento Saúde mais recente", () => {
    const r = registroAtual([
      { cd_matricula: 1, tp_plano: "SAUDE", tp_status: "A", dt_momento: "2020-01-01" },
      { cd_matricula: 1, tp_plano: "SAUDE", tp_status: "C", dt_momento: "2023-04-03" },
      { cd_matricula: 1, tp_plano: "ODONTO", tp_status: "A", dt_momento: "2025-01-01" },
    ]);
    expect(r?.tp_status).toBe("C");
  });
  it("cores de status", () => {
    expect(statusInfo("A").tone).toBe("ok");
    expect(statusInfo("S").tone).toBe("warn");
    expect(statusInfo("C").tone).toBe("bad");
  });
  it("sinistralidade = despesa ÷ receita (confere com a view: 160/282,88 = 56,56%)", () => {
    expect(resumoEard([mes(202409, 282.88, 160)]).sinistralidade!.toFixed(2)).toBe("56.56");
  });
  it("agrupa linhas da mesma competência", () => {
    const g = porCompetencia([mes(202410, 100, 10), mes(202409, 50, 0), mes(202410, 20, 5)]);
    expect(g.map((x) => x.dt_competencia)).toEqual([202409, 202410]);
    expect(g[1].vl_rec_cpp).toBe(120);
  });
});

describe("assistencial do beneficiário (12 meses)", () => {
  const linha = (c: number, cpp: number, copart: number, outros: number, desp: number): EardRow => ({ ...mes(c, cpp, desp), vl_rec_copart: copart, vl_rec_outros: outros });
  it("em novembro/2026 o período vai de 09/2025 a 08/2026", () => {
    const p = periodoAssistencial(new Date(2026, 10, 10));
    expect(p).toHaveLength(12);
    expect(p[0]).toBe(202509);
    expect(p.at(-1)).toBe(202608);
  });
  it("em fevereiro/2027 o período vai de 12/2025 a 11/2026", () => {
    const p = periodoAssistencial(new Date(2027, 1, 1));
    expect([p[0], p.at(-1)]).toEqual([202512, 202611]);
  });
  it("receita soma mensalidade e outras receitas; total receitas inclui coparticipação", () => {
    const r = resultadoAssistencial([linha(202608, 400, 50, 10, 0)], [202608]).meses[0];
    expect(r.receita).toBe(410);
    expect(r.copart).toBe(50);
    expect(r.totalReceitas).toBe(460);
  });
  it("saldo = total receitas − despesas e sinistralidade = despesas ÷ total receitas", () => {
    const r = resultadoAssistencial([linha(202608, 400, 50, 10, 230)], [202608]).meses[0];
    expect(r.saldo).toBe(230);
    expect(r.sinistralidade).toBe(0.5);
  });
  it("sinistralidade do período é a razão das somas, não a soma dos percentuais", () => {
    const t = resultadoAssistencial([linha(202607, 100, 0, 0, 200), linha(202608, 300, 0, 0, 0)], [202607, 202608]).total;
    expect(t.sinistralidade).toBe(0.5);
  });
  it("meses fora do período não entram e meses sem registro ficam sem dado", () => {
    const r = resultadoAssistencial([linha(202508, 999, 0, 0, 999), linha(202608, 100, 0, 0, 50)], [202607, 202608]);
    expect(r.meses[0].temDado).toBe(false);
    expect(r.total.totalReceitas).toBe(100);
  });
});

describe("grupo familiar (mesmo Plano e mesmo Contrato)", () => {
  it("código 0018 007957 00 abrange os Dep 00 a 99 do mesmo plano e contrato", () => {
    expect(faixaFamilia(1800795700)).toEqual({ de: 1800795700, ate: 1800795799 });
  });
  it("um dependente encontra a mesma família do titular", () => {
    expect(faixaFamilia("001800795703")).toEqual(faixaFamilia(1800795700));
  });
  it("outro contrato no mesmo plano não entra na família", () => {
    expect(faixaFamilia(1800795800)!.de).not.toBe(faixaFamilia(1800795700)!.de);
  });
  it("sem código alternativo não há família", () => {
    expect(faixaFamilia(null)).toBeNull();
    expect(faixaFamilia("0")).toBeNull();
  });
  it("lista um membro por matrícula, com o titular primeiro", () => {
    const m = membrosFamilia([
      { cd_matricula: 2, tp_plano: "SAUDE", cd_mat_alternativa: 1800795701, nm_beneficiario: "MARIA", dt_momento: "2024-01-01" },
      { cd_matricula: 1, tp_plano: "SAUDE", cd_mat_alternativa: 1800795700, nm_beneficiario: "DIVINO", dt_momento: "2020-01-01" },
      { cd_matricula: 1, tp_plano: "SAUDE", cd_mat_alternativa: 1800795700, nm_beneficiario: "DIVINO", dt_momento: "2026-01-01" },
    ]);
    expect(m.map((x) => [x.cd_matricula, x.dep])).toEqual([[1, "00"], [2, "01"]]);
  });
});
