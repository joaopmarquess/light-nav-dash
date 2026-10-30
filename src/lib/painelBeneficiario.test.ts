import { describe, it, expect } from "vitest";
import { registroAtual, statusInfo, resumoEard, porCompetencia, type EardRow } from "./painelBeneficiario";

const mes = (c: number, cpp: number, outros: number): EardRow => ({ dt_competencia: c, vl_rec_cpp: cpp, vl_rec_copart: 0, vl_rec_outros: 0, vl_desp_consulta: 0, vl_desp_urgencia: 0, vl_desp_internacao: 0, vl_desp_terapia: 0, vl_desp_exame: 0, vl_desp_outros: outros });

describe("painel beneficiário", () => {
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
