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
import { Building2, FileCheck2, FileSignature, House, Megaphone, Rocket, Stethoscope, Tags } from "lucide-react";
import TimelinePresentationHeader from "@/components/TimelinePresentationHeader";

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

const FRENTES = [
  { nome: "Comercial", icone: Tags },
  { nome: "Rede Assistencial", icone: Stethoscope },
  { nome: "Guias", icone: FileCheck2 },
  { nome: "Escritório Local", icone: Building2 },
] as const;

// estudoSimulacoes: abre na etapa Estudo › Simulações (Resultados Comerciais é a primeira aba), pelo atalho da Home.
const UberabaTimeline = ({ estudoSimulacoes = false }: { estudoSimulacoes?: boolean } = {}) => {
  const [aberta, setAberta] = useState<string | null>(estudoSimulacoes ? "Estudo" : HOME);
  const [navEstudo, setNavEstudo] = useState<HTMLDivElement | null>(null);
  // Canto direito da barra: botões e ícones da tela aberta (ex.: Referência, Proposta, Voltar às Tabelas), vindos de cada tela.
  const [acoesTela, setAcoesTela] = useState<HTMLDivElement | null>(null);
  const [frente, setFrente] = useState<(typeof FRENTES)[number]["nome"]>(FRENTES[0].nome);
  const [subPlano, setSubPlano] = useState<SubPlano>(HOME);
  const atual = ETAPAS.find((e) => e.nome === aberta);
  // vista: o que está na tela (no Plano de Ação, o submenu escolhido; "Operação Iniciada" = Home do Plano de Ação).
  const vista = aberta === PLANO ? (subPlano === HOME ? "Operação Iniciada" : subPlano) : aberta;
  const permiteRolagem = vista === "Estudo";
  const apresentacaoPropria = ["Operação Iniciada", "Plano de Marketing", "Formalização", "Modelo de Atuação", "Implantação"].includes(vista ?? "");
  const abrir = (etapa: string, sub: SubPlano = HOME) => { setAberta(etapa); setFrente(FRENTES[0].nome); setSubPlano(sub); };
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
        {aberta === "Estudo" && <div ref={setNavEstudo} className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-2" />}
        {aberta === PLANO && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Submenus do Plano de Ação">
            {SUB_PLANO.map((s) => { const Icone = s.icone; const on = subPlano === s.nome; return <Button key={s.nome} variant={on ? "default" : "outline"} aria-pressed={on} onClick={() => setSubPlano(s.nome)}><Icone />{s.nome}</Button>; })}
          </div>
        )}
        <div ref={setAcoesTela} aria-label="Ações da tela" className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2 empty:hidden" />
      </div>

      {aberta === HOME && (
        <section aria-label="Home do projeto" className="timeline-stage-panel flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-lg border border-border bg-card p-4">
          <img src={outdoorImagem.url} loading="eager" decoding="sync" alt="Outdoor do Bensaúde com Hospital Mário Palmério e SIGA: Estamos chegando, Uberaba" className="h-full max-h-full w-full object-contain" />
        </section>
      )}

      {(atual?.filhos || atual?.texto || atual?.conteudo) && (
        <div ref={panelRef} data-expansivel={permiteRolagem} className={`timeline-stage-panel flex min-h-0 w-full flex-1 flex-col rounded-lg border border-border bg-card ${permiteRolagem ? "overflow-auto" : "timeline-stage-static"} ${apresentacaoPropria ? "" : "px-4 py-4 sm:px-8"}`}>
          {!apresentacaoPropria && !(atual.nome === "Estudo") && <div className="mb-5"><TimelinePresentationHeader title={atual.nome} /></div>}
          {vista === "Operação Iniciada" ? <UberabaOperacaoIniciada key="plano-home" /> : vista === "Plano de Marketing" ? <UberabaMarketing key="plano-marketing" /> : vista === "Formalização" ? <UberabaFormalizacao key="plano-formalizacao" /> : vista === "Implantação" ? <UberabaImplantacao key="plano-implantacao" /> : atual.nome === "Estudo" ? (
            <UberabaEstudoMapas navTarget={navEstudo} acoesTarget={acoesTela} visaoInicial={estudoSimulacoes ? "simulacoes" : "home"} />
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
