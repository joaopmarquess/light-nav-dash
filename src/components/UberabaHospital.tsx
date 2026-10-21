import { useState } from "react";
import { Building2 } from "lucide-react";
import { HOSPITAL_PALMERIO, type HospitalInstitucional } from "@/lib/uberabaHospital";

function HospitalImage({ src, alt, className }: { src: string | null; alt: string; className: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div role="img" aria-label={alt} className={`hospital-placeholder ${className}`}><Building2 aria-hidden="true" />Imagem a inserir</div>;
  return <img src={src} alt={alt} onError={() => setFailed(true)} className={className} />;
}

const UberabaHospital = ({ hospital = HOSPITAL_PALMERIO }: { hospital?: HospitalInstitucional; onBack?: () => void }) => {
  const indicators = [
    { value: hospital.quantidade_leitos, label: "LEITOS" },
    { value: hospital.atendimento_24h ? "24h" : "—", label: "ATENDIMENTO" },
    { value: `${hospital.percentual_leitos_sus}%`, label: "DOS LEITOS AO SUS" },
    { value: hospital.ano_hospital_ensino, label: "HOSPITAL DE ENSINO" },
  ];
  const services = [
    { title: "ASSISTÊNCIA", text: hospital.servicos_assistenciais, tone: "hospital-service-assistance" },
    { title: "ALTA COMPLEXIDADE", text: hospital.servicos_alta_complexidade, tone: "hospital-service-complex" },
    { title: "DIAGNÓSTICO", text: hospital.servicos_diagnostico, tone: "hospital-service-diagnostic" },
  ];
  return (
    <article className="hospital-presentation" aria-label="Apresentação do Hospital Mário Palmério">
      <div className="hospital-slide">
        <aside className="hospital-institution hospital-slide-institution">
          <HospitalImage src={hospital.imagem_fachada_url} alt="Fachada do Hospital Mário Palmério" className="hospital-slide-facade" />
          <div className="hospital-slide-identity">
            <h2>{hospital.nome}<br />{hospital.tipo_prestador}</h2>
            <p className="hospital-slide-priority">Referência hospitalar prioritária<br />para o Projeto Uberaba</p>
            <p className="hospital-slide-description">A estrutura é tratada no projeto como ponto de sustentação para a formação da rede complementar e para a proposta de valor assistencial da Bensaúde.</p>
          </div>
        </aside>
        <div className="hospital-slide-content">
          <header className="hospital-slide-header">
            <p className="hospital-title">{hospital.nome_completo}</p>
            <h3>Estrutura, serviços e papel estratégico</h3>
          </header>
          <div className="hospital-slide-indicators">
            {indicators.map((item, i) => <div key={item.label} className={`hospital-slide-indicator ${i === 0 ? "hospital-slide-indicator-primary" : ""}`}><strong>{item.value}</strong><span>{item.label}</span></div>)}
          </div>
          <div className="hospital-slide-assistance">
            <HospitalImage src={hospital.imagem_assistencial_url} alt="Ambiente assistencial do Hospital Mário Palmério" className="hospital-slide-care-photo" />
            <div className="hospital-slide-services">
              {services.map(service => <section key={service.title} className={`hospital-slide-service ${service.tone}`}><h4>{service.title}</h4><p>{service.text}</p></section>)}
            </div>
          </div>
          <section className="hospital-slide-role" aria-label="Papel no Projeto">
            <h4>PAPEL NO PROJETO</h4><p>{hospital.papel_no_projeto}</p>
          </section>
          <footer className="hospital-slide-footer">
            <p>{hospital.endereco.replace(/\n/g, " • ")} • <a href={`tel:${hospital.telefone.replace(/\D/g, "")}`}>{hospital.telefone}</a> • <a href={`https://${hospital.site}`} target="_blank" rel="noreferrer">{hospital.site}</a></p>
            <p className="hospital-slide-signature">Projeto Uberaba | Bensaúde</p>
          </footer>
        </div>
      </div>
    </article>
  );
};
export default UberabaHospital;