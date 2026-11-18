import { describe, expect, it } from "vitest";
import { contagemMensal } from "./carteiraES";

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
