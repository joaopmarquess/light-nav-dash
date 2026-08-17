import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,

  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type DreRow = { ano: number; mes: number; g1: string; g2: string; g3: string; g4: string; valor: number };
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
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const PAGE = 1000;
        const rows: DreRow[] = [];
        for (let from = 0; ; from += PAGE) {
          const { data, error } = await supabase
            .from("dre_gerencial_2t2026")
            .select("nr_ano,nr_mes,g1,g2,g3,g4,valor")
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
              g4: r.g4 || "",
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

  /** Página 2: Receitas (Faturamento + Coparticipação) x Despesa assistencial */
  const receitasVsDespesa = useMemo(() => {
    const m = new Map<number, { fat: number; copa: number; desp: number }>();
    for (const r of dre || []) {
      if (r.ano !== anoAtual) continue;
      const g4 = stripPrefix(r.g4).toUpperCase();
      const cur = m.get(r.mes) || { fat: 0, copa: 0, desp: 0 };
      if (g4.startsWith("FATURAMENTO")) cur.fat += r.valor;
      else if (g4.startsWith("COPARTICIPA")) cur.copa += r.valor;
      else if (g4.startsWith("DESP. ASSISTENCIAL")) cur.desp += r.valor;
      else {
        continue;
      }
      m.set(r.mes, cur);
    }
    return Array.from(m.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([mes, v]) => ({
        mes: MES_LABEL[mes - 1] || String(mes),
        Faturamento: v.fat,
        Coparticipação: v.copa,
        Receitas: v.fat + v.copa,
        "Desp. Assistencial": Math.abs(v.desp),
      }));
  }, [dre, anoAtual]);

  /** Página 2b: Operacional x Administrativo (abs) x Financeiro por mês */
  const opAdmFin = useMemo(() => {
    const m = new Map<number, { op: number; adm: number; fin: number }>();
    for (const r of dre || []) {
      if (r.ano !== anoAtual) continue;
      const cur = m.get(r.mes) || { op: 0, adm: 0, fin: 0 };
      const g2 = stripPrefix(r.g2).toUpperCase();
      if (/FINANCEIRO/.test(stripPrefix(r.g1).toUpperCase())) cur.fin += r.valor;
      else if (g2.startsWith("ADMINISTRATIVO")) cur.adm += r.valor;
      else if (g2.startsWith("OPERACIONAL")) cur.op += r.valor;
      m.set(r.mes, cur);
    }
    return Array.from(m.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([mes, v]) => ({
        mes: MES_LABEL[mes - 1] || String(mes),
        Operacional: v.op,
        Administrativo: Math.abs(v.adm),
        Financeiro: v.fin,
      }));
  }, [dre, anoAtual]);

  /** Página 2c: filhos de Operacional (g3) — pizza */
  const PIE_COLORS = [
    "hsl(var(--chart-op))",
    "hsl(var(--chart-adm))",
    "hsl(var(--chart-fin))",
    "hsl(var(--chart-fat))",
    "hsl(var(--chart-copart))",
    "hsl(var(--chart-desp))",
  ];
  const operacionalFilhos = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of dre || []) {
      if (r.ano !== anoAtual) continue;
      if (!stripPrefix(r.g2).toUpperCase().startsWith("OPERACIONAL")) continue;
      const nome = stripPrefix(r.g3) || "(sem grupo)";
      m.set(nome, (m.get(nome) || 0) + r.valor);
    }
    return Array.from(m.entries())
      .map(([name, v]) => ({ name, value: v }))
      .filter((d) => d.value !== 0)
      .sort((a, b) => b.value - a.value);
  }, [dre, anoAtual]);

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

  if (pagina === 2) {
    return (
      <div className="h-full flex flex-col min-h-0 gap-2">
        {error ? <div className="text-[11px] text-destructive">erro: {error}</div> : null}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Página 2 de 2</span>
          <button
            onClick={() => setPagina(1)}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] hover:bg-accent"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Voltar
          </button>
        </div>
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 grid-rows-2 gap-3">
          <Card
            title={`Receitas x Despesa assistencial ${anoAtual}`}
            subtitle="Faturamento + Coparticipação vs. Desp. Assistencial (R$)"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={receitasVsDespesa} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={fmtMi} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={54} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => fmtFull(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Faturamento" stackId="rec" fill="hsl(var(--chart-fat))" />
                <Bar dataKey="Coparticipação" stackId="rec" fill="hsl(var(--chart-copart))" radius={[3, 3, 0, 0]}>
                  <LabelList
                    dataKey="Receitas"
                    position="top"
                    offset={4}
                    fontSize={9}
                    fill="hsl(var(--foreground))"
                    formatter={(v: number) => fmtMi(v)}
                  />
                </Bar>
                <Bar dataKey="Desp. Assistencial" fill="hsl(var(--chart-desp))" radius={[3, 3, 0, 0]}>
                  <LabelList
                    dataKey="Desp. Assistencial"
                    position="top"
                    offset={4}
                    fontSize={9}
                    fill="hsl(var(--foreground))"
                    formatter={(v: number) => fmtMi(v)}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card
            title={`Operacional x Administrativo x Financeiro ${anoAtual}`}
            subtitle="Mês a mês, Administrativo em módulo (R$)"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={opAdmFin} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={fmtMi} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={54} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => fmtFull(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Operacional" fill="hsl(var(--chart-op))" radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="Operacional" position="top" offset={4} fontSize={9} fill="hsl(var(--foreground))" formatter={(v: number) => fmtMi(v)} />
                </Bar>
                <Bar dataKey="Administrativo" fill="hsl(var(--chart-adm))" radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="Administrativo" position="top" offset={4} fontSize={9} fill="hsl(var(--foreground))" formatter={(v: number) => fmtMi(v)} />
                </Bar>
                <Bar dataKey="Financeiro" fill="hsl(var(--chart-fin))" radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="Financeiro" position="top" offset={4} fontSize={9} fill="hsl(var(--foreground))" formatter={(v: number) => fmtMi(v)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title={`Filhos de Operacional · totais ${anoAtual}`} subtitle="Valores em R$">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={operacionalFilhos} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[-4_000_000, "auto"]} tickFormatter={fmtMi} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={54} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => fmtFull(v)} />
                <Bar dataKey="value" name="Total" radius={[3, 3, 0, 0]}>
                  {operacionalFilhos.map((d, i) => (
                    <Cell key={i} fill={barColor(d.value)} />
                  ))}
                  <LabelList dataKey="value" position="top" offset={4} fontSize={9} fill="hsl(var(--foreground))" formatter={(v: number) => fmtMi(v)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 gap-2">
      {error ? <div className="text-[11px] text-destructive">erro: {error}</div> : null}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">Página 1 de 2</span>
        <button
          onClick={() => setPagina(2)}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] hover:bg-accent"
        >
          Página 2 <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 grid-rows-2 gap-3">

        {([
          { key: "EBITDA", title: `EBITDA mês a mês ${anoAtual}`, domain: [-6_500_000, "auto"] },
          { key: "Financeiro", title: `Financeiro mês a mês ${anoAtual}`, domain: ["auto", "auto"] },
          { key: "Resultado", title: `Resultado geral mês a mês ${anoAtual}`, domain: ["auto", "auto"] },
        ] as const).map((cfg) => (
          <Card key={cfg.key} title={cfg.title} subtitle="Valores em R$">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resultadoMensal} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={cfg.domain as [number | string, number | string]} tickFormatter={fmtMi} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={54} />

                <Tooltip {...tooltipStyle} formatter={(v: number) => fmtFull(v)} />
                <Bar dataKey={cfg.key} radius={[3, 3, 0, 0]}>
                  {resultadoMensal.map((d, i) => (
                    <Cell key={i} fill={barColor(d[cfg.key])} />
                  ))}
                  <LabelList
                    dataKey={cfg.key}
                    position="top"
                    offset={4}
                    fontSize={9}
                    fill="hsl(var(--foreground))"
                    formatter={(v: number) => fmtMi(v)}
                  />
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
