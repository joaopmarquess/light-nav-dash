import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import UberabaTimeline from "./UberabaTimeline";
import { TooltipProvider } from "@/components/ui/tooltip";

const abrirMenu = () => fireEvent.keyDown(screen.getByRole("button", { name: /^Etapa do projeto:/ }), { key: "Enter" });

describe("Project stage navigation", () => {
  it("opens the project Home (stage 0) with only the outdoor image by default", () => {
    render(<TooltipProvider><UberabaTimeline /></TooltipProvider>);
    expect(screen.getByRole("button", { name: "Etapa do projeto: Home" })).toBeVisible();
    const home = screen.getByRole("region", { name: "Home do projeto" });
    expect(home.querySelectorAll("img")).toHaveLength(1);
    expect(home.textContent).toBe("");
  });

  it("opens Estudo Home when choosing Estudo", () => {
    render(<TooltipProvider><UberabaTimeline /></TooltipProvider>);
    abrirMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /Estudo/ }));
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Home do Estudo" })).toBeVisible();
  });

  it("lists the seven stages in the dropdown and opens the chosen one", () => {
    render(<TooltipProvider><UberabaTimeline /></TooltipProvider>);
    abrirMenu();
    expect(screen.getAllByRole("menuitem")).toHaveLength(8);
    expect(screen.getAllByRole("menuitem")[0]).toHaveTextContent("0Home");
    fireEvent.click(screen.getByRole("menuitem", { name: /Modelo de Atuação/ }));
    expect(screen.getByRole("button", { name: "Etapa do projeto: Modelo de Atuação" })).toBeVisible();
    expect(screen.getByRole("article", { name: "Modelo de Atuação do Bensaúde|Uberaba" })).toBeVisible();
    expect(screen.queryByRole("region", { name: "Home do projeto" })).toBeNull();
  });
  it("switches the Modelo de Atuação fronts through the horizontal menu", () => {
    render(<TooltipProvider><UberabaTimeline /></TooltipProvider>);
    abrirMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /Modelo de Atuação/ }));
    const menu = screen.getByRole("group", { name: "Frentes do Modelo de Atuação" });
    expect(menu).toBeVisible();
    expect(screen.getByRole("button", { name: "Comercial" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Comercial" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Rede Assistencial" }));
    expect(screen.getByRole("heading", { name: "Rede Assistencial" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Guias" }));
    expect(screen.getByRole("button", { name: "Guias" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Guias" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Comercial" })).toBeNull();
  });
});
