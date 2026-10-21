import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CarteiraTrialGeo from "./CarteiraTrialGeo";

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
  it("keeps the selected date and beneficiary total when opening and closing the magnifier", async () => {
    render(<CarteiraTrialGeo />);
    fireEvent.click(await screen.findByRole("button", { name: "Mostrar MAA" }));
    const date = screen.getByLabelText("Ativos em") as HTMLInputElement;
    const selectedDate = date.value;
    fireEvent.click(screen.getByRole("button", { name: "Mapa Área Atuação (MAA)" }));
    expect(screen.getByTestId("map").getAttribute("data-core")).toBe("true");
    expect((screen.getByLabelText("Ativos em") as HTMLInputElement).value).toBe(selectedDate);
    expect(screen.getByText("1.000 vidas")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByTestId("map").getAttribute("data-core")).toBe("false");
    expect(screen.getByTestId("map").getAttribute("data-outline")).toBe("true");
    expect((screen.getByLabelText("Ativos em") as HTMLInputElement).value).toBe(selectedDate);
    expect(screen.getByText("1.000 vidas")).toBeTruthy();
  });

  it("starts hidden, shows MAA in place, then restores the original view without changing totals", async () => {
    render(<CarteiraTrialGeo />);
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