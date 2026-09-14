import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = {
  ano: string;
  mes: string;
  agente: string;
  vendedor: string;
  produto: string;
  qtd: number;
};

type Json = {
  anos: string[];
  produtos: string[];
  agentes: string[];
  data: Row[];
};

const MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const PROD_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
const ANO_COLORS = ["hsl(var(--chart-3))", "hsl(var(--chart-1))", "hsl(var(--chart-4))"];

const short = (s: string, n = 20) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const nf = (v: number) => v.toLocaleString("pt-BR");

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-col rounded-lg border border-border bg-card p-3">
      <div className="mb-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          {children as never}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function VendasVendedorProdutoChart() {
  const [json, setJson] = useState<Json | null>(null);
  const [topN, setTopN] = useState("10");

  useEffect(() => {
    fetch("/data/vendas_vendedor_produto.json")
      .then((r) => r.json())
      .then(setJson)
      .catch((e) => console.error(e));
  }, []);

  const produtos = json?.produtos ?? [];
  const anos = json?.anos ?? [];

  // 1) Agente x Tipo de Produto x Ano
  const agenteData = useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();
    for (const r of json?.data ?? []) {
      const row = map.get(r.agente) ?? { agente: r.agente };
      const k = `${r.ano} · ${r.produto}`;
      row[k] = ((row[k] as number) ?? 0) + r.qtd;
      row.__total = ((row.__total as number) ?? 0) + r.qtd;
      map.set(r.agente, row);
    }
    return [...map.values()].sort((a, b) => (b.__total as number) - (a.__total as number));
  }, [json]);

  const agenteSeries = useMemo(
    () => anos.flatMap((a) => produtos.map((p) => ({ key: `${a} · ${p}`, ano: a }))),
    [anos, produtos],
  );

  // 2) Vendedor x Tipo de Produto x Ano (Top N)
  const { vendedores, vendedorData } = useMemo(() => {
    const totals = new Map<string, number>();
    const map = new Map<string, Record<string, number | string>>();
    for (const r of json?.data ?? []) {
      totals.set(r.vendedor, (totals.get(r.vendedor) ?? 0) + r.qtd);
      const row = map.get(r.vendedor) ?? { vendedor: r.vendedor };
      const k = `${r.ano} · ${r.produto}`;
      row[k] = ((row[k] as number) ?? 0) + r.qtd;
      map.set(r.vendedor, row);
    }
    const vs = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, Number(topN))
      .map(([v]) => v);
    return { vendedores: vs, vendedorData: vs.map((v) => map.get(v)!) };
  }, [json, topN]);

  // 3) Tipo de Produto por mes x ano (linhas)
  const mesProdutoData = useMemo(() => {
    const base = MESES.map((nome, i) => ({ mes: nome, __m: String(i + 1) } as Record<string, number | string>));
    for (const r of json?.data ?? []) {
      const idx = Number(r.mes) - 1;
      if (idx < 0 || idx > 11) continue;
      const k = `${r.ano} · ${r.produto}`;
      base[idx][k] = ((base[idx][k] as number) ?? 0) + r.qtd;
    }
    return base;
  }, [json]);

  // 4) Volume mensal por ano (área) + mix por produto (donut)
  const mesAnoData = useMemo(() => {
    const base = MESES.map((nome) => ({ mes: nome } as Record<string, number | string>));
    for (const r of json?.data ?? []) {
      const idx = Number(r.mes) - 1;
      if (idx < 0 || idx > 11) continue;
      base[idx][r.ano] = ((base[idx][r.ano] as number) ?? 0) + r.qtd;
    }
    return base;
  }, [json]);

  const mixData = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of json?.data ?? []) {
      const k = `${r.ano} · ${r.produto}`;
      map.set(k, (map.get(k) ?? 0) + r.qtd);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [json]);

  const totalGeral = useMemo(
    () => (json?.data ?? []).reduce((s, r) => s + r.qtd, 0),
    [json],
  );

  if (!json) {
    return (
      <Card className="flex-1 min-h-0">
        <CardContent className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando painel...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <CardHeader className="shrink-0 flex flex-row flex-wrap items-center justify-between gap-3 py-3">
        <CardTitle className="text-base">
          Painel de Vendas — {nf(totalGeral)} vidas ({anos.join(" e ")})
        </CardTitle>
        <Select value={topN} onValueChange={setTopN}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["5", "10", "15", "20"].map((t) => (
              <SelectItem key={t} value={t}>
                Top {t} vendedores
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-auto">
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel
            title="Agente × Tipo de Produto × Ano"
            subtitle="Vidas por agente, empilhado por produto e separado por ano"
          >
            <BarChart data={agenteData} margin={{ left: 4, right: 12, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="agente" tick={{ fontSize: 10 }} tickFormatter={(v) => short(v, 14)} interval={0} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => nf(v)} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {agenteSeries.map((s, i) => (
                <Bar key={s.key} dataKey={s.key} stackId={s.ano} fill={PROD_COLORS[i % PROD_COLORS.length]} />
              ))}
            </BarChart>
          </Panel>

          <Panel
            title={`Vendedor × Tipo de Produto × Ano — Top ${topN}`}
            subtitle="Uma barra por ano, empilhada pelos tipos de produto"
          >
            <BarChart data={vendedorData} layout="vertical" margin={{ left: 4, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="vendedor"
                width={140}
                tick={{ fontSize: 9 }}
                tickFormatter={(v) => short(v, 18)}
              />
              <Tooltip formatter={(v: number) => nf(v)} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {agenteSeries.map((s, i) => (
                <Bar key={s.key} dataKey={s.key} stackId={s.ano} fill={PROD_COLORS[i % PROD_COLORS.length]} />
              ))}
            </BarChart>
          </Panel>

          <Panel
            title="Tipo de Produto × Mês × Ano"
            subtitle="Evolução mensal de cada produto, comparando os anos"
          >
            <LineChart data={mesProdutoData} margin={{ left: 4, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => nf(v)} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {agenteSeries.map((s, i) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={PROD_COLORS[i % PROD_COLORS.length]}
                  strokeWidth={2}
                  strokeDasharray={s.ano === anos[0] ? "4 3" : undefined}
                  dot={false}
                />
              ))}
            </LineChart>
          </Panel>

          <Panel
            title="Volume mensal por ano"
            subtitle="Total de vidas por mês, um ano sobre o outro"
          >
            <AreaChart data={mesAnoData} margin={{ left: 4, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => nf(v)} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {anos.map((a, i) => (
                <Area
                  key={a}
                  type="monotone"
                  dataKey={a}
                  stroke={ANO_COLORS[i % ANO_COLORS.length]}
                  fill={ANO_COLORS[i % ANO_COLORS.length]}
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </Panel>

          <Panel
            title="Mix de Tipo de Produto por Ano"
            subtitle="Participação de cada produto no total de vidas"
          >
            <PieChart>
              <Tooltip formatter={(v: number) => nf(v)} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Pie
                data={mixData}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={2}
              >
                {mixData.map((_, i) => (
                  <Cell key={i} fill={PROD_COLORS[i % PROD_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </Panel>
        </div>
      </CardContent>
    </Card>
  );
}
