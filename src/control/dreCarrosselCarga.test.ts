import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./dreHostinger", () => ({
  loadMesesDemonstracoes: vi.fn(),
  loadDreHostinger: vi.fn(),
}));
import { loadDreHostinger, loadMesesDemonstracoes } from "./dreHostinger";
import { carregarDreCarrossel } from "./dreCarrosselCarga";

describe("Período dos slides do Control", () => {
  beforeEach(() => vi.resetAllMocks());

  it("inclui setembro e outubro quando realizados na DRE, sem parar em agosto", async () => {
    const meses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const rows = [{ ano: 2026, mes: 10, tri: 4, g1: "Receita", g2: "", g3: "", g4: "", valor: 123 }];
    vi.mocked(loadMesesDemonstracoes).mockResolvedValue(meses);
    vi.mocked(loadDreHostinger).mockResolvedValue(rows);
    expect(await carregarDreCarrossel(2026)).toEqual({ meses, rows });
    expect(loadMesesDemonstracoes).toHaveBeenCalledWith(2026);
    expect(loadDreHostinger).toHaveBeenCalledWith(2026, meses);
  });

  it("não busca meses futuros quando nenhum mês está realizado", async () => {
    vi.mocked(loadMesesDemonstracoes).mockResolvedValue([]);
    expect(await carregarDreCarrossel(2026)).toEqual({ meses: [], rows: [] });
    expect(loadDreHostinger).not.toHaveBeenCalled();
  });
});