import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = {
  periodo: string;
  cdpln: string;
  dspln: string;
  rec_total: number;
  internacao: number;
  emergencia: number;
  consulta: number;
  exame: number;
  terapia: number;
  outros: number;
  fisioterap: number;
  despesa: number;
};

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);

const fmtBRLcompact = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);

const SinistralidadeGraficos = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/data/apb-sinistralidade.json")
      .then((r) => r.json())
      .then((d: Row[]) => setRows(d))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const porPeriodo = useMemo(() => {
    const periodos = Array.from(new Set(rows.map((r) => r.periodo))).sort();
    return periodos.map((p) => {
      const rs = rows.filter((r) => r.periodo === p);
      const rec = rs.reduce((a, r) => a + r.rec_total, 0);
      const desp = rs.reduce((a, r) => a + r.despesa, 0);
      return {
        periodo: p,
        receita: rec,
        despesa: desp,
        saldo: rec - desp,
        sinistralidade: rec ? (desp / rec) * 100 : 0,
      };
    });
  }, [rows]);

  const composicao = useMemo(() => {
    const periodos = Array.from(new Set(rows.map((r) => r.periodo))).sort();
    return periodos.map((p) => {
      const rs = rows.filter((r) => r.periodo === p);
      const sum = (k: keyof Row) =>
        rs.reduce((a, r) => a + (r[k] as number), 0);
      return {
        periodo: p,
        Internação: sum("internacao"),
        Emergência: sum("emergencia"),
        Consulta: sum("consulta"),
        Exame: sum("exame"),
        Terapia: sum("terapia"),
        Fisio: sum("fisioterap"),
      };
    });
  }, [rows]);

  if (loading) {
    return (
      <section className="bg-card rounded-xl border border-border shadow-sm p-6">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </section>
    );
  }

  if (rows.length === 0) {
    return (
      <section className="bg-card rounded-xl border border-border shadow-sm p-6">
        <p className="text-sm text-muted-foreground">Sem dados.</p>
      </section>
    );
  }

  const dspln = rows[0]?.dspln ?? "";

  return (
    <div className="space-y-6">
      <section className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Gráfico Sinistralidade
          </h2>
          <p className="text-xs text-muted-foreground mt-1">{dspln}</p>
        </div>

        <div className="mt-6 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={porPeriodo}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="l"
                tickFormatter={(v) => fmtBRLcompact(v)}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                yAxisId="r"
                orientation="right"
                tickFormatter={(v) => `${v.toFixed(0)}%`}
                tick={{ fontSize: 11 }}
                domain={[0, "auto"]}
              />
              <Tooltip
                formatter={(v: number, n) =>
                  n === "sinistralidade"
                    ? [`${v.toFixed(1)}%`, "Sinistralidade"]
                    : [fmtBRL(v), n]
                }
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                yAxisId="l"
                dataKey="receita"
                name="Receita"
                fill="hsl(var(--primary))"
              />
              <Bar
                yAxisId="l"
                dataKey="despesa"
                name="Despesa"
                fill="hsl(0 70% 55%)"
              />
              <Line
                yAxisId="r"
                type="monotone"
                dataKey="sinistralidade"
                name="Sinistralidade %"
                stroke="hsl(35 90% 45%)"
                strokeWidth={2}
                dot
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Saldo por período
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porPeriodo}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
              <YAxis
                tickFormatter={(v) => fmtBRLcompact(v)}
                tick={{ fontSize: 11 }}
              />
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
              <Bar dataKey="saldo" name="Saldo">
                {porPeriodo.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.saldo >= 0 ? "hsl(150 60% 40%)" : "hsl(0 70% 55%)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Composição da despesa
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={composicao}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
              <YAxis
                tickFormatter={(v) => fmtBRLcompact(v)}
                tick={{ fontSize: 11 }}
              />
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Internação" stackId="a" fill="hsl(210 70% 50%)" />
              <Bar dataKey="Emergência" stackId="a" fill="hsl(0 70% 55%)" />
              <Bar dataKey="Consulta" stackId="a" fill="hsl(150 60% 45%)" />
              <Bar dataKey="Exame" stackId="a" fill="hsl(35 90% 50%)" />
              <Bar dataKey="Terapia" stackId="a" fill="hsl(280 60% 55%)" />
              <Bar dataKey="Fisio" stackId="a" fill="hsl(190 60% 45%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};

export default SinistralidadeGraficos;
