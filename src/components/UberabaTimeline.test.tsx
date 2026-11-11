import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import UberabaTimeline from "./UberabaTimeline";
import { TooltipProvider } from "@/components/ui/tooltip";

describe("Project study selection", () => {
  it("opens Estudo Home by default and restores it when reopening the stage", () => {
    render(<TooltipProvider><UberabaTimeline /></TooltipProvider>);
    const stage = screen.getByRole("button", { name: "1 Estudo" });
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Home do Estudo" })).toBeVisible();
    fireEvent.click(stage);
    expect(screen.queryByRole("region", { name: "Home do Estudo" })).toBeNull();
    fireEvent.click(stage);
    expect(screen.getByRole("button", { name: "Home" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "Home do Estudo" })).toBeVisible();
  });

  it("starts expanded, collapses after choosing a stage and expands again from the icon", () => {
    render(<TooltipProvider><UberabaTimeline /></TooltipProvider>);
    expect(screen.getByRole("button", { name: "1 Estudo" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "3 Modelo de Atuação" }));
    expect(screen.queryByRole("button", { name: "1 Estudo" })).toBeNull();
    expect(screen.getByRole("article", { name: "Modelo de Atuação do Bensaúde|Uberaba" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Expandir etapas" }));
    expect(screen.getByRole("button", { name: "1 Estudo" })).toBeVisible();
    expect(screen.getByRole("article", { name: "Modelo de Atuação do Bensaúde|Uberaba" })).toBeVisible();
  });
});
