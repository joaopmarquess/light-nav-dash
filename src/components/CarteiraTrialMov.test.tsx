import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ rpc: vi.fn(), pages: vi.fn() }));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
vi.mock("@/lib/hostingerClient", () => ({ hostinger: { rpc: api.rpc } }));
import CarteiraTrialMov from "./CarteiraTrialMov";

beforeEach(() => {
  api.rpc.mockReset(); api.pages.mockReset();
  api.pages.mockResolvedValue({ data: [{ tipo: "T+", data: "2026-10-01", cpf: "123", mat: "2", mat_anterior: "1", saida: "2026-09-30", entrada: "2026-10-01", tipo_reentrada: "Pura" }], error: null });
  api.rpc.mockImplementation((name: string) => {
    if (name === "carteira_movimentacao_totais") return Promise.resolve({ data: [{ vendas: 11771, cancelamentos: 8049, reativacoes: 1179, entradas_transferencia: 2043, saidas_transferencia: 2019 }], error: null });
    if (name === "carteira_trial_geo") return Promise.resolve({ data: [{ uf: "SP", cidade: "A", ativos: 60000 }, { uf: "MG", cidade: "B", ativos: 6000 }], error: null });
    if (name === "carteira_trial_kpis") return Promise.resolve({ data: [{ ativos: 66411 }], error: null });
    const query = { order: () => query, range: api.pages };
    return query;
  });
});
afterEach(cleanup);

function aplicar() {
  const dates = document.querySelectorAll("input[type=date]");
  fireEvent.change(dates[0], { target: { value: "2026-10-01" } });
  fireEvent.change(dates[1], { target: { value: "2026-10-23" } });
  fireEvent.click(screen.getByRole("button", { name: "Calcular" }));
}

describe("consultas da Movimentação sob demanda", () => {
  it("não consulta antes de Calcular nem ao Limpar", async () => {
    render(<CarteiraTrialMov />);
    expect(api.rpc).not.toHaveBeenCalled();
    aplicar();
    await waitFor(() => expect(screen.getByRole("button", { name: "Abrir depuração" })).toBeEnabled());
    expect(api.rpc.mock.calls.filter(([name]) => name === "carteira_movimentacao_totais")).toHaveLength(1);
    expect(api.pages).not.toHaveBeenCalled();
    api.rpc.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
    await waitFor(() => expect(api.rpc).not.toHaveBeenCalled());
  });
  it("busca detalhes só no olho e reutiliza ao fechar e abrir", async () => {
    render(<CarteiraTrialMov />); aplicar();
    await waitFor(() => expect(screen.getByRole("button", { name: "Abrir depuração" })).toBeEnabled());
    expect(api.pages).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Abrir depuração" }));
    await waitFor(() => expect(api.pages).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Ocultar depuração" }));
    fireEvent.click(screen.getByRole("button", { name: "Abrir depuração" }));
    expect(api.pages).toHaveBeenCalledTimes(1);
    aplicar();
    await waitFor(() => expect(screen.getByRole("button", { name: "Abrir depuração" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Abrir depuração" }));
    await waitFor(() => expect(api.pages).toHaveBeenCalledTimes(2));
  });
  it("preserva datas de Anterior e Final em De-1 e Até+1", async () => {
    render(<CarteiraTrialMov />); aplicar();
    await waitFor(() => expect(api.rpc).toHaveBeenCalledWith("carteira_trial_geo", { p_data: "2026-09-30" }));
    await waitFor(() => expect(api.rpc).toHaveBeenCalledWith("carteira_trial_kpis", { p_data: "2026-10-24", p_q: null, p_empresa: null, p_cidade: null }));
  });
  it("consulta vidas no fechamento mensal e reutiliza os totais das barras sem buscar detalhes", async () => {
    render(<CarteiraTrialMov />); aplicar();
    await waitFor(() => expect(screen.getByRole("button", { name: "Abrir depuração" })).toBeEnabled());
    await waitFor(() => expect(api.rpc).toHaveBeenCalledWith("carteira_trial_kpis", { p_data: "2026-10-31", p_q: null, p_empresa: null, p_cidade: null }));
    expect(api.rpc.mock.calls.filter(([name]) => name === "carteira_trial_kpis")).toHaveLength(2);
    expect(api.rpc.mock.calls.filter(([name]) => name === "carteira_trial_geo")).toHaveLength(1);
    expect(api.rpc.mock.calls.filter(([name]) => name === "carteira_movimentacao_totais")).toHaveLength(1);
    expect(api.pages).not.toHaveBeenCalled();
  });
});