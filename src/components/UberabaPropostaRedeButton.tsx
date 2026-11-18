import { useState } from "react";
import { createPortal } from "react-dom";
import { FileSignature } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import PdfPreview from "@/components/PdfPreview";
import { loadTimbrado } from "@/lib/pdfTimbrado";
import { carregarParametrosRede, parametrosRede } from "@/lib/uberabaParametrosRede";
import { buildPropostaRedePdf } from "@/lib/uberabaPropostaRedePdf";
import { dadosRascunhoRede, lerTextosRede, textosRedeParaPdf, topicosRedeDesatualizados } from "@/lib/uberabaPropostaRede";

/** Ícone "Gerar Proposta de Credenciamento e Gestão de Rede" (Resultados Rede): Condições Rede, Parâmetros atuais e textos aprovados. */
export default function UberabaPropostaRedeButton() {
  const [aberto, setAberto] = useState(false);
  const abrir = () => {
    const antigos = topicosRedeDesatualizados(lerTextosRede(), dadosRascunhoRede(parametrosRede(carregarParametrosRede())));
    if (antigos.length) toast.warning(`Texto aprovado com números que não estão mais nos quadros: ${antigos.join("; ")}. Revise em “Textos da Proposta de Credenciamento e Gestão de Rede”.`, { duration: 10000 });
    setAberto(true);
  };
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Gerar Proposta de Credenciamento e Gestão de Rede" onClick={abrir}>
            <FileSignature />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Gerar Proposta de Credenciamento e Gestão de Rede</TooltipContent>
      </Tooltip>
      {aberto && createPortal(
        <PdfPreview
          build={async () => buildPropostaRedePdf(await loadTimbrado(), parametrosRede(carregarParametrosRede()), textosRedeParaPdf(lerTextosRede()))}
          fileName="Proposta_Credenciamento_Gestao_Rede_Bensaude_Uberaba.pdf"
          onClose={() => setAberto(false)}
        />,
        document.body,
      )}
    </>
  );
}
