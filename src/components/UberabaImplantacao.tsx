import UberabaModeloFrente from "@/components/UberabaModeloFrente";
import { PLANO_IMPLANTACAO_UBERABA } from "@/lib/uberabaPlanoAcao";

// Plano de Ação › Implantação: mesmo conceito visual das telas do Modelo de Atuação.
export default function UberabaImplantacao() {
  return (
    <article className="timeline-presentation modelo-presentation modelo-guias-aberta" aria-label="Implantação do Bensaúde|Uberaba">
      <UberabaModeloFrente content={PLANO_IMPLANTACAO_UBERABA} />
    </article>
  );
}
