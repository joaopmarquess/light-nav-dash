import { useId } from "react";
import { Bar, ComposedChart, Line, LabelList, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import type { MovimentoMensalComVidas } from "@/lib/movimentacaoCarga";

const fmtMes = (mes: string) => new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${mes}-01T00:00:00Z`));

export default function MovimentacaoCrescimentoMensal({ dados }: { dados: MovimentoMensalComVidas[] }) {
  const id = useId().replace(/:/g, "");
  const minimoVidas = Math.min(...dados.map(d => d.vidas));
  const maximoVidas = Math.max(...dados.map(d => d.vidas));
  const amplitudeVidas = Math.max(maximoVidas - minimoVidas, 1000);
  const dominioVidas: [number, number] = [minimoVidas - amplitudeVidas * 4, maximoVidas + amplitudeVidas * 0.5];
  const maximoFluxo = Math.max(1, ...dados.flatMap(d => [d.vendas, d.saidas]));
  return <section aria-labelledby="crescimento-mensal-titulo" className="movimentacao-chart min-w-0 border-t pt-7">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-5">
      <h2 id="crescimento-mensal-titulo" className="text-2xl font-semibold">Vendas, saídas e vidas no fim de cada mês</h2>
      <ul className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium" aria-label="Legenda do gráfico">
        <li className="flex items-center gap-2"><span className="movimentacao-key movimentacao-key-vendas" />Vendas</li>
        <li className="flex items-center gap-2"><span className="movimentacao-key movimentacao-key-saidas" />Saídas (abs)</li>
        <li className="flex items-center gap-2"><span className="movimentacao-key movimentacao-key-vidas" />Vidas no fim do mês</li>
      </ul>
    </div>
    <div className="h-[520px] w-full text-xs text-muted-foreground sm:h-[560px]" role="img" aria-label={dados.map(d => `${fmtMes(d.mes)}: ${d.vendas} vendas, ${d.saidas} saídas, ${d.vidas} vidas em ${d.data}`).join("; ")}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={dados} margin={{ top: 38, right: 32, bottom: 12, left: 0 }} barGap={8} barCategoryGap="24%" accessibilityLayer>
          <defs>
            <linearGradient id={`${id}-vendas`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-1))" />
              <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.55} />
            </linearGradient>
            <linearGradient id={`${id}-saidas`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-desp))" />
              <stop offset="100%" stopColor="hsl(var(--chart-desp))" stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.65} strokeDasharray="2 6" />
          <XAxis dataKey="mes" tickFormatter={fmtMes} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} tickMargin={16} minTickGap={24} />
          <YAxis domain={[0, maximoFluxo * 1.65]} tickFormatter={n => Number(n).toLocaleString("pt-BR")} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={60} tickCount={5} />
          <YAxis yAxisId="vidas" domain={dominioVidas} hide allowDataOverflow />
          <ReferenceLine y={0} stroke="hsl(var(--border))" />
          <Tooltip cursor={false} content={({ active, payload }) => {
            const d = payload?.[0]?.payload as MovimentoMensalComVidas | undefined;
            if (!active || !d) return null;
            return <div className="min-w-56 rounded-md border bg-popover px-5 py-4 text-sm text-popover-foreground shadow-lg">
              <p className="mb-3 border-b pb-2 font-semibold capitalize">{fmtMes(d.mes)}</p>
              <p className="flex justify-between gap-8 tabular-nums"><span>Vendas</span><strong>{d.vendas.toLocaleString("pt-BR")}</strong></p>
              <p className="mt-2 flex justify-between gap-8 tabular-nums"><span>Saídas</span><strong>{d.saidas.toLocaleString("pt-BR")}</strong></p>
              <p className="mt-3 border-t pt-3 text-xs">Vidas em {d.data.split("-").reverse().join("/")}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{d.vidas.toLocaleString("pt-BR")}</p>
            </div>;
          }} />
          <Bar dataKey="vendas" name="Vendas" fill={`url(#${id}-vendas)`} radius={[5, 5, 0, 0]} maxBarSize={56} isAnimationActive={false} />
          <Bar dataKey="saidas" name="Saídas (abs)" fill={`url(#${id}-saidas)`} radius={[5, 5, 0, 0]} maxBarSize={56} isAnimationActive={false} />
          <Line yAxisId="vidas" type="monotone" dataKey="vidas" name="Vidas no fim do mês" stroke="hsl(var(--chart-3))" strokeWidth={4} dot={{ r: 5, fill: "hsl(var(--card))", strokeWidth: 3 }} activeDot={{ r: 7, fill: "hsl(var(--chart-3))", stroke: "hsl(var(--card))", strokeWidth: 3 }} isAnimationActive={false}>
            <LabelList dataKey="vidas" position="top" offset={16} formatter={(v: number) => v.toLocaleString("pt-BR")} fill="hsl(var(--chart-3))" fontSize={13} fontWeight={700} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  </section>;
}