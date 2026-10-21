import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UberabaGuias from "./UberabaGuias";

describe("Guias interactions", () => {
  it("opens and closes the full journey and returns to the model", () => {
    const onBack = vi.fn();
    render(<UberabaGuias onBack={onBack} />);
    const toggle = screen.getByRole("button", { name: "VER FLUXO COMPLETO" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: "Voltar ao Modelo de Operação" }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});