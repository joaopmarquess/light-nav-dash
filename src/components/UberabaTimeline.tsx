import { useState } from "react";

type Etapa = { nome: string; filhos?: string[]; texto?: string };

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

const ETAPAS: Etapa[] = [
  { nome: "Estudo", texto: LOREM },
  { nome: "Hospital Mário Palmério", texto: LOREM },
  { nome: "Modelo de Atuação", filhos: ["Operação Comercial", "Rede Assistencial"] },
  { nome: "Plano de Marketing", texto: LOREM },
  { nome: "Formalização", texto: LOREM },
  { nome: "Implantação", texto: LOREM },
];

const UberabaTimeline = () => {
  const [aberta, setAberta] = useState<string | null>(null);
  const atual = ETAPAS.find((e) => e.nome === aberta);

  return (
    <div className="flex h-full flex-col gap-6">
      <h1 className="text-lg font-semibold text-foreground">Timeline</h1>
      <div className="rounded-lg border border-border bg-card px-8 py-12">
        <div className="relative">
          <div className="absolute left-[8.33%] right-[8.33%] top-5 h-0.5 bg-border" />
          <ol className="relative grid grid-cols-6 gap-4">
            {ETAPAS.map((e, i) => {
              const on = aberta === e.nome;
              const clicavel = !!e.filhos || !!e.texto;
              return (
                <li key={e.nome} className="flex flex-col items-center gap-3 text-center">
                  <button
                    type="button"
                    disabled={!clicavel}
                    onClick={() => setAberta(on ? null : e.nome)}
                    className={`flex flex-col items-center gap-3 ${clicavel ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary text-sm font-semibold ${
                        on ? "bg-primary text-primary-foreground" : "bg-background text-primary"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className={`text-sm font-medium text-foreground ${clicavel ? "underline decoration-dotted underline-offset-4" : ""}`}>
                      {e.nome}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {(atual?.filhos || atual?.texto) && (
        <div className="-my-6 grid grid-cols-6 gap-4 px-8">
          <div
            className="flex justify-center"
            style={{ gridColumnStart: ETAPAS.indexOf(atual) + 1 }}
          >
            <div className="h-6 w-0.5 bg-primary" />
          </div>
        </div>
      )}

      {(atual?.filhos || atual?.texto) && (
        <div className="rounded-lg border border-border bg-card px-8 py-6">
          <p className="mb-4 text-sm font-semibold text-foreground">{atual.nome}</p>
          {atual.texto && <p className="text-sm leading-relaxed text-muted-foreground">{atual.texto}</p>}
          {atual.filhos && <div className="flex flex-wrap gap-4">
            {atual.filhos.map((f) => (
              <div key={f} className="rounded-md border border-border bg-muted/40 px-4 py-2 text-sm font-medium text-foreground">
                {f}
              </div>
            ))}
          </div>}
        </div>
      )}
    </div>
  );
};

export default UberabaTimeline;
