import { useState } from "react";
import { createPortal } from "react-dom";
import { FileSignature, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import PdfPreview from "@/components/PdfPreview";
import { loadTimbrado } from "@/lib/pdfTimbrado";
import { carregarParametrosRede, parametrosRede } from "@/lib/uberabaParametrosRede";
import { buildPropostaRedePdf } from "@/lib/uberabaPropostaRedePdf";
import { carregarLogoBensaude } from "@/lib/pdfCapaProposta";
import { quantidadesRedeAtuais } from "@/lib/uberabaPropostaRede";
import { buildPropostaRedeDocx, carregarTimbradoBytes } from "@/lib/uberabaPropostaRedeDocx";

/** Ícone "Gerar Proposta de Credenciamento e Gestão de Rede" (Resultados Rede): Condições Rede, Parâmetros atuais e os textos fixos do modelo (sugestão por IA retirada em 19/11/2026). */
export default function UberabaPropostaRedeButton() {
  const [aberto, setAberto] = useState(false);
  const abrir = () => setAberto(true);
  const [gerandoWord, setGerandoWord] = useState(false);
  // Word com os mesmos textos, quadros e Parâmetros atuais do PDF (pedido de 19/11/2026).
  const gerarWord = async () => {
    setGerandoWord(true);
    try {
      const blob = await buildPropostaRedeDocx(await carregarTimbradoBytes(), parametrosRede(carregarParametrosRede()), null, quantidadesRedeAtuais(), await carregarLogoBensaude());
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Proposta_Credenciamento_Gestao_Rede_Bensaude_Uberaba.docx";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("[PropostaRede] falha ao gerar Word:", err);
      toast.error("Não foi possível gerar o Word da proposta.");
    } finally {
      setGerandoWord(false);
    }
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
          build={async () => buildPropostaRedePdf(await loadTimbrado(), parametrosRede(carregarParametrosRede()), null, quantidadesRedeAtuais(), await carregarLogoBensaude())}
          fileName="Proposta_Credenciamento_Gestao_Rede_Bensaude_Uberaba.pdf"
          onClose={() => setAberto(false)}
          acoesExtras={
            <button
              onClick={gerarWord}
              disabled={gerandoWord}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent disabled:opacity-50 inline-flex items-center gap-2"
            >
              {gerandoWord ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Gerar Word
            </button>
          }
        />,
        document.body,
      )}
    </>
  );
}
