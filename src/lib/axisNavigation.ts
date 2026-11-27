import { Home, MapPinned, TrendingUp, FileText, BarChart3, LayoutDashboard, Settings, Building2, Coins, Percent, Users, UserCheck, Stethoscope, CalendarCheck, Search, Trophy, DollarSign, FlaskConical, ListTree, ArrowRightLeft, Map as MapIcon, CalendarRange, Layers, Tags, LogIn, LogOut, Table2, FileBarChart2, Presentation, Wallet, Landmark, AlertTriangle, Calculator } from "lucide-react";
import { BENCH_SHORT_TEXT, DRE_MENU_NAME, SLIDES_SHORT_TEXT } from "@/control/dreLabels";
export type MenuItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children?: { icon: React.ComponentType<{ className?: string }>; label: string; id?: string; nivel?: number; grupo?: string }[];
  lab?: MenuItem[];
};

const controlItem: MenuItem = {
    icon: DollarSign,
    label: "Control",
    children: [
      { icon: FileText, label: DRE_MENU_NAME, id: "Control · DRE Gerencial PE" },
      // Relatório de Controladoria (Mensal ou Trimestral, sem filtros de período) como submenu do Control (pedido de 18/11/2026); id mantido para preservar permissões.
      { icon: FileBarChart2, label: "Relatório", id: "Relatório · Controladoria" },
      // Submenu "Orçamento" (pedido de 23/11/2026): itens consecutivos com o mesmo grupo abrem sob um título recolhível; ids mantidos para preservar permissões.
      { icon: Coins, label: "Orçamento 2026", id: "Control · Orçamento Vigente", grupo: "Orçamento" },
      { icon: FlaskConical, label: "Simulador 2027", id: "Control · Simulador", grupo: "Orçamento" },
      // Apresentação "Orçamento 2027" (pptx de 23/11/2026; antes "Slides Simulação"): mostra só o slide 4, o Ajuste do Simulador ao vivo; a apresentação completa está no Laboratory.
      { icon: Presentation, label: "Orçamento 2027", id: "Control · Slides Simulação", grupo: "Orçamento" },
    ],
};

/** Menu Financeiro (irmão do Control, pedido de 23/11/2026): contas a receber e inadimplência. */
const financeiroItem: MenuItem = {
  icon: Landmark,
  label: "Financeiro",
  children: [
    { icon: AlertTriangle, label: "Inadimplência", id: "Financeiro · Inadimplência" },
  ],
};

/** Ícone do título de cada subgrupo do menu lateral (campo `grupo` dos submenus). */
export const menuSubgroupIcons: Record<string, React.ComponentType<{ className?: string }>> = { "Orçamento": Wallet };

export const labItems: MenuItem[] = [
  { icon: FileText, label: "Proposta APB" },
  { icon: CalendarCheck, label: "Simular Datas FM" },
  { icon: Tags, label: "Produtos Lancers" },
  {
    icon: Users,
    label: "vCarteira",
    children: [
      { icon: Search, label: "Painel" },
      { icon: TrendingUp, label: "Vendas" },
      { icon: TrendingUp, label: "Vendas ate 08/2026" },
      { icon: TrendingUp, label: "Cancelamentos" },
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
      { icon: LayoutDashboard, label: "Proj. Uberaba", id: "Uberaba Timeline" },
    ],
  },
  {
    icon: Coins,
    label: "Orçamento ",
    children: [
      { icon: LayoutDashboard, label: "Painel", id: "Painel Orçamento" },
      // Antigo Control › Orçamento 2027, movido para o Laboratory em 23/11/2026; id mantido para preservar permissões e dados.
      { icon: TrendingUp, label: "old Orçamento 2027", id: "Control · Orçamento 2027" },
      // Apresentação completa "Orçamento 2027" (slides 1–7, pedido de 23/11/2026); no Control fica só o slide 4.
      { icon: Presentation, label: "Slides Simulador 2027" },
    ],
  },
  {
    icon: FileText,
    label: "Outros",
    children: [
      { icon: Calculator, label: "Facchini" },
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

/** Permissão (id antigo) do Plano de Contas, aberto pela engrenagem Configurações. */
export const PLANO_CONTAS_ID = "Control · Contas";
/** Permissão (id antigo) dos Slides do Control, abertos pelo ícone do cabeçalho. */
export const SLIDES_ID = "Control · Dashboards";

export const menuItems: MenuItem[] = [
  { icon: Home, label: "Home" },
  controlItem,
  financeiroItem,
  { icon: Users, label: "Carteira", children: [
    // Visão geral
    { icon: LayoutDashboard, label: "Painel", id: "Carteira · Painel" }, { icon: MapIcon, label: "Área Geográfica", id: "Carteira · Área Geográfica" }, { icon: TrendingUp, label: "Evolução Mensal", id: "Carteira · Evolução Mensal" },
    // Movimento
    { icon: ArrowRightLeft, label: "Movimentação", id: "Carteira · Movimentação" }, { icon: LogIn, label: "Entradas", id: "Carteira · Entradas" }, { icon: LogOut, label: "Saídas", id: "Carteira · Saídas" },
    // Consulta e apoio
    { icon: Search, label: "Consulta", id: "Carteira · Consulta" }, { icon: Table2, label: "Tabelas", id: "Carteira · Tabelas" },
  ] },
  { icon: Percent, label: "Sinistralidade", children: [{ icon: CalendarCheck, label: "Períodos", id: "Sinistralidade · Períodos" }, { icon: Layers, label: "Evolução Produtos", id: "Sinistralidade · Evolução Produtos" }] },
  { icon: Stethoscope, label: "Assistencial", children: [
    { icon: ListTree, label: "Desp. Assistencial", id: "Assistencial · Análise de Despesas Assistenciais" },
  ] },
  // Menu Bench (antes "Mercado", pedido de 27/11/2026): benchmarks de mercado; ids antigos mantidos para preservar permissões.
  { icon: Trophy, label: "Bench", children: [
    { icon: BarChart3, label: "Contábil", id: "Control · Bench C" },
    { icon: BarChart3, label: "Vidas", id: "Carteira · Bench Vidas" },
  ] },
];

/** Proj. Uberaba aberto direto em Estudo › Simulações › Resultados Comerciais (permissão própria do atalho, mesmo layout do Laboratory). */
export const UBERABA_RESULTADOS_COMERCIAIS = "Proj. Uberaba · Resultados Comerciais";

export const LAB_IDS = new Set<string>(["Laboratory", UBERABA_RESULTADOS_COMERCIAIS, ...labItems.flatMap((g) => g.children ? g.children.map((c) => c.id ?? c.label) : [g.label])]);

// menu: menu equivalente na barra lateral principal (ou Laboratory), usado como subtítulo na Home.
export const homeShortcuts = [
  { icon: ListTree, label: "Desp. Assistencial", destination: "Assistencial · Análise de Despesas Assistenciais", menu: "Assistencial" },
  { icon: ArrowRightLeft, label: "Movimentação", destination: "Carteira · Movimentação", menu: "Carteira" },
  { icon: MapIcon, label: "Área Geográfica", destination: "Carteira · Área Geográfica", menu: "Carteira" },
  { icon: Percent, label: "Período", destination: "Sinistralidade · Períodos", menu: "Sinistralidade" },
  { icon: FileText, label: "Controladoria", destination: "Control · DRE Gerencial PE", menu: "Control" },
  { icon: FileText, label: "Demonstrações", destination: "Control · DRE Gerencial PE", menu: "Control" },
  { icon: FlaskConical, label: "Laboratory", destination: "Laboratory", menu: "Laboratory" },
  { icon: CalendarRange, label: "Proj. Uberaba", destination: "Uberaba Timeline", menu: "Laboratory" },
  { icon: Tags, label: "Proposta Uberaba", destination: UBERABA_RESULTADOS_COMERCIAIS, menu: "Laboratory" },
  { icon: FileText, label: "Proposta APB", destination: "Proposta APB", menu: "Laboratory" },
  { icon: CalendarCheck, label: "Simular Datas FM", destination: "Simular Datas FM", menu: "Laboratory" },
  { icon: Tags, label: "Produtos Lancers", destination: "Produtos Lancers", menu: "Laboratory" },
  { icon: Layers, label: "Evolução Produtos", destination: "Evolução Produtos", menu: "Sinistralidade" },
  { icon: LayoutDashboard, label: "Painel", destination: "Carteira · Painel", menu: "Carteira" },
  { icon: BarChart3, label: "Vidas", destination: "Carteira · Bench Vidas", menu: "Bench" },
  { icon: BarChart3, label: "Contábil", destination: "Control · Bench C", menu: "Bench" },
];
export type HomeShortcut = (typeof homeShortcuts)[number];

/** Agrupa os atalhos da Home pelo menu equivalente, na ordem da barra lateral (Laboratory por último). */
export function homeShortcutGroups(shortcuts: HomeShortcut[] = homeShortcuts) {
  const ordem = [...menuItems.filter(m => m.label !== "Home").map(m => m.label), "Laboratory"];
  return ordem
    .map(menu => ({ menu, items: shortcuts.filter(s => s.menu === menu) }))
    .filter(g => g.items.length > 0);
}

export const axisPermissionGroups = [
  ...menuItems.map(g => ({
    label: g.label,
    items: g.label === "Home"
      ? [{ id: "Home", label: "Home" }, ...homeShortcuts.map(s => ({ id: s.destination, label: s.label }))]
      : g.children?.filter(c => c.id !== "__cfg_control__").map(c => ({ id: c.id ?? c.label, label: c.grupo ? `${c.grupo} · ${c.label}` : c.label })) ?? [{ id: g.label, label: g.label }],
  })),
  // Plano de Contas fica na engrenagem Configurações (pedido de 27/11/2026); id antigo mantido para preservar permissões.
  { label: "Configurações", items: [{ id: PLANO_CONTAS_ID, label: "Plano de Contas" }] },
  // Slides do Control abrem pelo ícone do cabeçalho (pedido de 27/11/2026); id antigo mantido para preservar permissões.
  { label: "Cabeçalho", items: [{ id: SLIDES_ID, label: "Slides" }] },
  { label: "Laboratory", items: [{ id: "Laboratory", label: "Laboratory" }, ...labItems.flatMap(g => g.children ? g.children.map(c => ({ id: c.id ?? c.label, label: `${g.label.trim()} · ${c.label}` })) : [{ id: g.label, label: g.label }])] },
];

// Apps com versão de celular: único conteúdo do menu "hamburger" no modo celular.
export const appsCelular: { id: string; label: string; icon: typeof ArrowRightLeft }[] = [
  { id: "Carteira · Movimentação", label: "Movimentação", icon: ArrowRightLeft },
  { id: "Carteira · Área Geográfica", label: "Área Geográfica", icon: MapPinned },
  { id: "Control · DRE Gerencial PE", label: "Demonstrações (DRE)", icon: FileText },
  { id: "Control · Bench C", label: "Bench Contábil", icon: BarChart3 },
  { id: "Control · Orçamento Vigente", label: "Orçamento 2026", icon: FileText },
  { id: "Control · Dashboards", label: "Slides do Control", icon: Presentation },
];
