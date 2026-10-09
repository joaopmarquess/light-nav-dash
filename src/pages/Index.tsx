import CarteiraTrial from "@/components/CarteiraTrial";
import { useEffect, useState } from "react";
import {
  Home,
  TrendingUp,
  FileText,
  BarChart3,
  LayoutDashboard,
  Settings2,
  Settings,
  Building2,
  Coins,
  Percent,
  Users,
  UserCheck,
  Stethoscope,
  ChevronDown,
  LogOut,
  ChevronLeft,
  ChevronsDownUp,
  Plus,
  Calendar as CalendarIcon,
  CalendarCheck,
  Search,
  Trophy,
} from "lucide-react";

const todayBR = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};
import AtivosEm from "@/components/AtivosEm";
import AtivosCidade from "@/components/AtivosCidade";
import HomeView from "@/components/Home";
import Entradas from "@/components/Entradas";
import Cancelamentos from "@/components/Cancelamentos";
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
import BIOverview from "@/components/BIOverview";
import DWCarteira from "@/components/DWCarteira";
import CarteiraGraficos from "@/components/CarteiraGraficos";
import CarteiraMapa from "@/components/CarteiraMapa";
import VendasMatriz from "@/components/VendasMatriz";
import SinistralidadeGraficos from "@/components/SinistralidadeGraficos";
import SinistralidadeConsulta from "@/components/SinistralidadeConsulta";
import SinistralidadeNova from "@/components/SinistralidadeNova";
import SinistralidadeCidades from "@/components/SinistralidadeCidades";
import SinistralidadePeriodo from "@/components/SinistralidadePeriodo";
import SinistralidadeAPB from "@/components/SinistralidadeAPB";
import SinistralidadeAPBTop10 from "@/components/SinistralidadeAPBTop10";
import Sinistralidade3100 from "@/components/Sinistralidade3100";
import SinistralidadeAPBFaturas from "@/components/SinistralidadeAPBFaturas";
import SinistralidadeAPBAtivos from "@/components/SinistralidadeAPBAtivos";
import SinistralidadeCidade from "@/components/SinistralidadeCidade";
import DREGerencialPE from "@/components/DREGerencialPE";
import Orcamento from "@/components/Orcamento";
import ContabilidadeGraficos from "@/components/ContabilidadeGraficos";
import InteligenciaUberaba from "@/components/InteligenciaUberaba";
import InteligenciaUnimed from "@/components/InteligenciaUnimed";
import Promocoes from "@/components/Promocoes";
import UberabaHospitais from "@/components/UberabaHospitais";
import AdministradorasSim from "@/components/AdministradorasSim";
import ControlPainel from "@/control/OrcamentoFaturamento";
import CtrlDRE from "@/control/DRETrial";
import CtrlContas from "@/control/ContasHub";
import CtrlOrcamento from "@/control/OrcamentoTrial";
import CtrlDashboards from "@/control/Dashboards";
import { ListTree } from "lucide-react";
import OrcamentoFaturamento from "@/components/OrcamentoFaturamento";
import UberabaShell from "@/components/UberabaShell";


import Assistencial from "@/components/Assistencial";
import AssistencialCompetencia from "@/components/AssistencialCompetencia";
import AssistencialConsulta from "@/components/AssistencialConsulta";
import AssistencialAuditoriaSSPMJR from "@/components/AssistencialAuditoriaSSPMJR";
import AssistencialRelatorioExecutor from "@/components/AssistencialRelatorioExecutor";
import AssistencialReceitas2518 from "@/components/AssistencialReceitas2518";
import { useConsultaState } from "@/lib/assistencialConsultaStore";
import { Loader2, DollarSign, FlaskConical } from "lucide-react";



import { useAuth } from "@/hooks/useAuth";
import { APP_VERSION, BUILD_ID } from "@/lib/version";
import logoFull from "@/assets/axis-logo.png.asset.json";
import logoIcon from "@/assets/axis-icon.png.asset.json";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";



type MenuItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children?: { icon: React.ComponentType<{ className?: string }>; label: string; id?: string; nivel?: number }[];
  lab?: MenuItem[];
};

const controlItem: MenuItem = {
    icon: DollarSign,
    label: "Control",
    children: [
      { icon: FileText, label: "Controladoria", id: "Control · DRE Gerencial PE" },
      { icon: Coins, label: "Orçamento 2026", id: "Control · Orçamento Vigente" },
      { icon: TrendingUp, label: "Orçamento 2027", id: "Control · Orçamento 2027" },
      { icon: BarChart3, label: "Carrossel", id: "Control · Dashboards" },
      { icon: Settings, label: "Configurações", id: "__cfg_control__" },
      { icon: ListTree, label: "Contas", id: "Control · Contas", nivel: 2 },
    ],
};

const labItems: MenuItem[] = [
  {
    icon: Users,
    label: "Carteira",
    children: [
      { icon: Search, label: "Painel" },
      { icon: UserCheck, label: "Área Geográfica" },
      { icon: UserCheck, label: "Ativos por Cidade" },
      { icon: TrendingUp, label: "Vendas" },
      { icon: TrendingUp, label: "Vendas ate 08/2026" },
      { icon: TrendingUp, label: "Cancelamentos" },
      { icon: LayoutDashboard, label: "Dashboard" },
      { icon: BarChart3, label: "Gráfico Carteira" },
      { icon: Building2, label: "Mapa" },
    ],
  },
  {
    icon: Percent,
    label: "Sinistralidade",
    children: [
      { icon: UserCheck, label: "Planos/Empresas" },
      { icon: CalendarCheck, label: "Período" },
      { icon: LayoutDashboard, label: "Cidades" },
      { icon: BarChart3, label: "Gráfico Sinistralidade" },
      { icon: CalendarCheck, label: "Ultra-X" },
      { icon: LayoutDashboard, label: "PBI U12" },
    ],
  },
  {
    icon: Stethoscope,
    label: "Assistencial",
    children: [
      
      { icon: CalendarCheck, label: "Por Competência" },
      { icon: Search, label: "Consulta" },
      { icon: Stethoscope, label: "Relatório Plano Executor" },
      { icon: Stethoscope, label: "2518 Despesas" },
      { icon: Stethoscope, label: "2518 Receitas" },
    ],
  },
  {
    icon: Trophy,
    label: "Simulações",
    children: [
      { icon: Trophy, label: "Premiação 4T 2026" },
      { icon: Users, label: "Administradoras" },
      { icon: Building2, label: "Uberaba" },
    ],
  },
  {
    icon: Coins,
    label: "Orçamento ",
    children: [{ icon: LayoutDashboard, label: "Painel", id: "Painel Orçamento" }],
  },
  {
    icon: FileText,
    label: "Outros",
    children: [
      { icon: CalendarCheck, label: "APB" },
      { icon: CalendarCheck, label: "APB Top10" },
      { icon: CalendarCheck, label: "APB Faturas" },
      { icon: CalendarCheck, label: "APB Ativos" },
      { icon: CalendarCheck, label: "Bensaúde U12|202606" },
      { icon: CalendarCheck, label: "Bensaúde U12|202607" },
    ],
  },
  { icon: LayoutDashboard, label: "B.I. Overview" },
];

const menuItems: MenuItem[] = [
  { icon: Home, label: "Home" },
  controlItem,
  { icon: Users, label: "Carteira (Trial)", children: [{ icon: Search, label: "Consulta", id: "Carteira (Trial) · Consulta" }] },
  { icon: FlaskConical, label: "Laboratory", lab: labItems },
];

const Index = () => {
  const [active, setActive] = useState("Home");
  const { nome, signOut } = useAuth();
  const [ctrlAba, setCtrlAba] = useState<string | null>(null);
  const [ctrlOrcDre, setCtrlOrcDre] = useState(false);
  const [ctrlCfgOpen, setCtrlCfgOpen] = useState(false);
  const [ctrlDreDre, setCtrlDreDre] = useState(false);
  const [abaOrc, setAbaOrc] = useState("Faturamento");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [labOpen, setLabOpen] = useState<Record<string, boolean>>({});
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
    const unimedHandler = () => {
      setOpenGroups({ Laboratory: true });
      setLabOpen({ "Simulações": true });
      setActive("Uberaba");
    };
    window.addEventListener("open-unimed-uberaba", unimedHandler);
    return () => {
      window.removeEventListener("open-ativos-em", handler as EventListener);
      window.removeEventListener("open-bi-overview", biHandler);
      window.removeEventListener("open-unimed-uberaba", unimedHandler);
    };
  }, []);

  useEffect(() => {
    if (active !== "Área Geográfica" && ativosDrillNome) setAtivosDrillNome(null);
  }, [active, ativosDrillNome]);

  const consulta = useConsultaState();
  const showConsultaBadge =
    active !== "Consulta" && (consulta.loading || (consulta.triggered && !consulta.revealed && !!consulta.periodo));

  return (
    <div className="h-screen overflow-hidden flex w-full bg-background">
      <aside
        className={`${collapsed ? "w-16" : "w-64"} border-r border-border bg-card flex flex-col transition-all duration-200`}
      >
        <div className="h-20 flex flex-col items-center justify-center gap-1 px-3 border-b border-border">
          <Tooltip>
            <TooltipTrigger asChild>
              {collapsed ? (
                <img src={logoIcon.url} alt="AXIS" className="h-10 w-10 object-contain" />
              ) : (
                <img src={logoFull.url} alt="AXIS" className="h-12 w-auto max-w-full" />
              )}
            </TooltipTrigger>
            <TooltipContent side="right" className="text-center">
              <div className="text-xs font-semibold tracking-[0.2em]">EXECUTIVE INTELLIGENCE PLATFORM</div>
            </TooltipContent>
          </Tooltip>
          <span className="text-[10px] font-medium text-muted-foreground leading-none" title={`Build ${BUILD_ID}`}>v{APP_VERSION}{!collapsed && <span className="opacity-60"> · build {BUILD_ID}</span>}</span>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <TooltipProvider delayDuration={150}>
          {menuItems.map((item) => {
            const isActive = active === item.label;
            const hasChildren = !!item.children || !!item.lab;
            const isOpen = openGroups[item.label];

            const button = (
              <button
                onClick={() => {
                  if (hasChildren) {
                    if (collapsed) {
                      setCollapsed(false);
                      setOpenGroups({ [item.label]: true });
                    } else {
                      setOpenGroups((p) => ({ [item.label]: !p[item.label] }));
                    }
                  } else {
                    setOpenGroups({});
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
                {collapsed || item.label === "Control" ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      {item.label === "Control"
                        ? "Control - Acesso ao programa da controladoria"
                        : item.label}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  button
                )}

                {hasChildren && isOpen && !collapsed && (
                  <div className="mt-1 space-y-1">
                    {(item.children ?? []).map((child: any) => {
                      if (child.nivel === 2 && !ctrlCfgOpen && active !== child.id) return null;
                      const childActive = active === (child.id ?? child.label) || ((child.id ?? child.label) === "Painel Orçamento" && active === "Simulação");
                      return (
                        <button
                          key={child.label}
                          onClick={() => child.id === "__cfg_control__" ? setCtrlCfgOpen((o) => !o) : setActive((child.id ?? child.label))}
                          className={`w-full flex items-center gap-3 ${child.nivel === 2 ? "pl-14" : "pl-9"} pr-3 py-2 rounded-lg text-sm transition-colors ${
                            childActive
                              ? "bg-accent text-primary font-medium"
                              : "text-foreground/60 hover:bg-accent/60 hover:text-primary"
                          }`}
                        >
                          <child.icon className="h-4 w-4 shrink-0" />
                          <span className="whitespace-nowrap">{child.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {item.lab && isOpen && !collapsed && (
                  <div className="mt-1 space-y-1">
                    {item.lab.map((sub) => {
                      const subOpen = !!labOpen[sub.label];
                      const subActive = !sub.children && active === sub.label;
                      return (
                        <div key={sub.label}>
                          <button
                            onClick={() =>
                              sub.children
                                ? setLabOpen((p) => ({ [sub.label]: !p[sub.label] }))
                                : setActive(sub.label)
                            }
                            className={`w-full flex items-center gap-3 pl-9 pr-3 py-2 rounded-lg text-sm transition-colors ${
                              subActive
                                ? "bg-accent text-primary font-medium"
                                : "text-foreground/70 hover:bg-accent/60 hover:text-primary"
                            }`}
                          >
                            <sub.icon className="h-4 w-4 shrink-0" />
                            <span className="flex-1 text-left whitespace-nowrap">{sub.label}</span>
                            {sub.children && (
                              <ChevronDown className={`h-4 w-4 transition-transform ${subOpen ? "" : "-rotate-90"}`} />
                            )}
                          </button>
                          {sub.children && subOpen && (
                            <div className="mt-1 space-y-1">
                              {sub.children.map((child) => {
                                const key = child.id ?? child.label;
                                const childActive = active === key || (key === "Painel Orçamento" && active === "Simulação");
                                return (
                                  <button
                                    key={child.label}
                                    onClick={() => setActive(key)}
                                    className={`w-full flex items-center gap-3 pl-14 pr-3 py-2 rounded-lg text-sm transition-colors ${
                                      childActive
                                        ? "bg-accent text-primary font-medium"
                                        : "text-foreground/60 hover:bg-accent/60 hover:text-primary"
                                    }`}
                                  >
                                    <child.icon className="h-4 w-4 shrink-0" />
                                    <span className="whitespace-nowrap">{child.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          </TooltipProvider>
        </nav>

        <div className="p-3 border-t border-border flex justify-between items-center gap-2">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-primary transition-colors"
            aria-label="Recolher menu"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
          {!collapsed && Object.values(openGroups).some(Boolean) && (
            <button
              onClick={() => setOpenGroups({})}
              className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-primary transition-colors"
              aria-label="Recolher todos os grupos"
              title="Recolher todos os grupos"
            >
              <ChevronsDownUp className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <header className="h-20 border-b border-border bg-card flex items-center justify-between px-8">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{active}</h1>
            <p className="text-xs text-muted-foreground">AXIS | Executive Intelligence Platform</p>
          </div>
          <div className="flex items-center gap-3">
            {(active === "Área Geográfica" || active === "Dashboard" || active === "Ativos por Cidade") && (
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
            <span className="text-sm text-muted-foreground">Olá, {nome ?? "Usuário"}</span>
            <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center text-primary text-sm font-semibold">
              {(nome ?? "U").charAt(0).toUpperCase()}
            </div>
            <button onClick={signOut} title="Sair"
              className="flex items-center gap-1.5 h-9 px-3 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-primary transition-colors">
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </header>

        <main className={`flex-1 min-h-0 overflow-hidden ${active === "Área Geográfica" || active === "Dashboard" ? "" : "p-8"}`}>
          {active === "Área Geográfica" ? (
            <AtivosEm dateValue={dateValue} />
          ) : active === "Ativos por Cidade" ? (
            <AtivosCidade dateValue={dateValue} />
          ) : active === "Dashboard" ? (
            <DWCarteira dateValue={dateValue} />
          ) : active === "Vendas" ? (
            <Entradas />
          ) : active === "Vendas ate 08/2026" ? (
            <VendasMatriz />
          ) : active === "Cancelamentos" ? (
            <Cancelamentos />
          ) : active === "Painel" ? (
            <ConsultaBeneficiarioDenis />
          ) : active === "DRE Gerencial PE" ? (
            <DREGerencialPE />
          ) : active === "Orçamento" ? (
            <Orcamento />
          ) : active === "Uberaba" ? (
            <UberabaShell />
          ) : active === "Gráficos" ? (
            <ContabilidadeGraficos />


          ) : active === "__removed_dre__" ? (
            <div />

          ) : active === "__removed_sin__" ? (
            <div />

          ) : active === "Planos/Empresas" ? (
            <SinistralidadeNova mode="beneficiario" />
          ) : active === "Período" ? (
            <SinistralidadePeriodo />
          ) : active === "APB" ? (
            <SinistralidadeAPB />
          ) : active === "APB Top10" ? (
            <SinistralidadeAPBTop10 />
          ) : active === "APB Faturas" ? (
            <SinistralidadeAPBFaturas />
          ) : active === "APB Ativos" ? (
            <SinistralidadeAPBAtivos />
          ) : active === "Bensaúde U12|202606" ? (
            <Sinistralidade3100 />
          ) : active === "Bensaúde U12|202607" ? (
            <Sinistralidade3100
              dataUrl="/data/3100_v2_sinistralidade.json"
              mensalUrl="/data/3100_v2_mensal.json"
            />
          ) : active === "Ultra-X" ? (
            <Sinistralidade3100 key="ultrax" label="Ultra-X" splitTop dataUrl="/data/ultrax_sinistralidade.json" mensalUrl="/data/ultrax_mensal.json" />
          ) : active === "Cidades" ? (
            <SinistralidadeCidade />



          ) : active === "oculto.Empresa" ? (
            <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex items-center justify-center text-muted-foreground text-sm">
              Submenu oculto — processamento suspenso.
            </section>
          ) : active === "oculto.Beneficiário" ? (
            <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex items-center justify-center text-muted-foreground text-sm">
              Submenu oculto — processamento suspenso.
            </section>


          ) : active === "PBI U12" ? (
            <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] overflow-hidden">
              <iframe
                title="PBI U12"
                src="https://app.powerbi.com/view?r=eyJrIjoiYjJkNjQ3MTYtMjM0Ni00Y2I2LWJiOWItNTcyNWU0YWY0ZTc2IiwidCI6ImM0ZTU0ODgxLWQ1NDktNDQ2Ny1iOGFjLWQ0ZjI1MGM2NzhjNiJ9"
                className="w-full h-full border-0"
                allowFullScreen
              />
            </section>
          ) : active === "__removed_orc_dw__" ? (
            <div />

          ) : active === "Painel Orçamento" ? (
            <OrcamentoFaturamento home onSimulacao={(a) => { setAbaOrc(a); setActive("Simulação"); }} />
          ) : active === "Simulação" ? (
            <OrcamentoFaturamento key={abaOrc} abaInicial={abaOrc} onPainel={() => setActive("Painel Orçamento")} />
          ) : active === "Premiação 4T 2026" ? (
            <Promocoes />
          ) : active === "Administradoras" ? (
            <AdministradorasSim />
          ) : active === "Control · DRE Gerencial PE" ? (
            ctrlDreDre ? <CtrlDRE onAba={() => setCtrlDreDre(false)} /> : <CtrlDRE painel onAba={() => setCtrlDreDre(true)} />
          ) : active === "Control · Contas" ? (
            <CtrlContas />
          ) : active === "Control · Orçamento Vigente" ? (
            ctrlOrcDre ? <CtrlOrcamento onAba={() => setCtrlOrcDre(false)} /> : <CtrlOrcamento painel onAba={() => setCtrlOrcDre(true)} />
          ) : active === "Control · Dashboards" ? (
            <CtrlDashboards />
          ) : active === "Control · Orçamento 2027" ? (
            ctrlAba ? (
              <ControlPainel key={ctrlAba} abaInicial={ctrlAba} onPainel={() => setCtrlAba(null)} />
            ) : (
              <ControlPainel home onSimulacao={(a) => setCtrlAba(a)} />
            )
          ) : active === "B.I. Overview" ? (
            <BIOverview />
          ) : active === "Gráfico Carteira" ? (
            <CarteiraGraficos />
          ) : active === "Mapa" ? (
            <CarteiraMapa />
          ) : active === "Gráfico Sinistralidade" ? (
            <SinistralidadeGraficos />
          ) : active === "Carteira (Trial) · Consulta" ? (
            <CarteiraTrial />
          ) : active === "Home" ? (
            <HomeView onNavigate={setActive} />
          ) : active === "Assistencial" ? (
            <Assistencial />
          ) : active === "Por Competência" ? (
            <AssistencialCompetencia />
          ) : active === "Consulta" ? (
            <AssistencialConsulta />
          ) : active === "Relatório Plano Executor" ? (
            <AssistencialRelatorioExecutor />
          ) : active === "2518 Despesas" ? (
            <AssistencialRelatorioExecutor source="csv2518" />
          ) : active === "2518 Receitas" ? (
            <AssistencialReceitas2518 />



          ) : active === "Auditoria SSPMJR" ? (
            <AssistencialAuditoriaSSPMJR />
          ) : (
            <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex items-center justify-center text-muted-foreground text-sm">
              Selecione uma opção no menu lateral.
            </section>
          )}

        </main>
      </div>

      {showConsultaBadge && (
        <button
          onClick={() => setActive("Consulta")}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg border border-border bg-card hover:bg-accent transition-colors text-xs"
          title="Voltar para Consulta Assistencial"
        >
          {consulta.loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-primary" />
          )}
          <span className="font-medium text-foreground">
            Consulta {consulta.periodo}
          </span>
          <span className="tabular-nums text-muted-foreground">
            {Math.floor(consulta.elapsed / 60).toString().padStart(2, "0")}:
            {(consulta.elapsed % 60).toString().padStart(2, "0")}
          </span>
          {!consulta.loading && (
            <span className="text-primary font-medium">Pronto</span>
          )}
        </button>
      )}
    </div>
  );
};

export default Index;
