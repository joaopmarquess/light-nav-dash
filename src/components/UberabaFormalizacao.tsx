import UberabaModeloFrente from "@/components/UberabaModeloFrente";
import { PLANO_FORMALIZACAO_UBERABA } from "@/lib/uberabaPlanoAcao";

// Plano de Ação › Formalização: mesmo conceito visual das telas do Modelo de Atuação.
export default function UberabaFormalizacao() {
  return (
    <article className="timeline-presentation modelo-presentation modelo-guias-aberta" aria-label="Formalização do Bensaúde|Uberaba">
      <UberabaModeloFrente content={PLANO_FORMALIZACAO_UBERABA} />
    </article>
  );
}
