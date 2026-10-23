import { ArrowUpRight, FlaskConical, CalendarRange, FileText, Map, Search, TrendingDown, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const carteiraItems = [
  { icon: Search, label: "Consulta" },
  { icon: Map, label: "Área Geográfica" },
  { icon: CalendarRange, label: "Movimentação" },
  { icon: TrendingUp, label: "Entradas" },
  { icon: Users, label: "Entradas Lancers" },
  { icon: TrendingDown, label: "Saídas" },
];

const shortcuts = [
  { icon: FlaskConical, label: "Laboratory", destination: "Laboratory" },
  { icon: CalendarRange, label: "Projeto Bensaúde|Uberaba", destination: "Uberaba Timeline" },
  { icon: FileText, label: "Controladoria", destination: "Control · DRE Gerencial PE" },
  { icon: Map, label: "Área Geográfica", destination: "Carteira (Trial) · Área Geográfica" },
];

const Home = ({ onNavigate }: { onNavigate: (label: string) => void }) => (
  <div className="space-y-8">
    <header>
      <h2 className="text-2xl font-semibold text-foreground">Bem-vindo ao AXIS</h2>
    </header>

    <section className="rounded-lg border border-border bg-card p-6 shadow-sm" aria-labelledby="home-carteira">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
          <Users className="h-6 w-6" />
        </div>
        <h3 id="home-carteira" className="text-xl font-semibold text-foreground">Carteira (Trial)</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {carteiraItems.map(({ icon: Icon, label }) => (
          <Button
            key={label}
            variant="outline"
            onClick={() => onNavigate(`Carteira (Trial) · ${label}`)}
            className="h-14 justify-start gap-3 px-4 text-base"
          >
            <Icon className="text-primary" />
            <span className="whitespace-normal text-left">{label}</span>
            <ArrowUpRight className="ml-auto shrink-0 text-muted-foreground" />
          </Button>
        ))}
      </div>
    </section>

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
