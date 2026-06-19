import { useEffect, useMemo, useState } from "react";
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

    // Composição de despesas em buckets fixos
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
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-3 min-h-0">
      <div className="flex items-stretch gap-3 shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
        {[
          { l: "Receitas (Jan-Abr)", v: fmtBRL(totalReceitas), c: "text-foreground" },
          { l: "Despesas (Jan-Abr)", v: fmtBRL(totalDespesas), c: "text-destructive" },
          { l: "Resultado do Período", v: fmtBRL(totalResultado), c: totalResultado < 0 ? "text-destructive" : "text-green-500" },
          { l: "Margem Líquida", v: `${margem.toFixed(1)}%`, c: margem < 0 ? "text-destructive" : "text-green-500" },
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
        <ChartCard title="Receitas vs Despesas por mês" subtitle="Comparativo mensal em R$">
          <BarChart data={data.byMes}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="Receitas" fill="#3b82f6" radius={[4, 4, 0, 0]}><LabelList dataKey="Receitas" position="top" formatter={fmtCompact} style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} /></Bar>
            <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]}><LabelList dataKey="Despesas" position="top" formatter={fmtCompact} style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} /></Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Evolução do Resultado" subtitle="EBITDA, Financeiro e Resultado Líquido">
          <ComposedChart data={data.byMes}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="EBITDA" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}><LabelList dataKey="EBITDA" position="top" formatter={fmtCompact} style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} /></Bar>
            <Bar dataKey="Financeiro" fill="#8b5cf6" radius={[4, 4, 0, 0]}><LabelList dataKey="Financeiro" position="top" formatter={fmtCompact} style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} /></Bar>
            <Line type="monotone" dataKey="Resultado" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }}><LabelList dataKey="Resultado" position="top" formatter={fmtCompact} style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} /></Line>
          </ComposedChart>
        </ChartCard>

        <ChartCard title="Composição de Despesas" subtitle="Participação por categoria no período">
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Pie
              data={data.despPie}
              dataKey="value"
              nameKey="name"
              cx="38%"
              cy="50%"
              outerRadius="78%"
              label={(e: any) => `${(e.percent * 100).toFixed(0)}%`}
              labelLine={false}
              style={{ fontSize: 9 }}
            >
              {data.despPie.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 9, lineHeight: "12px", paddingLeft: 8 }} />
          </PieChart>
        </ChartCard>

        <ChartCard title="Despesas Administrativas (Top 5)" subtitle="Evolução mensal por categoria">
          <LineChart data={data.admByMes}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v: number) => fmtBRL(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
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
