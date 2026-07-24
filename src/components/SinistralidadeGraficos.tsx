import { Monitor } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LabelList,
} from "recharts";
import { useSinistralidadeGraficosData } from "@/lib/sinistralidadeGraficosData";

const fmtCompact = (v: number) => {
  const abs = Math.abs(v);
  return abs >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : abs >= 1_000 ? (v / 1_000).toFixed(0) + "k" : v.toFixed(0);
};
const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
const fmtPct = (v: number) => `${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
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

const SinistralidadeGraficos = () => {
  const { loading, totals, gruposTop, desp } = useSinistralidadeGraficosData();

  if (loading || !totals.length) {
    return (
      <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex items-center justify-center text-muted-foreground text-sm">
        Carregando...
      </section>
    );
  }

  const totalRec = totals.reduce((s, r) => s + r.rec_total, 0);
  const totalDesp = totals.reduce((s, r) => s + r.vrdespesas, 0);
  const totalSaldo = totalRec - totalDesp;
  const sinTotal = totalRec ? totalDesp / totalRec : 0;

  return (
    <div className="h-[calc(100vh-9rem)] flex flex-col gap-3 min-h-0">
      <div className="flex items-stretch gap-3 shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
          {[
            { l: "Receita Total", v: fmtBRL(totalRec), c: "text-foreground" },
            { l: "Despesa Total", v: fmtBRL(totalDesp), c: "text-destructive" },
            { l: "Saldo", v: fmtBRL(totalSaldo), c: totalSaldo < 0 ? "text-destructive" : "text-green-500" },
            { l: "Sinistralidade", v: fmtPct(sinTotal), c: sinTotal > 0.85 ? "text-destructive" : "text-foreground" },
          ].map((k) => (
            <div key={k.l} className="bg-card rounded-xl border border-border shadow-sm px-3 py-2">
              <p className="text-[10px] text-muted-foreground leading-tight">{k.l}</p>
              <p className={`text-sm font-semibold mt-0.5 ${k.c}`}>{k.v}</p>
            </div>
          ))}
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
        <ChartCard title="Receita × Despesa por Período" subtitle="Comparativo em R$">
          <BarChart data={totals}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="periodo" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="rec_total" name="Receita" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="vrdespesas" name="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Sinistralidade (%) por Período" subtitle="Evolução do índice">
          <ComposedChart data={totals}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="periodo" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmtPct(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="sin" name="Sinistralidade" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }}>
              <LabelList dataKey="sin" position="top" formatter={(v: number) => `${(v * 100).toFixed(0)}%`} style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} />
            </Line>
          </ComposedChart>
        </ChartCard>

        <ChartCard title="Composição da Despesa" subtitle={`Período mais recente: ${totals[totals.length - 1]?.periodo ?? ""}`}>
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Pie
              data={desp}
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
              {desp.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 10, paddingLeft: 8 }} />
          </PieChart>
        </ChartCard>

        <ChartCard title="Top 10 Grupos por Despesa" subtitle="Consolidado de todos os períodos">
          <BarChart data={gruposTop} layout="vertical" margin={{ left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tickFormatter={fmtCompact} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis type="category" dataKey="GRUPO" tick={{ fontSize: 9 }} width={140} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Bar dataKey="vrdespesas" name="Despesa" fill="#ef4444" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartCard>
      </div>
    </div>
  );
};

export default SinistralidadeGraficos;
