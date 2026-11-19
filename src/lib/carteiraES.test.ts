import { describe, expect, it } from "vitest";
import { chaveEntrada, codigoPlano, contagemMensal, descricoesPorPlano, NIVEIS_ENTRADAS } from "./carteiraES";

describe("contagemMensal", () => {
  it("conta matrículas distintas por mês no formato MM/AAAA, incluindo meses vazios", () => {
    const rows = [
      { cd_mat_alternativa: 1, dt: "2026-01-05" },
      { cd_mat_alternativa: 1, dt: "2026-01-20" },
      { cd_mat_alternativa: 2, dt: "2026-01-09" },
      { cd_mat_alternativa: 3, dt: "2026-03-01T00:00:00" },
    ];
    expect(contagemMensal(rows, "dt", "2026-01-01", "2026-03-31")).toEqual([
      { mes: "01/2026", qtd: 2 }, { mes: "02/2026", qtd: 0 }, { mes: "03/2026", qtd: 1 },
    ]);
  });
  it("atravessa a virada do ano", () => {
    expect(contagemMensal([], "dt", "2025-12-01", "2026-01-31").map((x) => x.mes)).toEqual(["12/2025", "01/2026"]);
  });
});

describe("Entradas · nível 1 do grid", () => {
  it("mantém Vendedor como visão padrão e oferece Plano entre as opções", () => {
    expect(NIVEIS_ENTRADAS[0].id).toBe("vendedor");
    expect(NIVEIS_ENTRADAS.map((n) => n.id)).toContain("planoCodigo");
  });
  it("Plano = 4 primeiros dígitos da matrícula com 12 dígitos (zeros à esquerda)", () => {
    expect(codigoPlano(229012345600)).toBe("2290");
    expect(codigoPlano(1812345601)).toBe("0018");
    expect(codigoPlano("0018/123456-01")).toBe("0018");
    expect(codigoPlano(null)).toBe("");
    expect(codigoPlano(1234567890123)).toBe("");
  });
  it("nomeia o plano pela descrição mais frequente do código e agrupa matrículas do mesmo plano juntas", () => {
    const rows = [
      { cd_mat_alternativa: 1812345601, ds_plano: "BEM FÁCIL FLEX" },
      { cd_mat_alternativa: 1899999900, ds_plano: "BEM FÁCIL FLEX" },
      { cd_mat_alternativa: 1811111100, ds_plano: "FLEX ANTIGO" },
    ];
    const descricoes = descricoesPorPlano(rows);
    const ctx = { grupos: {}, descricoes };
    expect(rows.map((r) => chaveEntrada(r, "planoCodigo", ctx))).toEqual(["0018 · BEM FÁCIL FLEX", "0018 · BEM FÁCIL FLEX", "0018 · BEM FÁCIL FLEX"]);
    expect(chaveEntrada({ cd_mat_alternativa: null }, "planoCodigo", ctx)).toBe("SEM PLANO");
  });
  it("usa vendedor, grupo, empresa e cidade com rótulos para valores ausentes", () => {
    const ctx = { grupos: { "10": "LANCERS" }, descricoes: new Map<string, string>() };
    const r = { cd_vendedor: 10, nm_vendedor: "ANA", nm_empresa_estipulante: "", nm_cidade_plano: "UBERABA", cd_uf_plano: "MG" };
    expect(chaveEntrada(r, "vendedor", ctx)).toBe("ANA");
    expect(chaveEntrada(r, "grupo", ctx)).toBe("LANCERS");
    expect(chaveEntrada(r, "empresa", ctx)).toBe("SEM EMPRESA");
    expect(chaveEntrada(r, "cidade", ctx)).toBe("UBERABA (MG)");
    expect(chaveEntrada({}, "vendedor", ctx)).toBe("SEM VENDEDOR");
  });
});
