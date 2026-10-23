import { Bar, ComposedChart, Line, Legend, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import type { FluxoMensal } from "@/lib/movimentacaoCarga";

const fmtMes = (mes: string) => new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${mes}-01T00:00:00Z`));

export default function MovimentacaoCrescimentoMensal({ dados }: { dados: FluxoMensal[] }) {
  return <section aria-labelledby="crescimento-mensal-titulo" className="min-w-0 border-t pt-5">
    <h2 id="crescimento-mensal-titulo" className="mb-4 text-lg font-semibold">Vendas, saídas e crescimento mensal</h2>
    <div className="mx-auto h-[480px] w-full max-w-4xl text-xs text-muted-foreground" role="img" aria-label={dados.map(d => `${fmtMes(d.mes)}: ${d.vendas} vendas, ${d.saidas} saídas, crescimento ${d.crescimento}`).join("; ")}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={dados} margin={{ top: 16, right: 16, bottom: 8, left: 8 }} accessibilityLayer>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis dataKey="mes" tickFormatter={fmtMes} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
          <YAxis tickFormatter={n => Number(n).toLocaleString("pt-BR")} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={65} />
          <ReferenceLine y={0} stroke="hsl(var(--border))" />
          <Legend />
          <Tooltip cursor={false} content={({ active, payload }) => {
            const d = payload?.[0]?.payload as FluxoMensal | undefined;
            if (!active || !d) return null;
            return <div className="rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
              <p className="font-medium">{fmtMes(d.mes)}</p>
              <p className="mt-1 tabular-nums">Vendas: {d.vendas.toLocaleString("pt-BR")}</p>
              <p className="tabular-nums">Saídas: {d.saidas.toLocaleString("pt-BR")}</p>
              <p className="tabular-nums">Crescimento: {d.crescimento.toLocaleString("pt-BR")}</p>
            </div>;
          }} />
          <Bar dataKey="vendas" name="Vendas" fill="hsl(var(--chart-1))" maxBarSize={40} isAnimationActive={false} />
          <Bar dataKey="saidas" name="Saídas (abs)" fill="hsl(var(--chart-desp))" maxBarSize={40} isAnimationActive={false} />
          <Line type="linear" dataKey="crescimento" name="Crescimento" stroke="hsl(var(--chart-3))" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  </section>;
}