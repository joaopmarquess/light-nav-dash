import { Home, TrendingUp, FileText, BarChart3, LayoutDashboard, Settings, Building2, Coins, Percent, Users, UserCheck, Stethoscope, CalendarCheck, Search, Trophy, DollarSign, FlaskConical, ListTree, ArrowRightLeft, Map as MapIcon, CalendarRange, Layers } from "lucide-react";
import { BENCH_SHORT_TEXT, DRE_MENU_NAME, SLIDES_SHORT_TEXT } from "@/control/dreLabels";
export type MenuItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children?: { icon: React.ComponentType<{ className?: string }>; label: string; id?: string; nivel?: number }[];
  lab?: MenuItem[];
};

const controlItem: MenuItem = {
    icon: DollarSign,
    label: "Control",
    children: [
      { icon: FileText, label: DRE_MENU_NAME, id: "Control · DRE Gerencial PE" },
      { icon: BarChart3, label: BENCH_SHORT_TEXT, id: "Control · Bench C" },
      { icon: FileText, label: "Relatório", id: "Control · Relatório" },
      { icon: Coins, label: "Orçamento 2026", id: "Control · Orçamento Vigente" },
      { icon: TrendingUp, label: "Orçamento 2027", id: "Control · Orçamento 2027" },
      { icon: FlaskConical, label: "Simulador", id: "Control · Simulador" },
      { icon: BarChart3, label: SLIDES_SHORT_TEXT, id: "Control · Dashboards" },
      { icon: Settings, label: "Configurações", id: "__cfg_control__" },
      { icon: ListTree, label: "Contas", id: "Control · Contas", nivel: 2 },
    ],
};

export const labItems: MenuItem[] = [
  { icon: FileText, label: "Proposta APB" },
  {
    icon: Users,
    label: "vCarteira",
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
    label: "vSinistralidade",
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
      { icon: Stethoscope, label: "2518 Declarações" },
      { icon: Stethoscope, label: "2518 Prestadores" },
    ],
  },
  {
    icon: Trophy,
    label: "Simulações",
    children: [
      { icon: Trophy, label: "Premiação 4T 2026" },
      { icon: Users, label: "Administradoras" },
    ],
  },
  {
    icon: Building2,
    label: "Uberaba",
    children: [
      { icon: LayoutDashboard, label: "Painel", id: "Uberaba" },
      { icon: Building2, label: "Mapa", id: "Uberaba Mapa" },
      { icon: LayoutDashboard, label: "Projeto Bensaúde|Uberaba", id: "Uberaba Timeline" },
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

export const menuItems: MenuItem[] = [
  { icon: Home, label: "Home" },
  controlItem,
  { icon: Users, label: "Carteira", children: [{ icon: Search, label: "Consulta", id: "Carteira · Consulta" }, { icon: LayoutDashboard, label: "Painel", id: "Carteira · Painel" }, { icon: UserCheck, label: "Área Geográfica", id: "Carteira · Área Geográfica" }, { icon: Search, label: "Movimentação", id: "Carteira · Movimentação" }, { icon: TrendingUp, label: "Evolução Mensal", id: "Carteira · Evolução Mensal" }, { icon: BarChart3, label: "Bench Vidas", id: "Carteira · Bench Vidas" }, { icon: TrendingUp, label: "Entradas", id: "Carteira · Entradas" }, { icon: TrendingUp, label: "Saídas", id: "Carteira · Saídas" }, { icon: BarChart3, label: "Tabelas", id: "Carteira · Tabelas" }] },
  { icon: Percent, label: "Sinistralidade", children: [{ icon: CalendarCheck, label: "Períodos", id: "Sinistralidade · Períodos" }, { icon: Layers, label: "Evolução Produtos", id: "Sinistralidade · Evolução Produtos" }] },
];

export const LAB_IDS = new Set<string>(["Laboratory", ...labItems.flatMap((g) => g.children ? g.children.map((c) => c.id ?? c.label) : [g.label])]);

export const homeShortcuts = [
  { icon: ArrowRightLeft, label: "Movimentação", destination: "Carteira · Movimentação" },
  { icon: MapIcon, label: "Área Geográfica", destination: "Carteira · Área Geográfica" },
  { icon: Percent, label: "Período", destination: "Sinistralidade · Períodos" },
  { icon: FileText, label: "Controladoria", destination: "Control · DRE Gerencial PE" },
  { icon: FileText, label: "Demonstrações", destination: "Control · DRE Gerencial PE" },
  { icon: CalendarRange, label: "Projeto Bensaúde|Uberaba", destination: "Uberaba Timeline" },
  { icon: FlaskConical, label: "Laboratory", destination: "Laboratory" },
  { icon: FileText, label: "Proposta APB", destination: "Proposta APB" },
  { icon: Layers, label: "Evolução Produtos", destination: "Evolução Produtos" },
];

export const axisPermissionGroups = [
  ...menuItems.map(g => ({
    label: g.label,
    items: g.label === "Home"
      ? [{ id: "Home", label: "Home" }, ...homeShortcuts.map(s => ({ id: s.destination, label: s.label }))]
      : g.children?.filter(c => c.id !== "__cfg_control__").map(c => ({ id: c.id ?? c.label, label: c.label })) ?? [{ id: g.label, label: g.label }],
  })),
  { label: "Laboratory", items: [{ id: "Laboratory", label: "Laboratory" }, ...labItems.flatMap(g => g.children ? g.children.map(c => ({ id: c.id ?? c.label, label: `${g.label.trim()} · ${c.label}` })) : [{ id: g.label, label: g.label }])] },
];
