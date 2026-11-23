import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { BotaoReverterAjuste, GradeAjuste, useAlteracoesAjuste } from "@/control/SimuladorAjuste";
import { SLIDE_AJUSTE, TOTAL_SLIDES_SIMULACAO, slideAposTecla } from "@/control/slidesSimulacao";
import s1 from "@/assets/slides-simulacao/slide-01.webp.asset.json";
import s2 from "@/assets/slides-simulacao/slide-02.webp.asset.json";
import s3 from "@/assets/slides-simulacao/slide-03.webp.asset.json";
import s4 from "@/assets/slides-simulacao/slide-04-fundo.webp.asset.json";
import s4Original from "@/assets/slides-simulacao/slide-04-original.webp.asset.json";
import s5 from "@/assets/slides-simulacao/slide-05.webp.asset.json";
import s6 from "@/assets/slides-simulacao/slide-06.webp.asset.json";
import s7 from "@/assets/slides-simulacao/slide-07.webp.asset.json";

// Imagens 16:9 do pptx "Orçamento 2027". No slide 4, "Rever" desmarcado mostra o slide original (com a linha
// Sinistralidade Operacional); marcado, o fundo sem tabela recebe o grid do Ajuste ao vivo.
const IMAGENS = [s1.url, s2.url, s3.url, s4Original.url, s5.url, s6.url, s7.url];
const FUNDO_AJUSTE = s4.url;
const LARGURA = 1920;
const ALTURA = 1080;
// Posição da tabela no slide 4 do pptx (EMU convertidos para 1920×1080).
const AREA_TABELA = { left: 101, top: 268, width: 1714 };

function SlideAjuste({ rever, setRever }: { rever: boolean; setRever: (v: boolean) => void }) {
  const { alteracoes, setAlteracoes, alterado, reverter } = useAlteracoesAjuste();
  return <>
    {rever && <>
      <img src={FUNDO_AJUSTE} alt="" className="absolute inset-0 h-full w-full select-none" draggable={false} />
      <div className="absolute bg-background" style={AREA_TABELA}>
        <GradeAjuste alteracoes={alteracoes} setAlteracoes={setAlteracoes} slide sinistralidade />
      </div>
    </>}
    <div className="absolute flex items-center gap-4" style={{ top: 208, right: 106 }}>
      <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 text-base font-medium">
        <Checkbox checked={rever} onCheckedChange={(v) => setRever(v === true)} aria-label="Rever" className="h-5 w-5" />
        Rever
      </label>
      {rever && <BotaoReverterAjuste alterado={alterado} reverter={reverter} className="h-10 bg-background px-4 text-base" />}
    </div>
  </>;
}

const campoDeTexto = (alvo: EventTarget | null) =>
  alvo instanceof HTMLElement && (alvo.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName));

export default function SlidesSimulacao() {
  const [atual, setAtual] = useState(1);
  const [escala, setEscala] = useState(0);
  const [telaCheia, setTelaCheia] = useState(false);
  const [rever, setRever] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const palco = useRef<HTMLDivElement>(null);

  useEffect(() => { [...IMAGENS, FUNDO_AJUSTE].forEach((src) => { const img = new Image(); img.src = src; }); }, []);

  useLayoutEffect(() => {
    const el = palco.current;
    if (!el) return;
    const medir = () => setEscala(Math.min(el.clientWidth / LARGURA, el.clientHeight / ALTURA));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || campoDeTexto(e.target)) return;
      // Espaço/Enter num botão ou na opção Rever acionam o próprio controle, sem trocar de slide.
      if ((e.key === " " || e.key === "Enter") && e.target instanceof HTMLElement && e.target.closest("button, [role=checkbox], label")) return;
      const proximo = slideAposTecla(atual, e.key);
      if (proximo === null) return;
      e.preventDefault();
      setAtual(proximo);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [atual]);

  useEffect(() => {
    const aoMudar = () => setTelaCheia(document.fullscreenElement === raiz.current);
    document.addEventListener("fullscreenchange", aoMudar);
    return () => document.removeEventListener("fullscreenchange", aoMudar);
  }, []);
  const alternarTelaCheia = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void raiz.current?.requestFullscreen();
  }, []);

  return <div ref={raiz} className={cn("h-full min-h-0 flex flex-col gap-2", telaCheia && "bg-[hsl(var(--ajuste-head))] p-3")}>
    <div ref={palco} className="relative flex-1 min-h-0 overflow-hidden">
      {escala > 0 && <div
        className="absolute left-1/2 top-1/2 bg-background shadow-md"
        style={{ width: LARGURA, height: ALTURA, transform: `translate(-50%, -50%) scale(${escala})` }}
        role="region" aria-label={`Slide ${atual} de ${TOTAL_SLIDES_SIMULACAO}`}
      >
        <img src={IMAGENS[atual - 1]} alt={`Slide ${atual}`} className="absolute inset-0 h-full w-full select-none" draggable={false} />
        {atual === SLIDE_AJUSTE && <SlideAjuste rever={rever} setRever={setRever} />}
      </div>}
    </div>
    <div className="flex items-center justify-center gap-3">
      <Button size="icon" variant="outline" className="h-8 w-8" aria-label="Slide anterior" title="Slide anterior (←)" disabled={atual === 1} onClick={() => setAtual((n) => Math.max(1, n - 1))}><ChevronLeft /></Button>
      <span className={cn("min-w-[4.5rem] text-center text-sm tabular-nums", telaCheia ? "text-primary-foreground" : "text-muted-foreground")}>{atual} / {TOTAL_SLIDES_SIMULACAO}</span>
      <Button size="icon" variant="outline" className="h-8 w-8" aria-label="Próximo slide" title="Próximo slide (→)" disabled={atual === TOTAL_SLIDES_SIMULACAO} onClick={() => setAtual((n) => Math.min(TOTAL_SLIDES_SIMULACAO, n + 1))}><ChevronRight /></Button>
      <Button size="icon" variant="outline" className="h-8 w-8" aria-label={telaCheia ? "Sair da tela cheia" : "Tela cheia"} title={telaCheia ? "Sair da tela cheia" : "Tela cheia"} onClick={alternarTelaCheia}>{telaCheia ? <Minimize2 /> : <Maximize2 />}</Button>
    </div>
  </div>;
}
