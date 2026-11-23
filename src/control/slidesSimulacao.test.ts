import { describe, expect, it } from "vitest";
import { SLIDE_AJUSTE, TOTAL_SLIDES_SIMULACAO, slideAposTecla } from "./slidesSimulacao";

describe("Slides Simulação", () => {
  it("tem os 7 slides do pptx, com o Ajuste no slide 4", () => {
    expect(TOTAL_SLIDES_SIMULACAO).toBe(7);
    expect(SLIDE_AJUSTE).toBe(4);
  });
  it("seta direita avança e seta esquerda volta, sem passar dos limites", () => {
    expect(slideAposTecla(3, "ArrowRight")).toBe(4);
    expect(slideAposTecla(4, "ArrowLeft")).toBe(3);
    expect(slideAposTecla(7, "ArrowRight")).toBe(7);
    expect(slideAposTecla(1, "ArrowLeft")).toBe(1);
  });
  it("outras teclas de apresentação também passam os slides", () => {
    expect(slideAposTecla(2, " ")).toBe(3);
    expect(slideAposTecla(2, "PageDown")).toBe(3);
    expect(slideAposTecla(5, "Home")).toBe(1);
    expect(slideAposTecla(2, "End")).toBe(7);
    expect(slideAposTecla(2, "a")).toBeNull();
  });
});
