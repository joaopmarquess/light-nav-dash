import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
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
} from "recharts";

type Row = { g1: string; g2: string; g3: string; g4: string; valor: number; mes: number };

const MONTHS = [
  { n: 1, label: "Jan/26" },
  { n: 2, label: "Fev/26" },
  { n: 3, label: "Mar/26" },
  { n: 4, label: "Abr/26" },
];
const strip = (s: string) => s.replace(/^\d+\|/, "");
const fmtCompact = (v: number) => {
  const a = Math.abs(v);
  return a >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : a >= 1_000 ? (v / 1_000).toFixed(0) + "k" : v.toFixed(0);
};
const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

const ROTATE_MS = 7_000;

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
    const desp = new Map<string, number>();
    rows.filter((r) => r.valor < 0).forEach((r) => {
      const k = strip(r.g3);
      desp.set(k, (desp.get(k) ?? 0) + Math.abs(r.valor));
    });
    const sorted = [...desp.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, 6);
    const resto = sorted.slice(6).reduce((s, x) => s + x.value, 0);
    if (resto > 0) top.push({ name: "Outros", value: resto });

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
    return [
      {
        title: "Receitas vs Despesas por mês",
        subtitle: "Comparativo mensal em R$",
        chart: (
          <BarChart data={data.byMes} margin={{ top: 20, right: 40, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tick={{ fontSize: 16 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 14 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend wrapperStyle={{ fontSize: 16 }} />
            <Bar dataKey="Receitas" fill="#10b981" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Despesas" fill="#ef4444" radius={[6, 6, 0, 0]} />
          </BarChart>
        ),
      },
      {
        title: "Evolução do Resultado",
        subtitle: "EBITDA, Financeiro e Resultado Líquido",
        chart: (
          <ComposedChart data={data.byMes} margin={{ top: 20, right: 40, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tick={{ fontSize: 16 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 14 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend wrapperStyle={{ fontSize: 16 }} />
            <Bar dataKey="EBITDA" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Financeiro" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            <Line type="monotone" dataKey="Resultado" stroke="#f59e0b" strokeWidth={4} dot={{ r: 6 }} />
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
              label={(e: any) => `${e.name}: ${(e.percent * 100).toFixed(0)}%`}
              labelLine={true}
            >
              {data.despPie.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend wrapperStyle={{ fontSize: 14 }} />
          </PieChart>
        ),
      },
      {
        title: "Despesas Administrativas — Top 5",
        subtitle: "Evolução mensal por categoria",
        chart: (
          <LineChart data={data.admByMes} margin={{ top: 20, right: 40, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tick={{ fontSize: 16 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 14 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend wrapperStyle={{ fontSize: 14 }} />
            {data.admCats.map((c, i) => (
              <Line key={c} type="monotone" dataKey={c} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{ r: 4 }} />
            ))}
          </LineChart>
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

  if (!data || !slides.length) {
    return (
      <section className="h-[calc(100vh-8rem)] flex items-center justify-center text-muted-foreground text-sm bg-card rounded-xl border border-border">
        Carregando...
      </section>
    );
  }

  const current = slides[idx];

  return (
    <section
      ref={wrapRef}
      className={`${isFull ? "fixed inset-0 z-50 h-screen w-screen rounded-none" : "h-[calc(100vh-8rem)] rounded-xl border border-border"} bg-card shadow-sm overflow-hidden flex flex-col`}
    >
      <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{current.title}</h2>
          <p className="text-xs text-muted-foreground">{current.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
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

      <div className="flex-1 min-h-0 p-6">
        <div key={idx} className="h-full w-full animate-fade-in">
          <ResponsiveContainer width="100%" height="100%">
            {current.chart as any}
          </ResponsiveContainer>
        </div>
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
