import type jsPDF from "jspdf";
import timbradoAsset from "@/assets/timbrado9.png.asset.json";

export const TIMBRADO_URL = timbradoAsset.url;

/** Carrega o papel timbrado como dataURL PNG. */
export async function loadTimbrado(): Promise<string | null> {
  try {
    const res = await fetch(TIMBRADO_URL);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Desenha o timbrado na página atual e em todas as páginas criadas depois,
 * sempre antes do conteúdo (interceptando doc.addPage).
 * Retorna um controle para ligar/desligar o timbrado nas próximas páginas.
 */
/** Faixa do rodapé do timbrado com a razão social do Bensaúde (mm, A4 retrato), entre o traço (~284 mm) e a borda. */
export const TIMBRADO_RAZAO_SOCIAL = { topo: 285.2, base: 291.5, linha: 289 };

export function attachTimbrado(doc: jsPDF, dataUrl?: string | null, opts: { semRazaoSocial?: boolean } = {}) {
  if (!dataUrl) return { setEnabled: (_: boolean) => {} };
  let enabled = true;
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const draw = () => {
    if (!enabled) return;
    try {
      doc.addImage(dataUrl, "PNG", 0, 0, w, h);
      // PDFs internos: a razão social sai do rodapé para dar lugar à marca do AXIS.
      if (opts.semRazaoSocial) {
        doc.setFillColor(255, 255, 255);
        doc.rect(0, TIMBRADO_RAZAO_SOCIAL.topo * (h / 297), w, (TIMBRADO_RAZAO_SOCIAL.base - TIMBRADO_RAZAO_SOCIAL.topo) * (h / 297), "F");
      }
    } catch {
      /* ignore */
    }
  };
  draw();
  const orig = doc.addPage.bind(doc);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (doc as any).addPage = (...args: any[]) => {
    const r = (orig as any)(...args);
    draw();
    return r;
  };
  return { setEnabled: (v: boolean) => { enabled = v; } };
}

