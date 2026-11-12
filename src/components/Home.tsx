import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAxisAccess } from "@/hooks/useAxisAccess";

import { homeShortcuts } from "@/lib/axisNavigation";

const Home = ({ onNavigate }: { onNavigate: (label: string) => void }) => {
 const { can } = useAxisAccess();
 return (
  <div className="h-full overflow-y-auto space-y-8">
    <header>
      <h2 className="text-2xl font-semibold text-foreground">Bem-vindo ao AXIS</h2>
    </header>


    <section aria-labelledby="home-atalhos">
      <h3 id="home-atalhos" className="mb-4 text-sm font-semibold text-foreground">Atalhos</h3>
      <div className="flex flex-wrap gap-3">
        {homeShortcuts.filter(s => can(s.destination)).map(({ icon: Icon, label, destination }) => (
          <Button key={label} variant="secondary" title={label} onClick={() => onNavigate(destination)} className="h-12 w-[12.25rem] gap-1.5 px-3">
            <Icon />
            <span className="min-w-0 flex-1 truncate text-left">{label}</span>
            <ArrowUpRight className="text-muted-foreground" />
          </Button>
        ))}
      </div>
    </section>
  </div>
);
};

export default Home;
