import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { operatorFilterName, type operatorResults } from "@/control/benchC";
import { formatDreMargin } from "@/control/dreMargin";

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const amount = (value: number) => value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export default function BenchResultsChart({ data, year, quarters, loading, error }: {
  data: ReturnType<typeof operatorResults>; year?: number; quarters: number[];
  loading: boolean; error?: string;
}) {
  const available = data.filter(op => op.disponivel);
  return <section aria-label="Gráfico de resultados" className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      <header><h2 className="text-lg font-semibold">Resultado comparado das operadoras</h2><p className="text-sm text-muted-foreground">{[1, 2, 3, 4].every(q => quarters.includes(q)) ? `${year} Acumulado | R$` : `Acumulado · ${year} · ${quarters.map(q => `${q}º tri`).join(" + ")} · R$`}</p></header>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : loading ? <p role="status" className="py-6 text-center text-sm text-muted-foreground">Carregando dados do ano…</p> : available.length ? <div className="overflow-x-auto"><div className="min-w-[700px]" style={{ height: Math.max(280, available.length * 88 + 64) }}>
        <ResponsiveContainer width="100%" height="100%"><BarChart data={available} layout="vertical" margin={{ top: 12, right: 24, bottom: 16, left: 12 }}>
          <CartesianGrid stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" domain={[(minimum: number) => Math.min(0, minimum, available.some(op => op.resultado < 0) ? -Math.max(...available.map(op => op.resultado), 0) * 0.4 : 0), (maximum: number) => Math.max(0, maximum)]} tickFormatter={value => `${Number(value).toLocaleString("pt-BR", { notation: "compact" })}`} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
          <YAxis type="category" dataKey="reg" width={200} tick={({ x, y, payload }) => <foreignObject x={Number(x) - 192} y={Number(y) - 40} width={184} height={80}><div className="flex h-full items-center justify-end break-words text-right text-xs text-foreground">{operatorFilterName(available.find(op => op.reg === payload.value)?.nome ?? payload.value)}</div></foreignObject>} />
          <ReferenceLine x={0} stroke="hsl(var(--foreground))" />
          <Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={({ active, payload }) => {
            const op = payload?.[0]?.payload as (typeof available)[number] | undefined;
            return active && op ? <div className="max-w-sm rounded-md border border-border bg-popover p-3 text-sm text-popover-foreground shadow-md"><p className="font-semibold">{op.nome} · ANS {op.reg}</p><p>Resultado: {money(op.resultado)} {formatDreMargin(op.percentual)}</p></div> : null;
          }} />
          <Bar dataKey="resultado" name="Resultado" fill="hsl(var(--primary))" maxBarSize={32} isAnimationActive={false}>
            {available.map(op => <Cell key={op.reg} fill={op.resultado < 0 ? "hsl(var(--destructive))" : "hsl(var(--primary))"} />)}
            <LabelList dataKey="resultado" content={({ x, y, width, height, index }) => {
              const op = available[Number(index)];
              if (!op) return null;
              const negative = op.resultado < 0;
              const zeroX = Number(x);
              return <text x={zeroX + (negative ? -6 : 6)} y={Number(y) + Number(height) / 2} dominantBaseline="central" textAnchor={negative ? "end" : "start"} fill="hsl(var(--foreground))" fontSize={11} fontWeight={600}>{amount(op.resultado)} {formatDreMargin(op.percentual)}</text>;
            }} />
          </Bar>
        </BarChart></ResponsiveContainer>
      </div></div> : <p className="text-sm text-muted-foreground">Nenhum resultado disponível para este período.</p>}
      {!loading && !error && <dl className="divide-y divide-border">{data.map(op => <div key={op.reg} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><dt className="min-w-0 flex-1 basis-64 break-words">{op.nome} <span className="text-muted-foreground">· {op.reg}</span></dt><dd className="text-right tabular-nums">{op.disponivel ? <><div className="text-muted-foreground">Faturamento: {money(op.faturamento)}</div><div className={`font-semibold ${op.resultado < 0 ? "text-destructive" : "text-foreground"}`}>Resultado: {money(op.resultado)} <span className="whitespace-nowrap">{formatDreMargin(op.percentual)}</span></div></> : "Sem dados"}</dd></div>)}</dl>}
  </section>;
}