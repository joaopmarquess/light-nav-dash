import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

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

const nf = (v: number) => v.toLocaleString("pt-BR");

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

export default function VendasProdutoPizza() {
  const [json, setJson] = useState<Json | null>(null);

  useEffect(() => {
    fetch("/data/vendas_vendedor_produto.json")
      .then((r) => r.json())
      .then(setJson)
      .catch((e) => console.error(e));
  }, []);

  const anos = json?.anos ?? [];
  const produtos = json?.produtos ?? [];

  const porAno = useMemo(() => {
    const out = new Map<string, { name: string; value: number }[]>();
    for (const ano of anos) {
      const map = new Map<string, number>();
      for (const r of json?.data ?? []) {
        if (r.ano !== ano) continue;
        map.set(r.produto, (map.get(r.produto) ?? 0) + r.qtd);
      }
      out.set(
        ano,
        produtos
          .map((p) => ({ name: p, value: map.get(p) ?? 0 }))
          .filter((d) => d.value > 0),
      );
    }
    return out;
  }, [json, anos, produtos]);

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
        <CardTitle className="text-base">Tipo de Produto — participação por ano</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-auto">
        <div className="grid gap-4 lg:grid-cols-2">
          {anos.map((ano) => {
            const dados = porAno.get(ano) ?? [];
            const total = dados.reduce((s, d) => s + d.value, 0);
            return (
              <div key={ano} className="rounded-lg border border-border bg-card p-3">
                <div className="mb-2 flex items-baseline justify-between">
                  <p className="text-sm font-semibold text-foreground">{ano}</p>
                  <p className="text-xs text-muted-foreground">{nf(total)} vidas</p>
                </div>
                <div className="h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        formatter={(v: number) =>
                          `${nf(v)} (${total ? ((v / total) * 100).toFixed(1) : "0"}%)`
                        }
                        contentStyle={tooltipStyle}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Pie
                        data={dados}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={110}
                        paddingAngle={2}
                        label={(d: { value: number }) =>
                          total ? `${((d.value / total) * 100).toFixed(1)}%` : ""
                        }
                        labelLine={false}
                      >
                        {dados.map((d, i) => (
                          <Cell
                            key={d.name}
                            fill={PROD_COLORS[produtos.indexOf(d.name) % PROD_COLORS.length || i % PROD_COLORS.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
