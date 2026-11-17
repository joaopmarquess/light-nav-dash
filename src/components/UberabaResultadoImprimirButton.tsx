import { useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import PdfPreview from "@/components/PdfPreview";
import { loadTimbrado } from "@/lib/pdfTimbrado";
import { loadMarcaAxis } from "@/lib/pdfMarcaAxis";
import { buildResultadoImpressaoPdf, cenariosPorBaseDespesa, paginasResultado } from "@/lib/uberabaResultadoImpressao";
import type { ConfigSimulacao } from "@/lib/uberabaSimulacao";
import type { IndicadoresPorFrente, Indices } from "@/lib/uberabaTabelasComerciais";

/** Ícone "Imprimir": uma folha Contratual e outra Promocional, cada uma com os seus parâmetros e as despesas por Percentual e por Média Assist. */
export default function UberabaResultadoImprimirButton({ configuracoes, nomes, indices, indicadores }: { configuracoes: ConfigSimulacao[]; nomes: string[]; indices: Indices; indicadores: IndicadoresPorFrente }) {
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
          build={async () => buildResultadoImpressaoPdf(await loadTimbrado(), await loadMarcaAxis(), paginasResultado(cenariosPorBaseDespesa(configuracoes, indices, indicadores), nomes, indices, indicadores))}
          fileName="Resultado_por_Ente_Contratual_e_Promocional_Bensaude_Uberaba.pdf"
          onClose={() => setAberto(false)}
        />,
        document.body,
      )}
    </>
  );
}
