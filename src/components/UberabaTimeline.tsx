type Etapa = { nomes: string[]; filhos?: string[] };

const ETAPAS: Etapa[] = [
  { nomes: ["Estudo", "Hospital Mário Palmério"] },
  { nomes: ["Modelo de Atuação"], filhos: ["Operação Comercial", "Rede Assistencial"] },
  { nomes: ["Plano de Marketing"] },
  { nomes: ["Formalização"] },
  { nomes: ["Implantação"] },
];

const UberabaTimeline = () => (
  <div className="flex h-full flex-col gap-6">
    <h1 className="text-lg font-semibold text-foreground">Timeline</h1>
    <div className="rounded-lg border border-border bg-card px-8 py-12">
      <div className="relative">
        <div className="absolute left-[10%] right-[10%] top-5 h-0.5 bg-border" />
        <ol className="relative grid grid-cols-5 gap-4">
          {ETAPAS.map((e, i) => (
            <li key={i} className="flex flex-col items-center gap-3 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-background text-sm font-semibold text-primary">
                {i + 1}
              </span>
              <div className="flex flex-col items-center gap-2">
                {e.nomes.map((n) => (
                  <span key={n} className="text-sm font-medium text-foreground">{n}</span>
                ))}
              </div>
              {e.filhos && (
                <div className="flex flex-col items-center">
                  <div className="h-4 w-px bg-border" />
                  <ul className="flex flex-col gap-2">
                    {e.filhos.map((f) => (
                      <li key={f} className="rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  </div>
);

export default UberabaTimeline;
