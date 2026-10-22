import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UberabaEstudoMapas from "./UberabaEstudoMapas";

vi.mock("@/components/CarteiraTrialGeo", () => ({ default: () => <input aria-label="Data geográfica" defaultValue="2026-10-22" /> }));
vi.mock("@/components/UberabaMapa", () => ({ default: () => <div>Mapa regional selecionado</div> }));

describe("Estudo map selection", () => {
  it("defaults to Área Geográfica and preserves its date after switching maps", () => {
    render(<UberabaEstudoMapas />);
    expect(screen.getByRole("button", { name: "Área Geográfica" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("Mapa regional selecionado")).toBeNull();
    fireEvent.change(screen.getByLabelText("Data geográfica"), { target: { value: "2026-11-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Mapa Uberaba" }));
    expect(screen.getByRole("button", { name: "Mapa Uberaba" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Área Geográfica" }));
    expect(screen.getByLabelText("Data geográfica")).toHaveValue("2026-11-01");
  });
});