import { describe, expect, it } from "vitest";
import { SLIDE_AJUSTE, TOTAL_SLIDES_SIMULACAO, sinistralidadeSlideIndicadores, slideAposTecla } from "./slidesSimulacao";
import { formatarPercentualAjuste } from "./simulador/ajuste";

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
  it("slide 5 mostra a Sinistralidade Operacional original do slide 4: 92,00%, 89,91% e 89,00%", () => {
    const v = sinistralidadeSlideIndicadores({}, false);
    expect([v.pessimista, v.realista, v.otimista].map(formatarPercentualAjuste)).toEqual(["92,00", "89,91", "89,00"]);
  });
  it("slide 5 acompanha o Ajuste só quando Rever está marcado, como o slide 4", () => {
    const alt = { realista: { percentuais: { assistenciais: -80 } } };
    expect(formatarPercentualAjuste(sinistralidadeSlideIndicadores(alt, false).realista)).toBe("89,91");
    expect(sinistralidadeSlideIndicadores(alt, true).realista).not.toBeCloseTo(sinistralidadeSlideIndicadores({}, true).realista, 2);
  });
});
