import { useQuery } from "@tanstack/react-query";
import { Coins, TrendingUp, Landmark } from "lucide-react";
import { loadDreHostinger, loadMesesDemonstracoes } from "@/control/dreHostinger";
import { resumoPainelDre } from "@/control/drePainel";

const year = 2026;
const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

export default function HomeControlCards() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["home-control-demonstracoes", year],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const period = await loadMesesDemonstracoes(year);
      const rows = period.length ? await loadDreHostinger(year, period) : [];
      return { period, summary: resumoPainelDre(rows) };
    },
  });
  const period = data?.period ?? [];
  const subtitle = period.length ? `${months[(period[0] ?? 1) - 1]}–${months[(period[period.length - 1] ?? 1) - 1]}/${year}` : String(year);
  const cards = [
    { label: "Faturamento", icon: Coins, value: data?.summary.fat },
    { label: "EBITDA", icon: TrendingUp, value: data?.summary.cards.find(([label]) => label === "EBITDA")?.[1] },
    { label: "Resultado Líquido", icon: Landmark, value: data?.summary.liq },
  ];
  return <section aria-label="Indicadores do Control" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-foreground">Control</h3>
      <span className="text-xs text-muted-foreground">{subtitle} · Realizado do balancete</span>
    </div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {cards.map(({ label, icon: Icon, value }) => <article key={label} className="min-w-0 rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-medium text-muted-foreground">{label}</h4><Icon className="h-5 w-5 shrink-0 text-primary" /></div>
        <div className="mt-3 min-h-8 break-words text-xl font-semibold tabular-nums text-foreground">{isPending ? "Carregando…" : isError ? "Indisponível" : !period.length || value === undefined ? "—" : currency.format(value)}</div>
      </article>)}
    </div>
    {isError && <p role="alert" className="text-sm text-destructive">Não foi possível carregar os indicadores do Control.</p>}
  </section>;
}