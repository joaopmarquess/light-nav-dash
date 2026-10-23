import jsPDF from "jspdf";
import slides from "@/assets/apresentacao/slides.json";

export const SLIDE_PDF_SIZE = { width: 1440, height: 810 } as const;

/** One frozen snapshot per full-bleed landscape page; no automatic pagination. */
export function createPresentationPdf(images: readonly string[]) {
  if (images.length !== slides.length) throw new Error("A apresentação precisa conter todos os 31 slides.");
  const { width, height } = SLIDE_PDF_SIZE;
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: [width, height], compress: true });
  pdf.setProperties({ title: "Projeto Bensaúde|Uberaba", subject: "Apresentação estática 16:9" });
  images.forEach((image, index) => {
    if (index > 0) pdf.addPage([width, height], "landscape");
    pdf.addImage(image, 0, 0, width, height, `slide-${index}`, "FAST");
  });
  return pdf;
}

export async function downloadPresentationPdf(onProgress: (completed: number, total: number) => void) {
  const images: string[] = [];
  for (const slide of slides) {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = slide.url;
    await image.decode();
    if (image.naturalWidth !== 1920 || image.naturalHeight !== 1080) {
      throw new Error(`O slide “${slide.title}” não está no formato 1920×1080.`);
    }
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar as imagens do PDF.");
    context.drawImage(image, 0, 0);
    images.push(canvas.toDataURL("image/jpeg", 0.95));
    canvas.width = canvas.height = 0;
    onProgress(images.length, slides.length);
  }
  const pdf = createPresentationPdf(images);
  await pdf.save("Projeto-Bensaude-Uberaba-31-slides.pdf", { returnPromise: true });
}