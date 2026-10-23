import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CrescimentoMensal } from "@/lib/movimentacaoCarga";

const fmtMes = (mes: string) => new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${mes}-01T00:00:00Z`));
const fmtData = (data: string) => data.split("-").reverse().join("/");

export default function MovimentacaoCrescimentoMensal({ dados }: { dados: CrescimentoMensal[] }) {
  return <section aria-labelledby="crescimento-mensal-titulo" className="min-w-0 border-t pt-5">
    <h2 id="crescimento-mensal-titulo" className="mb-4 text-lg font-semibold">Crescimento mensal</h2>
    <div className="h-72 w-full text-xs text-muted-foreground" role="img" aria-label={dados.map(d => `${fmtMes(d.mes)}: ${d.crescimento.toLocaleString("pt-BR")} vidas`).join("; ")}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 16, right: 16, bottom: 8, left: 8 }} accessibilityLayer>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis dataKey="mes" tickFormatter={fmtMes} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
          <YAxis tickFormatter={n => Number(n).toLocaleString("pt-BR")} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={65} />
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
          <Tooltip cursor={false} content={({ active, payload }) => {
            const d = payload?.[0]?.payload as CrescimentoMensal | undefined;
            if (!active || !d) return null;
            return <div className="rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
              <p className="font-medium">{fmtMes(d.mes)}</p>
              <p className="text-xs text-muted-foreground">{fmtData(d.de)} a {fmtData(d.ate)}</p>
              <p className="mt-1 tabular-nums">{d.crescimento.toLocaleString("pt-BR")} vidas</p>
            </div>;
          }} />
          <Bar dataKey="crescimento" name="Crescimento" maxBarSize={56} isAnimationActive={false}>
            {dados.map(d => <Cell key={d.mes} fill={d.crescimento < 0 ? "hsl(var(--destructive))" : "hsl(var(--primary))"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </section>;
}