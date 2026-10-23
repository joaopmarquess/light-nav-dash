import { ArrowUpRight, FlaskConical, CalendarRange, FileText, Map as MapIcon, ArrowRightLeft, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";

const shortcuts = [
  { icon: ArrowRightLeft, label: "Movimentação", destination: "Carteira · Movimentação" },
  { icon: MapIcon, label: "Área Geográfica", destination: "Carteira · Área Geográfica" },
  { icon: Percent, label: "Período", destination: "Sinistralidade · Períodos" },
  { icon: FileText, label: "Controladoria", destination: "Control · DRE Gerencial PE" },
  { icon: CalendarRange, label: "Projeto Bensaúde|Uberaba", destination: "Uberaba Timeline" },
  { icon: FlaskConical, label: "Laboratory", destination: "Laboratory" },
];

const Home = ({ onNavigate }: { onNavigate: (label: string) => void }) => (
  <div className="space-y-8">
    <header>
      <h2 className="text-2xl font-semibold text-foreground">Bem-vindo ao AXIS</h2>
    </header>

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
