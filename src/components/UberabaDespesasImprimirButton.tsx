import { useState } from "react";
import { createPortal } from "react-dom";
import { FileHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import PdfPreview from "@/components/PdfPreview";
import { loadTimbrado } from "@/lib/pdfTimbrado";
import { loadMarcaAxis } from "@/lib/pdfMarcaAxis";
import { buildDespesasImpressaoPdf, paginasDespesas } from "@/lib/uberabaDespesasImpressao";
import type { ConfigSimulacao } from "@/lib/uberabaSimulacao";
import type { IndicadoresPorFrente, Indices } from "@/lib/uberabaTabelasComerciais";

/** Ícone do relatório de Despesas Assistenciais: uma folha por Percentual e outra por Média Assist. */
export default function UberabaDespesasImprimirButton({ configuracoes, nomes, indices, indicadores }: { configuracoes: ConfigSimulacao[]; nomes: string[]; indices: Indices; indicadores: IndicadoresPorFrente }) {
  const [aberto, setAberto] = useState(false);
  const rotulo = "Relatório de despesas: Percentual e Média Assist.";
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" aria-label={rotulo} onClick={() => setAberto(true)}>
            <FileHeart />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{rotulo}</TooltipContent>
      </Tooltip>
      {aberto && createPortal(
        <PdfPreview
          build={async () => buildDespesasImpressaoPdf(await loadTimbrado(), await loadMarcaAxis(), paginasDespesas(configuracoes, indices, indicadores, nomes))}
          fileName="Despesas_Assistenciais_Percentual_e_Media_Bensaude_Uberaba.pdf"
          onClose={() => setAberto(false)}
        />,
        document.body,
      )}
    </>
  );
}
