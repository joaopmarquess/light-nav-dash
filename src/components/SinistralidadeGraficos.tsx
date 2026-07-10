import { useEffect, useMemo, useState } from "react";
import { Monitor, ArrowRight, ArrowLeft } from "lucide-react";
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

type Agg = {
  k: string | number;
  rec: number; desp: number; vidas: number;
  saldo?: number; rec_tmm?: number; rec_cop?: number;
};
type Data = {
  byMes: Agg[];
  byFaixa: Agg[];
  byTipo: Agg[];
  byMicro: Agg[];
  byContr: Agg[];
  byPlano: Agg[];
  byRecup: Agg[];
};
type MetricRow = { name: string; value: number; vidas: number };

const MES_LABEL: Record<number, string> = {
  202505: "Mai/25", 202506: "Jun/25", 202507: "Jul/25", 202508: "Ago/25",
  202509: "Set/25", 202510: "Out/25", 202511: "Nov/25", 202512: "Dez/25",
  202601: "Jan/26", 202602: "Fev/26", 202603: "Mar/26", 202604: "Abr/26",
};

const fmtCompact = (v: number) => {
  const a = Math.abs(v);
  return a >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : a >= 1_000 ? (v / 1_000).toFixed(0) + "k" : v.toFixed(0);
};
const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const COLORS = ["#3b82f6", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4", "#ec4899", "#f97316", "#eab308", "#8b5cf6", "#14b8a6"];

const ChartCard = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <div className="bg-card rounded-xl border border-border shadow-sm p-3 flex flex-col min-h-0">
    <div className="mb-1 shrink-0">
      <h3 className="text-xs font-semibold text-foreground leading-tight">{title}</h3>
      {subtitle && <p className="text-[10px] text-muted-foreground leading-tight">{subtitle}</p>}
    </div>
    <div className="flex-1 min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        {children as any}
      </ResponsiveContainer>
    </div>
  </div>
);

type DimRow = { name: string; vidas: number; rec_tmm: number; rec_cop: number; rec_total: number; despesa: number; saldo: number };

const MetricTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const row = p?.payload as DimRow | undefined;
  return (
    <div className="bg-card border border-border rounded-md px-2 py-1 text-[11px] shadow-md">
      <div className="font-semibold text-foreground mb-0.5">{label}</div>
      <div className="text-foreground">{p.name}: {fmtBRL(p.value)}</div>
      {row && (
        <>
          <div className="text-muted-foreground">Receita total: {fmtBRL(row.rec_total)}</div>
          <div className="text-muted-foreground">Vidas: {Math.round(row.vidas).toLocaleString("pt-BR")}</div>
        </>
      )}
    </div>
  );
};

// Returns BarChart JSX directly (NOT a component) so that ResponsiveContainer
// receives the chart as its immediate child and can inject width/height.
const metricBars = (rows: DimRow[], dataKey: keyof DimRow, color: string, width = 130) => (
  <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 60, left: 4, bottom: 0 }}>
    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
    <XAxis type="number" tickFormatter={fmtCompact} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
    <YAxis type="category" dataKey="name" width={width} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
    <Tooltip content={<MetricTooltip />} cursor={{ fill: "hsl(var(--accent))", opacity: 0.3 }} />
    <Bar dataKey={dataKey as string} fill={color} radius={[0, 4, 4, 0]}>
      <LabelList dataKey={dataKey as string} position="right" formatter={fmtCompact} style={{ fontSize: 9, fill: "hsl(var(--foreground))" }} />
    </Bar>
  </BarChart>
);

const DimensionPage = ({ label, rows }: { label: string; rows: DimRow[] }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
    <ChartCard title={`Receitas Mensalidade por ${label}`} subtitle="rec_tm — Mensalidade">
      {metricBars(rows, "rec_tmm", "#3b82f6")}
    </ChartCard>
    <ChartCard title={`Receitas Coparticipação por ${label}`} subtitle="rec_cpa — Coparticipação">
      {metricBars(rows, "rec_cop", "#06b6d4")}
    </ChartCard>
    <ChartCard title={`Receitas Totais por ${label}`} subtitle="rec_total — Receitas">
      {metricBars(rows, "rec_total", "#10b981")}
    </ChartCard>
    <ChartCard title={`Despesas por ${label}`} subtitle="vrdespesas — Despesas">
      {metricBars(rows, "despesa", "#ef4444")}
    </ChartCard>
    <ChartCard title={`Resultado (Saldo) por ${label}`} subtitle="!SALDO — Resultado">
      {metricBars(rows, "saldo", "#a855f7")}
    </ChartCard>
    <ChartCard title={`Vidas Atingidas por ${label}`} subtitle="!VIDAS ATING. — Vidas">
      {metricBars(rows, "vidas", "#f59e0b")}
    </ChartCard>
  </div>
);


export const useSinistralidade = () => {
  const [raw, setRaw] = useState<Data | null>(null);
  useEffect(() => {
    fetch("/data/sinistralidade.json").then((r) => r.json()).then(setRaw).catch(() => setRaw(null));
  }, []);
  return useMemo(() => {
    if (!raw) return null;
    const pct = (rec: number, desp: number) => (rec > 0 ? (desp / rec) * 100 : 0);

    const byMes = raw.byMes.map((m) => ({
      mes: MES_LABEL[m.k as number] ?? String(m.k),
      Receita: m.rec,
      Despesa: m.desp,
      Sinistralidade: +pct(m.rec, m.desp).toFixed(1),
    }));

    const faixaOrder = ["00 a 18", "19 a 23", "24 a 28", "29 a 33", "34 a 38", "39 a 43", "44 a 48", "49 a 53", "54 a 58", "59 ou +"];
    const byFaixa = raw.byFaixa
      .map((f) => ({ faixa: String(f.k), Sinistralidade: +pct(f.rec, f.desp).toFixed(1), Receita: f.rec, Despesa: f.desp }))
      .sort((a, b) => faixaOrder.indexOf(a.faixa) - faixaOrder.indexOf(b.faixa));

    const byTipo = raw.byTipo
      .map((t) => ({ name: String(t.k).replace(/\s*\[[^\]]+\]\s*$/, "").trim() || String(t.k), value: t.desp, rec: t.rec, sin: +pct(t.rec, t.desp).toFixed(1) }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);

    const byMicroTop = raw.byMicro
      .filter((m) => m.rec > 0 && m.vidas >= 100)
      .map((m) => ({ micro: String(m.k), Sinistralidade: +pct(m.rec, m.desp).toFixed(1), vidas: m.vidas }))
      .sort((a, b) => b.Sinistralidade - a.Sinistralidade)
      .slice(0, 10);

    const byContr = (raw.byContr ?? [])
      .map((c) => ({ name: String(c.k), Sinistralidade: +pct(c.rec, c.desp).toFixed(1), Receita: c.rec, Despesa: c.desp }))
      .sort((a, b) => b.Despesa - a.Despesa);

    const byPlano = (raw.byPlano ?? [])
      .map((p) => ({ name: String(p.k), Sinistralidade: +pct(p.rec, p.desp).toFixed(1), Receita: p.rec, Despesa: p.desp }))
      .sort((a, b) => b.Despesa - a.Despesa);

    const byRecup = (raw.byRecup ?? [])
      .map((r) => ({ name: String(r.k), value: r.desp, Sinistralidade: +pct(r.rec, r.desp).toFixed(1) }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);

    const vidasByMes = raw.byMes.map((m) => ({
      mes: MES_LABEL[m.k as number] ?? String(m.k),
      Vidas: m.vidas,
    }));

    const totalRec = raw.byMes.reduce((s, m) => s + m.rec, 0);
    const totalDesp = raw.byMes.reduce((s, m) => s + m.desp, 0);
    const totalVidas = raw.byMes.reduce((s, m) => s + m.vidas, 0) / Math.max(raw.byMes.length, 1);
    const sinTotal = pct(totalRec, totalDesp);

    // Métricas por dimensão para as páginas "Mais 4"
    const cleanTipo = (s: string) => s.replace(/\s*\[[^\]]+\]\s*$/, "").trim() || s;
    const makeMetric = (arr: Agg[], cleanName?: (s: string) => string, topN?: number) => {
      const norm = arr.map((a) => ({
        name: (cleanName ?? String)(String(a.k)),
        vidas: a.vidas,
        rec_tmm: a.rec_tmm ?? 0,
        rec_cop: a.rec_cop ?? 0,
        rec_total: a.rec,
        despesa: a.desp,
        saldo: a.saldo ?? (a.rec - a.desp),
      }));
      // Para microrregião limitamos por receita total (top N)
      const sorted = topN
        ? [...norm].sort((a, b) => b.rec_total - a.rec_total).slice(0, topN)
        : norm.sort((a, b) => b.rec_total - a.rec_total);
      return sorted;
    };
    const dims = {
      tipo: { label: "Tipo Copart", rows: makeMetric(raw.byTipo, cleanTipo) },
      contr: { label: "Contratação", rows: makeMetric(raw.byContr) },
      recup: { label: "Recuperação", rows: makeMetric(raw.byRecup) },
      micro: { label: "Microrregião (Top 10)", rows: makeMetric(raw.byMicro, undefined, 10) },
    };

    return { byMes, byFaixa, byTipo, byMicroTop, byContr, byPlano, byRecup, vidasByMes, totalRec, totalDesp, totalVidas, sinTotal, dims };
  }, [raw]);
};

const SinistralidadeGraficos = () => {
  const data = useSinistralidade();
  const [page, setPage] = useState(0);
  if (!data) {
    return (
      <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex items-center justify-center text-muted-foreground text-sm">
        Carregando...
      </section>
    );
  }

  return (
    <div className="h-[calc(100vh-9rem)] flex flex-col gap-3 min-h-0">
      <div className="flex items-stretch gap-3 shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
          {[
            { l: "Receita (12m)", v: fmtBRL(data.totalRec), c: "text-foreground" },
            { l: "Despesa (12m)", v: fmtBRL(data.totalDesp), c: "text-destructive" },
            { l: "Sinistralidade", v: fmtPct(data.sinTotal), c: data.sinTotal > 80 ? "text-destructive" : "text-green-500" },
            { l: "Vidas (média)", v: Math.round(data.totalVidas).toLocaleString("pt-BR"), c: "text-foreground" },
          ].map((k) => (
            <div key={k.l} className="bg-card rounded-xl border border-border shadow-sm px-3 py-2">
              <p className="text-[10px] text-muted-foreground leading-tight">{k.l}</p>
              <p className={`text-sm font-semibold mt-0.5 ${k.c}`}>{k.v}</p>
            </div>
          ))}
        </div>
        {(() => {
          const totalPages = 6;
          const labels = ["Visão geral", "Comparativo", "Tipo Copart", "Contratação", "Recuperação", "Microrregião"];
          const isLast = page === totalPages - 1;
          return (
            <>
              <button
                onClick={() => setPage((p) => (p + 1) % totalPages)}
                className="shrink-0 bg-card rounded-xl border border-border shadow-sm px-4 flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:bg-accent hover:text-primary transition-colors"
                title={isLast ? "Voltar à visão geral" : "Próximos 4 gráficos"}
                aria-label={isLast ? "Voltar à visão geral" : "Próximos 4 gráficos"}
              >
                {isLast ? <ArrowLeft className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
                <span className="text-[10px] leading-tight">{isLast ? "Voltar" : "Mais 4"}</span>
                <span className="text-[9px] leading-tight text-muted-foreground/70">{page + 1}/{totalPages} · {labels[page]}</span>
              </button>
            </>
          );
        })()}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("open-bi-overview"))}
          className="shrink-0 bg-card rounded-xl border border-border shadow-sm px-4 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-accent hover:text-primary transition-colors"
          title="Abrir B.I. Overview"
          aria-label="Abrir B.I. Overview"
        >
          <Monitor className="h-5 w-5" />
          <span className="text-[10px] leading-tight">B.I. Overview</span>
        </button>
      </div>

      {page === 2 ? <DimensionPage label="Tipo Copart" rows={data.dims.tipo.rows as any} /> :
       page === 3 ? <DimensionPage label="Contratação" rows={data.dims.contr.rows as any} /> :
       page === 4 ? <DimensionPage label="Recuperação" rows={data.dims.recup.rows as any} /> :
       page === 5 ? <DimensionPage label="Microrregião" rows={data.dims.micro.rows as any} /> :
       page === 0 ? (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">

        <ChartCard title="Sinistralidade mensal" subtitle="Receita, Despesa e % Sinistralidade">
          <ComposedChart data={data.byMes} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis yAxisId="l" tickFormatter={fmtCompact} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis yAxisId="r" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number, n) => (n === "Sinistralidade" ? fmtPct(v) : fmtBRL(v))} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar yAxisId="l" dataKey="Receita" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="l" dataKey="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Line yAxisId="r" type="monotone" dataKey="Sinistralidade" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }}>
              <LabelList dataKey="Sinistralidade" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 9, fill: "hsl(var(--foreground))" }} />
            </Line>
          </ComposedChart>
        </ChartCard>

        <ChartCard title="Sinistralidade por Faixa Etária" subtitle="% Despesa / Receita">
          <BarChart data={data.byFaixa} margin={{ top: 14, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="faixa" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmtPct(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Bar dataKey="Sinistralidade" fill="#a855f7" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="Sinistralidade" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 9, fill: "hsl(var(--foreground))" }} />
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Despesa por Tipo de Plano" subtitle="Participação no período">
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Pie
              data={data.byTipo}
              dataKey="value"
              nameKey="name"
              cx="38%"
              cy="50%"
              innerRadius="48%"
              outerRadius="78%"
              paddingAngle={2}
              label={(e: any) => `${(e.percent * 100).toFixed(0)}%`}
              labelLine={false}
              style={{ fontSize: 9 }}
            >
              {data.byTipo.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 9, lineHeight: "12px", paddingLeft: 8 }} />
          </PieChart>
        </ChartCard>

        <ChartCard title="Top 10 Microrregiões — Sinistralidade" subtitle="Mínimo 100 vidas no período">
          <BarChart data={data.byMicroTop} layout="vertical" margin={{ top: 4, right: 30, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis type="category" dataKey="micro" width={110} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmtPct(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Bar dataKey="Sinistralidade" fill="#06b6d4" radius={[0, 4, 4, 0]}>
              <LabelList dataKey="Sinistralidade" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 9, fill: "hsl(var(--foreground))" }} />
            </Bar>
          </BarChart>
        </ChartCard>
      </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
        <ChartCard title="Sinistralidade por Contratação" subtitle="% Despesa / Receita por tipo de contratação">
          <BarChart data={data.byContr} margin={{ top: 14, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" interval={0} />
            <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmtPct(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Bar dataKey="Sinistralidade" fill="#3b82f6" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="Sinistralidade" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 9, fill: "hsl(var(--foreground))" }} />
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Sinistralidade por Tipo Plano Contratação" subtitle="% Despesa / Receita">
          <BarChart data={data.byPlano} margin={{ top: 14, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" interval={0} />
            <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmtPct(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Bar dataKey="Sinistralidade" fill="#a855f7" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="Sinistralidade" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 9, fill: "hsl(var(--foreground))" }} />
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Despesa por Recuperação" subtitle="Coparticipativo x Não coparticipativo">
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Pie
              data={data.byRecup}
              dataKey="value"
              nameKey="name"
              cx="38%"
              cy="50%"
              innerRadius="48%"
              outerRadius="78%"
              paddingAngle={2}
              label={(e: any) => `${(e.percent * 100).toFixed(0)}%`}
              labelLine={false}
              style={{ fontSize: 9 }}
            >
              {data.byRecup.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 9, lineHeight: "12px", paddingLeft: 8 }} />
          </PieChart>
        </ChartCard>

        <ChartCard title="Vidas Atingidas por mês" subtitle="Total de vidas no período">
          <LineChart data={data.vidasByMes} margin={{ top: 14, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR")} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Line type="monotone" dataKey="Vidas" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }}>
              <LabelList dataKey="Vidas" position="top" formatter={fmtCompact} style={{ fontSize: 9, fill: "hsl(var(--foreground))" }} />
            </Line>
          </LineChart>
        </ChartCard>
      </div>
      )}
    </div>
  );
};

export default SinistralidadeGraficos;
