import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";

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

const HIDE_PERIODO = "06/2021 a 05/2022";

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
  const [openPer, setOpenPer] = useState<Set<string>>(new Set());
  const [openPlano, setOpenPlano] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/data/apb-sinistralidade.json")
      .then((r) => r.json())
      .then((d: Row[]) => setRows(d.filter((r) => r.periodo !== HIDE_PERIODO)))
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

  const togglePer = (p: string) =>
    setOpenPer((s) => {
      const n = new Set(s);
      n.has(p) ? n.delete(p) : n.add(p);
      return n;
    });

  const togglePlano = (key: string) =>
    setOpenPlano((s) => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

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
    <section className="bg-card rounded-xl border border-border shadow-sm p-6">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Tabela Sinistralidade
          </h2>
          <p className="text-xs text-muted-foreground mt-1">{dspln}</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {periodos.length} períodos
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
              <th className="text-left py-2 pr-4">Período / Plano</th>
              <th className="text-right py-2 px-3">Receita</th>
              <th className="text-right py-2 px-3">Despesa</th>
              <th className="text-right py-2 px-3">Saldo</th>
              <th className="text-right py-2 pl-3">Sinistralidade</th>
            </tr>
          </thead>
          <tbody>
            {totaisPorPeriodo.map((t) => {
              const perOpen = openPer.has(t.periodo);
              const planos = rows.filter((r) => r.periodo === t.periodo);
              return (
                <>
                  <tr
                    key={t.periodo}
                    className="border-b border-border/50 hover:bg-accent/30 cursor-pointer"
                    onClick={() => togglePer(t.periodo)}
                  >
                    <td className="py-2 pr-4 font-medium text-foreground">
                      <span className="inline-flex items-center gap-1">
                        <ChevronRight
                          className={`h-3.5 w-3.5 transition-transform ${
                            perOpen ? "rotate-90" : ""
                          }`}
                        />
                        {t.periodo}
                      </span>
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

                  {perOpen &&
                    planos.map((p) => {
                      const key = `${p.periodo}|${p.cdpln}`;
                      const planoOpen = openPlano.has(key);
                      const sin = p.despesa / p.rec_total;
                      return (
                        <>
                          <tr
                            key={key}
                            className="border-b border-border/40 bg-accent/10 hover:bg-accent/30 cursor-pointer"
                            onClick={() => togglePlano(key)}
                          >
                            <td className="py-1.5 pr-4 pl-6 text-foreground">
                              <span className="inline-flex items-center gap-1 text-xs">
                                <ChevronRight
                                  className={`h-3 w-3 transition-transform ${
                                    planoOpen ? "rotate-90" : ""
                                  }`}
                                />
                                Plano {p.cdpln}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 text-right tabular-nums text-xs">
                              {fmtBRL(p.rec_total)}
                            </td>
                            <td className="py-1.5 px-3 text-right tabular-nums text-xs">
                              {fmtBRL(p.despesa)}
                            </td>
                            <td
                              className={`py-1.5 px-3 text-right tabular-nums text-xs ${
                                p.saldo >= 0
                                  ? "text-emerald-700"
                                  : "text-rose-700"
                              }`}
                            >
                              {fmtBRL(p.rec_total - p.despesa)}
                            </td>
                            <td
                              className={`py-1.5 pl-3 text-right tabular-nums text-xs font-medium ${
                                sin <= 0.8
                                  ? "text-emerald-700"
                                  : "text-rose-700"
                              }`}
                            >
                              {fmtPct(sin)}
                            </td>
                          </tr>

                          {planoOpen && (
                            <tr
                              key={`${key}-benef`}
                              className="border-b border-border/40 bg-accent/5"
                            >
                              <td
                                colSpan={5}
                                className="py-3 pl-12 pr-4 text-xs text-muted-foreground italic"
                              >
                                Detalhe por beneficiário indisponível — a fonte
                                atual não contém essa granularidade.
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Sinistralidade;
