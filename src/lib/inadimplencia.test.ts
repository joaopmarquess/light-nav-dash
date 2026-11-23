import { describe, expect, it } from "vitest";
import { agrupar, titulosDobrados, consolidarTitulos, converterValor, lerCsvContasReceber, medir, pctInadimplencia, pctRecebido, total, type LinhaCR } from "./inadimplencia";

const base = (o: Partial<LinhaCR>): LinhaCR => ({
  cd_itcon_rec: "1", dt_competencia: "202601", dt_vencimento: "2026-01-10", dt_recebimento: "2026-01-10",
  vl_duplicata: 100, vl_recebido: 100, vl_acrescimo: 0, vl_desconto: 0, tp_quitacao: "Q", tp_plano: "PIF",
  sn_coparticipativo: "N", cd_plano: "17", ds_con_cor: "ITAÚ", nm_responsavel_financeiro: "A", nr_cpf_cgc: "1", cd_contrato: "9", ...o,
});

describe("Inadimplência", () => {
  it("soma recebimentos parciais do mesmo título e conta a duplicata uma vez", () => {
    const t = consolidarTitulos([
      base({ cd_itcon_rec: "X", vl_duplicata: 6438.38, vl_recebido: 280 }),
      base({ cd_itcon_rec: "X", vl_duplicata: 6438.38, vl_recebido: 1163.38 }),
      ...[1, 2, 3].map(() => base({ cd_itcon_rec: "X", vl_duplicata: 6438.38, vl_recebido: 1665 })),
    ]);
    expect(t).toHaveLength(1);
    const m = total(medir(t, "2026-01-31"));
    expect(m.aReceber).toBe(6438.38);
    expect(m.recebido).toBe(6438.38);
    expect(m.emAberto).toBe(0);
  });

  it("linha repetida com o valor total não conta em dobro: excesso fica à parte", () => {
    const t = consolidarTitulos([base({ vl_duplicata: 751.21, vl_recebido: 751.21 }), base({ vl_duplicata: 751.21, vl_recebido: 751.21 })]);
    const m = total(medir(t, "2026-01-31"));
    expect(m.recebido).toBe(751.21);
    expect(m.excesso).toBe(751.21);
    const dob = titulosDobrados(medir(t, "2026-01-31"));
    expect(dob.map((d) => [d.t.valor, d.t.recebidoArquivo, d.t.excesso, d.t.linhas])).toEqual([[751.21, 1502.42, 751.21, 2]]);
  });

  it("recebimentos parciais que fecham o título não aparecem em Dobrado", () => {
    const t = consolidarTitulos([base({ vl_duplicata: 300, vl_recebido: 100 }), base({ vl_duplicata: 300, vl_recebido: 200 })]);
    expect(titulosDobrados(medir(t, "2026-01-31"))).toEqual([]);
  });

  it("acréscimo (juros) não entra no recebido do principal", () => {
    const t = consolidarTitulos([base({ vl_duplicata: 1977.08, vl_recebido: 2025.2, vl_acrescimo: 48.12, dt_recebimento: "2026-01-20" })]);
    const m = total(medir(t, "2026-01-31"));
    expect(m.recebido).toBe(1977.08);
    expect(m.acrescimos).toBe(48.12);
    expect(m.recebidoAtraso).toBe(1977.08);
  });

  it("Inadimplência = em aberto ÷ a receber; recebido ÷ a receber é o complemento", () => {
    const t = consolidarTitulos([
      base({ cd_itcon_rec: "1", vl_duplicata: 300, vl_recebido: 300 }),
      base({ cd_itcon_rec: "2", vl_duplicata: 100, vl_recebido: 0, dt_recebimento: null, tp_quitacao: "L" }),
    ]);
    const m = total(medir(t, "2026-01-31"));
    expect(m.aReceber).toBe(400);
    expect(pctRecebido(m)).toBe(0.75);
    expect(pctInadimplencia(m)).toBe(0.25);
    expect(m.inadimplentes).toBe(1);
  });

  it("cancelados saem da base, salvo quando incluídos", () => {
    const t = consolidarTitulos([base({ cd_itcon_rec: "1" }), base({ cd_itcon_rec: "2", vl_recebido: 0, dt_recebimento: null, tp_quitacao: "C" })]);
    expect(total(medir(t, "2026-01-31")).aReceber).toBe(100);
    expect(total(medir(t, "2026-01-31", { incluirCancelados: true })).aReceber).toBe(200);
  });

  it("na posição: título a vencer fica fora e recebimento posterior ainda é aberto", () => {
    const t = consolidarTitulos([base({ dt_vencimento: "2026-01-10", dt_recebimento: "2026-01-12" }), base({ cd_itcon_rec: "2", dt_vencimento: "2026-02-10" })]);
    const m = total(medir(t, "2026-01-11"));
    expect(m.titulos).toBe(1);
    expect(m.emAberto).toBe(100);
  });

  it("agrupa em níveis com totais coerentes", () => {
    const t = consolidarTitulos([
      base({ cd_itcon_rec: "1", cd_plano: "17", vl_duplicata: 100, vl_recebido: 100 }),
      base({ cd_itcon_rec: "2", cd_plano: "18", vl_duplicata: 50, vl_recebido: 0, dt_recebimento: null, tp_quitacao: "L" }),
      base({ cd_itcon_rec: "3", cd_plano: "17", vl_duplicata: 20, vl_recebido: 0, dt_recebimento: null, tp_quitacao: "L" }),
    ]);
    const nos = agrupar(medir(t, "2026-02-28"), ["competencia", "plano", "faixaAtraso"], "2026-02-28");
    expect(nos).toHaveLength(1);
    expect(nos[0].metricas.aReceber).toBe(170);
    expect(nos[0].filhos.map((n) => [n.rotulo, n.metricas.emAberto])).toEqual([["Plano 17", 20], ["Plano 18", 50]]);
    expect(nos[0].filhos[0].filhos.map((n) => n.rotulo)).toEqual(["Em aberto 31 a 60 dias", "Pago em dia"]);
  });

  it("lê o CSV no formato do arquivo (datas DD/MM/AAAA, vírgula decimal)", () => {
    expect(converterValor("dt_vencimento", "29/12/2025 00:00:00")).toBe("2025-12-29");
    expect(converterValor("vl_duplicata", "1.647,34")).toBe(1647.34);
    const rows = lerCsvContasReceber("CD_ITCON_REC;DT_COMPETENCIA;DT_VENCIMENTO;VL_DUPLICATA;VL_RECEBIDO\r\n8326513;202512;29/12/2025 00:00:00;647,34;647,34\r\n");
    expect(rows).toEqual([{ linha: 1, cd_itcon_rec: "8326513", dt_competencia: "202512", dt_vencimento: "2025-12-29", vl_duplicata: 647.34, vl_recebido: 647.34 }]);
  });
});
