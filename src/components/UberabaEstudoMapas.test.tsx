import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UberabaEstudoMapas from "./UberabaEstudoMapas";

vi.mock("@/components/UberabaMapa", () => ({ default: () => <div>Mapa regional selecionado</div> }));
vi.mock("@/components/UberabaShell", () => ({ default: () => <input aria-label="Filtro do painel" /> }));

describe("Estudo map selection", () => {
  it("defaults to Home and switches between Home, panel and area", () => {
    render(<UberabaEstudoMapas />);
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Home do Estudo" })).toBeVisible();
    expect(screen.queryByText("Mapa regional selecionado")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Dados", exact: true }));
    expect(screen.getByRole("region", { name: "Dados" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Home", exact: true }));
    expect(screen.getByRole("region", { name: "Home do Estudo" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Painel" }));
    expect(screen.getByLabelText("Filtro do painel")).toBeVisible();
    expect(screen.queryByText("Mapa regional selecionado")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Área" }));
    expect(screen.queryByLabelText("Filtro do painel")).toBeNull();
    expect(screen.getByText("Mapa regional selecionado")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(screen.getByRole("region", { name: "Home do Estudo" })).toBeVisible();
    expect(screen.queryByText("Mapa regional selecionado")).toBeNull();
  });
});