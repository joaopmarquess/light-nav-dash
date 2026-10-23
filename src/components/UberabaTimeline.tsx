import { useEffect, useRef, useState, type ReactNode } from "react";
import { HOSPITAL, MODELO, MARKETING, FORMALIZACAO, IMPLANTACAO } from "@/components/UberabaTimelineEtapas";
import { Button } from "@/components/ui/button";
import UberabaTabelasComerciais, { ReferenciaButton } from "@/components/UberabaTabelasComerciais";
import UberabaRedeAssistencial from "@/components/UberabaRedeAssistencial";
import UberabaEstudoMapas from "@/components/UberabaEstudoMapas";
import UberabaHospital from "@/components/UberabaHospital";
import UberabaMarketing from "@/components/UberabaMarketing";
import UberabaFormalizacao from "@/components/UberabaFormalizacao";
import UberabaImplantacao from "@/components/UberabaImplantacao";
import UberabaGuias from "@/components/UberabaGuias";
import UberabaOperacaoIniciada from "@/components/UberabaOperacaoIniciada";
import { CalendarDays, FileCheck2 } from "lucide-react";
import UberabaCronograma from "@/components/UberabaCronograma";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import TimelinePresentationHeader from "@/components/TimelinePresentationHeader";
import UberabaPresentationPdfButton from "@/components/UberabaPresentationPdfButton";

type Etapa = { nome: string; filhos?: string[]; texto?: string; conteudo?: ReactNode };



const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

const ETAPAS: Etapa[] = [
  { nome: "Estudo", conteudo: <UberabaEstudoMapas /> },
  { nome: "Hospital Mário Palmério", conteudo: HOSPITAL },
  { nome: "Modelo de Atuação", conteudo: MODELO },
  { nome: "Plano de Marketing", conteudo: MARKETING },
  { nome: "Formalização", conteudo: FORMALIZACAO },
  { nome: "Implantação", conteudo: IMPLANTACAO },
  { nome: "Operação Iniciada", conteudo: <UberabaOperacaoIniciada /> },
];

const UberabaTimeline = () => {
  const [aberta, setAberta] = useState<string | null>("Estudo");
  const [mostrarDatas, setMostrarDatas] = useState(false);
  const [sub, setSub] = useState<"Comercial" | "Rede Assistencial" | "Guias" | null>(null);
  const atual = ETAPAS.find((e) => e.nome === aberta);
  const permiteRolagem = ["Estudo", "Plano de Marketing"].includes(aberta ?? "");
  const apresentacaoPropria = ["Hospital Mário Palmério", "Operação Iniciada"].includes(aberta ?? "") || (["Plano de Marketing", "Formalização", "Modelo de Atuação", "Implantação"].includes(aberta ?? ""));
  const timelineRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0;
  }, [sub]);
  useEffect(() => {
    if (aberta !== "Hospital Mário Palmério") return;
    if (panelRef.current) panelRef.current.scrollTop = 0;
    panelRef.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [aberta]);
  const voltarTimeline = () => {
    if (panelRef.current) panelRef.current.scrollTop = 0;
    timelineRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
  };

  return (
    <div ref={timelineRef} className="timeline-workspace flex h-full min-h-0 flex-col gap-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">Projeto Bensaúde|Uberaba</h1>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant={mostrarDatas ? "default" : "outline"} aria-label={mostrarDatas ? "Ocultar datas planejadas" : "Mostrar datas planejadas"} aria-pressed={mostrarDatas} onClick={() => setMostrarDatas(!mostrarDatas)}>
                <CalendarDays className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{mostrarDatas ? "Ocultar datas planejadas" : "Mostrar datas planejadas"}</TooltipContent>
          </Tooltip>
          {mostrarDatas && <span className="text-xs font-medium text-muted-foreground">Datas planejadas</span>}
        </div>
        <div className="ml-auto shrink-0"><UberabaPresentationPdfButton iconOnly /></div>
      </div>
      <div className="shrink-0 overflow-x-auto rounded-lg border border-border bg-card px-8 py-4">
        <div className="relative min-w-[840px] md:min-w-0">
          <div className="absolute left-[7.14%] right-[7.14%] top-5 h-0.5 bg-border" />
          <ol className="relative grid grid-cols-7 gap-4">
            {ETAPAS.map((e, i) => {
              const on = aberta === e.nome;
              const clicavel = !!e.filhos || !!e.texto || !!e.conteudo;
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
          {mostrarDatas && <UberabaCronograma />}
        </div>
      </div>

      {(atual?.filhos || atual?.texto || atual?.conteudo) && (
        <div className="-my-6 grid grid-cols-7 gap-4 px-8">
          <div
            className="flex justify-center"
            style={{ gridColumnStart: ETAPAS.indexOf(atual) + 1 }}
          >
            <div className="h-6 w-0.5 bg-primary" />
          </div>
        </div>
      )}

      {(atual?.filhos || atual?.texto || atual?.conteudo) && (
        <div ref={panelRef} data-expansivel={permiteRolagem} className={`timeline-stage-panel flex min-h-0 w-full flex-1 flex-col rounded-lg border border-border bg-card ${permiteRolagem ? "overflow-auto" : "timeline-stage-static"} ${apresentacaoPropria ? "" : "px-4 py-4 sm:px-8"}`}>
          {!apresentacaoPropria && !(atual.nome === "Estudo") && <div className="mb-5"><TimelinePresentationHeader title={atual.nome} /></div>}
          {atual.nome === "Operação Iniciada" ? <UberabaOperacaoIniciada /> : atual.nome === "Hospital Mário Palmério" ? <UberabaHospital onBack={voltarTimeline} /> : atual.nome === "Plano de Marketing" ? <UberabaMarketing /> : atual.nome === "Formalização" ? <UberabaFormalizacao /> : atual.nome === "Implantação" ? <UberabaImplantacao /> : atual.nome === "Estudo" ? (
            <UberabaEstudoMapas />
          ) : atual.nome === "Modelo de Atuação" ? (
            <article className="timeline-presentation modelo-presentation" aria-label="Modelo de Atuação do Bensaúde|Uberaba">
              <div className="modelo-heading">
                <TimelinePresentationHeader title="Modelo de Atuação" subtitle="Operação comercial, rede assistencial e jornada digital" />
                <div className="modelo-controls" role="group" aria-label="Frentes do modelo de atuação">
                  {(["Comercial", "Rede Assistencial", "Guias"] as const).map((b) => (
                    <Button key={b} variant={sub === b ? "default" : "outline"} onClick={() => setSub(sub === b ? null : b)} aria-pressed={sub === b}>{b === "Guias" && <FileCheck2 className="h-4 w-4" />}{b}</Button>
                  ))}
                  {sub === "Comercial" && <ReferenciaButton />}
                </div>
              </div>
              {sub === null && <div className="modelo-fronts">
                {[
                  { nome: "Comercial", texto: "PCA / ACIU, PCE 50 a 99 e PCE 100+", cor: "comercial" },
                  { nome: "Rede Assistencial", texto: "Referências médicas, diagnóstico e terapia e profissionais não médicos", cor: "rede" },
                  { nome: "Guias", texto: "Carteirinha virtual, autorização online, auditoria remota e atendimento digital", cor: "guias" },
                ].map((f, i) => <section key={f.nome} className={`modelo-front modelo-front-${f.cor}`}><span>{i + 1}</span><h3>{f.nome}</h3><p>{f.texto}</p><Button variant="outline" onClick={() => setSub(f.nome as "Comercial" | "Rede Assistencial" | "Guias")}>{f.nome}</Button></section>)}
              </div>}
              {sub === "Comercial" && <UberabaTabelasComerciais />}
               {sub === "Rede Assistencial" && <UberabaRedeAssistencial />}
               {sub === "Guias" && <UberabaGuias onBack={() => { setSub(null); if (panelRef.current) panelRef.current.scrollTop = 0; }} />}
            </article>
          ) : (
            <p className="text-justify text-xl leading-7 text-foreground/85 hyphens-auto" lang="pt-BR">{LOREM}</p>
          )}
          {!["Hospital Mário Palmério", "Operação Iniciada"].includes(atual.nome) && (
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
