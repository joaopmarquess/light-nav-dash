import { describe, expect, it } from "vitest";
import { agruparFaixas, ativoEm, faixaIndex } from "./carteiraTabelas";

const b = (o: object) => ({ nr_cpf: "1", tp_acomodacao: "PRATA", dt_nascimento: "2000-01-01", dt_vigencia_beneficiario: "2020-01-01", dt_desligamento: null, dt_reativacao: null, ...o });

describe("Tabelas da carteira", () => {
  it("usa as 10 faixas: 18 em 00 a 18, 19 em 19 a 23, 59 em 59 ou +", () => {
    expect([faixaIndex(18), faixaIndex(19), faixaIndex(58), faixaIndex(59)]).toEqual([0, 1, 8, 9]);
  });
  it("considera desligado após a data como ativo e reativado como ativo", () => {
    expect(ativoEm(b({ dt_desligamento: "2026-02-01" }), "2026-01-31")).toBe(true);
    expect(ativoEm(b({ dt_desligamento: "2025-01-01" }), "2026-01-31")).toBe(false);
    expect(ativoEm(b({ dt_desligamento: "2025-01-01", dt_reativacao: "2025-06-01" }), "2026-01-31")).toBe(true);
  });
  it("conta CPF distinto: PRATA em enfermaria e OURO em apartamento", () => {
    const t = agruparFaixas([b({}), b({}), b({ nr_cpf: "2", tp_acomodacao: "OURO" })], "2026-01-31");
    expect(t[3]).toEqual({ faixa: "24 a 28", enfermaria: 1, apartamento: 1 });
  });
});
