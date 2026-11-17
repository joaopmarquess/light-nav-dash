import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CarteiraTrialGeo from "./CarteiraTrialGeo";

const renderGeo = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><CarteiraTrialGeo /></QueryClientProvider>);

vi.mock("@/lib/hostingerClient", () => ({
  hostinger: { rpc: vi.fn().mockResolvedValue({ data: [{ uf: "SP", cidade: "São José do Rio Preto", ativos: 1000 }], error: null }) },
}));
vi.mock("@/components/DWCarteira", () => ({ UF_FLAGS: {} }));
vi.mock("@/components/BrazilHeatMap", () => ({ BrazilHeatMap: () => null }));
vi.mock("@/components/StateHeatMap", () => ({
  StateHeatMap: ({ core, outlineOnly, showOverview }: { core?: boolean; outlineOnly?: boolean; showOverview?: boolean }) => (
    <div data-testid="map" data-core={Boolean(core)} data-outline={Boolean(outlineOnly)} data-overview={showOverview} />
  ),
}));

describe("inline MAA toggle", () => {
  it("no longer offers the MAA magnifier button", async () => {
    renderGeo();
    await screen.findByRole("button", { name: "Mostrar MAA" });
    expect(screen.queryByRole("button", { name: "Mapa Área Atuação (MAA)" })).toBeNull();
    expect(screen.getByTestId("map").getAttribute("data-core")).toBe("false");
  });

  it("starts hidden, shows MAA in place, then restores the original view without changing totals", async () => {
    renderGeo();
    const toggle = await screen.findByRole("button", { name: "Mostrar MAA" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByTestId("map").getAttribute("data-core")).toBe("false");
    fireEvent.click(toggle);
    await waitFor(() => expect(screen.getByTestId("map").getAttribute("data-outline")).toBe("true"));
    expect(screen.getByTestId("map").getAttribute("data-core")).toBe("false");
    expect(screen.getByRole("button", { name: "Ocultar MAA" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("map").getAttribute("data-overview")).toBe("false");
    expect(screen.queryByText("← Voltar")).toBeNull();
    expect(screen.getByText("1.000 vidas")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ocultar MAA" }));
    expect(screen.getByTestId("map").getAttribute("data-outline")).toBe("false");
    expect(screen.getByTestId("map").getAttribute("data-core")).toBe("false");
    expect(screen.getByRole("button", { name: "Mostrar MAA" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("1.000 vidas")).toBeTruthy();
  });
});