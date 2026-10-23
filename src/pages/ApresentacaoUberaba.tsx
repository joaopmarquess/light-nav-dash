import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Expand, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import slides from "@/assets/apresentacao/slides.json";
import "./ApresentacaoUberaba.css";

/** Static, read-only 16:9 snapshots of the Projeto Bensaúde|Uberaba screens. */
export default function ApresentacaoUberaba() {
  const [params, setParams] = useSearchParams();
  const print = params.has("print");
  const index = Math.min(Math.max(Number(params.get("slide") ?? 1) - 1, 0), slides.length - 1);
  const go = (i: number) => setParams({ slide: String(Math.min(Math.max(i, 0), slides.length - 1) + 1) }, { replace: true });
  const touch = useRef<number | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    slides.forEach((s) => { const img = new Image(); img.src = s.url; });
  }, []);
  useEffect(() => {
    document.title = print ? "Projeto Bensaúde|Uberaba — PDF" : `${index + 1}/${slides.length} — ${slides[index].title}`;
  }, [index, print]);
  useEffect(() => {
    if (print) return;
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); go(index + 1); }
      if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); go(index - 1); }
      if (e.key === "Home") go(0);
      if (e.key === "End") go(slides.length - 1);
    };
    const onFs = () => setTick((t) => t + 1);
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("fullscreenchange", onFs); };
  });
  useEffect(() => {
    if (!print) return;
    const imgs = [...document.images];
    Promise.all(imgs.map((i) => (i.complete ? Promise.resolve() : new Promise((r) => { i.onload = i.onerror = r; })))).then(() => setTimeout(() => window.print(), 300));
  }, [print]);

  if (print) {
    return <div className="pbu-print">{slides.map((s, i) => <section key={i} className="pbu-print-page"><img src={s.url} alt={s.title} /></section>)}</div>;
  }

  const full = !!document.fullscreenElement;
  return (
    <div
      className="pbu-deck"
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
        touch.current = null;
      }}
    >
      <div className="pbu-stage">
        <img className="pbu-slide" src={slides[index].url} alt={slides[index].title} decoding="sync" />
      </div>
      {!full && (
        <nav className="pbu-bar" aria-label="Navegação da apresentação">
          <Button size="icon" variant="outline" aria-label="Slide anterior" disabled={index === 0} onClick={() => go(index - 1)}><ChevronLeft /></Button>
          <span className="pbu-counter">{index + 1} / {slides.length} · {slides[index].title}</span>
          <Button size="icon" variant="outline" aria-label="Próximo slide" disabled={index === slides.length - 1} onClick={() => go(index + 1)}><ChevronRight /></Button>
          <Button variant="outline" onClick={() => document.documentElement.requestFullscreen()}><Expand />Tela cheia</Button>
          <Button variant="outline" onClick={() => window.open(`${window.location.pathname}?print`, "_blank")}><FileDown />Exportar PDF</Button>
        </nav>
      )}
    </div>
  );
}
