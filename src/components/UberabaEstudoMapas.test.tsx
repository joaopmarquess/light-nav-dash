import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UberabaEstudoMapas from "./UberabaEstudoMapas";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("@/components/UberabaMapa", () => ({ default: () => <div>Mapa regional selecionado</div> }));
vi.mock("@/components/UberabaShell", () => ({ default: () => <input aria-label="Filtro do painel" /> }));

describe("Estudo map selection", () => {
  it("defaults to Home and switches between Home, panel and area", () => {
    render(<TooltipProvider><UberabaEstudoMapas /></TooltipProvider>);
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Home do Estudo" })).toBeVisible();
    expect(screen.queryByText("Mapa regional selecionado")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Dados$/ }));
    expect(screen.getByRole("region", { name: "Dados" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /^Home$/ }));
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

  it("opens the Gestão Rede view with its variables", () => {
    render(<TooltipProvider><UberabaEstudoMapas /></TooltipProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Gestão Rede" }));
    expect(screen.getByRole("button", { name: "Gestão Rede" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Valor Vida Paulo")).toBeVisible();
    expect(screen.getByLabelText("Número Vidas total")).toBeVisible();
  });

  it("opens the Comercial tables with their indices", () => {
    render(<TooltipProvider><UberabaEstudoMapas /></TooltipProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Comercial" }));
    expect(screen.getByRole("region", { name: "Comercial" })).toBeVisible();
    expect(screen.getByLabelText("Índice PCA Adm. x Referência")).toHaveValue("90");
    expect(screen.getByLabelText("Índice PCE Adm. x Referência")).toHaveValue("80");
    expect(screen.getByLabelText("Índice PCE 100+ x Referência")).toHaveValue("70");
    expect(screen.getByRole("button", { name: "Referência" })).toBeVisible();
  });
});
