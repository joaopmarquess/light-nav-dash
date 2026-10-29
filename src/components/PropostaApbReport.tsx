import { useEffect, useState } from "react";
import type jsPDF from "jspdf";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function PropostaApbReport({ doc, onClose }: { doc: jsPDF | null; onClose: () => void }) {
  const [paginas, setPaginas] = useState<string[]>([]);
  const [erro, setErro] = useState("");
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    let ativo = true;
    setPaginas([]); setErro(""); setPronto(false);
    if (!doc) return;
    async function renderizar() {
      if (!doc) return;
      const pdfjs = await import("pdfjs-dist");
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      const task = pdfjs.getDocument({ data: doc.output("arraybuffer") });
      try {
        const pdf = await task.promise;
        for (let i = 1; i <= pdf.numPages && ativo; i++) {
          const page = await pdf.getPage(i), viewport = page.getViewport({ scale: 1.7 });
          const canvas = document.createElement("canvas"); canvas.width = viewport.width; canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Não foi possível preparar o relatório.");
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          const imagem = canvas.toDataURL("image/png");
          if (ativo) setPaginas((x) => [...x, imagem]);
          page.cleanup();
        }
        if (ativo) setPronto(true);
      } finally { await task.destroy(); }
    }
    renderizar().catch(() => { if (ativo) setErro("Não foi possível mostrar o relatório. Feche e tente novamente."); });
    return () => { ativo = false; };
  }, [doc]);
  return <Dialog open={doc !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="flex h-[92vh] max-w-5xl flex-col gap-3">
      <DialogHeader className="pr-8"><DialogTitle>Proposta APB — Estratégico</DialogTitle></DialogHeader>
      <div className="flex justify-end"><Button variant="outline" size="sm" disabled={!pronto || !!erro} onClick={() => doc?.save("Proposta_APB_3990_Estrategico.pdf")}><Download className="mr-2 h-4 w-4" />Baixar PDF</Button></div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-muted p-3">
        {erro && <p role="alert" className="text-destructive">{erro}</p>}
        {!pronto && !erro && <div role="status" className="flex items-center justify-center gap-2 py-4 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Preparando relatório…</div>}
        <div className="mx-auto flex max-w-3xl flex-col gap-4">{paginas.map((src, i) => <img key={i} src={src} alt={`Proposta Estratégico — página ${i + 1}`} className="h-auto w-full border border-border shadow-sm" />)}</div>
      </div>
    </DialogContent>
  </Dialog>;
}