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
  CalendarCheck,
  Search,
  Receipt,
  ClipboardList,
  Printer,
} from "lucide-react";

const todayBR = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};
import AtivosEm from "@/components/AtivosEm";
import HomeView from "@/components/Home";
import Entradas from "@/components/Entradas";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const parseBR = (s: string): Date | undefined => {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return undefined;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  return isNaN(d.getTime()) ? undefined : d;
};
const formatBR = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

import ConsultaBeneficiarioDenis from "@/components/ConsultaBeneficiarioDenis";
import DRE from "@/components/DRE";
import DREGraficos from "@/components/DREGraficos";
import SinistralidadeGraficos from "@/components/SinistralidadeGraficos";
import Sinistralidade from "@/components/Sinistralidade";
import BIOverview from "@/components/BIOverview";
import OrcamentoDW from "@/components/OrcamentoDW";
import DWCarteira from "@/components/DWCarteira";
import OdoFornecedores from "@/components/odo/OdoFornecedores";
import OdoLancamentos from "@/components/odo/OdoLancamentos";
import OdoAcoes from "@/components/odo/OdoAcoes";



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
      { icon: LayoutDashboard, label: "DRE PB" },
      { icon: FileText, label: "Orçamento DW" },
    ],
  },
  {
    icon: Users,
    label: "Carteira",
    children: [
      
      { icon: Search, label: "Painel" },
      { icon: UserCheck, label: "Área Geográfica" },
      { icon: TrendingUp, label: "Vendas" },
      { icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    icon: Percent,
    label: "Sinistralidade",
    children: [
      { icon: FileText, label: "Tabela Sinistralidade" },
      { icon: BarChart3, label: "Gráfico Sinistralidade" },
      { icon: LayoutDashboard, label: "PBI U12" },
    ],
  },
  { icon: Stethoscope, label: "Assistencial" },
  { icon: LayoutDashboard, label: "B.I. Overview" },
  {
    icon: Receipt,
    label: "ODO-NRPS",
    children: [
      { icon: Users, label: "Fornecedores" },
      { icon: FileText, label: "Lançamentos" },
      { icon: ClipboardList, label: "Ações / Log" },
    ],
  },
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
        setActive("Área Geográfica");
      }
    };
    window.addEventListener("open-ativos-em", handler as EventListener);
    const biHandler = () => setActive("B.I. Overview");
    window.addEventListener("open-bi-overview", biHandler);
    return () => {
      window.removeEventListener("open-ativos-em", handler as EventListener);
      window.removeEventListener("open-bi-overview", biHandler);
    };
  }, []);

  useEffect(() => {
    if (active !== "Área Geográfica" && ativosDrillNome) setAtivosDrillNome(null);
  }, [active, ativosDrillNome]);

  return (
    <div className="h-screen overflow-hidden flex w-full bg-background">
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

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <header className="h-20 border-b border-border bg-card flex items-center justify-between px-8">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{active}</h1>
            <p className="text-xs text-muted-foreground">Relatório Executivo</p>
          </div>
          <div className="flex items-center gap-3">
            {(active === "Área Geográfica" || active === "Dashboard") && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-label="Abrir calendário"
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-primary transition-colors"
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        locale={ptBR}
                        selected={parseBR(dateValue)}
                        onSelect={(d) => d && setDateValue(formatBR(d))}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                      <div className="p-2 border-t border-border flex justify-end">
                        <button
                          type="button"
                          onClick={() => setDateValue(todayBR())}
                          className="h-8 px-3 rounded-md border border-border bg-background text-sm text-foreground hover:bg-accent hover:text-primary transition-colors"
                        >
                          Hoje
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <input
                    type="text"
                    value={dateValue}
                    onChange={(e) => setDateValue(e.target.value)}
                    placeholder="dd/mm/aaaa"
                    className="h-9 w-40 pl-9 pr-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            )}
            <span className="text-sm text-muted-foreground">Olá, Usuário</span>
            <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center text-primary text-sm font-semibold">
              U
            </div>
          </div>
        </header>

        <main className={`flex-1 min-h-0 overflow-hidden ${active === "Área Geográfica" || active === "Dashboard" ? "" : "p-8"}`}>
          {active === "Área Geográfica" ? (
            <AtivosEm dateValue={dateValue} />
          ) : active === "Dashboard" ? (
            <DWCarteira dateValue={dateValue} />
          ) : active === "Vendas" ? (
            <Entradas />
          ) : active === "Painel" ? (
            <ConsultaBeneficiarioDenis />
          ) : active === "DRE" ? (
            <DRE />
          ) : active === "Gráfico" ? (
            <DREGraficos />
          ) : active === "Gráfico Sinistralidade" ? (
            <SinistralidadeGraficos />
          ) : active === "Tabela Sinistralidade" ? (
            <Sinistralidade />
          ) : active === "PBI U12" ? (
            <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] overflow-hidden">
              <iframe
                title="PBI U12"
                src="https://app.powerbi.com/view?r=eyJrIjoiYjJkNjQ3MTYtMjM0Ni00Y2I2LWJiOWItNTcyNWU0YWY0ZTc2IiwidCI6ImM0ZTU0ODgxLWQ1NDktNDQ2Ny1iOGFjLWQ0ZjI1MGM2NzhjNiJ9"
                className="w-full h-full border-0"
                allowFullScreen
              />
            </section>
          ) : active === "DRE PB" ? (
            <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] overflow-hidden">
              <iframe
                title="DEX_DRE"
                src="https://app.powerbi.com/view?r=eyJrIjoiMTBhYTQ4M2EtYWIzNy00NjBiLWFlOGItNGEyNDY5YTcwOTVhIiwidCI6ImM0ZTU0ODgxLWQ1NDktNDQ2Ny1iOGFjLWQ0ZjI1MGM2NzhjNiJ9"
                className="w-full h-full border-0"
                allowFullScreen
              />
            </section>
          ) : active === "Orçamento DW" ? (
            <OrcamentoDW />
          ) : active === "B.I. Overview" ? (
            <BIOverview />
          ) : active === "Fornecedores" ? (
            <OdoFornecedores />
          ) : active === "Lançamentos" ? (
            <OdoLancamentos />
          ) : active === "Ações / Log" ? (
            <OdoAcoes />
          ) : active === "Relatórios" ? (
            <OdoRelatoriosView />
          ) : active === "Home" ? (
            <HomeView onNavigate={setActive} />
          ) : (
            <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex items-center justify-center text-muted-foreground text-sm">
              Selecione uma opção no menu lateral.
            </section>
          )}

        </main>
      </div>
    </div>
  );
};

export default Index;
