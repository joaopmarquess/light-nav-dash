import { fireEvent, render, screen, within } from "@testing-library/react";
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

  it("shows no title or subtitle on the Estudo screen", () => {
    abrir();
    expect(screen.queryByRole("heading", { name: "Estudo" })).toBeNull();
    expect(document.querySelector(".timeline-presentation-header")).toBeNull();
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

  it("lists the Simulações sub-buttons with the new names in the requested order", () => {
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Simulações" }));
    const grupo = screen.getByRole("group", { name: "Simulações do Estudo" });
    expect(Array.from(grupo.querySelectorAll("button")).map((b) => b.textContent)).toEqual(["Resultados Comerciais", "Resultados Rede"]);
    expect(screen.getByRole("button", { name: "Resultados Comerciais" })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows Simulação de resultados as a collapsed container inside Resultados Comerciais", () => {
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Simulações" }));
    const botao = screen.getByRole("button", { name: "Expandir Simulação de resultados" });
    expect(botao).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("region", { name: "Variáveis por modalidade", hidden: true })).not.toBeVisible();
    fireEvent.click(botao);
    // Parâmetros e Resultado por Ente: blocos recolhidos dentro da Simulação de resultados.
    expect(screen.getByRole("region", { name: "Variáveis por modalidade", hidden: true })).not.toBeVisible();
    expect(screen.getByRole("button", { name: "Expandir Resultado por Ente" })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: "Expandir Parâmetros" }));
    expect(screen.getByRole("region", { name: "Variáveis por modalidade" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Resumo por faixa etária" })).toBeVisible();
  }, 20000);

  it("Resultados Rede não tem mais a seção Antecipação × Mensal", () => {
    abrir();
    abrirSimulacoes("Resultados Rede");
    expect(screen.queryByRole("region", { name: "Antecipação × Mensal", hidden: true })).toBeNull();
    expect(screen.getByRole("button", { name: "Expandir Quantidade de Credenciamentos" })).toBeVisible();
  });

  it("opens the Comercial tables with their indices", () => {
    abrir();
    abrirSimulacoes("Resultados Comerciais");
    expect(screen.getByLabelText("Índice ADESÃO x Referência")).toHaveValue("95");
    expect(screen.getByLabelText("Índice PME ADMINISTRADAS x Referência")).toHaveValue("90");
    expect(screen.getByLabelText("Índice PJ ADMINISTRADAS x Referência")).toHaveValue("85");
    expect(screen.getByLabelText("Índice EMPRESARIAL x Referência")).toHaveValue("75");
    expect(screen.getByRole("button", { name: "Referência" })).toBeVisible();
  });

  it("shows Condições Rede as a collapsed container before Quantidade de Credenciamentos in Resultados Rede", () => {
    abrir();
    abrirSimulacoes("Resultados Rede");
    expect(screen.queryByRole("button", { name: "Condições Rede" })).toBeNull();
    const botao = screen.getByRole("button", { name: "Expandir Condições Rede" });
    expect(botao).toHaveAttribute("aria-expanded", "false");
    const quantidade = screen.getByRole("button", { name: "Expandir Quantidade de Credenciamentos" });
    expect(botao.compareDocumentPosition(quantidade) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("group", { name: "Cenário de credenciamento", hidden: true })).not.toBeVisible();
    fireEvent.click(botao);
    expect(screen.getByRole("group", { name: "Cenário de credenciamento" })).toBeVisible();
  });
});
