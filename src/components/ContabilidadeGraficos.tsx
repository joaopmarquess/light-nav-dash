import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

type DreRow = { ano: number; mes: number; g1: string; g2: string; g3: string; valor: number };
type OrcRow = { mes: number; item: string; previsto: number; realizado: number };

const MES_LABEL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const stripPrefix = (s: string) => (s || "").replace(/^\d+\|/, "");

const fmtMi = (v: number) =>
  `${v < 0 ? "−" : ""}${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(Math.abs(v) / 1_000_000)} mi`;

const fmtFull = (v: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(v);

const Card = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <section className="bg-card rounded-xl border border-border shadow-sm p-3 flex flex-col min-h-0">
    <header className="mb-1">
      <h3 className="text-[13px] font-semibold text-foreground leading-tight">{title}</h3>
      {subtitle ? <p className="text-[11px] text-muted-foreground leading-tight">{subtitle}</p> : null}
    </header>
    <div className="flex-1 min-h-0">{children}</div>
  </section>
);

const tooltipStyle = {
  contentStyle: {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 11,
    color: "hsl(var(--popover-foreground))",
  },
  labelStyle: { color: "hsl(var(--popover-foreground))", fontSize: 11, fontWeight: 600 },
};

const ContabilidadeGraficos = () => {
  const [dre, setDre] = useState<DreRow[] | null>(null);
  const [orc, setOrc] = useState<OrcRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const PAGE = 1000;
        const rows: DreRow[] = [];
        for (let from = 0; ; from += PAGE) {
          const { data, error } = await supabase
            .from("dre_gerencial_2t2026")
            .select("nr_ano,nr_mes,g1,g2,g3,valor")
            .order("id")
            .range(from, from + PAGE - 1);
          if (error) throw error;
          rows.push(
            ...(data || []).map((r) => ({
              ano: Number(r.nr_ano) || 0,
              mes: Number(r.nr_mes) || 0,
              g1: r.g1 || "",
              g2: r.g2 || "",
              g3: r.g3 || "",
              valor: Number(r.valor) || 0,
            }))
          );
          if (!data || data.length < PAGE) break;
        }
        setDre(rows);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
        setDre([]);
      }
      try {
        const { data, error } = await supabase
          .from("orcamento_2026")
          .select("item,nr_mes,previsto,realizado");
        if (error) throw error;
        setOrc(
          (data || []).map((r) => ({
            mes: Number(r.nr_mes) || 0,
            item: r.item || "",
            previsto: Number(r.previsto) || 0,
            realizado: Number(r.realizado) || 0,
          }))
        );
      } catch (e: unknown) {
        setError((p) => p ?? (e instanceof Error ? e.message : String(e)));
        setOrc([]);
      }
    })();
  }, []);

  const anos = useMemo(() => Array.from(new Set((dre || []).map((r) => r.ano))).sort(), [dre]);
  const anoAtual = anos.length ? anos[anos.length - 1] : 0;

  /** 1) Resultado mensal do ano corrente: EBITDA, Financeiro e Resultado */
  const resultadoMensal = useMemo(() => {
    const m = new Map<number, { ebitda: number; fin: number }>();
    for (const r of dre || []) {
      if (r.ano !== anoAtual) continue;
      const cur = m.get(r.mes) || { ebitda: 0, fin: 0 };
      if (/EBITDA/i.test(r.g1)) cur.ebitda += r.valor;
      else cur.fin += r.valor;
      m.set(r.mes, cur);
    }
    return Array.from(m.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([mes, v]) => ({
        mes: MES_LABEL[mes - 1] || String(mes),
        EBITDA: v.ebitda,
        Financeiro: v.fin,
        Resultado: v.ebitda + v.fin,
      }));
  }, [dre, anoAtual]);

  /** cores por sinal */
  const barColor = (v: number) => (v < 0 ? "hsl(var(--chart-4))" : "hsl(var(--chart-1))");


  /** 4) Orçamento: Previsto x Realizado por mês */
  const orcamentoMensal = useMemo(() => {
    const m = new Map<number, { previsto: number; realizado: number }>();
    for (const r of orc || []) {
      const cur = m.get(r.mes) || { previsto: 0, realizado: 0 };
      cur.previsto += r.previsto;
      cur.realizado += r.realizado;
      m.set(r.mes, cur);
    }
    return Array.from(m.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([mes, v]) => ({
        mes: MES_LABEL[mes - 1] || String(mes),
        Previsto: v.previsto,
        Realizado: v.realizado,
      }));
  }, [orc]);

  if (!dre || !orc) {
    return (
      <div className="h-full grid place-items-center text-sm text-muted-foreground">Carregando gráficos…</div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 gap-2">
      {error ? <div className="text-[11px] text-destructive">erro: {error}</div> : null}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 grid-rows-2 gap-3">
        {([
          { key: "EBITDA", title: `EBITDA mês a mês ${anoAtual}` },
          { key: "Financeiro", title: `Financeiro mês a mês ${anoAtual}` },
          { key: "Resultado", title: `Resultado geral mês a mês ${anoAtual}` },
        ] as const).map((cfg) => (
          <Card key={cfg.key} title={cfg.title} subtitle="Valores em R$">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resultadoMensal} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={fmtMi} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={54} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => fmtFull(v)} />
                <Bar dataKey={cfg.key} radius={[3, 3, 0, 0]}>
                  {resultadoMensal.map((d, i) => (
                    <Cell key={i} fill={barColor(d[cfg.key])} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        ))}


        <Card title="Orçamento — Previsto x Realizado" subtitle="Total por mês (R$)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={orcamentoMensal} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickFormatter={fmtMi} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={54} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => fmtFull(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Previsto" stroke="hsl(var(--chart-2))" strokeDasharray="4 3" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Realizado" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

export default ContabilidadeGraficos;
