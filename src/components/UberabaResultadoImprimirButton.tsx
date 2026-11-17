import { useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import PdfPreview from "@/components/PdfPreview";
import { loadTimbrado } from "@/lib/pdfTimbrado";
import { loadMarcaAxis } from "@/lib/pdfMarcaAxis";
import { buildResultadoImpressaoPdf, paginasResultado } from "@/lib/uberabaResultadoImpressao";
import type { CenarioAgenciamento } from "@/lib/uberabaSimulacao";
import type { IndicadoresPorFrente, Indices } from "@/lib/uberabaTabelasComerciais";

/** Ícone "Imprimir": uma folha com o resultado Contratual e outra com o Promocional, cada uma com os seus parâmetros. */
export default function UberabaResultadoImprimirButton({ cenarios, nomes, indices, indicadores }: { cenarios: CenarioAgenciamento[]; nomes: string[]; indices: Indices; indicadores: IndicadoresPorFrente }) {
  const [aberto, setAberto] = useState(false);
  const rotulo = "Imprimir resultados Contratual e Promocional";
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" aria-label={rotulo} onClick={() => setAberto(true)}>
            <Printer />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{rotulo}</TooltipContent>
      </Tooltip>
      {aberto && createPortal(
        <PdfPreview
          build={async () => buildResultadoImpressaoPdf(await loadTimbrado(), await loadMarcaAxis(), cenarios, paginasResultado(cenarios, nomes, indices, indicadores))}
          fileName="Resultado_por_Ente_Contratual_e_Promocional_Bensaude_Uberaba.pdf"
          onClose={() => setAberto(false)}
        />,
        document.body,
      )}
    </>
  );
}
