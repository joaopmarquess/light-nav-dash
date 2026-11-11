import UberabaModeloFrente from "@/components/UberabaModeloFrente";
import { PLANO_HOME_UBERABA } from "@/lib/uberabaPlanoAcao";

// Plano de Ação › Home: mesmo conceito visual das telas do Modelo de Atuação.
export default function UberabaOperacaoIniciada() {
  return (
    <article className="timeline-presentation modelo-presentation modelo-guias-aberta" aria-label="Operação Iniciada do Bensaúde|Uberaba">
      <UberabaModeloFrente content={PLANO_HOME_UBERABA} />
    </article>
  );
}
