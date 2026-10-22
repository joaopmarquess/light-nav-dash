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
});