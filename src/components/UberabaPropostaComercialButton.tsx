import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import PdfPreview from "@/components/PdfPreview";
import { loadTimbrado } from "@/lib/pdfTimbrado";
import { lerFatores, lerIndicadores, lerIndices, lerRotulos } from "@/lib/uberabaTabelasComerciais";
import { buildPropostaComercialPdf } from "@/lib/uberabaPropostaComercialPdf";
import { BOTOES_PROPOSTA_COMERCIAL, propostaGrupo, PROPOSTAS_GRUPO, type PropostaGrupoId } from "@/lib/uberabaPropostaGrupo";
import { buildPropostaGrupoPdf } from "@/lib/uberabaPropostaGrupoPdf";
import { carregarLogoBensaude } from "@/lib/pdfCapaProposta";
import { lerVidasSimulacao } from "@/lib/uberabaResultadoRede";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buildPropostaGrupoDocx } from "@/lib/uberabaPropostaGrupoDocx";
import { carregarTimbradoBytes } from "@/lib/uberabaPropostaRedeDocx";

type Escolha = PropostaGrupoId | "original";

/**
 * Botões da Proposta Comercial (Resultados Comerciais), pedido de 19/11/2026: Administrados, Empresariais e Original;
 * o nome completo aparece só na dica. Todos usam os índices, indicadores, nomes e fatores atuais das tabelas.
 */
export default function UberabaPropostaComercialButton() {
  const [aberto, setAberto] = useState<Escolha | null>(null);
  const build = async (e: Escolha) => {
    const [timbrado, logo] = [await loadTimbrado(), await carregarLogoBensaude()];
    if (e === "original") return buildPropostaComercialPdf(timbrado, lerIndices(), lerIndicadores(), lerRotulos(), lerFatores(), null, logo);
    return buildPropostaGrupoPdf(propostaGrupo(e, lerIndices(), lerIndicadores(), lerRotulos(), lerFatores(), lerVidasSimulacao()), timbrado, logo);
  };
  const [gerandoWord, setGerandoWord] = useState(false);
  // Word com o mesmo conteúdo do PDF (pedido de 24/11/2026); a Original não tem versão Word.
  const gerarWord = async (e: PropostaGrupoId) => {
    setGerandoWord(true);
    try {
      const p = propostaGrupo(e, lerIndices(), lerIndicadores(), lerRotulos(), lerFatores(), lerVidasSimulacao());
      const blob = await buildPropostaGrupoDocx(p, await carregarTimbradoBytes(), await carregarLogoBensaude());
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = PROPOSTAS_GRUPO[e].arquivo.replace(/\.pdf$/i, "") + ".docx";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("[PropostaComercial] falha ao gerar Word:", err);
      toast.error("Não foi possível gerar o Word da proposta.");
    } finally {
      setGerandoWord(false);
    }
  };
  return (
    <>
      {BOTOES_PROPOSTA_COMERCIAL.map((b) => (
        <Tooltip key={b.id}>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 px-3" aria-label={b.nome} onClick={() => setAberto(b.id)}>
              {b.rotulo}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{b.nome}</TooltipContent>
        </Tooltip>
      ))}
      {aberto && createPortal(
        <PdfPreview
          key={aberto}
          build={() => build(aberto)}
          fileName={aberto === "original" ? "Proposta_Comercial_Bensaude_Uberaba.pdf" : PROPOSTAS_GRUPO[aberto].arquivo}
          onClose={() => setAberto(null)}
          acoesExtras={aberto !== "original" ? (
            <button
              onClick={() => gerarWord(aberto)}
              disabled={gerandoWord}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent disabled:opacity-50 inline-flex items-center gap-2"
            >
              {gerandoWord ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Gerar Word
            </button>
          ) : undefined}
        />,
        document.body,
      )}
    </>
  );
}
