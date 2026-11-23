// Control › Slides Simulação: apresentação "Orçamento 2027" (pptx enviado pelo Dênis em 23/11/2026).
// Os slides 1–3 e 5–7 são imagens fiéis do pptx; o slide 4 é a tela Ajuste do Simulador, ao vivo.
export const TOTAL_SLIDES_SIMULACAO = 7;
export const SLIDE_AJUSTE = 4;

/** Teclas que passam os slides: setas, Page Up/Down, espaço, Home e End. */
export function slideAposTecla(atual: number, tecla: string, total = TOTAL_SLIDES_SIMULACAO): number | null {
  switch (tecla) {
    case "ArrowRight": case "ArrowDown": case "PageDown": case " ": case "Enter":
      return Math.min(total, atual + 1);
    case "ArrowLeft": case "ArrowUp": case "PageUp": case "Backspace":
      return Math.max(1, atual - 1);
    case "Home": return 1;
    case "End": return total;
    default: return null;
  }
}
