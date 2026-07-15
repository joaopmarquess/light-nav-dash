import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";

type Row = {
  periodo: string;
  cdpln: string;
  dspln: string;
  cdregusr: string;
  nmcli: string;
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

const sumBy = <T,>(arr: T[], k: (t: T) => number) =>
  arr.reduce((a, t) => a + k(t), 0);

type Agg = {
  rec_tm: number;
  rec_cpa: number;
  rec_total: number;
  internacao: number;
  emergencia: number;
  consulta: number;
  exame: number;
  terapia: number;
  fisioterap: number;
  outros: number;
  despesa: number;
  saldo: number;
};

const aggregate = (rs: Row[]): Agg => {
  const rec_tm = sumBy(rs, (r) => r.rec_tm);
  const despesa = sumBy(rs, (r) => r.despesa);
  return {
    rec_tm,
    rec_cpa: sumBy(rs, (r) => r.rec_cpa),
    rec_total: sumBy(rs, (r) => r.rec_total),
    internacao: sumBy(rs, (r) => r.internacao),
    emergencia: sumBy(rs, (r) => r.emergencia),
    consulta: sumBy(rs, (r) => r.consulta),
    exame: sumBy(rs, (r) => r.exame),
    terapia: sumBy(rs, (r) => r.terapia),
    fisioterap: sumBy(rs, (r) => r.fisioterap),
    outros: sumBy(rs, (r) => r.outros),
    despesa,
    saldo: rec_tm - despesa,
  };
};

const NUM_COLS: { key: keyof Agg; label: string }[] = [
  { key: "rec_cpa", label: "Rec. Copa" },
  { key: "rec_total", label: "Rec. Total" },
  { key: "internacao", label: "Internação" },
  { key: "emergencia", label: "Emergência" },
  { key: "consulta", label: "Consulta" },
  { key: "exame", label: "Exame" },
  { key: "terapia", label: "Terapia" },
  { key: "fisioterap", label: "Fisio" },
  { key: "outros", label: "Outros" },
  { key: "despesa", label: "vrDespesas" },
  { key: "saldo", label: "Saldo" },
];

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

  const porPeriodo = useMemo(
    () =>
      periodos.map((p) => {
        const rs = rows.filter((r) => r.periodo === p);
        return { periodo: p, rows: rs, agg: aggregate(rs) };
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

  const NumCells = ({ a, sin }: { a: Agg; sin: number }) => (
    <>
      {NUM_COLS.map((c) => {
        const v = a[c.key];
        const color =
          c.key === "saldo"
            ? v >= 0
              ? "text-emerald-700"
              : "text-rose-700"
            : c.key === "rec_total" || c.key === "rec_cpa"
            ? "text-emerald-700"
            : c.key === "despesa"
            ? "text-rose-700"
            : "text-foreground";
        return (
          <td
            key={c.key}
            className={`py-1.5 px-2 text-right tabular-nums ${color}`}
          >
            {fmtBRL(v)}
          </td>
        );
      })}
      <td
        className={`py-1.5 pl-2 text-right tabular-nums font-medium ${
          sin <= 0.8 ? "text-emerald-700" : "text-rose-700"
        }`}
      >
        {fmtPct(sin)}
      </td>
    </>
  );

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
          {periodos.length} períodos · {rows.length.toLocaleString("pt-BR")} linhas
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="uppercase tracking-wide text-muted-foreground border-b border-border">
              <th className="text-left py-2 pr-3 whitespace-nowrap">
                Período / Plano / Beneficiário
              </th>
              {NUM_COLS.map((c) => (
                <th
                  key={c.key}
                  className="text-right py-2 px-2 whitespace-nowrap"
                >
                  {c.label}
                </th>
              ))}
              <th className="text-right py-2 pl-2 whitespace-nowrap">
                Sinistr.
              </th>
            </tr>
          </thead>
          <tbody>
            {porPeriodo.map(({ periodo, rows: rsP, agg }) => {
              const perOpen = openPer.has(periodo);
              const sinP = agg.despesa / agg.rec_total;
              const planosCodes = Array.from(
                new Set(rsP.map((r) => r.cdpln))
              ).sort();
              return (
                <>
                  <tr
                    key={periodo}
                    className="border-b border-border/50 hover:bg-accent/30 cursor-pointer text-sm"
                    onClick={() => togglePer(periodo)}
                  >
                    <td className="py-2 pr-3 font-medium text-foreground whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <ChevronRight
                          className={`h-3.5 w-3.5 transition-transform ${
                            perOpen ? "rotate-90" : ""
                          }`}
                        />
                        {periodo}
                      </span>
                    </td>
                    <NumCells a={agg} sin={sinP} />
                  </tr>

                  {perOpen &&
                    planosCodes.map((cd) => {
                      const key = `${periodo}|${cd}`;
                      const planoOpen = openPlano.has(key);
                      const rsPl = rsP.filter((r) => r.cdpln === cd);
                      const aggPl = aggregate(rsPl);
                      const sinPl = aggPl.despesa / aggPl.rec_total;
                      const benefs = [...rsPl].sort(
                        (a, b) => b.despesa - a.despesa
                      );
                      return (
                        <>
                          <tr
                            key={key}
                            className="border-b border-border/40 bg-accent/10 hover:bg-accent/30 cursor-pointer"
                            onClick={() => togglePlano(key)}
                          >
                            <td className="py-1.5 pr-3 pl-6 text-foreground whitespace-nowrap">
                              <span className="inline-flex items-center gap-1">
                                <ChevronRight
                                  className={`h-3 w-3 transition-transform ${
                                    planoOpen ? "rotate-90" : ""
                                  }`}
                                />
                                Plano {cd}
                                <span className="text-muted-foreground ml-1">
                                  ({rsPl.length})
                                </span>
                              </span>
                            </td>
                            <NumCells a={aggPl} sin={sinPl} />
                          </tr>

                          {planoOpen &&
                            benefs.map((b) => {
                              const sinB = b.rec_total
                                ? b.despesa / b.rec_total
                                : 0;
                              return (
                                <tr
                                  key={`${key}|${b.cdregusr}`}
                                  className="border-b border-border/30 bg-accent/5"
                                >
                                  <td className="py-1 pr-3 pl-12 text-foreground whitespace-nowrap max-w-[360px] truncate">
                                    <span className="text-muted-foreground mr-2 tabular-nums">
                                      {b.cdregusr}
                                    </span>
                                    {b.nmcli}
                                  </td>
                                  <NumCells a={b as unknown as Agg} sin={sinB} />
                                </tr>
                              );
                            })}
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
