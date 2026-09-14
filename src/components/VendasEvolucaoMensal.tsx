import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
  recurso: string;
  agente: string;
  vendedor: string;
  produto: string;
  qtd: number;
};

type Json = {
  anos: string[];
  produtos: string[];
  agentes: string[];
  recursos?: string[];
  data: Row[];
};

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];


const isAdm = (p: string) => /adm/i.test(p);
const isProprio = (s: string) => /pr[oó]prio/i.test(s);

// Produto de ADM em laranja, outros produtos em azul escuro.
// Combinação com recurso Próprio usa o tom mais claro.
const prodColor = (label: string, fallback: string) => {
  const adm = isAdm(label);
  const claro = isProprio(label);
  if (adm) return claro ? "hsl(28 90% 70%)" : "hsl(var(--chart-adm))";
  return claro ? "hsl(var(--chart-fat))" : "hsl(215 60% 60%)";
};

type Dim = "produto" | "recurso" | "agente" | "vendedor" | "recurso_produto";

const dimKey = (r: Row, dim: Dim) =>
  dim === "recurso_produto" ? `${r.recurso} · ${r.produto}` : r[dim];

const DIMS: { key: Dim; label: string }[] = [
  { key: "recurso_produto", label: "Recurso × Produto" },
  { key: "produto", label: "Tipo de Produto" },
  { key: "recurso", label: "Recurso" },
  { key: "agente", label: "Agente" },
  { key: "vendedor", label: "Vendedor" },
];

const nf = (v: number) => v.toLocaleString("pt-BR");

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

type Props = { mesDe?: string; mesAte?: string };

export default function VendasEvolucaoMensal({ mesAte = "12" }: Props) {
  const [json, setJson] = useState<Json | null>(null);
  const [dim, setDim] = useState<Dim>("produto");
  const [recurso, setRecurso] = useState("__all__");
  const [agente, setAgente] = useState("__all__");
  const [vendedor, setVendedor] = useState("__all__");

  useEffect(() => {
    fetch("/data/vendas_vendedor_produto.json")
      .then((r) => r.json())
      .then(setJson)
      .catch((e) => console.error(e));
  }, []);

  const anoFinal = useMemo(() => {
    const anos = (json?.data ?? []).map((r) => Number(r.ano));
    return anos.length ? Math.max(...anos) : 2026;
  }, [json]);

  // Anos anteriores: todos os meses. Último ano: até o mês selecionado.
  const noPeriodo = useMemo(
    () =>
      (json?.data ?? []).filter(
        (r) => Number(r.ano) < anoFinal || Number(r.mes) <= Number(mesAte),
      ),
    [json, anoFinal, mesAte],
  );


  const recursos = useMemo(() => {
    const t = new Map<string, number>();
    for (const r of noPeriodo) t.set(r.recurso, (t.get(r.recurso) ?? 0) + r.qtd);
    return [...t.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
  }, [noPeriodo]);

  const agentes = useMemo(() => {
    const t = new Map<string, number>();
    for (const r of noPeriodo) {
      if (recurso !== "__all__" && r.recurso !== recurso) continue;
      t.set(r.agente, (t.get(r.agente) ?? 0) + r.qtd);
    }
    return [...t.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
  }, [noPeriodo, recurso]);

  const vendedores = useMemo(() => {
    const t = new Map<string, number>();
    for (const r of noPeriodo) {
      if (recurso !== "__all__" && r.recurso !== recurso) continue;
      if (agente !== "__all__" && r.agente !== agente) continue;
      t.set(r.vendedor, (t.get(r.vendedor) ?? 0) + r.qtd);
    }
    return [...t.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
  }, [noPeriodo, recurso, agente]);

  useEffect(() => {
    if (agente !== "__all__" && !agentes.includes(agente)) setAgente("__all__");
  }, [agentes, agente]);

  useEffect(() => {
    if (vendedor !== "__all__" && !vendedores.includes(vendedor)) setVendedor("__all__");
  }, [vendedores, vendedor]);

  const filtradas = useMemo(
    () =>
      noPeriodo.filter(
        (r) =>
          (recurso === "__all__" || r.recurso === recurso) &&
          (agente === "__all__" || r.agente === agente) &&
          (vendedor === "__all__" || r.vendedor === vendedor),
      ),
    [noPeriodo, recurso, agente, vendedor],
  );

  // Eixo horizontal: todos os meses de 01/2025 até o último mês existente
  const meses = useMemo(() => {
    const chaves = new Set<string>();
    for (const r of filtradas) chaves.add(`${r.ano}-${String(Number(r.mes)).padStart(2, "0")}`);
    if (!chaves.size) return [] as string[];
    const anos = [...new Set([...chaves].map((c) => Number(c.slice(0, 4))))];
    const anoIni = Math.min(2025, ...anos);
    const anoFim = Math.max(...anos);
    const ultimo = `${anoFim}-${String(Number(mesAte)).padStart(2, "0")}`;
    const out: string[] = [];
    let y = anoIni;
    let m = 1;
    for (;;) {
      const k = `${y}-${String(m).padStart(2, "0")}`;
      out.push(k);
      if (k === ultimo) break;
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
      if (out.length > 60) break;
    }
    return out;
  }, [filtradas, mesAte]);

  const { series, chartData } = useMemo(() => {
    const totals = new Map<string, number>();
    for (const r of filtradas) {
      const k = dimKey(r, dim);
      totals.set(k, (totals.get(k) ?? 0) + r.qtd);
    }
    const ss = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k]) => k);
    const base = new Map<string, Record<string, number | string>>(
      meses.map((k) => {
        const [y, m] = k.split("-");
        return [k, { mes: `${m}/${y.slice(2)}` }];
      }),
    );
    for (const r of filtradas) {
      const k = `${r.ano}-${String(Number(r.mes)).padStart(2, "0")}`;
      const row = base.get(k);
      const sk = dimKey(r, dim);
      if (!row || !ss.includes(sk)) continue;
      row[sk] = ((row[sk] as number) ?? 0) + r.qtd;
    }
    return { series: ss, chartData: [...base.values()] };
  }, [filtradas, dim, meses]);

  const total = useMemo(() => filtradas.reduce((s, r) => s + r.qtd, 0), [filtradas]);

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
      <CardHeader className="shrink-0 flex flex-col gap-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">
            Evolução mensal — {DIMS.find((d) => d.key === dim)?.label} · {nf(total)} vidas
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={recurso} onValueChange={setRecurso}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os recursos</SelectItem>
                {recursos.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={agente} onValueChange={setAgente}>
              <SelectTrigger className="w-[220px]">
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
              <SelectTrigger className="w-[220px]">
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
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Abrir por:</span>
          {DIMS.map((d) => (
            <Button
              key={d.key}
              size="sm"
              variant={dim === d.key ? "default" : "outline"}
              onClick={() => setDim(d.key)}
            >
              {d.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-auto">
        <div className="h-[460px] rounded-lg border border-border bg-card p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 4, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => nf(v)} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {series.map((s, i) => (
                <Bar key={s} dataKey={s} stackId="a" fill={dim === "produto" || dim === "recurso_produto" ? prodColor(s, COLORS[i % COLORS.length]) : COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
