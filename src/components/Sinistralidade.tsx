import { useEffect, useMemo, useState } from "react";

type Row = {
  periodo: string;
  cdpln: string;
  dspln: string;
  rec_tm: number;
  rec_cpa: number;
  rec_total: number;
  internacao: number;
  emergencia: number;
  consulta: number;
  exame: number;
  terapia: number;
  outros: number;
  fisioterap: number;
  despesa: number;
  saldo: number;
};

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);

const fmtPct = (v: number) =>
  isFinite(v) ? `${(v * 100).toFixed(1)}%` : "—";

const Sinistralidade = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/data/apb-sinistralidade.json")
      .then((r) => r.json())
      .then((d: Row[]) => setRows(d))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const periodos = useMemo(
    () => Array.from(new Set(rows.map((r) => r.periodo))).sort(),
    [rows]
  );

  const totaisPorPeriodo = useMemo(
    () =>
      periodos.map((p) => {
        const rs = rows.filter((r) => r.periodo === p);
        const rec = rs.reduce((a, r) => a + r.rec_total, 0);
        const desp = rs.reduce((a, r) => a + r.despesa, 0);
        return { periodo: p, rec, desp, saldo: rec - desp, sin: desp / rec };
      }),
    [periodos, rows]
  );

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
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Tabela Sinistralidade
            </h2>
            <p className="text-xs text-muted-foreground mt-1">{dspln}</p>
          </div>
          <span className="text-xs text-muted-foreground">
            {rows.length} linhas · {periodos.length} períodos
          </span>
        </div>

        {/* Resumo por período */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="text-left py-2 pr-4">Período</th>
                <th className="text-right py-2 px-3">Receita</th>
                <th className="text-right py-2 px-3">Despesa</th>
                <th className="text-right py-2 px-3">Saldo</th>
                <th className="text-right py-2 pl-3">Sinistralidade</th>
              </tr>
            </thead>
            <tbody>
              {totaisPorPeriodo.map((t) => (
                <tr
                  key={t.periodo}
                  className="border-b border-border/50 hover:bg-accent/30"
                >
                  <td className="py-2 pr-4 font-medium text-foreground">
                    {t.periodo}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-emerald-700">
                    {fmtBRL(t.rec)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-rose-700">
                    {fmtBRL(t.desp)}
                  </td>
                  <td
                    className={`py-2 px-3 text-right tabular-nums ${
                      t.saldo >= 0 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {fmtBRL(t.saldo)}
                  </td>
                  <td
                    className={`py-2 pl-3 text-right tabular-nums font-medium ${
                      t.sin <= 0.8 ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {fmtPct(t.sin)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detalhe por plano */}
      <section className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Detalhe por plano
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="text-left py-2 pr-3">Período</th>
                <th className="text-left py-2 pr-3">Plano</th>
                <th className="text-right py-2 px-2">Rec. TM</th>
                <th className="text-right py-2 px-2">Rec. Copa</th>
                <th className="text-right py-2 px-2">Rec. Total</th>
                <th className="text-right py-2 px-2">Internação</th>
                <th className="text-right py-2 px-2">Emergência</th>
                <th className="text-right py-2 px-2">Consulta</th>
                <th className="text-right py-2 px-2">Exame</th>
                <th className="text-right py-2 px-2">Terapia</th>
                <th className="text-right py-2 px-2">Fisio</th>
                <th className="text-right py-2 px-2">Despesa</th>
                <th className="text-right py-2 pl-2">Sin.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const sin = r.despesa / r.rec_total;
                return (
                  <tr
                    key={i}
                    className="border-b border-border/50 hover:bg-accent/30"
                  >
                    <td className="py-1.5 pr-3 whitespace-nowrap text-foreground">
                      {r.periodo}
                    </td>
                    <td className="py-1.5 pr-3 text-muted-foreground">
                      {r.cdpln}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {fmtBRL(r.rec_tm)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {fmtBRL(r.rec_cpa)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-medium">
                      {fmtBRL(r.rec_total)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {fmtBRL(r.internacao)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {fmtBRL(r.emergencia)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {fmtBRL(r.consulta)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {fmtBRL(r.exame)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {fmtBRL(r.terapia)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {fmtBRL(r.fisioterap)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-medium">
                      {fmtBRL(r.despesa)}
                    </td>
                    <td
                      className={`py-1.5 pl-2 text-right tabular-nums font-medium ${
                        sin <= 0.8 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {fmtPct(sin)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Sinistralidade;
