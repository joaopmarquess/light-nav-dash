import { useEffect, useRef, useState } from "react";
import type jsPDF from "jspdf";
import { FileDown, Loader2, Printer, X } from "lucide-react";
import { htmlImpressao } from "@/lib/pdfImpressao";

/** Pré-visualização de PDF em tela cheia, com Baixar / Imprimir / Fechar. */
export default function PdfPreview({
  build,
  fileName,
  onClose,
  onDownload,
}: {
  build: () => Promise<jsPDF>;
  fileName: string;
  onClose: () => void;
  /** Substitui o download padrão (ex.: baixar mais de um arquivo). */
  onDownload?: () => void | Promise<void>;
}) {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const docRef = useRef<jsPDF | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const doc = await build();
      docRef.current = doc;
      const imgs = await renderizarPaginas(doc, 1.6, () => cancelled);
      if (!cancelled) {
        setPages(imgs);
        setLoading(false);
      }
    })().catch((err) => {
      console.error("[PdfPreview] falha ao renderizar PDF:", err);
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doDownload = () => (onDownload ? onDownload() : docRef.current?.save(fileName));

  const doPrint = async () => {
    const d = docRef.current;
    if (pages.length === 0 || !d) return;
    // A janela abre já no clique (evita bloqueio de pop-up); as páginas são renderizadas em resolução maior
    // para impressão, para linhas finas e textos pequenos não ficarem claros no preto e branco.
    const w = window.open("", "_blank");
    if (!w) {
      doDownload();
      return;
    }
    w.document.write('<p style="font-family:sans-serif;padding:24px">Preparando impressão…</p>');
    let imgs = pages;
    try {
      imgs = await renderizarPaginas(d, 3);
    } catch (err) {
      console.error("[PdfPreview] falha ao preparar impressão em alta resolução:", err);
    }
    const landscape = d.internal.pageSize.getWidth() > d.internal.pageSize.getHeight();
    w.document.open();
    w.document.write(htmlImpressao(imgs, landscape));
    w.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
      <div className="bg-card border-b border-border p-3 flex items-center justify-between gap-2">
        <div className="text-sm font-medium">
          Pré-visualização do Relatório (PDF) {pages.length > 0 && `— ${pages.length} página(s)`}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={doDownload}
            disabled={loading}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent disabled:opacity-50 inline-flex items-center gap-2"
          >
            <FileDown className="h-4 w-4" /> Baixar PDF
          </button>
          <button
            onClick={doPrint}
            disabled={loading || pages.length === 0}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </button>
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent inline-flex items-center gap-2"
          >
            <X className="h-4 w-4" /> Fechar
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-neutral-800 p-4">
        {loading ? (
          <div className="h-full flex items-center justify-center text-white text-sm">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando PDF...
          </div>
        ) : pages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-white text-sm">
            Não foi possível gerar a pré-visualização.
          </div>
        ) : (
          <div className="mx-auto max-w-4xl flex flex-col gap-4">
            {pages.map((src, i) => (
              <img key={i} src={src} alt={`Página ${i + 1}`} className="w-full bg-white shadow-lg" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Renderiza cada página do PDF como imagem PNG na escala pedida. */
async function renderizarPaginas(doc: jsPDF, escala: number, cancelado: () => boolean = () => false): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  const workerMod: { default: string } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerMod.default;
  const pdf = await pdfjs.getDocument({ data: doc.output("arraybuffer") }).promise;
  const imgs: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: escala });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    imgs.push(canvas.toDataURL("image/png"));
    if (cancelado()) return imgs;
  }
  return imgs;
}
