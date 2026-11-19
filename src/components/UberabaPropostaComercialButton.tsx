import { useState } from "react";
import { createPortal } from "react-dom";
import { FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import PdfPreview from "@/components/PdfPreview";
import { loadTimbrado } from "@/lib/pdfTimbrado";
import { lerFatores, lerIndicadores, lerIndices, lerRotulos } from "@/lib/uberabaTabelasComerciais";
import { buildPropostaComercialPdf } from "@/lib/uberabaPropostaComercialPdf";

/** Ícone "Gerar Proposta Comercial" (Resultados Comerciais): usa os índices e indicadores atuais das tabelas e os textos fixos (sugestão por IA retirada em 19/11/2026). */
export default function UberabaPropostaComercialButton() {
  const [aberto, setAberto] = useState(false);
  const abrir = () => setAberto(true);
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Gerar Proposta Comercial" onClick={abrir}>
            <FileSignature />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Gerar Proposta Comercial</TooltipContent>
      </Tooltip>
      {aberto && createPortal(
        <PdfPreview
          build={async () => buildPropostaComercialPdf(await loadTimbrado(), lerIndices(), lerIndicadores(), lerRotulos(), lerFatores(), null)}
          fileName="Proposta_Comercial_Bensaude_Uberaba.pdf"
          onClose={() => setAberto(false)}
        />,
        document.body,
      )}
    </>
  );
}
