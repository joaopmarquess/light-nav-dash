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
        />,
        document.body,
      )}
    </>
  );
}
