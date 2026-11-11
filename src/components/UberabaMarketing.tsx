import UberabaModeloFrente from "@/components/UberabaModeloFrente";
import { PLANO_MARKETING_UBERABA } from "@/lib/uberabaPlanoAcao";

// Plano de Ação › Plano de Marketing: mesmo conceito visual das telas do Modelo de Atuação.
export default function UberabaMarketing() {
  return (
    <article className="timeline-presentation modelo-presentation modelo-guias-aberta" aria-label="Plano de Marketing do Bensaúde|Uberaba">
      <UberabaModeloFrente content={PLANO_MARKETING_UBERABA} />
    </article>
  );
}
