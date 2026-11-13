import { useState } from "react";
import { createPortal } from "react-dom";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import PdfPreview from "@/components/PdfPreview";
import { loadTimbrado } from "@/lib/pdfTimbrado";
import { buildMemoriaCalculoPdf } from "@/lib/uberabaMemoriaCalculoPdf";
import type { ResultadoSimulacao } from "@/lib/uberabaSimulacao";

/** Ícone "Gerar Relatório da Memória de Cálculo" (Resultado por Ente): usa o cenário que está na tela. */
export default function UberabaMemoriaCalculoButton({ resultados, nomes, baseAgenciamento }: { resultados: ResultadoSimulacao[]; nomes: string[]; baseAgenciamento: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" aria-label="Gerar Relatório da Memória de Cálculo" onClick={() => setAberto(true)}>
            <FileText />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Gerar Relatório da Memória de Cálculo</TooltipContent>
      </Tooltip>
      {aberto && createPortal(
        <PdfPreview
          build={async () => buildMemoriaCalculoPdf(await loadTimbrado(), resultados, nomes, baseAgenciamento)}
          fileName="Memoria_de_Calculo_Resultado_por_Ente_Bensaude_Uberaba.pdf"
          onClose={() => setAberto(false)}
        />,
        document.body,
      )}
    </>
  );
}
