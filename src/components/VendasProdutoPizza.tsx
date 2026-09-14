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
  const [agente, setAgente] = useState("__all__");
  const [vendedor, setVendedor] = useState("__all__");

  useEffect(() => {
    fetch("/data/vendas_vendedor_produto.json")
      .then((r) => r.json())
      .then(setJson)
      .catch((e) => console.error(e));
  }, []);

  const anos = json?.anos ?? [];
  const produtos = json?.produtos ?? [];

  const agentes = useMemo(() => {
    const totals = new Map<string, number>();
    for (const r of json?.data ?? []) totals.set(r.agente, (totals.get(r.agente) ?? 0) + r.qtd);
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([a]) => a);
  }, [json]);

  const vendedores = useMemo(() => {
    const totals = new Map<string, number>();
    for (const r of json?.data ?? []) {
      if (agente !== "__all__" && r.agente !== agente) continue;
      totals.set(r.vendedor, (totals.get(r.vendedor) ?? 0) + r.qtd);
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
  }, [json, agente]);

  useEffect(() => {
    if (vendedor !== "__all__" && !vendedores.includes(vendedor)) setVendedor("__all__");
  }, [vendedores, vendedor]);

  const porAno = useMemo(() => {
    const out = new Map<string, { name: string; value: number }[]>();
    for (const ano of anos) {
      const map = new Map<string, number>();
      for (const r of json?.data ?? []) {
        if (r.ano !== ano) continue;
        if (agente !== "__all__" && r.agente !== agente) continue;
        if (vendedor !== "__all__" && r.vendedor !== vendedor) continue;
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
  }, [json, anos, produtos, agente, vendedor]);

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
      <CardHeader className="shrink-0 flex flex-row flex-wrap items-center justify-between gap-3 py-3">
        <CardTitle className="text-base">
          Tipo de Produto — participação por ano
          {agente !== "__all__" && ` · ${agente}`}
          {vendedor !== "__all__" && ` · ${vendedor}`}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={agente} onValueChange={setAgente}>
            <SelectTrigger className="w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os agentes</SelectItem>
              {agentes.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={vendedor} onValueChange={setVendedor}>
            <SelectTrigger className="w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os vendedores</SelectItem>
              {vendedores.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
