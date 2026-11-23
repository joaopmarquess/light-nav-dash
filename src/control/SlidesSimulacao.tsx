import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { BotaoReverterAjuste, GradeAjuste, useAlteracoesAjuste } from "@/control/SimuladorAjuste";
import { SLIDE_AJUSTE, SLIDE_INDICADORES, SLIDES_SIMULADOR_2027, sinistralidadeSlideIndicadores, slideAposTecla } from "@/control/slidesSimulacao";
import { formatarPercentualAjuste } from "@/control/simulador/ajuste";
import "@fontsource/noto-sans/700.css";
import s1 from "@/assets/slides-simulacao/slide-01.webp.asset.json";
import s2 from "@/assets/slides-simulacao/slide-02.webp.asset.json";
import s3 from "@/assets/slides-simulacao/slide-03.webp.asset.json";
import s4 from "@/assets/slides-simulacao/slide-04-fundo.webp.asset.json";
import s4Original from "@/assets/slides-simulacao/slide-04-original.webp.asset.json";
import s5 from "@/assets/slides-simulacao/slide-05-fundo.webp.asset.json";
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

// Slide 5: a linha "Sinistralidade líquida de coparticipação" foi apagada do fundo; aqui entra a Sinistralidade
// Operacional do slide 4, nas posições e fonte/cores do pptx (EMU ÷ 6350 = px em 1920×1080).
const LINHA_INDICADORES = { top: 436, height: 84 };
const CORES_PPTX = { titulo: "#0E2841", lateral: "#595959" };
const COLUNAS_INDICADORES = [
  { cenario: "pessimista", left: 590, tamanho: 56, cor: CORES_PPTX.lateral },
  { cenario: "realista", left: 999, tamanho: 64, cor: CORES_PPTX.titulo },
  { cenario: "otimista", left: 1408, tamanho: 56, cor: CORES_PPTX.lateral },
] as const;

function SlideIndicadores({ rever }: { rever: boolean }) {
  const { alteracoes } = useAlteracoesAjuste();
  const valores = sinistralidadeSlideIndicadores(alteracoes, rever);
  const base = { position: "absolute", ...LINHA_INDICADORES, display: "flex", alignItems: "center", fontFamily: "'Noto Sans', sans-serif", fontWeight: 700 } as const;
  return <>
    <div style={{ ...base, left: 115, width: 475, fontSize: 28, lineHeight: 1.2, color: CORES_PPTX.titulo }}>Sinistralidade Operacional</div>
    {COLUNAS_INDICADORES.map((c) => <div key={c.cenario} style={{ ...base, left: c.left, width: 409, justifyContent: "center", fontSize: c.tamanho, lineHeight: 1, color: c.cor }}>
      {formatarPercentualAjuste(valores[c.cenario])}%
    </div>)}
  </>;
}

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

/** `slides`: números dos slides do pptx exibidos, na ordem (padrão: todos). A navegação percorre só essa lista. */
export default function SlidesSimulacao({ slides = SLIDES_SIMULADOR_2027 }: { slides?: number[] }) {
  const [posicao, setAtual] = useState(1);
  const total = slides.length;
  const atual = slides[Math.min(posicao, total) - 1];
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
      const proximo = slideAposTecla(posicao, e.key, total);
      if (proximo === null) return;
      e.preventDefault();
      setAtual(proximo);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [posicao, total]);

  // Tela cheia: a apresentação cobre toda a janela (por cima do menu e do cabeçalho) e, quando o navegador
  // permite, também a tela inteira do monitor. Esc ou o botão saem.
  const sairTelaCheia = useCallback(() => {
    setTelaCheia(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  }, []);
  const alternarTelaCheia = useCallback(() => {
    if (telaCheia) { sairTelaCheia(); return; }
    setTelaCheia(true);
    raiz.current?.requestFullscreen?.().catch(() => {});
  }, [telaCheia, sairTelaCheia]);
  useEffect(() => {
    const aoMudar = () => { if (!document.fullscreenElement) setTelaCheia(false); };
    document.addEventListener("fullscreenchange", aoMudar);
    return () => document.removeEventListener("fullscreenchange", aoMudar);
  }, []);
  useEffect(() => {
    if (!telaCheia) return;
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === "Escape" && !campoDeTexto(e.target)) sairTelaCheia(); };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [telaCheia, sairTelaCheia]);
  useEffect(() => () => { if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); }, []);

  // Em tela cheia, os botões de navegação ficam por cima do slide e somem após alguns segundos sem mexer o mouse.
  const [controlesVisiveis, setControlesVisiveis] = useState(true);
  const timer = useRef<number>();
  const mostrarControles = useCallback(() => {
    setControlesVisiveis(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setControlesVisiveis(false), 2500);
  }, []);
  useEffect(() => { if (telaCheia) mostrarControles(); else { window.clearTimeout(timer.current); setControlesVisiveis(true); } }, [telaCheia, mostrarControles]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return <div
    ref={raiz}
    onMouseMove={telaCheia ? mostrarControles : undefined}
    className={cn("flex flex-col", telaCheia ? cn("fixed inset-0 z-[100] bg-background", !controlesVisiveis && "cursor-none") : "h-full min-h-0 gap-2")}
  >
    <div ref={palco} className="relative flex-1 min-h-0 overflow-hidden">
      {escala > 0 && <div
        className={cn("absolute left-1/2 top-1/2 bg-background", !telaCheia && "shadow-md")}
        style={{ width: LARGURA, height: ALTURA, transform: `translate(-50%, -50%) scale(${escala})` }}
        role="region" aria-label={`Slide ${posicao} de ${total}`}
      >
        <img src={IMAGENS[atual - 1]} alt={`Slide ${atual}`} className="absolute inset-0 h-full w-full select-none" draggable={false} />
        {atual === SLIDE_AJUSTE && <SlideAjuste rever={rever} setRever={setRever} />}
        {atual === SLIDE_INDICADORES && <SlideIndicadores rever={rever} />}
      </div>}
    </div>
    <div className={cn(
      "flex items-center justify-center gap-3",
      telaCheia && "absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-background/90 px-3 py-1.5 shadow-md transition-opacity duration-300",
      telaCheia && !controlesVisiveis && "pointer-events-none opacity-0",
    )}>
      {total > 1 && <>
        <Button size="icon" variant="outline" className="h-8 w-8" aria-label="Slide anterior" title="Slide anterior (←)" disabled={posicao === 1} onClick={() => setAtual((n) => Math.max(1, n - 1))}><ChevronLeft /></Button>
        <span className={cn("min-w-[4.5rem] text-center text-sm tabular-nums", "text-muted-foreground")}>{posicao} / {total}</span>
        <Button size="icon" variant="outline" className="h-8 w-8" aria-label="Próximo slide" title="Próximo slide (→)" disabled={posicao === total} onClick={() => setAtual((n) => Math.min(total, n + 1))}><ChevronRight /></Button>
      </>}
      <Button size="icon" variant="outline" className="h-8 w-8" aria-label={telaCheia ? "Sair da tela cheia" : "Tela cheia"} title={telaCheia ? "Sair da tela cheia" : "Tela cheia"} onClick={alternarTelaCheia}>{telaCheia ? <Minimize2 /> : <Maximize2 />}</Button>
    </div>
  </div>;
}
