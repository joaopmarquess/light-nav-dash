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
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = { ano: string; mes: string; vendedor: string; produto: string; qtd: number };

const MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const short = (s: string) => (s.length > 22 ? `${s.slice(0, 21)}…` : s);

export default function VendasVendedorProdutoChart() {
  const [json, setJson] = useState<{ produtos: string[]; anos: string[]; data: Row[] } | null>(null);
  const [ano, setAno] = useState("todos");
  const [mes, setMes] = useState("todos");
  const [top, setTop] = useState("20");

  useEffect(() => {
    fetch("/data/vendas_vendedor_produto.json")
      .then((r) => r.json())
      .then(setJson)
      .catch((e) => console.error(e));
  }, []);

  const produtos = json?.produtos ?? [];

  const anos = useMemo(
    () => (ano === "todos" ? (json?.anos ?? []) : [ano]),
    [json, ano],
  );

  const { vendedores, byAno } = useMemo(() => {
    const totals = new Map<string, number>();
    const byAno = new Map<string, Map<string, Record<string, number>>>();
    anos.forEach((a) => byAno.set(a, new Map()));
    for (const r of json?.data ?? []) {
      if (!byAno.has(r.ano)) continue;
      if (mes !== "todos" && r.mes !== mes) continue;
      totals.set(r.vendedor, (totals.get(r.vendedor) ?? 0) + r.qtd);
      const m = byAno.get(r.ano)!;
      const row = m.get(r.vendedor) ?? {};
      row[r.produto] = (row[r.produto] ?? 0) + r.qtd;
      m.set(r.vendedor, row);
    }
    const vendedores = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, Number(top))
      .map(([v]) => v);
    return { vendedores, byAno };
  }, [json, anos, mes, top]);

  const dataFor = (a: string) => {
    const m = byAno.get(a) ?? new Map<string, Record<string, number>>();
    return vendedores.map((v) => {
      const row: Record<string, number | string> = { vendedor: v };
      produtos.forEach((p) => (row[p] = m.get(v)?.[p] ?? 0));
      return row;
    });
  };

  const height = Math.max(320, vendedores.length * 26 + 70);

  return (
    <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <CardHeader className="shrink-0 py-3 flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="text-base">
          Vendedor × Tipo de Produto — vidas (contagem distinta)
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={ano} onValueChange={setAno}>
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">2025 e 2026</SelectItem>
              {(json?.anos ?? []).map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os meses</SelectItem>
              {MESES.map((nome, i) => (
                <SelectItem key={i} value={String(i + 1)}>
                  {nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={top} onValueChange={setTop}>
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["10", "20", "30", "50"].map((t) => (
                <SelectItem key={t} value={t}>
                  Top {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-auto">
        {!json ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <div className={anos.length > 1 ? "grid gap-4 lg:grid-cols-2" : ""}>
            {anos.map((a) => (
              <div key={a} className="min-w-0">
                <p className="mb-1 text-center text-sm font-semibold text-foreground">{a}</p>
                <div style={{ height }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dataFor(a)} layout="vertical" margin={{ left: 8, right: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="vendedor"
                        width={170}
                        tick={{ fontSize: 10 }}
                        tickFormatter={short}
                      />
                      <Tooltip
                        formatter={(v: number) => v.toLocaleString("pt-BR")}
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          fontSize: 12,
                        }}
                      />
                      <Legend />
                      {produtos.map((prod, i) => (
                        <Bar
                          key={prod}
                          dataKey={prod}
                          stackId="a"
                          fill={COLORS[i % COLORS.length]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
