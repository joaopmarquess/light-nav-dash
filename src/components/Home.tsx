import { ArrowUpRight, FlaskConical, CalendarRange, FileText, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { geographicToday, useCarteiraTrialGeo } from "@/hooks/useCarteiraTrialGeo";

const fmt = (n: number) => n.toLocaleString("pt-BR");

const AtivosEmCards = () => {
  const date = geographicToday();
  const { data, isLoading, error } = useCarteiraTrialGeo(date);
  const rows = data ?? [];
  const total = rows.reduce((a, r) => a + r.ativos, 0);
  const porUF = new Map<string, number>();
  rows.forEach((r) => porUF.set(r.uf, (porUF.get(r.uf) ?? 0) + r.ativos));
  const topUF = [...porUF].sort((a, b) => b[1] - a[1])[0];
  const topCidade = [...rows].sort((a, b) => b.ativos - a.ativos)[0];
  const cards = [
    { label: "Vidas ativas", value: fmt(total), hint: `Ativos em ${date.split("-").reverse().join("/")}` },
    { label: "Municípios", value: fmt(rows.filter((r) => r.ativos > 0).length), hint: "Com ao menos uma vida" },
    { label: "Estados", value: fmt([...porUF.values()].filter((v) => v > 0).length), hint: "UFs com vidas" },
    { label: "Maior UF", value: topUF ? topUF[0] : "—", hint: topUF ? `${fmt(topUF[1])} vidas` : "" },
    { label: "Maior município", value: topCidade?.cidade ?? "—", hint: topCidade ? `${topCidade.uf} · ${fmt(topCidade.ativos)} vidas` : "" },
  ];
  return (
    <section aria-label="Ativos em">
      {error ? (
        <p className="text-sm text-destructive">Não foi possível carregar os indicadores de ativos.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map((c) => (
            <div key={c.label} className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.label}</div>
              <div className="mt-2 truncate text-2xl font-semibold text-foreground">{isLoading ? "…" : c.value}</div>
              <div className="mt-1 truncate text-xs text-muted-foreground">{isLoading ? "Carregando" : c.hint}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

const shortcuts = [
  { icon: FlaskConical, label: "Laboratory", destination: "Laboratory" },
  { icon: CalendarRange, label: "Projeto Bensaúde|Uberaba", destination: "Uberaba Timeline" },
  { icon: FileText, label: "Controladoria", destination: "Control · DRE Gerencial PE" },
  { icon: MapIcon, label: "Área Geográfica", destination: "Carteira · Área Geográfica" },
];

const Home = ({ onNavigate }: { onNavigate: (label: string) => void }) => (
  <div className="space-y-8">
    <header>
      <h2 className="text-2xl font-semibold text-foreground">Bem-vindo ao AXIS</h2>
    </header>

    <AtivosEmCards />

    <section aria-labelledby="home-atalhos">
      <h3 id="home-atalhos" className="mb-4 text-sm font-semibold text-foreground">Atalhos</h3>
      <div className="flex flex-wrap gap-3">
        {shortcuts.map(({ icon: Icon, label, destination }) => (
          <Button key={label} variant="secondary" onClick={() => onNavigate(destination)} className="h-12 gap-3 px-5">
            <Icon />
            {label}
            <ArrowUpRight className="text-muted-foreground" />
          </Button>
        ))}
      </div>
    </section>
  </div>
);

export default Home;
