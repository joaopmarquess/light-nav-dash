import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import UberabaTimeline from "./UberabaTimeline";
import { TooltipProvider } from "@/components/ui/tooltip";

describe("Timeline version selection", () => {
  it("starts simplified and keeps the selected stage when switching versions", () => {
    render(<TooltipProvider><UberabaTimeline /></TooltipProvider>);
    const simple = screen.getByRole("radio", { name: "Simplificada" });
    const complete = screen.getByRole("radio", { name: "Completa" });
    expect(simple).toHaveAttribute("aria-checked", "true");
    expect(complete).toHaveAttribute("aria-checked", "false");
    const stage = screen.getByRole("button", { name: "1 Estudo" });
    fireEvent.click(stage);
    const panel = screen.getAllByText("Estudo")[1]?.parentElement;
    expect(panel).toBeInTheDocument();
    fireEvent.click(complete);
    expect(complete).toHaveAttribute("aria-checked", "true");
    expect(panel).toBeInTheDocument();
    fireEvent.click(simple);
    expect(simple).toHaveAttribute("aria-checked", "true");
    expect(panel).toBeInTheDocument();
  });
});