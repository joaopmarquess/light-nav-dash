import { Monitor } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LabelList,
} from "recharts";
import { useDWCarteira } from "@/components/DWCarteira";

const fmtInt = (v: number) => v.toLocaleString("pt-BR");
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

const CarteiraGraficos = () => {
  const d = useDWCarteira(true);

  if (d.loading || d.vidas == null) {
    return (
      <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex items-center justify-center text-muted-foreground text-sm">
        Carregando...
      </section>
    );
  }

  const contrat = d.porContratacao.slice(0, 8);
  const recup = d.porRecuperacao.slice(0, 8);
  const acom = d.porAcomodacao.slice(0, 8);
  const totalM = d.porFaixa.reduce((s, r) => s + r.M, 0);
  const totalF = d.porFaixa.reduce((s, r) => s + r.F, 0);
  const ufTop = d.porUF;

  return (
    <div className="h-[calc(100vh-9rem)] flex flex-col gap-3 min-h-0">
      <div className="flex items-stretch gap-3 shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
          {[
            { l: "Vidas ativas (hoje)", v: fmtInt(d.vidas), c: "text-foreground" },
            { l: "Feminino", v: fmtInt(totalF), c: "text-foreground" },
            { l: "Masculino", v: fmtInt(totalM), c: "text-foreground" },
            { l: "UFs distintas", v: fmtInt(Object.keys(d.ufTotals).length), c: "text-foreground" },
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
        <ChartCard title="Faixa etária por sexo" subtitle="Vidas ativas — distribuição por idade">
          <BarChart data={d.porFaixa}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="faixa" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmtInt(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="F" name="Feminino" stackId="s" fill="#ec4899" />
            <Bar dataKey="M" name="Masculino" stackId="s" fill="#3b82f6" />
          </BarChart>
        </ChartCard>

        <ChartCard title="Distribuição por UF" subtitle="Vidas ativas por estado">
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Pie
              data={ufTop}
              dataKey="total"
              nameKey="uf"
              cx="38%"
              cy="50%"
              innerRadius="48%"
              outerRadius="78%"
              paddingAngle={2}
              label={(e: any) => `${(e.percent * 100).toFixed(0)}%`}
              labelLine={false}
              style={{ fontSize: 9 }}
            >
              {ufTop.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => fmtInt(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 10, paddingLeft: 8 }} />
          </PieChart>
        </ChartCard>

        <ChartCard title="Tipo de Contratação" subtitle="Vidas ativas por tipo">
          <BarChart data={contrat} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={120} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmtInt(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]}>
              <LabelList dataKey="total" position="right" formatter={fmtInt} style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} />
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Recuperação × Acomodação" subtitle="Top categorias — vidas ativas">
          <BarChart data={recup.map((r) => ({ label: r.label, Recuperacao: r.total, Acomodacao: acom.find((a) => a.label === r.label)?.total ?? 0 }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" interval={0} angle={-15} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmtInt(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="Recuperacao" fill="#a855f7" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Acomodacao" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>
    </div>
  );
};

export default CarteiraGraficos;
