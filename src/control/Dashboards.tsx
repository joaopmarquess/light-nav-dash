import { useEffect, useMemo, useRef, useState } from "react";

import { Maximize2, Minimize2, ChevronLeft, ChevronRight } from "lucide-react";
import { useDreCarrossel } from "@/control/dreCarrossel";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ComposedChart,
  LabelList,
} from "recharts";

const fmtCompact = (v: number) => {
  const a = Math.abs(v);
  return a >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : a >= 1_000 ? (v / 1_000).toFixed(0) + "k" : v.toFixed(0);
};
const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
const COLORS = ["#3b82f6", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4", "#ec4899", "#f97316", "#eab308", "#8b5cf6", "#14b8a6"];

const ROTATE_MS = 12_000;

const WARMUP_MS = 2_500;

const LudicCurtain = () => (
  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-gradient-to-br from-card via-card to-accent/30">
    <div className="flex items-end gap-3 h-40">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="w-6 rounded-t-md bg-gradient-to-t from-primary/70 to-primary"
          style={{
            animation: `bi-bar-grow 1.4s ${i * 0.12}s ease-in-out infinite alternate`,
            transformOrigin: "bottom",
          }}
        />
      ))}
    </div>
    <svg viewBox="0 0 220 60" className="w-64 h-16 text-primary">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="600"
        strokeDashoffset="600"
        points="0,45 30,30 60,38 90,20 120,28 150,12 180,22 220,6"
        style={{ animation: "bi-line-draw 2.4s ease-in-out infinite" }}
      />
    </svg>
    <div className="flex items-center gap-4">
      <div
        className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary"
        style={{ animation: "bi-spin 1s linear infinite" }}
      />
      <div className="text-center">
        <div className="text-sm font-semibold text-foreground">Preparando indicadores…</div>
        <div className="text-xs text-muted-foreground">Carregando gráficos em segundo plano</div>
      </div>
    </div>
    <div className="flex gap-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-primary/60"
          style={{ animation: `bi-dot-pulse 1.2s ${i * 0.2}s ease-in-out infinite` }}
        />
      ))}
    </div>
    <style>{`
      @keyframes bi-bar-grow { from { height: 15% } to { height: 100% } }
      @keyframes bi-line-draw { 0% { stroke-dashoffset: 600 } 60% { stroke-dashoffset: 0 } 100% { stroke-dashoffset: 0; opacity: 0.4 } }
      @keyframes bi-spin { to { transform: rotate(360deg) } }
      @keyframes bi-dot-pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8) } 50% { opacity: 1; transform: scale(1.3) } }
    `}</style>
  </div>
);

const Dashboards = () => {
  const { charts, loading } = useDreCarrossel();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [ready, setReady] = useState(false);
  const wrapRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), WARMUP_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onChange = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFull = async () => {
    try {
      if (!document.fullscreenElement) await wrapRef.current?.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      /* noop */
    }
  };



  const slides = charts;

  useEffect(() => {
    if (!slides.length || paused || !ready) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [slides.length, paused, ready]);

  useEffect(() => {
    if (slides.length && idx >= slides.length) setIdx(0);
  }, [slides.length, idx]);

  useEffect(() => {
    if (!slides.length || !ready) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setIdx((i) => (i + 1) % slides.length);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIdx((i) => (i - 1 + slides.length) % slides.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides.length, ready]);

  const showCurtain = !ready || loading || !slides.length;
  const current = slides[idx];

  return (
    <section
      ref={wrapRef}
      className={`${isFull ? "fixed inset-0 z-50 h-screen w-screen rounded-none" : "h-[calc(100vh-9rem)] rounded-xl border border-border"} bg-card shadow-sm overflow-hidden flex flex-col relative`}
    >
      {showCurtain && <LudicCurtain />}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{current?.title ?? ""}</h2>
          <p className="text-xs text-muted-foreground">{current?.subtitle ?? ""}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIdx((i) => (i - 1 + slides.length) % slides.length)}
            className="h-8 w-8 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-primary"
            aria-label="Anterior"
            title="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`h-2 rounded-full transition-all ${i === idx ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"}`}
                aria-label={`Ir para gráfico ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={() => setIdx((i) => (i + 1) % slides.length)}
            className="h-8 w-8 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-primary"
            aria-label="Próximo"
            title="Próximo"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPaused((p) => !p)}
            className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-accent hover:text-primary"
          >
            {paused ? "Retomar" : "Pausar"}
          </button>
          <button
            onClick={toggleFull}
            className="h-8 w-8 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-primary"
            aria-label={isFull ? "Sair da tela cheia" : "Tela cheia"}
            title={isFull ? "Sair da tela cheia (Esc)" : "Tela cheia"}
          >
            {isFull ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-6 relative">
        {slides.map((slide, i) => {
          const active = i === idx;
          return (
            <div
              key={i}
              className={`absolute inset-6 h-[calc(100%-3rem)] w-[calc(100%-3rem)] transition-opacity duration-500 ${
                active ? "opacity-100 z-10 animate-fade-in" : "opacity-0 z-0 pointer-events-none"
              }`}
              aria-hidden={!active}
            >
              {(slide as any).iframe ? (
                <iframe
                  title={slide.title}
                  src={(slide as any).iframe}
                  className="w-full h-full border-0 rounded-md"
                  allowFullScreen
                />
              ) : (slide as any).custom ? (
                <div className="w-full h-full">{(slide as any).custom}</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {slide.chart as any}
                </ResponsiveContainer>
              )}
            </div>
          );
        })}
      </div>


      {!paused && (
        <div className="h-0.5 bg-muted/30 shrink-0 overflow-hidden">
          <div
            key={idx}
            className="h-full bg-muted-foreground/40"
            style={{ animation: `bi-progress ${ROTATE_MS}ms linear forwards` }}
          />
        </div>
      )}
      <style>{`@keyframes bi-progress { from { width: 0% } to { width: 100% } }`}</style>
    </section>
  );
};

export default Dashboards;
