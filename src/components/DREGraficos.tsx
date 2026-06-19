import { useEffect, useMemo, useState } from "react";
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
  const abs = Math.abs(v);
  const s =
    abs >= 1_000_000
      ? (v / 1_000_000).toFixed(1) + "M"
      : abs >= 1_000
      ? (v / 1_000).toFixed(0) + "k"
      : v.toFixed(0);
  return s;
};
const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const COLORS = ["#dc2626", "#ef4444", "#f87171", "#b91c1c", "#fb7185", "#e11d48", "#fca5a5", "#7f1d1d"];

const ChartCard = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <div className="bg-card rounded-xl border border-border shadow-sm p-5">
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        {children as any}
      </ResponsiveContainer>
    </div>
  </div>
);

const DREGraficos = () => {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    fetch("/data/dre.json").then((r) => r.json()).then(setRows).catch(() => setRows([]));
  }, []);

  const data = useMemo(() => {
    if (!rows) return null;

    // Por mês: receitas, despesas, resultado
    const byMes = MONTHS.map((m) => {
      const mr = rows.filter((r) => r.mes === m.n);
      const receitas = mr.filter((r) => r.valor > 0).reduce((s, r) => s + r.valor, 0);
      const despesas = mr.filter((r) => r.valor < 0).reduce((s, r) => s + r.valor, 0);
      const ebitda = mr.filter((r) => r.g1 === "1|EBITDA").reduce((s, r) => s + r.valor, 0);
      const financeiro = mr.filter((r) => r.g1 === "2|FINANCEIRO").reduce((s, r) => s + r.valor, 0);
      const resultado = ebitda + financeiro;
      return {
        mes: m.label,
        Receitas: receitas,
        Despesas: Math.abs(despesas),
        EBITDA: ebitda,
        Financeiro: financeiro,
        Resultado: resultado,
      };
    });

    // Composição de despesas por G3 (todas as despesas)
    const desp = new Map<string, number>();
    rows.filter((r) => r.valor < 0).forEach((r) => {
      const k = strip(r.g3);
      desp.set(k, (desp.get(k) ?? 0) + Math.abs(r.valor));
    });
    const despPie = [...desp.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const top = despPie.slice(0, 6);
    const restoTotal = despPie.slice(6).reduce((s, x) => s + x.value, 0);
    if (restoTotal > 0) top.push({ name: "Outros", value: restoTotal });

    // Administrativo por categoria ao longo dos meses (top 5 categorias)
    const admRows = rows.filter((r) => r.g2 === "2|ADMINISTRATIVO");
    const cats = Array.from(new Set(admRows.map((r) => strip(r.g3))));
    const admTotals = cats
      .map((c) => ({ c, total: admRows.filter((r) => strip(r.g3) === c).reduce((s, r) => s + Math.abs(r.valor), 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((x) => x.c);
    const admByMes = MONTHS.map((m) => {
      const row: any = { mes: m.label };
      admTotals.forEach((c) => {
        row[c] = admRows
          .filter((r) => r.mes === m.n && strip(r.g3) === c)
          .reduce((s, r) => s + Math.abs(r.valor), 0);
      });
      return row;
    });

    return { byMes, despPie: top, admByMes, admCats: admTotals };
  }, [rows]);

  if (!data) {
    return (
      <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-8rem)] flex items-center justify-center text-muted-foreground text-sm">
        Carregando...
      </section>
    );
  }

  const totalReceitas = data.byMes.reduce((s, r) => s + r.Receitas, 0);
  const totalDespesas = data.byMes.reduce((s, r) => s + r.Despesas, 0);
  const totalResultado = data.byMes.reduce((s, r) => s + r.Resultado, 0);
  const margem = totalReceitas ? (totalResultado / totalReceitas) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { l: "Receitas (Jan-Abr)", v: fmtBRL(totalReceitas), c: "text-foreground" },
          { l: "Despesas (Jan-Abr)", v: fmtBRL(totalDespesas), c: "text-destructive" },
          { l: "Resultado do Período", v: fmtBRL(totalResultado), c: totalResultado < 0 ? "text-destructive" : "text-green-500" },
          { l: "Margem Líquida", v: `${margem.toFixed(1)}%`, c: margem < 0 ? "text-destructive" : "text-green-500" },
        ].map((k) => (
          <div key={k.l} className="bg-card rounded-xl border border-border shadow-sm p-4">
            <p className="text-xs text-muted-foreground">{k.l}</p>
            <p className={`text-lg font-semibold mt-1 ${k.c}`}>{k.v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Receitas vs Despesas por mês" subtitle="Comparativo mensal em R$">
          <BarChart data={data.byMes}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Evolução do Resultado" subtitle="EBITDA, Financeiro e Resultado Líquido">
          <ComposedChart data={data.byMes}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="EBITDA" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Financeiro" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="Resultado" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
          </ComposedChart>
        </ChartCard>

        <ChartCard title="Composição de Despesas" subtitle="Participação por categoria no período">
          <PieChart>
            <Pie
              data={data.despPie}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={95}
              label={(e: any) => `${(e.percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.despPie.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ChartCard>

        <ChartCard title="Despesas Administrativas (Top 5)" subtitle="Evolução mensal por categoria">
          <LineChart data={data.admByMes}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {data.admCats.map((c, i) => (
              <Line key={c} type="monotone" dataKey={c} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ChartCard>
      </div>
    </div>
  );
};

export default DREGraficos;
