const ETAPAS = ["Estudo", "Modelo de Atuação", "Plano de Marketing", "Formalização", "Implantação"];

const UberabaTimeline = () => (
  <div className="flex h-full flex-col gap-6">
    <h1 className="text-lg font-semibold text-foreground">Timeline</h1>
    <div className="rounded-lg border border-border bg-card px-8 py-12">
      <div className="relative">
        <div className="absolute left-[10%] right-[10%] top-5 h-0.5 bg-border" />
        <ol className="relative grid grid-cols-5">
          {ETAPAS.map((e, i) => (
            <li key={e} className="flex flex-col items-center gap-3 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-background text-sm font-semibold text-primary">
                {i + 1}
              </span>
              <span className="text-sm font-medium text-foreground">{e}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  </div>
);

export default UberabaTimeline;
