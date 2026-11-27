import { describe, expect, it } from "vitest";
import { regiaoImediataDaCidade, vidasPorRegiaoIbge } from "./regioesIbge";

const rows = [
  { uf: "SP", cidade: "SAO JOSE DO RIO PRETO", ativos: 100 },
  { uf: "SP", cidade: "ENGENHEIRO SCHMITT", ativos: 5 },
  { uf: "SP", cidade: "JALES", ativos: 40 },
  { uf: "MG", cidade: "LIMEIRA D OESTE", ativos: 3 },
  { uf: "SP", cidade: "LUGAR INEXISTENTE", ativos: 2 },
];

describe("regiões IBGE", () => {
  it("distrito soma no município a que pertence", () => {
    expect(regiaoImediataDaCidade("SP", "ENGENHEIRO SCHMITT")).toBe(regiaoImediataDaCidade("SP", "São José do Rio Preto"));
  });
  it("preserva o total e separa não identificadas", () => {
    for (const nivel of ["imediata", "intermediaria"] as const) {
      const l = vidasPorRegiaoIbge(rows, nivel);
      expect(l.reduce((s, r) => s + r.total, 0)).toBe(150);
      expect(l[l.length - 1]).toMatchObject({ nome: "Não identificada", total: 2 });
    }
  });
  it("imediata separa Jales; intermediária junta com Rio Preto", () => {
    const im = vidasPorRegiaoIbge(rows, "imediata");
    expect(im.find((r) => r.nome === "São José do Rio Preto")?.total).toBe(105);
    expect(im.find((r) => r.nome === "Jales")?.total).toBe(40);
    const it2 = vidasPorRegiaoIbge(rows, "intermediaria");
    expect(it2.find((r) => r.nome === "São José do Rio Preto")?.total).toBe(145);
  });
});
