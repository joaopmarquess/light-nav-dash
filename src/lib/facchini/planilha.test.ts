import { describe, it, expect } from "vitest";
import * as E from "./engine";

// Conferência com a planilha Estudo_Facchini_F30.xlsx (aba #ESTUDO, carteira Target, tabela Fácil 30)
const faixas = [[20,542],[291,62],[546,55],[556,76],[568,70],[611,90],[526,116],[407,122],[335,91],[226,102]].map(([titulares, dependentes]) => ({ titulares, dependentes }));
const f30 = [111.52,130.14,151.87,167.35,195.29,223.22,273.43,340.97,452.47,668.97];
const pr = { ...E.PREMISSAS_PADRAO, taxaAdesaoAtiva: false }; // planilha: diluição 1% zera a taxa de adesão

describe("Planilha Facchini F30", () => {
  const r = E.projecao(faixas, f30, pr);
  it("carteira e produção", () => {
    expect(r.producao.titulares).toBe(4086); expect(r.producao.dependentes).toBe(1326);
    expect(r.producao.total).toBeCloseTo(1354814.54, 2);
    expect(r.producao.prodTitulares).toBeCloseTo(1048744.54, 2);
    expect(r.producao.ticketGrupo).toBeCloseTo(250.33528085735404, 8);
  });
  it("projeção mês 1, ano 1 e ano 2", () => {
    expect(r.colunas.mes1.saldo).toBeCloseTo(115481.454, 2);
    expect(r.colunas.ano1.saldo).toBeCloseTo(3231554.896, 2);
    expect(r.colunas.ano2.saldo).toBeCloseTo(4064443.62, 2);
    expect(r.colunas.ano1.coparticipacao).toBeCloseTo(1625777.448, 2);
  });
  it("RN 63", () => {
    expect(r.rn63.r1_7).toBeCloseTo(2.4518472022955526, 10);
    expect(r.rn63.validacao1).toBe("OK"); expect(r.rn63.validacao2).toBe("OK");
  });
});
