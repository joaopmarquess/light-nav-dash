import { describe, expect, it } from "vitest";
import { normalizarEstipulantes, periodoInicialSuspensos } from "./consultaSuspensos";

describe("Suspensos na Consulta", () => {
  it("inicia em primeiro de janeiro até hoje do ano vigente", () => {
    expect(periodoInicialSuspensos(new Date(2026, 10, 6, 9, 46))).toEqual({ de: "2026-01-01", ate: "2026-11-06" });
    expect(periodoInicialSuspensos(new Date(2027, 0, 1))).toEqual({ de: "2027-01-01", ate: "2027-01-01" });
  });
  it("preserva vidas do nível 2 por estipulante", () => {
    const rows = normalizarEstipulantes([{ nome_estipulante: " Empresa B ", vidas: 2 }, { nome_estipulante: "Empresa A", vidas: 5 }]);
    expect(rows).toEqual([{ nome_estipulante: "Empresa A", vidas: 5 }, { nome_estipulante: "Empresa B", vidas: 2 }]);
    expect(rows.reduce((n, r) => n + r.vidas, 0)).toBe(7);
  });
});