import { useEffect, useRef, useState, type ReactNode } from "react";
import { HOSPITAL, MODELO, MARKETING, FORMALIZACAO, IMPLANTACAO } from "@/components/UberabaTimelineEtapas";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import { HOSPITAL_PALMERIO } from "@/lib/uberabaHospital";
import campanha from "@/assets/uberaba-marketing-outdoor-sem-exclamacao.png";
import operacaoDigital from "@/assets/uberaba-guias-operacao-digital.jpg";

type Etapa = { nome: string; filhos?: string[]; texto?: string; conteudo?: ReactNode };

const ESTUDO = `O estudo para o **Bensaúde|Uberaba** partiu de uma **leitura ampla do mercado** e da convicção de que a entrada do Bensaúde na cidade não poderia ser tratada apenas como uma **expansão comercial**. Buscamos compreender o território, sua dinâmica empresarial, sua influência regional e, sobretudo, sua reconhecida **vocação para a saúde e para a medicina**. A partir dessa visão, o projeto passou a ser construído para integrar **presença institucional**, **capacidade assistencial** e **desenvolvimento de mercado**.

A **estrutura assistencial** recebeu atenção especial. Avaliamos a necessidade de uma **referência hospitalar**, a composição de uma **rede médica por especialidade** e a disponibilidade de **serviços de diagnóstico e terapia**. Comparamos redes já existentes em Uberaba e utilizamos também a experiência do próprio Bensaúde em **São José do Rio Preto** como parâmetro para dimensionamento. O objetivo não foi simplesmente reproduzir uma rede, mas entender que estrutura seria necessária para sustentar uma **operação competitiva e confiável**.

Na frente comercial, o estudo evoluiu para **três modelos distintos de atuação**: **PCA/ACIU**, direcionado ao mercado de adesão; **PCE 50 a 99**, voltado às médias empresas; e **PCE 100+**, destinado às empresas de maior porte. Para cada frente analisamos públicos, volumes potenciais, tabelas, formas de participação e possíveis composições entre **Operadora, Administradora, Corretora e equipe própria**. Essa segmentação mostrou que Uberaba não deve ser abordada com uma única estratégia comercial, mas com propostas adequadas às características de cada mercado.

Também estudamos quem poderia caminhar conosco na implantação. O relacionamento com o **Hospital Mário Palmério**, a participação da **SIGA Soluções** e as alternativas envolvendo a **Lancers** foram incorporados ao desenho como possibilidades de construir presença local com parceiros já inseridos no ambiente da cidade. Mais do que contratar fornecedores, a proposta é estabelecer conexões que aproximem o Bensaúde da comunidade médica, das empresas, das entidades e dos demais agentes que formam o **ecossistema de saúde de Uberaba**.

Por fim, o projeto passou a considerar não apenas como vender em Uberaba, mas **como chegar a Uberaba**. O Bensaúde ainda não possui na cidade o reconhecimento que construiu nos mercados onde atua, e isso exige uma **estratégia própria de apresentação**. A mensagem pretendida parte de uma posição transparente: **estamos chegando, acreditamos em Uberaba**, reconhecemos sua história, sua força econômica e sua vocação para a saúde, e queremos investir na cidade conectando empresas, profissionais, prestadores e pessoas. É essa combinação entre estudo de mercado, rede assistencial, estratégia comercial, parcerias e **construção de marca** que dá sentido ao **modelo de atuação proposto**.`;

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

const ETAPAS: Etapa[] = [
  { nome: "Estudo", texto: ESTUDO },
  { nome: "Hospital Mário Palmério", conteudo: HOSPITAL },
  { nome: "Modelo de Atuação", conteudo: MODELO },
  { nome: "Plano de Marketing", conteudo: MARKETING },
  { nome: "Formalização", conteudo: FORMALIZACAO },
  { nome: "Implantação", conteudo: IMPLANTACAO },
  { nome: "Operação Iniciada", conteudo: <UberabaOperacaoIniciada /> },
];

const UberabaTimeline = () => {
  const [aberta, setAberta] = useState<string | null>(null);
  const [mostrarDatas, setMostrarDatas] = useState(false);
  const [versao, setVersao] = useState<"simples" | "completa">("simples");
  const [sub, setSub] = useState<"Comercial" | "Rede Assistencial" | "Guias" | null>(null);
  const atual = ETAPAS.find((e) => e.nome === aberta);
  const permiteRolagem = versao === "simples" && ["Estudo", "Plano de Marketing", "Modelo de Atuação"].includes(aberta ?? "");
  const apresentacaoPropria = ["Hospital Mário Palmério", "Operação Iniciada"].includes(aberta ?? "") || (versao === "simples" && ["Plano de Marketing", "Formalização", "Modelo de Atuação", "Implantação"].includes(aberta ?? ""));
  const timelineRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const imagens = [HOSPITAL_PALMERIO.imagem_fachada_url, HOSPITAL_PALMERIO.imagem_assistencial_url, campanha, operacaoDigital];
    imagens.forEach((src) => {
      if (!src) return;
      const imagem = new Image();
      if (src === campanha) imagem.fetchPriority = "high";
      imagem.src = src;
      if (typeof imagem.decode === "function") void imagem.decode().catch(() => undefined);
    });
  }, []);
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
          <h1 className="text-lg font-semibold text-foreground">Timeline · Bensaúde|Uberaba</h1>
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
        <ToggleGroup type="single" value={versao} onValueChange={(value) => {
          if (value === "simples" || value === "completa") setVersao(value);
        }} variant="outline" aria-label="Versão da Timeline">
          <ToggleGroupItem value="simples">Simplificada</ToggleGroupItem>
          <ToggleGroupItem value="completa">Completa</ToggleGroupItem>
        </ToggleGroup>
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
          {!apresentacaoPropria && <div className="mb-5"><TimelinePresentationHeader title={atual.nome} /></div>}
          {atual.nome === "Operação Iniciada" ? <UberabaOperacaoIniciada /> : atual.nome === "Hospital Mário Palmério" ? <UberabaHospital onBack={voltarTimeline} /> : versao === "simples" && atual.nome === "Plano de Marketing" ? <UberabaMarketing /> : versao === "simples" && atual.nome === "Formalização" ? <UberabaFormalizacao /> : versao === "simples" && atual.nome === "Implantação" ? <UberabaImplantacao /> : versao === "simples" ? (atual.nome === "Estudo" ? (
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
          )
          ) : <>
          {atual.texto && <p className="whitespace-pre-line text-justify text-xl leading-7 text-foreground/85 hyphens-auto" lang="pt-BR">{atual.texto.split("**").map((t, i) => (i % 2 ? <strong key={i} className="font-semibold text-foreground">{t}</strong> : t))}</p>}
          {atual.conteudo}
          {atual.filhos && <div className="flex w-full gap-4">
            {atual.filhos.map((f) => (
              <div key={f} className="flex-1 rounded-md border border-border bg-muted/40 px-4 py-2 text-sm font-medium text-foreground">
                {f}
              </div>
            ))}
          </div>}
          </>}
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
