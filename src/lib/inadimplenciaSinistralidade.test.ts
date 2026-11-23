import { describe, expect, it } from "vitest";
import {
  contratoDaMatAlternativa, faixaMatAlternativa, faixaSinistralidade, normalizarContratoInterno, periodoSinistralidade,
  rotuloPeriodoSinistralidade, sinistralidadeItens, somarPorContrato,
} from "./inadimplenciaSinistralidade";
import { agrupar, consolidarTitulos, medir, normalizarLinha, type LinhaCR, type Titulo } from "./inadimplencia";

describe("Inadimplência · sinistralidade do contrato", () => {
  it("últimos 12 meses terminando em 09/2026 vão de 10/2025 a 09/2026", () => {
    const p = periodoSinistralidade({ ano: 2026, mes: 9 });
    expect(p).toEqual({ de: 202510, ate: 202609 });
    expect(rotuloPeriodoSinistralidade(p)).toBe("10/2025 a 09/2026");
  });

  it("CD_CONTRATO_INTERNO são os 10 primeiros dígitos da matrícula alternativa", () => {
    expect(normalizarContratoInterno("0019004559")).toBe("0019004559");
    expect(normalizarContratoInterno(19004559)).toBe("0019004559");
    expect(contratoDaMatAlternativa("001900455900")).toBe("0019004559");
    expect(contratoDaMatAlternativa("001900455903")).toBe("0019004559");
    expect(faixaMatAlternativa("0019004559")).toEqual({ de: "001900455900", ate: "001900455999" });
  });

  it("soma titular e dependentes do contrato: despesas (seis colunas) ÷ receitas (cpp + copart + outros)", () => {
    const m = somarPorContrato(
      [{ cd_matricula: 1, cd_mat_alternativa: "001900455900" }, { cd_matricula: 2, cd_mat_alternativa: "001900455901" }],
      [
        { cd_matricula: 1, vl_rec_cpp: 600, vl_rec_copart: 50, vl_rec_outros: 0, vl_desp_consulta: 100, vl_desp_exame: 50 },
        { cd_matricula: 2, vl_rec_cpp: 350, vl_desp_internacao: 300, vl_desp_terapia: 10, vl_desp_urgencia: 20, vl_desp_outros: 20 },
        { cd_matricula: 99, vl_rec_cpp: 1000, vl_desp_consulta: 1000 },
      ],
    );
    expect(m.get("0019004559")).toEqual({ receita: 1000, despesa: 500 });
    expect(m.size).toBe(1);
  });

  it("faixas: até 50%, 50% a 75%, 75% a 100% e acima de 100%", () => {
    const f = (d: number) => faixaSinistralidade({ receita: 100, despesa: d }).rotulo;
    expect([f(50), f(50.01), f(75), f(100), f(100.01)]).toEqual(["Até 50%", "50% a 75%", "50% a 75%", "75% a 100%", "Acima de 100%"]);
    expect(faixaSinistralidade({ receita: 0, despesa: 10 }).rotulo).toBe("Sem receita no período");
    expect(faixaSinistralidade(null).rotulo).toBe("Sem dados no período");
    expect(faixaSinistralidade(null, false).rotulo).toBe("Sem contrato interno");
  });

  it("no grupo, cada contrato entra uma vez mesmo com vários títulos", () => {
    const base = (o: Partial<LinhaCR>): LinhaCR => normalizarLinha({
      cd_itcon_rec: "1", dt_competencia: "202601", dt_vencimento: "2026-01-12", dt_recebimento: null, vl_duplicata: 100, vl_recebido: 0, cd_contrato_interno: "0019004559", ...o,
    });
    const soma = new Map([["0019004559", { receita: 1000, despesa: 900 }], ["0015043597", { receita: 1000, despesa: 300 }]]);
    const ts: Titulo[] = consolidarTitulos([base({}), base({ cd_itcon_rec: "2" }), base({ cd_itcon_rec: "3", cd_contrato_interno: "0015043597" })])
      .map((t) => ({ ...t, sinistralidade: soma.get(t.cd_contrato_interno!) ?? null }));
    const itens = medir(ts, "2026-01-31");
    expect(sinistralidadeItens(itens)).toEqual({ contratos: 2, receita: 2000, despesa: 1200, valor: 0.6 });
    const nos = agrupar(itens, ["sinistralidade"], "2026-01-31");
    expect(nos.map((n) => [n.rotulo, n.metricas.titulos])).toEqual([["Até 50%", 1], ["75% a 100%", 2]]);
    expect(medir(ts, "2026-01-31", { faixaSinistralidade: "3" }).map((i) => i.t.cd_itcon_rec)).toEqual(["1", "2"]);
  });
});
