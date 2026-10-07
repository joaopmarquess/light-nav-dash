import { TrendingUp, TrendingDown, Coins, Percent, FileText, BarChart3, LayoutDashboard, Activity, Landmark, Wallet, Banknote } from "lucide-react";
import { useContabilidadeCharts, fmtBRLFull } from "@/control/contabilidadeCharts";

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
const pct = (v: number) => `${v.toFixed(1)}%`;

const shortcuts = [
  { icon: FileText, label: "DRE Gerencial PE", title: "DRE", desc: "Demonstrativo gerencial" },
  { icon: Coins, label: "Orçamento", title: "Orçamento 2026", desc: "Previsto x realizado" },
  { icon: BarChart3, label: "Gráficos", desc: "Análises contábeis" },
  { icon: LayoutDashboard, label: "Dashboards", title: "Carrossel", desc: "Carrossel de indicadores" },
];

const Home = ({ onNavigate }: { onNavigate: (label: string) => void }) => {
  const {
    anoAtual,
    resultadoMensal,
    receitasVsDespesa,
    opAdmFin,
    sinistralidade,
    operacionalFilhos,
    loading,
  } = useContabilidadeCharts();

  const ultimoMes = resultadoMensal[resultadoMensal.length - 1]?.mes ?? "";

  const ebitda = sum(resultadoMensal.map((d) => d.EBITDA));
  const financeiro = sum(resultadoMensal.map((d) => d.Financeiro));
  const resultado = sum(resultadoMensal.map((d) => d.Resultado));
  const faturamento = sum(receitasVsDespesa.map((d) => d.Faturamento));
  const receitas = sum(receitasVsDespesa.map((d) => d.Receitas));
  const despAssist = sum(receitasVsDespesa.map((d) => d["Desp. Assistencial"]));
  const sinistroMedio = receitas ? (despAssist / receitas) * 100 : 0;
  const sinistroUlt = sinistralidade[sinistralidade.length - 1]?.Sinistralidade ?? 0;
  const operacional = sum(opAdmFin.map((d) => d.Operacional));
  const administrativo = sum(opAdmFin.map((d) => d.Administrativo));
  const maiorOp = operacionalFilhos[0];

  const tone = (v: number) => (v >= 0 ? "text-emerald-600" : "text-rose-600");

  const kpis = loading
    ? []
    : [
        { label: `Faturamento ${anoAtual}`, value: fmtBRLFull(faturamento), hint: "Somente faturamento", icon: Coins, tone: "text-emerald-600" },
        { label: "Desp. assistencial", value: fmtBRLFull(despAssist), hint: `Sinistralidade média ${pct(sinistroMedio)}`, icon: TrendingDown, tone: "text-rose-600" },
        { label: "EBITDA acumulado", value: fmtBRLFull(ebitda), hint: `Último mês: ${ultimoMes}`, icon: TrendingUp, tone: tone(ebitda) },
        { label: "Resultado geral", value: fmtBRLFull(resultado), hint: "EBITDA + financeiro", icon: Landmark, tone: tone(resultado) },
        { label: "Sinistralidade", value: pct(sinistroUlt), hint: `${ultimoMes} · média ${pct(sinistroMedio)}`, icon: Percent, tone: sinistroUlt > 80 ? "text-rose-600" : "text-emerald-600" },
        { label: "Operacional", value: fmtBRLFull(operacional), hint: maiorOp ? `Maior: ${maiorOp.name}` : "—", icon: Activity, tone: tone(operacional) },
        { label: "Administrativo", value: fmtBRLFull(administrativo), hint: "Acumulado em módulo", icon: Wallet, tone: "text-rose-600" },
        { label: "Financeiro", value: fmtBRLFull(financeiro), hint: `Acumulado ${anoAtual}`, icon: Banknote, tone: tone(financeiro) },
      ];

  return (
    <div className="space-y-6 h-full overflow-y-auto">
      <section className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h2 className="text-2xl font-semibold text-foreground">Welcome to the Control</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Visão contábil gerencial{ultimoMes ? ` — referência ${ultimoMes}/${anoAtual}` : ""}.
        </p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-card rounded-xl border border-border shadow-sm p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{k.label}</span>
                <Icon className={`h-4 w-4 ${k.tone}`} />
              </div>
              <div className={`mt-2 text-xl font-semibold ${k.tone}`}>{k.value}</div>
              <div className="mt-1 text-xs text-muted-foreground truncate">{k.hint}</div>
            </div>
          );
        })}
      </section>

      <section className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Atalhos</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {shortcuts.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.label}
                onClick={() => onNavigate(s.label)}
                className="group flex items-start gap-3 p-3 rounded-lg border border-border bg-background hover:border-primary/40 hover:bg-accent/50 transition-colors text-left"
              >
                <div className="h-9 w-9 rounded-md bg-accent flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{"title" in s ? s.title : s.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{s.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Home;
