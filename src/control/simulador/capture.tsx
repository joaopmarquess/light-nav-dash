import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import html2canvas from "html2canvas";
import OrcamentoFaturamento from "@/control/OrcamentoFaturamento";
import { SimulatorContext } from "./context";
import { ETAPAS, viewModel, type SimulationRecord } from "./model";

export type ScreenShot = { data: string; w: number; h: number };
export type ViewShots = Record<number, ScreenShot[]>;

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Renders the real Painel and DRE screens offscreen and captures them as images for the PDF. */
async function shot(model: ReturnType<typeof viewModel>, stage: number): Promise<ScreenShot> {
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-20000px;top:0;width:1500px;padding:12px 12px 24px;";
  host.className = "bg-background text-foreground";
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(
      <SimulatorContext.Provider value={{ model, update: () => {}, stage, readOnly: true }}>
        <OrcamentoFaturamento home={stage === 0} abaInicial={stage === 0 ? undefined : ETAPAS[stage]} />
      </SimulatorContext.Provider>,
    ));
    // Hide the floating navigation bar so only the screen content is captured.
    host.querySelectorAll<HTMLElement>(".fixed, .sticky.bottom-0").forEach(el => { if (el !== host) el.style.display = "none"; });
    // Show wide tables entirely (no scroll clipping) and drop sticky columns, which html2canvas paints incorrectly.
    host.querySelectorAll<HTMLElement>("*").forEach(el => {
      const cs = getComputedStyle(el);
      if (/(auto|scroll|hidden)/.test(cs.overflowX) || /(auto|scroll|hidden)/.test(cs.overflowY)) { el.style.overflow = "visible"; el.style.maxHeight = "none"; el.style.height = "auto"; }
      // html2canvas fills inset shadows; redraw them as a left border.
      if (cs.boxShadow.includes("inset")) { const c = cs.boxShadow.match(/rgba?\([^)]*\)/)?.[0] ?? "currentColor"; el.style.boxShadow = "none"; el.style.borderLeft = `3px solid ${c}`; }
      if (cs.position === "sticky") { el.style.position = "static"; }
      // Expand/collapse chevrons are controls, not content.
      if (el.tagName === "BUTTON" && el.closest("td")) el.querySelector(":scope > span.rounded-full")?.remove();
    });
    // html2canvas draws input values poorly: show them as plain text with the same box styling.
    host.querySelectorAll<HTMLInputElement>("input").forEach(inp => {
      const span = document.createElement("span");
      span.className = inp.className; span.textContent = inp.value;
      span.style.display = "inline-flex"; span.style.alignItems = "center"; span.style.justifyContent = getComputedStyle(inp).textAlign === "right" ? "flex-end" : "flex-start";
      span.style.width = `${inp.offsetWidth}px`; span.style.height = `${inp.offsetHeight}px`;
      inp.replaceWith(span);
    });
    // Action buttons (e.g. Restaurar) are not content.
    host.querySelectorAll<HTMLButtonElement>("button").forEach(btn => { if (/Restaurar/.test(btn.textContent ?? "")) btn.style.visibility = "hidden"; });
    host.style.width = "max-content"; host.style.minWidth = "1500px";
    await wait(250);
    const canvas = await html2canvas(host, { scale: 2, backgroundColor: getComputedStyle(host).backgroundColor, logging: false });
    return { data: canvas.toDataURL("image/jpeg", 0.92), w: canvas.width, h: canvas.height };
  } finally {
    root.unmount();
    host.remove();
  }
}

export async function captureViewScreens(sim: SimulationRecord): Promise<ViewShots> {
  const out: ViewShots = {};
  for (const v of sim.simulador_visoes) {
    const m = viewModel(v);
    out[v.position] = [];
    for (let st = 0; st < ETAPAS.length; st++) out[v.position].push(await shot(m, st));
  }
  return out;
}
