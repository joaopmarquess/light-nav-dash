import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Coins,
  Percent,
  FileText,
  BarChart3,
  Search,
  UserCheck,
  LayoutDashboard,
  Stethoscope,
} from "lucide-react";

type ByMes = { k: number; rec: number; desp: number; saldo: number; vidas: number };
type Sin = { byMes: ByMes[] };

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
const fmtInt = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
const labelMes = (k: number) => {
  const y = Math.floor(k / 100);
  const m = k % 100;
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${meses[m - 1]}/${String(y).slice(2)}`;
};

const shortcuts = [
  { icon: FileText, label: "DRE", desc: "Demonstrativo de resultados" },
  { icon: Percent, label: "Tabela Sinistralidade", desc: "Receita x despesa por dimensão" },
  { icon: BarChart3, label: "Gráfico Sinistralidade", desc: "Tendência mensal" },
  { icon: Search, label: "Consulta Beneficiário", desc: "Pesquisa individual" },
  { icon: UserCheck, label: "Ativos em", desc: "Carteira por data" },
  { icon: TrendingUp, label: "Vendas", desc: "Novas adesões" },
  { icon: LayoutDashboard, label: "B.I. Overview", desc: "Painel rotativo" },
  { icon: Stethoscope, label: "Assistencial", desc: "Indicadores de uso" },
];

const Home = ({ onNavigate }: { onNavigate: (label: string) => void }) => {
  const [data, setData] = useState<Sin | null>(null);

  useEffect(() => {
    fetch("/data/sinistralidade.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const meses = (data?.byMes ?? []).filter((m) => m.vidas > 30000);
  const ultimo = meses[meses.length - 1];
  const anterior = meses[meses.length - 2];

  const sinist = ultimo ? ultimo.desp / ultimo.rec : 0;
  const sinistAnt = anterior ? anterior.desp / anterior.rec : 0;
  const deltaVidas = ultimo && anterior ? ultimo.vidas - anterior.vidas : 0;
  const deltaRec = ultimo && anterior ? (ultimo.rec - anterior.rec) / anterior.rec : 0;

  const kpis = ultimo
    ? [
        {
          label: "Receita",
          value: fmtBRL(ultimo.rec),
          delta: deltaRec,
          icon: Coins,
          tone: "text-emerald-600",
        },
        {
          label: "Despesa",
          value: fmtBRL(ultimo.desp),
          delta: anterior ? (ultimo.desp - anterior.desp) / anterior.desp : 0,
          icon: TrendingDown,
          tone: "text-rose-600",
          invert: true,
        },
        {
          label: "Saldo",
          value: fmtBRL(ultimo.saldo),
          delta: anterior ? (ultimo.saldo - anterior.saldo) / Math.abs(anterior.saldo || 1) : 0,
          icon: TrendingUp,
          tone: ultimo.saldo >= 0 ? "text-emerald-600" : "text-rose-600",
        },
        {
          label: "Sinistralidade",
          value: fmtPct(sinist),
          delta: sinist - sinistAnt,
          icon: Percent,
          tone: sinist <= 0.8 ? "text-emerald-600" : "text-rose-600",
          isAbs: true,
          invert: true,
        },
        {
          label: "Vidas",
          value: fmtInt(ultimo.vidas),
          delta: anterior ? deltaVidas / anterior.vidas : 0,
          icon: Users,
          tone: "text-blue-700",
        },
      ]
    : [];

  // mini sparkline path
  const spark = (() => {
    if (meses.length < 2) return "";
    const vals = meses.map((m) => m.desp / m.rec);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const W = 100;
    const H = 28;
    return vals
      .map((v, i) => {
        const x = (i / (vals.length - 1)) * W;
        const y = H - ((v - min) / (max - min || 1)) * H;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  })();

  return (
    <div className="space-y-6">
      {/* Saudação */}
      <section className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Bem-vindo ao Dex Bensaúde</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Visão executiva da operação{ultimo ? ` — referência ${labelMes(ultimo.k)}` : ""}.
            </p>
          </div>
          {meses.length >= 2 && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Sinistralidade (12m)</div>
                <div className="text-lg font-semibold text-foreground">{fmtPct(sinist)}</div>
              </div>
              <svg viewBox="0 0 100 28" className="w-32 h-8 text-primary">
                <path d={spark} fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
          )}
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          const positive = k.invert ? k.delta < 0 : k.delta > 0;
          const deltaTxt =
            k.delta === 0
              ? "—"
              : k.isAbs
              ? `${k.delta > 0 ? "+" : ""}${(k.delta * 100).toFixed(1)} p.p.`
              : `${k.delta > 0 ? "+" : ""}${(k.delta * 100).toFixed(1)}%`;
          return (
            <div key={k.label} className="bg-card rounded-xl border border-border shadow-sm p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{k.label}</span>
                <Icon className={`h-4 w-4 ${k.tone}`} />
              </div>
              <div className={`mt-2 text-xl font-semibold ${k.tone}`}>{k.value}</div>
              <div
                className={`mt-1 text-xs font-medium ${
                  k.delta === 0 ? "text-muted-foreground" : positive ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {deltaTxt} <span className="text-muted-foreground font-normal">vs. mês anterior</span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Atalhos */}
      <section className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Atalhos</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
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
                  <div className="text-sm font-medium text-foreground truncate">{s.label}</div>
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
