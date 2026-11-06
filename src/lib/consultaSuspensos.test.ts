import { describe, expect, it } from "vitest";
import { matriculasSuspensas, normalizarEstipulantes, periodoInicialSuspensos } from "./consultaSuspensos";

describe("Suspensos na Consulta", () => {
  const registro = (mat: string, susp: string, reat: string | null = null) => ({ cd_mat_alternativa: mat, dt_ult_suspensao: susp, dt_ult_reat_suspensao: reat });
  const periodo = { de: "2026-01-01", ate: "2026-11-06" };
  it("inclui apenas suspensões iniciadas entre De e Até, inclusive", () => {
    expect(matriculasSuspensas([registro("1", "2026-01-01"), registro("2", "2026-11-06"), registro("3", "2025-12-31"), registro("4", "2026-11-07")], periodo)).toEqual(["1", "2"]);
  });
  it("exclui reativação da suspensão entre sua data e Até, inclusive", () => {
    expect(matriculasSuspensas([registro("1", "2026-10-01", "2026-10-01"), registro("2", "2026-10-01", "2026-11-06"), registro("3", "2026-10-01", "2026-11-07"), registro("4", "2026-10-01", "2026-09-30")], periodo)).toEqual(["3", "4"]);
  });
  it("usa a última suspensão por matrícula sem duplicar vidas", () => {
    expect(matriculasSuspensas([registro("1", "2026-01-01"), registro("1", "2026-10-01", "2026-10-02"), registro("2", "2026-10-01"), registro("2", "2026-09-01", "2026-09-02")], periodo)).toEqual(["2"]);
  });
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