import { useEffect, useState } from "react";
import {
  Home,
  TrendingUp,
  FileText,
  BarChart3,
  LayoutDashboard,
  Settings2,
  Building2,
  Coins,
  Percent,
  Users,
  UserCheck,
  Stethoscope,
  ChevronDown,
  ChevronLeft,
  Plus,
  Calendar as CalendarIcon,
  RotateCcw,
  Search,
} from "lucide-react";

const todayBR = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};
import AtivosEm from "@/components/AtivosEm";
import Vendas from "@/components/Vendas";
import ConsultaBeneficiario from "@/components/ConsultaBeneficiario";
import DRE from "@/components/DRE";
import DREGraficos from "@/components/DREGraficos";
import BIOverview from "@/components/BIOverview";
import logoFull from "@/assets/bensaude-logo.svg.asset.json";
import logoIcon from "@/assets/bensaude-icon.svg.asset.json";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";



type MenuItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children?: { icon: React.ComponentType<{ className?: string }>; label: string }[];
};

const menuItems: MenuItem[] = [
  { icon: Home, label: "Home" },
  {
    icon: TrendingUp,
    label: "Contabilidade",
    children: [
      { icon: FileText, label: "DRE" },
      { icon: BarChart3, label: "Gráfico" },
    ],
  },
  {
    icon: Users,
    label: "Carteira",
    children: [
      { icon: Search, label: "Consulta Beneficiário" },
      { icon: UserCheck, label: "Ativos em" },
      { icon: TrendingUp, label: "Vendas" },
    ],
  },
  { icon: Percent, label: "Sinistralidade" },
  { icon: Stethoscope, label: "Assistencial" },
];

const Index = () => {
  const [active, setActive] = useState("Home");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState(true);
  const [dateValue, setDateValue] = useState(todayBR());
  const [ativosDrillNome, setAtivosDrillNome] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ nome: string }>).detail;
      if (detail?.nome) {
        setAtivosDrillNome(detail.nome);
        setActive("Ativos em");
      }
    };
    window.addEventListener("open-ativos-em", handler as EventListener);
    return () => window.removeEventListener("open-ativos-em", handler as EventListener);
  }, []);

  useEffect(() => {
    if (active !== "Ativos em" && ativosDrillNome) setAtivosDrillNome(null);
  }, [active, ativosDrillNome]);

  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside
        className={`${collapsed ? "w-16" : "w-64"} border-r border-border bg-card flex flex-col transition-all duration-200`}
      >
        <div className="h-20 flex items-center justify-center px-3 border-b border-border">
          {collapsed ? (
            <img src={logoIcon.url} alt="Bensaúde" className="h-10 w-10" />
          ) : (
            <img src={logoFull.url} alt="Bensaúde" className="h-12 w-auto max-w-full" />
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <TooltipProvider delayDuration={150}>
          {menuItems.map((item) => {
            const isActive = active === item.label;
            const hasChildren = !!item.children;
            const isOpen = openGroups[item.label];

            const button = (
              <button
                onClick={() => {
                  if (hasChildren) {
                    if (collapsed) {
                      setCollapsed(false);
                      setOpenGroups((p) => ({ ...p, [item.label]: true }));
                    } else {
                      setOpenGroups((p) => ({ ...p, [item.label]: !p[item.label] }));
                    }
                  } else {
                    setActive(item.label);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent text-primary"
                    : "text-foreground/70 hover:bg-accent/60 hover:text-primary"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {hasChildren && (
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${isOpen ? "" : "-rotate-90"}`}
                      />
                    )}
                  </>
                )}
              </button>
            );

            return (
              <div key={item.label}>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  button
                )}

                {hasChildren && isOpen && !collapsed && (
                  <div className="mt-1 space-y-1">
                    {item.children!.map((child) => {
                      const childActive = active === child.label;
                      return (
                        <button
                          key={child.label}
                          onClick={() => setActive(child.label)}
                          className={`w-full flex items-center gap-3 pl-9 pr-3 py-2 rounded-lg text-sm transition-colors ${
                            childActive
                              ? "bg-accent text-primary font-medium"
                              : "text-foreground/60 hover:bg-accent/60 hover:text-primary"
                          }`}
                        >
                          <child.icon className="h-4 w-4 shrink-0" />
                          <span>{child.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          </TooltipProvider>
        </nav>

        <div className="p-3 border-t border-border flex justify-start">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-primary transition-colors"
            aria-label="Recolher menu"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-8">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{active}</h1>
            <p className="text-xs text-muted-foreground">Relatório Executivo</p>
          </div>
          <div className="flex items-center gap-3">
            {active === "Ativos em" && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={dateValue}
                    onChange={(e) => setDateValue(e.target.value)}
                    placeholder="dd/mm/aaaa"
                    className="h-9 w-40 pl-9 pr-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setDateValue(todayBR())}
                  title="Voltar para hoje"
                  aria-label="Voltar para hoje"
                  className="h-9 w-9 flex items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-primary transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            )}
            <span className="text-sm text-muted-foreground">Olá, Usuário</span>
            <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center text-primary text-sm font-semibold">
              U
            </div>
          </div>
        </header>

        <main className="flex-1 p-8">
          {active === "Ativos em" ? (
            <AtivosEm dateValue={dateValue} initialDrillNome={ativosDrillNome} />
          ) : active === "Vendas" ? (
            <Vendas />
          ) : active === "Consulta Beneficiário" ? (
            <ConsultaBeneficiario />
          ) : active === "DRE" ? (
            <DRE />
          ) : active === "Gráfico" ? (
            <DREGraficos />
          ) : (
            <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-8rem)] flex items-center justify-center text-muted-foreground text-sm">
              Selecione uma opção no menu lateral.
            </section>
          )}

        </main>
      </div>
    </div>
  );
};

export default Index;
