import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle, Maximize2, Minimize2, Pause, Play } from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { AvisoErroDados } from "@/components/AvisoErroDados";
import { useDreCarrossel } from "./dreCarrossel";

const ROTACAO_MS = 12_000;
const TOTAL = 5;
const CONFIG = [
  { titulo: "Resultado acumulado", chaves: ["Acumulado"], percentual: false },
  { titulo: "Resultado do mês", chaves: ["Resultado"], percentual: false },
  { titulo: "Entradas e despesas assistenciais", chaves: ["Entradas Operacionais", "Despesas Assistenciais"], percentual: false },
  { titulo: "Receitas e despesas", chaves: ["Receitas", "Despesas"], percentual: false },
  { titulo: "Sinistralidade operacional", chaves: ["Sinistralidade"], percentual: true },
];
const CORES = ["hsl(var(--primary))", "hsl(var(--destructive))"];
const valor = (n: number, percentual: boolean) => percentual
  ? `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
  : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const eixo = (n: number) => `${(n / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
function indiceInicial() {
  const slide = Number(new URLSearchParams(window.location.search).get("slide"));
  return Number.isInteger(slide) && slide >= 1 && slide <= TOTAL ? slide - 1 : 0;
}

export default function DashboardsCelular() {
  const { charts, loading, erro, tentarNovamente } = useDreCarrossel();
  const [indice, setIndice] = useState(indiceInicial);
  const [pausado, setPausado] = useState(false);
  const [telaCheia, setTelaCheia] = useState(false);
  const tela = useRef<HTMLElement>(null);
  const toque = useRef<{ x: number; y: number } | null>(null);
  const mudar = (delta: number) => setIndice(i => (i + delta + TOTAL) % TOTAL);
  const config = CONFIG[indice] ?? CONFIG[0];
  const slide = charts[indice];
  const dados = slide?.data ?? [];
  const ultimo = dados.at(-1) as Record<string, number | string> | undefined;
  const periodo = charts[0]?.subtitle.split(" · ")[1] ?? "";

  useEffect(() => {
    if (pausado || loading || !charts.length) return;
    const timer = window.setInterval(() => setIndice(i => (i + 1) % TOTAL), ROTACAO_MS);
    return () => window.clearInterval(timer);
  }, [pausado, loading, charts.length, indice]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("slide", String(indice + 1));
    window.history.replaceState(null, "", url);
    document.title = `${indice + 1}/${TOTAL} — ${config.titulo} · AXIS`;
  }, [indice, config.titulo]);

  useEffect(() => {
    const sync = () => setTelaCheia(document.fullscreenElement === tela.current);
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { e.preventDefault(); setIndice(i => (i + 1) % TOTAL); }
      if (e.key === "ArrowLeft") { e.preventDefault(); setIndice(i => (i - 1 + TOTAL) % TOTAL); }
    };
    document.addEventListener("fullscreenchange", sync);
    window.addEventListener("keydown", key);
    return () => { document.removeEventListener("fullscreenchange", sync); window.removeEventListener("keydown", key); };
  }, []);

  async function alternarTelaCheia() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await tela.current?.requestFullscreen();
    } catch { setTelaCheia(false); }
  }

  if (erro) return <div className="p-4"><AvisoErroDados erro={erro} onTentar={tentarNovamente} /></div>;
  if (loading) return <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Carregando indicadores…</p>;
  if (!slide || !ultimo) return <p className="p-4 text-sm text-muted-foreground">Nenhum período realizado disponível.</p>;

  return (
    <section ref={tela} aria-label="Slides do Control" className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background text-foreground">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
        <p className="text-xs font-medium text-muted-foreground">DRE · {periodo}</p>
        {document.fullscreenEnabled && <Button variant="ghost" size="icon" onClick={alternarTelaCheia} aria-label={telaCheia ? "Sair da tela cheia" : "Tela cheia"} title={telaCheia ? "Sair da tela cheia" : "Tela cheia"}>{telaCheia ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</Button>}
      </div>
      <div className="flex min-h-0 flex-1 touch-pan-y flex-col px-4 pt-4" onTouchStart={e => {
        const t = e.touches[0]; if (t) toque.current = { x: t.clientX, y: t.clientY };
      }} onTouchEnd={e => {
        const t = e.changedTouches[0]; const inicio = toque.current; toque.current = null;
        if (!t || !inicio) return;
        const dx = t.clientX - inicio.x, dy = t.clientY - inicio.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) mudar(dx < 0 ? 1 : -1);
      }}>
        <h2 className="min-h-14 text-xl font-semibold leading-tight">{config.titulo}</h2>
        <div className="mb-3 grid shrink-0 grid-cols-1 gap-2 border-b border-border pb-3">
          {config.chaves.map((chave, i) => <div key={chave}>
            <p className="text-xs text-muted-foreground">{config.chaves.length > 1 ? `${chave} · ` : ""}{indice === 0 ? periodo : `${ultimo.mes}/2026`}</p>
            <p className={`break-words text-2xl font-semibold tabular-nums ${Number(ultimo[chave]) < 0 || i === 1 ? "text-destructive" : "text-primary"}`}>
              {valor(Number(ultimo[chave]), config.percentual)}
            </p>
          </div>)}
        </div>
        <div className="min-h-0 flex-1" aria-label={`Gráfico: ${config.titulo}`}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart key={indice} data={dados} margin={{ top: 12, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 5" />
              <XAxis dataKey="mes" interval={0} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis width={56} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={config.percentual ? n => `${n}%` : eixo} axisLine={false} tickLine={false} />
              <Tooltip formatter={(n: number) => valor(Number(n), config.percentual)} />
              <ReferenceLine y={config.percentual ? 100 : 0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
              {config.chaves.map((chave, i) => config.chaves.length > 1
                ? <Bar key={chave} dataKey={chave} fill={CORES[i]} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                : <Line key={chave} type="monotone" dataKey={chave} stroke={CORES[0]} strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />)}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-border p-3">
        <Button variant="ghost" size="icon" onClick={() => mudar(-1)} aria-label="Slide anterior" title="Slide anterior"><ChevronLeft className="h-5 w-5" /></Button>
        <span className="text-xs tabular-nums text-muted-foreground">{indice + 1} / {TOTAL}</span>
        <Button variant="outline" size="icon" aria-label={pausado ? "Retomar slides" : "Pausar slides"} title={pausado ? "Retomar slides" : "Pausar slides"} onClick={() => setPausado(p => !p)}>{pausado ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</Button>
        <Button variant="ghost" size="icon" onClick={() => mudar(1)} aria-label="Próximo slide" title="Próximo slide"><ChevronRight className="h-5 w-5" /></Button>
      </footer>
    </section>
  );
}