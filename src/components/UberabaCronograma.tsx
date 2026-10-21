import { mesesPlanejadosUberaba } from "@/lib/uberabaCronograma";
import { Button } from "@/components/ui/button";
import UberabaCalendario from "@/components/UberabaCalendario";

const UberabaCronograma = () => (
  <div className="timeline-heat" aria-label="Cronograma planejado por mês">
    <div className="timeline-heat-band">
      {mesesPlanejadosUberaba().map(({ data, etapas }) => (
        <UberabaCalendario key={data} trigger={<Button variant="ghost" aria-label={`Abrir calendário: ${data}`} className={`timeline-heat-month timeline-heat-level-${etapas.length} hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring`} style={{ gridColumn: `span ${etapas.length}` }}>
          <span className="timeline-heat-ticks" aria-hidden="true">{etapas.map((etapa) => <span key={etapa} />)}</span>
          <strong>{data}</strong>
          <span>{etapas.length} {etapas.length === 1 ? "etapa" : "etapas"}</span>
        </Button>} />
      ))}
    </div>
    <div className="timeline-heat-legend"><span>Concentração de etapas</span><i className="timeline-heat-level-1" /> <span>1</span><i className="timeline-heat-level-2" /> <span>2</span><i className="timeline-heat-level-3" /> <span>3</span></div>
  </div>
);

export default UberabaCronograma;