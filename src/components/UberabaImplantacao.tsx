import { ArrowDown, ArrowRight, ShieldAlert } from "lucide-react";
import { IMPLANTACAO_UBERABA as dados, textoDefinicao } from "@/lib/uberabaImplantacao";
import TimelinePresentationHeader from "@/components/TimelinePresentationHeader";

export default function UberabaImplantacao() {
  return (
    <article className="uberaba-implantacao" aria-label="Implantação do Bensaúde|Uberaba">
      <div className="implantacao-page">
        <TimelinePresentationHeader title={dados.titulo} subtitle={dados.subtitulo} />
        <ol className="implantacao-flow">
          {dados.etapas.map((e, i) => (
            <li key={e.numero} className="implantacao-step">
              <section className={`implantacao-card implantacao-cor-${e.numero}`}>
                <h3><span>{e.numero}</span>{e.titulo}</h3>
                <div><p>ENTREGA</p><strong>{e.entrega}</strong></div>
                <div className="implantacao-criterio"><p>CRITÉRIO DE AVANÇO</p><strong>{e.criterio}</strong></div>
                <small>Prazo: {textoDefinicao(e.prazo)} • Responsável: {textoDefinicao(e.responsavel)}</small>
              </section>
              {i < dados.etapas.length - 1 && <><ArrowRight className="implantacao-arrow implantacao-arrow-h" aria-hidden="true" /><ArrowDown className="implantacao-arrow implantacao-arrow-v" aria-hidden="true" /></>}
            </li>
          ))}
        </ol>
        <div className="implantacao-condicao"><ShieldAlert aria-hidden="true" /><div><p>CONDIÇÃO-CHAVE</p><strong>“{dados.condicao}”</strong></div></div>
        <ArrowDown className="implantacao-arrow implantacao-arrow-final" aria-hidden="true" />
        <section className="implantacao-resultado" aria-label="Resultado esperado">
          <p>RESULTADO ESPERADO</p>
          <h3>{dados.resultado.titulo}</h3>
          <span>{dados.resultado.itens.join(" • ")}</span>
        </section>
        <section className="implantacao-monitorar">
          <h3>Monitorar e evoluir</h3>
          <ul>{dados.indicadores.map((i) => <li key={i}>{i}</li>)}</ul>
        </section>
      </div>
    </article>
  );
}
