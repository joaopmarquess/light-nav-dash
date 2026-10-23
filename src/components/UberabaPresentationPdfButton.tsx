import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function UberabaPresentationPdfButton({ iconOnly = false }: { iconOnly?: boolean }) {
  const [progress, setProgress] = useState<number | null>(null);
  const exportPdf = async () => {
    setProgress(0);
    try {
      const { downloadPresentationPdf } = await import("@/lib/uberabaPresentationPdf");
      await downloadPresentationPdf((done, total) => setProgress(Math.round(done / total * 100)));
    } catch {
      toast.error("Não foi possível carregar todos os slides. Tente gerar o PDF novamente.");
    } finally {
      setProgress(null);
    }
  };
  const label = progress === null ? "Exportar PDF dos 31 slides" : `Gerando PDF: ${progress}%`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={iconOnly ? "ghost" : "outline"} size={iconOnly ? "icon" : "default"} aria-label={label} disabled={progress !== null} onClick={exportPdf}>
          {progress === null ? <FileDown className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
          {!iconOnly && (progress === null ? "Exportar PDF" : `${progress}%`)}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}