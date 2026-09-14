import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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

const PROD_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];


const isAdm = (p: string) => /adm/i.test(p);
const prodColor = (p: string, fallback: string) =>
  isAdm(p) ? "hsl(var(--chart-adm))" : "hsl(var(--chart-fat))";

const short = (s: string, n = 18) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const nf = (v: number) => v.toLocaleString("pt-BR");

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

type Props = { mesDe?: string; mesAte?: string };

export default function VendasVendedorProdutoChart({ mesDe = "1", mesAte = "12" }: Props) {
  const [json, setJson] = useState<Json | null>(null);

  useEffect(() => {
    fetch("/data/vendas_vendedor_produto.json")
      .then((r) => r.json())
      .then(setJson)
      .catch((e) => console.error(e));
  }, []);

  const anos = json?.anos ?? [];
  const produtos = json?.produtos ?? [];
  const noPeriodo = useMemo(
    () =>
      (json?.data ?? []).filter(
        (r) => Number(r.mes) >= Number(mesDe) && Number(r.mes) <= Number(mesAte),
      ),
    [json, mesDe, mesAte],
  );

  // Agentes ordenados pelo total geral (mesma ordem nos dois anos)
  const agentes = useMemo(() => {
    const totals = new Map<string, number>();
    for (const r of noPeriodo) {
      totals.set(r.agente, (totals.get(r.agente) ?? 0) + r.qtd);
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([a]) => a);
  }, [noPeriodo]);

  // Uma série de dados por ano: agente × produto
  const porAno = useMemo(() => {
    const out = new Map<string, Record<string, number | string>[]>();
    let max = 0;
    for (const ano of anos) {
      const rows = agentes.map((agente) => {
        const row: Record<string, number | string> = { agente };
        let total = 0;
        for (const r of noPeriodo) {
          if (r.ano !== ano || r.agente !== agente) continue;
          row[r.produto] = ((row[r.produto] as number) ?? 0) + r.qtd;
          total += r.qtd;
        }
        row.__total = total;
        max = Math.max(max, total);
        return row;
      });
      out.set(ano, rows);
    }
    return { out, max };
  }, [noPeriodo, anos, agentes]);

  const totalPorAno = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of noPeriodo) m.set(r.ano, (m.get(r.ano) ?? 0) + r.qtd);
    return m;
  }, [noPeriodo]);

  if (!json) {
    return (
      <Card className="flex-1 min-h-0">
        <CardContent className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando gráfico...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <CardHeader className="shrink-0 py-3">
        <CardTitle className="text-base">Agente × Tipo de Produto — um ano em cada coluna</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-auto">
        <div className="grid gap-4 lg:grid-cols-2">
          {anos.map((ano) => (
            <div key={ano} className="rounded-lg border border-border bg-card p-3">
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-sm font-semibold text-foreground">{ano}</p>
                <p className="text-xs text-muted-foreground">
                  {nf(totalPorAno.get(ano) ?? 0)} vidas
                </p>
              </div>
              <div style={{ height: Math.max(280, agentes.length * 46) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={porAno.out.get(ano) ?? []}
                    layout="vertical"
                    margin={{ left: 4, right: 24, top: 4, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, porAno.max]} tick={{ fontSize: 10 }} />
                    <YAxis
                      type="category"
                      dataKey="agente"
                      width={150}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => short(v, 20)}
                      interval={0}
                    />
                    <Tooltip formatter={(v: number) => nf(v)} contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {produtos.map((p, i) => (
                      <Bar
                        key={p}
                        dataKey={p}
                        stackId="a"
                        fill={prodColor(p, PROD_COLORS[i % PROD_COLORS.length])}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
