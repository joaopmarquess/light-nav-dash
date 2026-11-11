import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import UberabaHospitais from "./UberabaHospitais";

describe("Uberaba Hospitais", () => {
  it("opens the Mário Palmério presentation from the MPHU name and returns to the list", () => {
    render(<UberabaHospitais />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir apresentação: Mário Palmério Hospital Universitário (MPHU)" }));
    expect(screen.getByRole("article", { name: "Hospital Mário Palmério do Bensaúde|Uberaba" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Voltar aos hospitais" }));
    expect(screen.getByText("Hospitais de Uberaba")).toBeInTheDocument();
  });
});
