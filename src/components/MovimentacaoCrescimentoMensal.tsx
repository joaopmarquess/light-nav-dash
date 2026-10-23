import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { VidasMensais } from "@/lib/movimentacaoCarga";

const fmtMes = (mes: string) => new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${mes}-01T00:00:00Z`));
const fmtData = (data: string) => data.split("-").reverse().join("/");

export default function MovimentacaoCrescimentoMensal({ dados }: { dados: VidasMensais[] }) {
  return <section aria-labelledby="crescimento-mensal-titulo" className="min-w-0 border-t pt-5">
    <h2 id="crescimento-mensal-titulo" className="mb-4 text-lg font-semibold">Vidas no fim de cada mês</h2>
    <div className="h-72 w-full text-xs text-muted-foreground" role="img" aria-label={dados.map(d => `${fmtData(d.data)}: ${d.vidas.toLocaleString("pt-BR")} vidas`).join("; ")}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 16, right: 16, bottom: 8, left: 8 }} accessibilityLayer>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis dataKey="mes" tickFormatter={fmtMes} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
          <YAxis tickFormatter={n => Number(n).toLocaleString("pt-BR")} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={65} />
          <Tooltip cursor={false} content={({ active, payload }) => {
            const d = payload?.[0]?.payload as VidasMensais | undefined;
            if (!active || !d) return null;
            return <div className="rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
              <p className="font-medium">{fmtMes(d.mes)}</p>
              <p className="text-xs text-muted-foreground">{fmtData(d.data)}</p>
              <p className="mt-1 tabular-nums">{d.vidas.toLocaleString("pt-BR")} vidas</p>
            </div>;
          }} />
          <Bar dataKey="vidas" name="Vidas" fill="hsl(var(--primary))" maxBarSize={56} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </section>;
}