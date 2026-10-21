import { mesesPlanejadosUberaba } from "@/lib/uberabaCronograma";

const UberabaCronograma = () => (
  <div className="timeline-heat" aria-label="Cronograma planejado por mês">
    <div className="timeline-heat-band">
      {mesesPlanejadosUberaba().map(({ data, etapas }) => (
        <div key={data} className={`timeline-heat-month timeline-heat-level-${etapas.length}`} style={{ gridColumn: `span ${etapas.length}` }}>
          <div className="timeline-heat-ticks" aria-hidden="true">{etapas.map((etapa) => <span key={etapa} />)}</div>
          <strong>{data}</strong>
          <span>{etapas.length} {etapas.length === 1 ? "etapa" : "etapas"}</span>
        </div>
      ))}
    </div>
    <div className="timeline-heat-legend"><span>Concentração de etapas</span><i className="timeline-heat-level-1" /> <span>1</span><i className="timeline-heat-level-2" /> <span>2</span><i className="timeline-heat-level-3" /> <span>3</span></div>
  </div>
);

export default UberabaCronograma;