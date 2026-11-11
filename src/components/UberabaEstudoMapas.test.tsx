import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UberabaEstudoMapas from "./UberabaEstudoMapas";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("@/components/UberabaMapa", () => ({ default: () => <div>Mapa regional selecionado</div> }));
vi.mock("@/components/InteligenciaUberaba", () => ({ default: () => <input aria-label="Filtro do painel" /> }));
vi.mock("@/components/InteligenciaUnimed", () => ({ default: () => null }));
vi.mock("@/components/UberabaHospitais", () => ({ default: () => null }));
vi.mock("@/components/UberabaDados", () => ({ default: () => <div>Dados Lancers</div> }));

const abrir = () => render(<TooltipProvider><UberabaEstudoMapas /></TooltipProvider>);
const abrirSimulacoes = (aba: string) => {
  fireEvent.click(screen.getByRole("button", { name: "Simulações" }));
  fireEvent.click(screen.getByRole("button", { name: aba }));
};

describe("Estudo view selection", () => {
  it("shows only Home, Painel, Área and Simulações at the top", () => {
    abrir();
    const grupo = screen.getByRole("group", { name: "Visões do Estudo" });
    expect(Array.from(grupo.querySelectorAll("button")).map((b) => b.textContent)).toEqual(["Home", "Painel", "Área", "Simulações"]);
  });

  it("defaults to Home and switches between Home, panel and area", () => {
    abrir();
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Home do Estudo" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Painel" }));
    expect(screen.getByLabelText("Filtro do painel")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Área" }));
    expect(screen.queryByLabelText("Filtro do painel")).toBeNull();
    expect(screen.getByText("Mapa regional selecionado")).toBeVisible();
  });

  it("opens Dados as a sub-button inside Painel", () => {
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Painel" }));
    fireEvent.click(screen.getByRole("button", { name: "Dados" }));
    expect(screen.getByText("Dados Lancers")).toBeVisible();
    expect(screen.queryByLabelText("Filtro do painel")).toBeNull();
  });

  it("groups Simulação, Gestão Rede, Comercial and Rede Assistencial under Simulações", () => {
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Simulações" }));
    const grupo = screen.getByRole("group", { name: "Simulações do Estudo" });
    expect(Array.from(grupo.querySelectorAll("button")).map((b) => b.textContent)).toEqual(["Simulação", "Gestão Rede", "Comercial", "Rede Assistencial"]);
    expect(screen.getByRole("button", { name: "Simulação" })).toHaveAttribute("aria-pressed", "true");
  });

  it("opens the Gestão Rede view with its variables", () => {
    abrir();
    abrirSimulacoes("Gestão Rede");
    expect(screen.getByLabelText("Valor Vida Paulo")).toBeVisible();
    expect(screen.getByLabelText("Número Vidas total")).toBeVisible();
  });

  it("opens the Comercial tables with their indices", () => {
    abrir();
    abrirSimulacoes("Comercial");
    expect(screen.getByLabelText("Índice PCA Adm. x Referência")).toHaveValue("90");
    expect(screen.getByLabelText("Índice PCE Adm. x Referência")).toHaveValue("80");
    expect(screen.getByLabelText("Índice PCE 100+ x Referência")).toHaveValue("70");
    expect(screen.getByRole("button", { name: "Referência" })).toBeVisible();
  });

  it("opens the Rede Assistencial view inside Simulações", () => {
    abrir();
    abrirSimulacoes("Rede Assistencial");
    expect(screen.getByRole("button", { name: "Rede Assistencial" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("group", { name: "Cenário de credenciamento" })).toBeVisible();
  });
});
