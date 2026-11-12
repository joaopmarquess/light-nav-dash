import { useState } from "react";
import { createPortal } from "react-dom";
import { FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import PdfPreview from "@/components/PdfPreview";
import { loadTimbrado } from "@/lib/pdfTimbrado";
import { lerIndicadores, lerIndices, lerRotulos } from "@/lib/uberabaTabelasComerciais";
import { buildPropostaComercialPdf } from "@/lib/uberabaPropostaComercialPdf";

/** Ícone "Gerar Proposta Comercial" (Resultados Comerciais): usa os índices e indicadores atuais das tabelas. */
export default function UberabaPropostaComercialButton() {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Gerar Proposta Comercial" onClick={() => setAberto(true)}>
            <FileSignature />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Gerar Proposta Comercial</TooltipContent>
      </Tooltip>
      {aberto && createPortal(
        <PdfPreview
          build={async () => buildPropostaComercialPdf(await loadTimbrado(), lerIndices(), lerIndicadores(), lerRotulos())}
          fileName="Proposta_Comercial_Bensaude_Uberaba.pdf"
          onClose={() => setAberto(false)}
        />,
        document.body,
      )}
    </>
  );
}
