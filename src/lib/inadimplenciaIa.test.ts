import { describe, expect, it } from "vitest";
import { consolidarTitulos, normalizarLinha, type Titulo } from "./inadimplencia";
import { executarConsultaIa, type ConsultaIa } from "./inadimplenciaIa";

const linha = (o: Record<string, unknown>) => normalizarLinha({ cd_itcon_rec: "1", dt_competencia: "202601", dt_vencimento: "2026-01-12", dt_recebimento: "2026-01-12", vl_duplicata: 100, vl_recebido: 100, tp_quitacao: "Q", cd_plano: "17", ...o });
const titulos: Titulo[] = consolidarTitulos([
  linha({ cd_contrato_interno: "0015043597" }),
  linha({ cd_itcon_rec: "2", cd_contrato_interno: "0015000001", vl_duplicata: 200, vl_recebido: 0, dt_recebimento: null, tp_quitacao: "L" }),
  linha({ cd_itcon_rec: "3", cd_contrato_interno: "0015000002", tp_quitacao: "C" }),
  linha({ cd_itcon_rec: "4", cd_contrato_interno: "0019004559", cd_plano: "169" }),
]);
const vazia: ConsultaIa = { posicao: null, filtros: null, agruparPor: null, limiteGrupos: null, listarTitulos: null };
const filtros = (o: Partial<NonNullable<ConsultaIa["filtros"]>>): ConsultaIa["filtros"] => ({
  competenciaDe: null, competenciaAte: null, tipoPlano: null, plano: null, planoInterno: null, contratoInterno: null, coparticipativo: null,
  banco: null, situacao: null, faixaSinistralidade: null, faixaAtraso: null, somenteEmAberto: null, incluirCancelados: null, nome: null, ...o,
});

describe("Inadimplência · consulta da IA", () => {
  it("plano 15 = contrato interno começando com 0015, sem cancelados como na tela", () => {
    const r = executarConsultaIa(titulos, { ...vazia, filtros: filtros({ planoInterno: "15" }) }, "2026-01-31");
    expect(r.totais.titulos).toBe(2);
    expect(r.totais.aReceber).toBe(300);
    expect(r.totais.emAberto).toBe(200);
  });

  it("incluirCancelados traz o cancelado; agrupamento por plano de 4 dígitos", () => {
    const r = executarConsultaIa(titulos, { ...vazia, filtros: filtros({ incluirCancelados: true }), agruparPor: ["planoInterno"] }, "2026-01-31");
    expect(r.grupos?.map((g) => [g.grupo, g.titulos])).toEqual([["Plano 0015", 3], ["Plano 0019", 1]]);
  });

  it("posição antes do vencimento não conta o título", () => {
    expect(executarConsultaIa(titulos, { ...vazia, posicao: "2026-01-11" }, "2026-01-31").totais.titulos).toBe(0);
  });

  it("lista os títulos em aberto primeiro", () => {
    const r = executarConsultaIa(titulos, { ...vazia, listarTitulos: 1 }, "2026-01-31");
    expect(r.titulos?.map((t) => [t.titulo, t.emAberto])).toEqual([["2", 200]]);
    expect(r.titulosOmitidos).toBe(2);
  });
});
