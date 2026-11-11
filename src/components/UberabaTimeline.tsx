import { useEffect, useRef, useState, type ReactNode } from "react";
import { MODELO, MARKETING, FORMALIZACAO, IMPLANTACAO } from "@/components/UberabaTimelineEtapas";
import { Button } from "@/components/ui/button";
import UberabaEstudoMapas from "@/components/UberabaEstudoMapas";
import UberabaMarketing from "@/components/UberabaMarketing";
import UberabaFormalizacao from "@/components/UberabaFormalizacao";
import UberabaImplantacao from "@/components/UberabaImplantacao";
import UberabaOperacaoIniciada from "@/components/UberabaOperacaoIniciada";
import UberabaGuias from "@/components/UberabaGuias";
import { COMERCIAL_UBERABA, ESCRITORIO_UBERABA, REDE_UBERABA } from "@/lib/uberabaFrentes";
import UberabaModeloFrente from "@/components/UberabaModeloFrente";
import outdoorImagem from "@/assets/projeto-uberaba-home-v2.svg.asset.json";
import { Building2, CalendarDays, ChevronDown, FileCheck2, Stethoscope, Tags } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import UberabaCronograma from "@/components/UberabaCronograma";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import TimelinePresentationHeader from "@/components/TimelinePresentationHeader";
import UberabaPresentationPdfButton from "@/components/UberabaPresentationPdfButton";

type Etapa = { nome: string; filhos?: string[]; texto?: string; conteudo?: ReactNode };



const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

const ETAPAS: Etapa[] = [
  { nome: "Estudo", conteudo: <UberabaEstudoMapas /> },
  { nome: "Modelo de Atuação", conteudo: MODELO },
  { nome: "Plano de Marketing", conteudo: MARKETING },
  { nome: "Formalização", conteudo: FORMALIZACAO },
  { nome: "Implantação", conteudo: IMPLANTACAO },
  { nome: "Operação Iniciada", conteudo: <UberabaOperacaoIniciada /> },
];

const HOME = "Home";

const FRENTES = [
  { nome: "Comercial", icone: Tags },
  { nome: "Rede Assistencial", icone: Stethoscope },
  { nome: "Guias", icone: FileCheck2 },
  { nome: "Escritório Local", icone: Building2 },
] as const;

const UberabaTimeline = () => {
  const [aberta, setAberta] = useState<string | null>(HOME);
  const [mostrarDatas, setMostrarDatas] = useState(false);
  const [navEstudo, setNavEstudo] = useState<HTMLDivElement | null>(null);
  const [frente, setFrente] = useState<(typeof FRENTES)[number]["nome"]>(FRENTES[0].nome);
  const atual = ETAPAS.find((e) => e.nome === aberta);
  const permiteRolagem = ["Estudo", "Plano de Marketing"].includes(aberta ?? "");
  const apresentacaoPropria = ["Operação Iniciada", "Plano de Marketing", "Formalização", "Modelo de Atuação", "Implantação"].includes(aberta ?? "");
  const timelineRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0;
  }, [frente]);

  return (
    <div ref={timelineRef} className="timeline-workspace flex h-full min-h-0 flex-col gap-6">
      <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-2" aria-label="Navegação das etapas do projeto">
        <span className="text-sm font-medium text-muted-foreground">Etapa</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 min-w-[280px] justify-between gap-3" aria-label={`Etapa do projeto: ${aberta === HOME ? HOME : atual ? atual.nome : "nenhuma"}`}>
              <span className="flex min-w-0 items-center gap-2">
                {(atual || aberta === HOME) && <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{atual ? ETAPAS.indexOf(atual) + 1 : 0}</span>}
                <span className="truncate">{atual ? atual.nome : aberta === HOME ? HOME : "Selecione uma etapa"}</span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[280px]">
            <DropdownMenuLabel>Etapas do projeto</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => { setAberta(HOME); setFrente(FRENTES[0].nome); }} className={aberta === HOME ? "bg-accent text-primary" : undefined} aria-current={aberta === HOME ? "step" : undefined}>
              <span className={`mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-primary text-xs font-semibold ${aberta === HOME ? "bg-primary text-primary-foreground" : "bg-background text-primary"}`}>0</span>
              {HOME}
            </DropdownMenuItem>
            {ETAPAS.map((e, i) => {
              const on = aberta === e.nome;
              return (
                <DropdownMenuItem key={e.nome} onSelect={() => { setAberta(e.nome); setFrente(FRENTES[0].nome); }} className={on ? "bg-accent text-primary" : undefined} aria-current={on ? "step" : undefined}>
                  <span className={`mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-primary text-xs font-semibold ${on ? "bg-primary text-primary-foreground" : "bg-background text-primary"}`}>{i + 1}</span>
                  {e.nome}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        {aberta === "Estudo" && <div ref={setNavEstudo} className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2" />}
        <div className="ml-auto flex shrink-0 items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" className="h-9 w-9" variant={mostrarDatas ? "default" : "outline"} aria-label={mostrarDatas ? "Ocultar datas planejadas" : "Mostrar datas planejadas"} aria-pressed={mostrarDatas} onClick={() => setMostrarDatas(!mostrarDatas)}>
                  <CalendarDays className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{mostrarDatas ? "Ocultar datas planejadas" : "Mostrar datas planejadas"}</TooltipContent>
            </Tooltip>
            {mostrarDatas && <span className="text-xs font-medium text-muted-foreground">Datas planejadas</span>}
          <UberabaPresentationPdfButton iconOnly />
        </div>
      </div>
      {mostrarDatas && <div className="relative shrink-0 overflow-x-auto rounded-lg border border-border bg-card px-8 py-4" aria-label="Datas planejadas por etapa">
        <div className="relative min-w-[840px] md:min-w-0">
          <div className="absolute top-5 h-0.5 bg-border" style={{ left: `${50 / ETAPAS.length}%`, right: `${50 / ETAPAS.length}%` }} />
          <ol className="relative grid gap-4" style={{ gridTemplateColumns: `repeat(${ETAPAS.length}, minmax(0, 1fr))` }}>
            {ETAPAS.map((e, i) => {
              const on = aberta === e.nome;
              const clicavel = !!e.filhos || !!e.texto || !!e.conteudo;
              return (
                <li key={e.nome} className="flex flex-col items-center gap-3 text-center">
                  <button
                    type="button"
                    disabled={!clicavel}
                    onClick={() => { setAberta(e.nome); setFrente(FRENTES[0].nome); }}
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
          {mostrarDatas && <UberabaCronograma />}
        </div>
      </div>}

      {mostrarDatas && (atual?.filhos || atual?.texto || atual?.conteudo) && (
        <div className="-my-6 grid gap-4 px-8" style={{ gridTemplateColumns: `repeat(${ETAPAS.length}, minmax(0, 1fr))` }}>
          <div
            className="flex justify-center"
            style={{ gridColumnStart: ETAPAS.indexOf(atual) + 1 }}
          >
            <div className="h-6 w-0.5 bg-primary" />
          </div>
        </div>
      )}

      {aberta === HOME && (
        <section aria-label="Home do projeto" className="timeline-stage-panel flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-lg border border-border bg-card p-4">
          <img src={outdoorImagem.url} loading="eager" decoding="sync" alt="Outdoor do Bensaúde com Hospital Mário Palmério e SIGA: Estamos chegando, Uberaba" className="h-full max-h-full w-full object-contain" />
        </section>
      )}

      {(atual?.filhos || atual?.texto || atual?.conteudo) && (
        <div ref={panelRef} data-expansivel={permiteRolagem} className={`timeline-stage-panel flex min-h-0 w-full flex-1 flex-col rounded-lg border border-border bg-card ${permiteRolagem ? "overflow-auto" : "timeline-stage-static"} ${apresentacaoPropria ? "" : "px-4 py-4 sm:px-8"}`}>
          {!apresentacaoPropria && !(atual.nome === "Estudo") && <div className="mb-5"><TimelinePresentationHeader title={atual.nome} /></div>}
          {atual.nome === "Operação Iniciada" ? <UberabaOperacaoIniciada /> : atual.nome === "Plano de Marketing" ? <UberabaMarketing /> : atual.nome === "Formalização" ? <UberabaFormalizacao /> : atual.nome === "Implantação" ? <UberabaImplantacao /> : atual.nome === "Estudo" ? (
            <UberabaEstudoMapas navTarget={navEstudo} />
          ) : atual.nome === "Modelo de Atuação" ? (
            <article className="timeline-presentation modelo-presentation modelo-guias-aberta" aria-label="Modelo de Atuação do Bensaúde|Uberaba">
              <div className="modelo-menu" role="group" aria-label="Frentes do Modelo de Atuação">
                {FRENTES.map((f) => { const Icone = f.icone; return <Button key={f.nome} variant={frente === f.nome ? "default" : "outline"} aria-pressed={frente === f.nome} onClick={() => setFrente(f.nome)}><Icone className="h-4 w-4" />{f.nome}</Button>; })}
              </div>
              {frente === "Comercial" && <UberabaModeloFrente key="comercial" content={COMERCIAL_UBERABA} />}
              {frente === "Rede Assistencial" && <UberabaModeloFrente key="rede" content={REDE_UBERABA} />}
              {frente === "Guias" && <UberabaGuias key="guias" />}
              {frente === "Escritório Local" && <UberabaModeloFrente key="escritorio" content={ESCRITORIO_UBERABA} />}
            </article>
          ) : (
            <p className="text-justify text-xl leading-7 text-foreground/85 hyphens-auto" lang="pt-BR">{LOREM}</p>
          )}
          {atual.nome !== "Operação Iniciada" && (
            <footer className="mt-auto shrink-0 px-4 pb-4 pt-5 text-right text-base font-bold text-primary sm:px-8">
              Bensaúde|Uberaba
            </footer>
          )}
        </div>
      )}
    </div>
  );
};

export default UberabaTimeline;
