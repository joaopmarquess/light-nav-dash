import type jsPDF from "jspdf";
import logoAsset from "@/assets/axis-report-logo.png.asset.json";

/** Expressão da marca do AXIS nos PDFs internos. */
export const MARCA_AXIS_TEXTO = "AXIS | Executive Intelligence Platform";
export const MARCA_AXIS_AUTOR = "by Dênis Santana";

const LOGO_PROPORCAO = 1410 / 480; // largura ÷ altura do arquivo da logo
const COR: [number, number, number] = [55, 55, 55]; // cinza escuro: legível impresso em p/b

let cache: Promise<string | null> | null = null;

/** Carrega a logo do AXIS como dataURL (uma vez por sessão). Sem a logo, a marca sai só com o texto. */
export function loadMarcaAxis(): Promise<string | null> {
  cache ??= (async () => {
    try {
      const res = await fetch(logoAsset.url);
      if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/")) return null;
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
  })();
  const atual = cache;
  void atual.then((v) => { if (v === null && cache === atual) cache = null; });
  return atual;
}

export type PosicaoMarca = {
  /** Linha de base do texto, em unidades do documento (mm). */
  y: number;
  /** Ponto de referência horizontal (mm). */
  x: number;
  align?: "left" | "center" | "right";
};

/** Largura total da marca (logo + texto) em mm, no tamanho padrão. */
export function larguraMarcaAxis(doc: jsPDF, logo: string | null, tamanho = 6.5) {
  const alturaLogo = tamanho * 0.42;
  const logoW = logo ? alturaLogo * LOGO_PROPORCAO + 1.4 : 0;
  doc.setFontSize(tamanho);
  doc.setFont("helvetica", "normal");
  const t1 = doc.getTextWidth(`${MARCA_AXIS_TEXTO} `) + tamanho * 0.08;
  doc.setFont("helvetica", "italic");
  const t2 = doc.getTextWidth(MARCA_AXIS_AUTOR);
  return { total: logoW + t1 + t2, logoW, t1, alturaLogo };
}

/**
 * Desenha a marca do AXIS (logo + "AXIS | Executive Intelligence Platform by Dênis Santana")
 * no rodapé de todas as páginas. Chamar depois de o documento estar completo.
 */
export function aplicarMarcaAxis(doc: jsPDF, logo: string | null, pos: (pagina: number, largura: number, altura: number) => PosicaoMarca, tamanho = 6.5) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    const { x, y, align = "left" } = pos(p, W, H);
    const m = larguraMarcaAxis(doc, logo, tamanho);
    const x0 = align === "center" ? x - m.total / 2 : align === "right" ? x - m.total : x;
    if (logo) {
      try {
        doc.addImage(logo, "PNG", x0, y - m.alturaLogo + 0.2, m.alturaLogo * LOGO_PROPORCAO, m.alturaLogo, "marca-axis", "FAST");
      } catch { /* sem logo, segue só com o texto */ }
    }
    doc.setTextColor(...COR);
    doc.setFontSize(tamanho);
    doc.setFont("helvetica", "normal");
    doc.text(`${MARCA_AXIS_TEXTO} `, x0 + m.logoW, y);
    doc.setFont("helvetica", "italic");
    doc.text(MARCA_AXIS_AUTOR, x0 + m.logoW + m.t1, y);
  }
  doc.setFont("helvetica", "normal");
}
