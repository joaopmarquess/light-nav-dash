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
import { supabase } from "@/integrations/supabase/client";
import { mergeOrcamento } from "@/control/orcamentoLocal";
import { DRE_LOCAL_ROWS } from "@/control/dreLocal";

type DreRow = { ano: number; mes: number; g1: string; g2: string; g3: string; g4: string; valor: number };
type OrcRow = { mes: number; item: string; previsto: number; realizado: number; projetado: number };

const MES_LABEL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const stripPrefix = (s: string) => (s || "").replace(/^\d+\|/, "");

export const fmtMi = (v: number) =>
  `${v < 0 ? "−" : ""}${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(Math.abs(v) / 1_000_000)} mi`;

export const fmtMi2 = (v: number) =>
  `${v < 0 ? "−" : ""}${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v) / 1_000_000)} mi`;

export const fmtFull = (v: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(v);

export const fmtBRLFull = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

export const tooltipStyle = {
  contentStyle: {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 13,
    color: "hsl(var(--popover-foreground))",
  },
  labelStyle: { color: "hsl(var(--popover-foreground))", fontSize: 13, fontWeight: 600 },
};

const barColor = (v: number) => (v < 0 ? "hsl(var(--chart-4))" : "hsl(var(--chart-1))");

export type ChartDef = { key: string; title: string; subtitle?: string; chart: React.ReactNode };

export function useContabilidadeCharts() {
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
        const presentes = new Set(rows.map((r) => `${r.ano}-${r.mes}`));
        const extras: DreRow[] = DRE_LOCAL_ROWS.filter(
          (r) => !presentes.has(`${r.ano}-${r.mes}`)
        ).map((r) => ({ ano: r.ano, mes: r.mes, g1: r.g1, g2: r.g2, g3: r.g3, g4: r.g4, valor: r.valor }));
        setDre([...rows, ...extras]);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
        setDre([]);
      }
      try {
        const { data, error } = await supabase
          .from("orcamento_2026")
          .select("*");
        if (error) throw error;
        setOrc(
          mergeOrcamento(
            (data || []).map((r) => ({
              item: r.item || "",
              mes: Number(r.nr_mes) || 0,
              previsto: Number(r.previsto) || 0,
              realizado: Number(r.realizado) || 0,
              projetado: Number((r as { projetado?: number }).projetado) || 0,
            }))
          )
        );
      } catch (e: unknown) {
        setError((p) => p ?? (e instanceof Error ? e.message : String(e)));
        setOrc(mergeOrcamento([]));
      }
    })();
  }, []);

  const anos = useMemo(() => Array.from(new Set((dre || []).map((r) => r.ano))).sort(), [dre]);
  const anoAtual = anos.length ? anos[anos.length - 1] : 0;

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

  const receitasVsDespesa = useMemo(() => {
    const m = new Map<number, { fat: number; copa: number; desp: number }>();
    for (const r of dre || []) {
      if (r.ano !== anoAtual) continue;
      const g4 = stripPrefix(r.g4).toUpperCase();
      const cur = m.get(r.mes) || { fat: 0, copa: 0, desp: 0 };
      if (g4.startsWith("FATURAMENTO")) cur.fat += r.valor;
      else if (g4.startsWith("COPARTICIPA")) cur.copa += r.valor;
      else if (g4.startsWith("DESP. ASSISTENCIAL")) cur.desp += r.valor;
      else continue;
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

  const sinistralidade = useMemo(
    () =>
      receitasVsDespesa
        .map((d) => ({
          mes: d.mes,
          Sinistralidade: d.Receitas ? (d["Desp. Assistencial"] / d.Receitas) * 100 : 0,
        }))
        .filter((d) => d.Sinistralidade !== 0),
    [receitasVsDespesa]
  );

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

  const orcamentoMensal = useMemo(() => {
    const m = new Map<number, { previsto: number; realizado: number; projetado: number }>();
    for (const r of orc || []) {
      const cur = m.get(r.mes) || { previsto: 0, realizado: 0, projetado: 0 };
      cur.previsto += r.previsto;
      cur.realizado += r.realizado;
      cur.projetado += r.projetado;
      m.set(r.mes, cur);
    }
    return Array.from(m.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([mes, v]) => ({
        mes: MES_LABEL[mes - 1] || String(mes),
        Previsto: v.previsto,
        Projetado: v.projetado,
        Realizado: v.realizado,
      }));
  }, [orc]);

  const charts = useMemo<ChartDef[]>(() => {
    if (!dre || !orc) return [];
    const resultadoCards = ([
      { key: "EBITDA", title: `EBITDA mês a mês ${anoAtual}`, domain: [-6_500_000, "auto"] },
      { key: "Financeiro", title: `Financeiro mês a mês ${anoAtual}`, domain: ["auto", "auto"] },
      { key: "Resultado", title: `Resultado geral mês a mês ${anoAtual}`, domain: ["auto", "auto"] },
    ] as const).map((cfg) => ({
      key: cfg.key,
      title: cfg.title,
      subtitle: "Valores em R$",
      chart: (
        <BarChart data={resultadoMensal} margin={{ top: 26, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="mes" tick={{ fontSize: 13 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis domain={cfg.domain as [number | string, number | string]} tickFormatter={fmtMi} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={54} />
          <Tooltip {...tooltipStyle} formatter={(v: number) => fmtBRLFull(v)} />
          <Bar dataKey={cfg.key} radius={[3, 3, 0, 0]}>
            {resultadoMensal.map((d, i) => (
              <Cell key={i} fill={barColor(d[cfg.key])} />
            ))}
            <LabelList dataKey={cfg.key} position="top" offset={4} fontSize={14} fill="hsl(var(--foreground))" formatter={(v: number) => fmtBRLFull(v)} />
          </Bar>
        </BarChart>
      ),
    }));

    const orcamento: ChartDef = {
      key: "orcamento",
      title: "Orçamento — Previsto x Realizado",
      subtitle: "Total por mês (R$)",
      chart: (
        <LineChart data={orcamentoMensal} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="mes" tick={{ fontSize: 13 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tickFormatter={fmtMi} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={54} />
          <Tooltip {...tooltipStyle} formatter={(v: number) => fmtBRLFull(v)} />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Line type="monotone" dataKey="Previsto" stroke="hsl(var(--chart-2))" strokeDasharray="4 3" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Projetado" stroke="hsl(var(--chart-3))" strokeDasharray="2 3" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Realizado" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      ),
    };

    const receitas: ChartDef = {
      key: "receitas",
      title: `Receitas x Despesa assistencial ${anoAtual}`,
      subtitle: "Faturamento + Coparticipação vs. Desp. Assistencial (R$)",
      chart: (
        <BarChart data={receitasVsDespesa} margin={{ top: 26, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="mes" tick={{ fontSize: 13 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tickFormatter={fmtMi} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={54} />
          <Tooltip {...tooltipStyle} formatter={(v: number) => fmtBRLFull(v)} />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="Faturamento" stackId="rec" fill="hsl(var(--chart-fat))" />
          <Bar dataKey="Coparticipação" stackId="rec" fill="hsl(var(--chart-copart))" radius={[3, 3, 0, 0]}>
            <LabelList dataKey="Receitas" position="top" offset={4} fontSize={12} fill="hsl(var(--foreground))" formatter={(v: number) => fmtMi2(v)} />
          </Bar>
          <Bar dataKey="Desp. Assistencial" fill="hsl(var(--chart-desp))" radius={[3, 3, 0, 0]}>
            <LabelList dataKey="Desp. Assistencial" position="top" offset={4} fontSize={12} fill="hsl(var(--foreground))" formatter={(v: number) => fmtMi2(v)} />
          </Bar>
        </BarChart>
      ),
    };

    const opAdm: ChartDef = {
      key: "opAdmFin",
      title: `Operacional x Administrativo x Financeiro ${anoAtual}`,
      subtitle: "Mês a mês, Administrativo em módulo (R$)",
      chart: (
        <BarChart data={opAdmFin} margin={{ top: 26, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="mes" tick={{ fontSize: 13 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tickFormatter={fmtMi} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={54} />
          <Tooltip {...tooltipStyle} formatter={(v: number) => fmtBRLFull(v)} />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="Operacional" fill="hsl(var(--chart-op))" radius={[3, 3, 0, 0]}>
            <LabelList dataKey="Operacional" position="top" offset={4} fontSize={12} fill="hsl(var(--foreground))" formatter={(v: number) => fmtMi2(v)} />
          </Bar>
          <Bar dataKey="Administrativo" fill="hsl(var(--chart-adm))" radius={[3, 3, 0, 0]}>
            <LabelList dataKey="Administrativo" position="top" offset={4} fontSize={12} fill="hsl(var(--foreground))" formatter={(v: number) => fmtMi2(v)} />
          </Bar>
          <Bar dataKey="Financeiro" fill="hsl(var(--chart-fin))" radius={[3, 3, 0, 0]}>
            <LabelList dataKey="Financeiro" position="top" offset={4} fontSize={12} fill="hsl(var(--foreground))" formatter={(v: number) => fmtMi2(v)} />
          </Bar>
        </BarChart>
      ),
    };

    const filhos: ChartDef = {
      key: "operacionalFilhos",
      title: `Operacional · totais ${anoAtual}`,
      subtitle: "Valores em R$",
      chart: (
        <BarChart data={operacionalFilhos} margin={{ top: 28, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 13 }} interval={0} stroke="hsl(var(--muted-foreground))" />
          <YAxis domain={[-4_000_000, "auto"]} tickFormatter={fmtMi} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={54} />
          <Tooltip {...tooltipStyle} formatter={(v: number) => fmtBRLFull(v)} />
          <Bar dataKey="value" name="Total" radius={[3, 3, 0, 0]}>
            {operacionalFilhos.map((d, i) => (
              <Cell key={i} fill={barColor(d.value)} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              offset={6}
              fontSize={15}
              fill="hsl(var(--foreground))"
              formatter={(v: number) => fmtBRLFull(v)}
            />
          </Bar>
        </BarChart>
      ),
    };

    const sinistro: ChartDef = {
      key: "sinistralidade",
      title: `Sinistralidade mês a mês ${anoAtual}`,
      subtitle: "Desp. Assistencial ÷ (Faturamento + Coparticipação)",
      chart: (
        <BarChart data={sinistralidade} margin={{ top: 26, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="mes" tick={{ fontSize: 13 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tickFormatter={(v: number) => `${v.toFixed(0)}%`} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={44} />
          <Tooltip {...tooltipStyle} formatter={(v: number) => `${v.toFixed(1)}%`} />
          <Bar dataKey="Sinistralidade" fill="hsl(var(--chart-desp))" radius={[3, 3, 0, 0]}>
            <LabelList dataKey="Sinistralidade" position="top" offset={4} fontSize={14} fill="hsl(var(--foreground))" formatter={(v: number) => `${v.toFixed(1)}%`} />
          </Bar>
        </BarChart>
      ),
    };

    return [...resultadoCards, orcamento, receitas, opAdm, filhos, sinistro];
  }, [dre, orc, anoAtual, resultadoMensal, orcamentoMensal, receitasVsDespesa, opAdmFin, operacionalFilhos, sinistralidade]);

  return {
    charts,
    loading: !dre || !orc,
    error,
    anoAtual,
    resultadoMensal,
    receitasVsDespesa,
    opAdmFin,
    sinistralidade,
    operacionalFilhos,
    orcamentoMensal,
  };
}

export const ChartFrame = ({ children }: { children: React.ReactElement }) => (
  <ResponsiveContainer width="100%" height="100%">
    {children}
  </ResponsiveContainer>
);
