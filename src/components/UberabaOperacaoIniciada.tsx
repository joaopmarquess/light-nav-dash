import { OPERACAO_UBERABA } from "@/lib/uberabaOperacao";
import { ArrowDown, ArrowRight, RefreshCw, Waypoints } from "lucide-react";
import TimelinePresentationHeader from "@/components/TimelinePresentationHeader";

export default function UberabaOperacaoIniciada() {
  return (
    <section className="uberaba-operacao" aria-labelledby="operacao-titulo">
      <div className="operacao-page">
        <TimelinePresentationHeader title="Operação Iniciada" titleId="operacao-titulo" subtitle="Tudo convergindo para a operação iniciada" />
        <div className="operacao-diagram">
          <ol className="operacao-fronts" aria-label="Frentes do projeto">
            {OPERACAO_UBERABA.frentes.map((frente, index) => (
              <li key={frente.id} className={`operacao-front operacao-tone-${frente.cor}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{frente.titulo}</h3><p>{frente.descricao}</p></div>
              </li>
            ))}
          </ol>
          <div className="operacao-connections"><svg viewBox="0 0 100 600" preserveAspectRatio="none" aria-hidden="true">
            {[50, 150, 250, 350, 450, 550].map((y) => <path key={y} d={`M0 ${y} C55 ${y} 45 300 100 300`} />)}
          </svg></div>
          <div className="operacao-alignment">
            <Waypoints aria-hidden="true" />
            <h3>ALINHAMENTO<br />E EXECUÇÃO</h3>
          </div>
          <div className="operacao-arrow"><span>TUDO CONFORME<br />PLANEJADO</span><ArrowRight className="operacao-arrow-right" aria-hidden="true" /><ArrowDown className="operacao-arrow-down" aria-hidden="true" /></div>
          <section className="operacao-outcome" aria-labelledby="operacao-resultado">
            <p className="operacao-expected">RESULTADO ESPERADO</p>
            <h3 id="operacao-resultado">{OPERACAO_UBERABA.resultado}</h3>
            <p className="operacao-description">{OPERACAO_UBERABA.descricao}</p>
            <div className="operacao-monitor"><RefreshCw aria-hidden="true" /><p>MONITORAR E EVOLUIR</p></div>
          </section>
        </div>
        <footer className="operacao-footer">“Operação Iniciada” representa o resultado esperado do projeto, não uma operação já iniciada.</footer>
      </div>
    </section>
  );
}