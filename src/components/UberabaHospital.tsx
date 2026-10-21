import { useRef, useState } from "react";
import { ArrowUp, Building2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HOSPITAL_PALMERIO, type HospitalInstitucional } from "@/lib/uberabaHospital";

const scrollTo = (element: HTMLElement | null) => element?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });

function HospitalImage({ src, alt, logo = false }: { src: string | null; alt: string; logo?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div role="img" aria-label={alt} className={`hospital-placeholder flex items-center justify-center gap-2 rounded-md border border-border text-sm ${logo ? "h-16" : "aspect-video"}`}><Building2 className="h-4 w-4" />Imagem a inserir</div>;
  return <img src={src} alt={alt} onError={() => setFailed(true)} className={logo ? "h-16 w-full object-contain" : "h-auto w-full rounded-md object-cover"} />;
}

const UberabaHospital = ({ hospital = HOSPITAL_PALMERIO, onBack }: { hospital?: HospitalInstitucional; onBack: () => void }) => {
  const [expanded, setExpanded] = useState(false);
  const roleRef = useRef<HTMLElement>(null);
  const indicators = [
    { value: hospital.quantidade_leitos, label: "LEITOS" },
    { value: hospital.atendimento_24h ? "24h" : "—", label: "ATENDIMENTO" },
    { value: `${hospital.percentual_leitos_sus}%`, label: "DOS LEITOS DESTINADOS AO SUS" },
    { value: hospital.ano_hospital_ensino, label: "HOSPITAL DE ENSINO" },
  ];
  const services = [
    { title: "ASSISTÊNCIA", text: hospital.servicos_assistenciais, tone: "hospital-service-assistance" },
    { title: "ALTA COMPLEXIDADE", text: hospital.servicos_alta_complexidade, tone: "hospital-service-complex" },
    { title: "DIAGNÓSTICO", text: hospital.servicos_diagnostico, tone: "hospital-service-diagnostic" },
  ];
  return (
    <div className="hospital-executive grid shrink-0 grid-cols-1 gap-6 xl:grid-cols-[35fr_65fr]">
      <aside className="hospital-institution overflow-hidden rounded-md">
        <HospitalImage src={hospital.imagem_fachada_url} alt="Fachada do Hospital Mário Palmério" />
        <div className="space-y-5 p-6">
          <HospitalImage src={hospital.logo_url} alt="Logomarca do Hospital Mário Palmério" logo />
          <div><h3 className="text-3xl font-semibold">{hospital.nome}</h3><p className="hospital-institution-secondary mt-1 text-lg">{hospital.tipo_prestador}</p></div>
          <p className="text-xl font-semibold leading-snug">Referência hospitalar prioritária<br />para o Projeto Uberaba</p>
          <p className="hospital-institution-secondary text-base leading-relaxed">A estrutura é tratada no projeto como ponto de sustentação para a formação da rede complementar e para a proposta de valor assistencial da Bensaúde.</p>
          {hospital.imagem_panorama_url && <HospitalImage src={hospital.imagem_panorama_url} alt="Panorama do Hospital Mário Palmério" />}
        </div>
      </aside>
      <div className="min-w-0 space-y-5">
        <header><h2 className="hospital-title text-2xl font-bold uppercase">{hospital.nome_completo}</h2><p className="mt-1 text-lg font-medium">Estrutura, serviços e papel estratégico</p></header>
        <div className="space-y-2 text-base leading-relaxed"><p>{hospital.resumo_institucional}</p><p>A possível integração com o hospital deverá apoiar a implantação da operação, ampliar a capacidade de atendimento e fortalecer a credibilidade local do projeto.</p></div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {indicators.map((item, i) => <div key={item.label} className={`hospital-indicator flex min-h-28 flex-col items-center justify-center rounded-md border border-border px-3 py-4 text-center ${i === 0 ? "hospital-highlight" : ""}`}><strong className="text-4xl tabular-nums">{item.value}</strong><span className="mt-2 text-xs font-semibold leading-snug">{item.label}</span></div>)}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-controls="hospital-services">{expanded ? <ChevronUp /> : <ChevronDown />}Ver estrutura assistencial</Button>
          <Button variant="outline" onClick={() => scrollTo(roleRef.current)}><ArrowUp className="rotate-180" />Ver papel no projeto</Button>
          <Button variant="ghost" onClick={onBack}><ArrowUp />Voltar à Timeline</Button>
        </div>
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          <HospitalImage src={hospital.imagem_assistencial_url} alt="Ambiente assistencial do Hospital Mário Palmério" />
          <div id="hospital-services" className="space-y-3">
            {services.map(service => <div key={service.title} className={`hospital-service rounded-md border border-border border-l-4 px-4 py-3 ${service.tone}`}><h3 className="text-sm font-bold">{service.title}</h3>{expanded && <p className="hospital-secondary mt-2 text-sm leading-relaxed">{service.text}</p>}</div>)}
          </div>
        </div>
        <section ref={roleRef} className="hospital-highlight scroll-mt-4 px-5 py-4" aria-label="Papel no Projeto">
          <h3 className="text-sm font-bold">PAPEL NO PROJETO</h3><p className="mt-2 text-lg font-semibold leading-snug">{hospital.papel_no_projeto}</p><p className="mt-2 text-sm leading-relaxed">O hospital deverá funcionar como referência para a estruturação da rede complementar de médicos, clínicas, laboratórios e serviços de diagnóstico e terapia.</p>
        </section>
        <footer className="space-y-4 border-t border-border pt-4">
          <div className="flex flex-wrap items-start justify-between gap-4 text-sm"><p className="whitespace-pre-line">{hospital.endereco}</p><a className="hover:underline" href={`tel:${hospital.telefone.replace(/\D/g, "")}`}>{hospital.telefone}</a><Button asChild variant="link" className="h-auto p-0"><a href={`https://${hospital.site}`} target="_blank" rel="noreferrer">{hospital.site}<ExternalLink /></a></Button></div>
          <p className="hospital-secondary text-xs leading-relaxed">{hospital.observacao}</p>
        </footer>
      </div>
    </div>
  );
};
export default UberabaHospital;
