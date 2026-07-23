import { useEffect, useMemo, useRef, useState } from "react";

import { Maximize2, Minimize2, ChevronLeft, ChevronRight } from "lucide-react";
import AtivosEm from "@/components/AtivosEm";
import Entradas from "@/components/Entradas";
import Cancelamentos from "@/components/Cancelamentos";
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

type Row = { g1: string; g2: string; g3: string; g4: string; valor: number; mes: number };

const MONTHS = [
  { n: 1, label: "Jan/26" },
  { n: 2, label: "Fev/26" },
  { n: 3, label: "Mar/26" },
  { n: 4, label: "Abr/26" },
];
const ACRONYMS = ["EBITDA", "TI"];
const toSentence = (s: string) => {
  if (!s) return s;
  let r = s.toLowerCase();
  r = r.charAt(0).toUpperCase() + r.slice(1);
  for (const a of ACRONYMS) r = r.replace(new RegExp(`\\b${a.toLowerCase()}\\b`, "gi"), a);
  return r;
};
const strip = (s: string) => toSentence(s.replace(/^\d+\|/, ""));
const fmtCompact = (v: number) => {
  const a = Math.abs(v);
  return a >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : a >= 1_000 ? (v / 1_000).toFixed(0) + "k" : v.toFixed(0);
};
const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
const COLORS = ["#3b82f6", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4", "#ec4899", "#f97316", "#eab308", "#8b5cf6", "#14b8a6"];

const ROTATE_MS = 12_000;

const BIOverview = () => {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const wrapRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetch("/data/dre.json").then((r) => r.json()).then(setRows).catch(() => setRows([]));
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

  const data = useMemo(() => {
    if (!rows) return null;
    const byMes = MONTHS.map((m) => {
      const mr = rows.filter((r) => r.mes === m.n);
      const ebitda = mr.filter((r) => r.g1 === "1|EBITDA").reduce((s, r) => s + r.valor, 0);
      const financeiro = mr.filter((r) => r.g1 === "2|FINANCEIRO").reduce((s, r) => s + r.valor, 0);
      return {
        mes: m.label,
        Receitas: mr.filter((r) => r.valor > 0).reduce((s, r) => s + r.valor, 0),
        Despesas: Math.abs(mr.filter((r) => r.valor < 0).reduce((s, r) => s + r.valor, 0)),
        EBITDA: ebitda,
        Financeiro: financeiro,
        Resultado: ebitda + financeiro,
      };
    });
    const sumAbs = (pred: (r: Row) => boolean) =>
      rows.filter((r) => r.valor < 0 && pred(r)).reduce((s, r) => s + Math.abs(r.valor), 0);
    const buckets: { name: string; value: number }[] = [
      { name: "Despesa Assistencial", value: sumAbs((r) => r.g3 === "1|PRINCIPAL" && r.g4 === "3|DESP. ASSISTENCIAL") },
      { name: "Secundária", value: sumAbs((r) => r.g3 === "2|SECUNDÁRIA") },
      { name: "Provisões", value: sumAbs((r) => r.g3 === "3|PROVISÕES") },
      { name: "Comercialização", value: sumAbs((r) => r.g3 === "4|COMERCIALIZAÇÃO") },
      { name: "Impostos Diretos", value: sumAbs((r) => r.g3 === "5|IMPOSTOS DIRETOS") },
      { name: "Despesas Administrativas", value: sumAbs((r) => r.g2 === "2|ADMINISTRATIVO") },
    ];
    const top = buckets.filter((b) => b.value > 0);

    const admRows = rows.filter((r) => r.g2 === "2|ADMINISTRATIVO");
    const cats = Array.from(new Set(admRows.map((r) => strip(r.g3))));
    const admCats = cats
      .map((c) => ({ c, t: admRows.filter((r) => strip(r.g3) === c).reduce((s, r) => s + Math.abs(r.valor), 0) }))
      .sort((a, b) => b.t - a.t)
      .slice(0, 5)
      .map((x) => x.c);
    const admByMes = MONTHS.map((m) => {
      const row: any = { mes: m.label };
      admCats.forEach((c) => {
        row[c] = admRows.filter((r) => r.mes === m.n && strip(r.g3) === c).reduce((s, r) => s + Math.abs(r.valor), 0);
      });
      return row;
    });
    return { byMes, despPie: top, admByMes, admCats };
  }, [rows]);


  const slides = useMemo(() => {
    if (!data) return [];
    const fmtPct = (v: number) => `${v.toFixed(1)}%`;
    return [
      {
        title: "Receitas vs Despesas por mês",
        subtitle: "Comparativo mensal em R$",
        chart: (
          <BarChart data={data.byMes} margin={{ top: 20, right: 40, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="Receitas" fill="#3b82f6" radius={[6, 6, 0, 0]}><LabelList dataKey="Receitas" position="top" formatter={fmtCompact} style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} /></Bar>
            <Bar dataKey="Despesas" fill="#ef4444" radius={[6, 6, 0, 0]}><LabelList dataKey="Despesas" position="top" formatter={fmtCompact} style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} /></Bar>
          </BarChart>
        ),
      },
      {
        title: "Evolução do Resultado",
        subtitle: "EBITDA, Financeiro e Resultado Líquido",
        chart: (
          <ComposedChart data={data.byMes} margin={{ top: 20, right: 40, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="EBITDA" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]}><LabelList dataKey="EBITDA" position="top" formatter={fmtCompact} style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} /></Bar>
            <Bar dataKey="Financeiro" fill="#8b5cf6" radius={[6, 6, 0, 0]}><LabelList dataKey="Financeiro" position="top" formatter={fmtCompact} style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} /></Bar>
            <Line type="monotone" dataKey="Resultado" stroke="#f59e0b" strokeWidth={4} dot={{ r: 6 }}><LabelList dataKey="Resultado" position="top" formatter={fmtCompact} style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} /></Line>
          </ComposedChart>
        ),
      },
      {
        title: "Composição de Despesas",
        subtitle: "Participação por categoria no período",
        chart: (
          <PieChart>
            <Pie
              data={data.despPie}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="70%"
              label={(e: any) => `${e.name}: ${fmtCompact(e.value)} (${(e.percent * 100).toFixed(0)}%)`}
              labelLine={true}
            >
              {data.despPie.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
          </PieChart>
        ),
      },
      {
        title: "Despesas Administrativas — Top 5",
        subtitle: "Evolução mensal por categoria",
        chart: (
          <LineChart data={data.admByMes} margin={{ top: 20, right: 40, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {data.admCats.map((c, i) => (
              <Line key={c} type="monotone" dataKey={c} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{ r: 4 }} />
            ))}
          </LineChart>
        ),
      },
      {
        title: "Área Geográfica — Beneficiários ativos hoje",
        subtitle: "Distribuição por UF na data de hoje",
        custom: <AtivosEm dateValue={new Date().toISOString().slice(0, 10)} />,
      },
      {
        title: "Vendas — por Agente Comercial",
        subtitle: "01/01/2026 até hoje",
        custom: (
          <Entradas
            embedded
            initialDe="01/01/2026"
            initialGroupBy="agente"
            initialPlanoDe="Todos"
          />
        ),
      },
      {
        title: "Cancelamentos — por Motivo",
        subtitle: "01/01/2026 até hoje",
        custom: (
          <Cancelamentos
            embedded
            initialDe="01/01/2026"
            initialGroupBy="motivo"
            initialPlanoDe="Todos"
          />
        ),
      },
    ];
  }, [data]);

  useEffect(() => {
    if (!slides.length || paused) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [slides.length, paused]);

  useEffect(() => {
    if (slides.length && idx >= slides.length) setIdx(0);
  }, [slides.length, idx]);

  useEffect(() => {
    if (!slides.length) return;
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
  }, [slides.length]);

  if (!data || !slides.length) {
    return (
      <section className="h-[calc(100vh-9rem)] flex items-center justify-center text-muted-foreground text-sm bg-card rounded-xl border border-border">
        Carregando...
      </section>
    );
  }

  const current = slides[idx];

  return (
    <section
      ref={wrapRef}
      className={`${isFull ? "fixed inset-0 z-50 h-screen w-screen rounded-none" : "h-[calc(100vh-9rem)] rounded-xl border border-border"} bg-card shadow-sm overflow-hidden flex flex-col`}
    >
      <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{current.title}</h2>
          <p className="text-xs text-muted-foreground">{current.subtitle}</p>
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

export default BIOverview;
