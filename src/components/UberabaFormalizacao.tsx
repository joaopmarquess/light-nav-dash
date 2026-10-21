import { ArrowRight, FileText, Handshake, Hospital, MapPin, ShieldCheck, Users } from "lucide-react";
import { FORMALIZACAO_UBERABA as dados } from "@/lib/uberabaFormalizacao";

export default function UberabaFormalizacao() {
  return (
    <article className="uberaba-formalizacao" aria-label="Formalização do Bensaúde Uberba">
      <div className="formalizacao-page">
        <header className="formalizacao-header">
          <p>BENSAÚDE UBERBA | FORMALIZAÇÃO</p>
          <h2>Formalização</h2>
          <span>Produtos e instrumentos contratuais previstos</span>
        </header>
        <div className="formalizacao-products">
          <MapPin aria-hidden="true" />
          <div><p>PRODUTOS</p><h3>{dados.produtos.titulo}</h3></div>
          <strong>Rede {dados.produtos.rede} a {dados.produtos.territorio}</strong>
        </div>
        <div className="formalizacao-contracts">
          <section className="formalizacao-siga" aria-labelledby="formalizacao-siga-title">
            <div className="formalizacao-section-heading"><Handshake aria-hidden="true" /><div><p>PARCERIA LOCAL</p><h3 id="formalizacao-siga-title">Contratos com a SIGA</h3></div></div>
            <p className="formalizacao-fronts">{dados.siga.frentes.join(" • ")}</p>
            <div className="formalizacao-sequence">
              <div><FileText aria-hidden="true" /><span>PREVIAMENTE</span><strong>{dados.siga.instrumentoPrevio}</strong></div>
              <ArrowRight className="formalizacao-arrow" aria-hidden="true" />
              <div><ShieldCheck aria-hidden="true" /><span>CONTRATOS</span><strong>{dados.siga.escoposContratuais.join(" e ")}</strong></div>
            </div>
            <p className="formalizacao-scope">Não há contrato de {dados.siga.escoposExcluidos.join(" ou ")}.<br /><strong>Os contratos são de venda e captação.</strong></p>
          </section>
          <div className="formalizacao-assistance">
            <section className="formalizacao-assistance-item hospital-service-complex"><Hospital aria-hidden="true" /><div><p>REFERÊNCIA HOSPITALAR</p><h3>Contratos com o {dados.contratosAssistenciais[0]}</h3><span>Formalização da relação hospitalar</span></div></section>
            <section className="formalizacao-assistance-item hospital-service-diagnostic"><Users aria-hidden="true" /><div><p>REDE ASSISTENCIAL</p><h3>Contratos com os {dados.contratosAssistenciais[1].toLowerCase()}</h3><span>Formalização dos credenciamentos</span></div></section>
          </div>
        </div>
        <footer className="formalizacao-footer"><span>Instrumentos previstos para o Bensaúde Uberba</span><strong>Bensaúde</strong></footer>
      </div>
    </article>
  );
}