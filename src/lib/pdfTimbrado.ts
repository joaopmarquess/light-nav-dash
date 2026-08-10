import type jsPDF from "jspdf";
import timbradoAsset from "@/assets/timbrado2.png.asset.json";

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
export function attachTimbrado(doc: jsPDF, dataUrl?: string | null) {
  if (!dataUrl) return { setEnabled: (_: boolean) => {} };
  let enabled = true;
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const draw = () => {
    if (!enabled) return;
    try {
      doc.addImage(dataUrl, "PNG", 0, 0, w, h);
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

