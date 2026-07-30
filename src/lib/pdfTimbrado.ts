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
 */
export function attachTimbrado(doc: jsPDF, dataUrl?: string | null) {
  if (!dataUrl) return;
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const draw = () => {
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
}
