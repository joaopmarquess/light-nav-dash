import { useEffect, useRef, useState, type ReactNode } from "react";
import { MODELO } from "@/components/UberabaTimelineEtapas";
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
import { Building2, CalendarDays, FileCheck2, FileSignature, House, Megaphone, Rocket, Stethoscope, Tags } from "lucide-react";
import { CRONOGRAMA_UBERABA } from "@/lib/uberabaCronograma";
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
  { nome: "Plano de Ação", conteudo: <UberabaOperacaoIniciada /> },
];

const HOME = "Home";
const PLANO = "Plano de Ação";

// Submenus do Plano de Ação: Home mostra a apresentação "Operação Iniciada" (resultado esperado).
const SUB_PLANO = [
  { nome: HOME, icone: House },
  { nome: "Plano de Marketing", icone: Megaphone },
  { nome: "Formalização", icone: FileSignature },
  { nome: "Implantação", icone: Rocket },
] as const;
type SubPlano = (typeof SUB_PLANO)[number]["nome"];

// Faixa de datas: os itens planejados do cronograma (datas inalteradas), cada um levando à etapa/submenu correspondente.
const destinoAgenda = (item: string): { etapa: string; sub?: SubPlano; numero: string } => {
  if (item === "Operação Iniciada") return { etapa: PLANO, sub: HOME, numero: "3.1" };
  const sub = SUB_PLANO.findIndex((s) => s.nome === item);
  if (sub >= 0) return { etapa: PLANO, sub: SUB_PLANO[sub].nome, numero: `3.${sub + 1}` };
  return { etapa: item, numero: String(ETAPAS.findIndex((e) => e.nome === item) + 1) };
};
const AGENDA = Object.keys(CRONOGRAMA_UBERABA).map((item) => ({ item, ...destinoAgenda(item) }));

const FRENTES = [
  { nome: "Comercial", icone: Tags },
  { nome: "Rede Assistencial", icone: Stethoscope },
  { nome: "Guias", icone: FileCheck2 },
  { nome: "Escritório Local", icone: Building2 },
] as const;

// estudoSimulacoes: abre na etapa Estudo › Simulações (Resultados Comerciais é a primeira aba), pelo atalho da Home.
const UberabaTimeline = ({ estudoSimulacoes = false }: { estudoSimulacoes?: boolean } = {}) => {
  const [aberta, setAberta] = useState<string | null>(estudoSimulacoes ? "Estudo" : HOME);
  const [mostrarDatas, setMostrarDatas] = useState(false);
  const [navEstudo, setNavEstudo] = useState<HTMLDivElement | null>(null);
  const [frente, setFrente] = useState<(typeof FRENTES)[number]["nome"]>(FRENTES[0].nome);
  const [subPlano, setSubPlano] = useState<SubPlano>(HOME);
  const atual = ETAPAS.find((e) => e.nome === aberta);
  // vista: o que está na tela (no Plano de Ação, o submenu escolhido; "Operação Iniciada" = Home do Plano de Ação).
  const vista = aberta === PLANO ? (subPlano === HOME ? "Operação Iniciada" : subPlano) : aberta;
  const permiteRolagem = vista === "Estudo";
  const apresentacaoPropria = ["Operação Iniciada", "Plano de Marketing", "Formalização", "Modelo de Atuação", "Implantação"].includes(vista ?? "");
  const abrir = (etapa: string, sub: SubPlano = HOME) => { setAberta(etapa); setFrente(FRENTES[0].nome); setSubPlano(sub); };
  const agendaAtual = AGENDA.findIndex((a) => a.item === vista);
  const timelineRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0;
  }, [frente]);

  return (
    <div ref={timelineRef} className="timeline-workspace flex h-full min-h-0 flex-col gap-6">
      <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-2" aria-label="Navegação das etapas do projeto">
        <nav aria-label="Etapas do projeto" className="flex shrink-0 items-center">
          <ol className="flex items-center">
            {[HOME, ...ETAPAS.map((e) => e.nome)].map((nome, i) => {
              const on = aberta === nome;
              return (
                <li key={nome} className="flex items-center">
                  {i > 0 && <span aria-hidden className="mx-1 h-0.5 w-6 bg-border" />}
                  <button
                    type="button"
                    onClick={() => abrir(nome)}
                    aria-label={`Etapa ${i}: ${nome}`}
                    aria-current={on ? "step" : undefined}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${on ? "text-primary" : "text-foreground/80"}`}
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-primary text-xs font-semibold ${on ? "bg-primary text-primary-foreground" : "bg-background text-primary"}`}>{i}</span>
                    <span className={`whitespace-nowrap ${on ? "underline decoration-2 underline-offset-[6px]" : ""}`}>{nome}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
        {(aberta === "Estudo" || aberta === PLANO) && <span aria-hidden className="h-6 w-px bg-border" />}
        {aberta === "Estudo" && <div ref={setNavEstudo} className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2" />}
        {aberta === PLANO && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Submenus do Plano de Ação">
            {SUB_PLANO.map((s) => { const Icone = s.icone; const on = subPlano === s.nome; return <Button key={s.nome} variant={on ? "default" : "outline"} aria-pressed={on} onClick={() => setSubPlano(s.nome)}><Icone />{s.nome}</Button>; })}
          </div>
        )}
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
          <div className="absolute top-5 h-0.5 bg-border" style={{ left: `${50 / AGENDA.length}%`, right: `${50 / AGENDA.length}%` }} />
          <ol className="relative grid gap-4" style={{ gridTemplateColumns: `repeat(${AGENDA.length}, minmax(0, 1fr))` }}>
            {AGENDA.map((a, i) => {
              const on = i === agendaAtual;
              const clicavel = true;
              return (
                <li key={a.item} className="flex flex-col items-center gap-3 text-center">
                  <button
                    type="button"
                    disabled={!clicavel}
                    onClick={() => abrir(a.etapa, a.sub)}
                    className={`flex flex-col items-center gap-3 ${clicavel ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary text-sm font-semibold ${
                        on ? "bg-primary text-primary-foreground" : "bg-background text-primary"
                      }`}
                    >
                      {a.numero}
                    </span>
                    <span className={`text-sm font-medium text-foreground ${clicavel ? "underline decoration-dotted underline-offset-4" : ""}`}>
                      {a.item}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {mostrarDatas && <UberabaCronograma />}
        </div>
      </div>}

      {mostrarDatas && agendaAtual >= 0 && (
        <div className="-my-6 grid gap-4 px-8" style={{ gridTemplateColumns: `repeat(${AGENDA.length}, minmax(0, 1fr))` }}>
          <div
            className="flex justify-center"
            style={{ gridColumnStart: agendaAtual + 1 }}
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
          {vista === "Operação Iniciada" ? <UberabaOperacaoIniciada key="plano-home" /> : vista === "Plano de Marketing" ? <UberabaMarketing key="plano-marketing" /> : vista === "Formalização" ? <UberabaFormalizacao key="plano-formalizacao" /> : vista === "Implantação" ? <UberabaImplantacao key="plano-implantacao" /> : atual.nome === "Estudo" ? (
            <UberabaEstudoMapas navTarget={navEstudo} visaoInicial={estudoSimulacoes ? "simulacoes" : "home"} />
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
          {(
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
