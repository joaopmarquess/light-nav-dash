import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Loader2, Check } from "lucide-react";
import {
  addMonths,
  fmtComp,
  fetchMabasBounds,
  fetchISinRows,
} from "@/lib/isinistralidadeData";
import {
  buildPeriodos,
  setSinPeriodo,
  useSinPeriodo,
} from "@/lib/sinistralidadePeriodoStore";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pct = (v: number) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;


export default function SinistralidadeDefinirPeriodo() {
  const cfg = useSinPeriodo();
  const [baseFim, setBaseFim] = useState(cfg?.baseFim ?? "");
  const [meses, setMeses] = useState(String(cfg?.meses ?? 12));
  const [bounds, setBounds] = useState<{ min: string; max: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const b = await fetchMabasBounds();
      if (!alive) return;
      setBounds(b);
      setLoading(false);
      if (b && !cfg?.baseFim) setBaseFim(b.max);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nMeses = Number(meses) || 0;
  const baseIni = useMemo(
    () => (/^\d{6}$/.test(baseFim) && nMeses > 0 ? addMonths(baseFim, -(nMeses - 1)) : ""),
    [baseFim, nMeses],
  );

  const preview = useMemo(
    () => buildPeriodos(baseFim, nMeses, bounds?.min),
    [baseFim, nMeses, bounds?.min],
  );

  const gerar = () => {
    if (!preview.length) return;
    setSinPeriodo({ baseFim, meses: nMeses, baseIni, periodos: preview });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const inputCls =
    "h-9 w-28 px-2 rounded-md border border-border bg-background text-sm text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-primary" />
          Definir Período
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Informe a base final e a quantidade de meses. A base inicial e os períodos são
          calculados pela aplicação a partir dos mabas.
        </p>
      </div>

      <div className="p-4 flex flex-wrap items-start gap-4 border-b border-border">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground h-4 leading-4">Base final (AAAAMM)</label>
          <input
            type="text"
            inputMode="numeric"
            value={baseFim}
            onChange={(e) => setBaseFim(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="202606"
            className={inputCls}
          />
          <span className="text-[11px] text-muted-foreground h-4 leading-4">
            {baseFim.length === 6 ? fmtComp(baseFim) : ""}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground h-4 leading-4">Quantos meses</label>
          <input
            type="text"
            inputMode="numeric"
            value={meses}
            onChange={(e) => setMeses(e.target.value.replace(/\D/g, "").slice(0, 2))}
            placeholder="12"
            className={inputCls}
          />
          <span className="text-[11px] h-4 leading-4" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground h-4 leading-4">
            Base inicial (calculada)
          </label>
          <div className="h-9 w-28 px-2 rounded-md border border-dashed border-border bg-muted/40 text-sm text-foreground tabular-nums flex items-center">
            {baseIni || "-"}
          </div>
          <span className="text-[11px] text-muted-foreground h-4 leading-4">
            {baseIni ? fmtComp(baseIni) : ""}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs h-4 leading-4" aria-hidden="true" />
          <button
            type="button"
            onClick={gerar}
            disabled={!preview.length}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 transition"
          >
            Gerar
          </button>
          <span className="text-[11px] h-4 leading-4" />
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-xs h-4 leading-4" aria-hidden="true" />
          <div className="h-9 flex items-center gap-3 flex-wrap">
            {saved && (
              <span className="text-xs text-primary flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Períodos definidos
              </span>
            )}

            {loading && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> lendo mabas disponíveis
              </span>
            )}
            {!loading && bounds && (
              <span className="text-xs text-muted-foreground">
                Base disponível: {fmtComp(bounds.min)} a {fmtComp(bounds.max)}
              </span>
            )}
          </div>
          <span className="text-[11px] h-4 leading-4" />
        </div>
      </div>


      <div className="flex-1 overflow-auto p-4">
        {preview.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Preencha a base final e a quantidade de meses.
          </p>
        ) : (
          <table className="text-sm">
            <thead>
              <tr className="text-xs uppercase text-muted-foreground">
                <th className="text-left px-3 py-2">#</th>
                <th className="text-left px-3 py-2">Período</th>
                <th className="text-left px-3 py-2">mabas</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((p) => (
                <tr key={p.idx} className="border-t border-border">
                  <td className="px-3 py-2 text-muted-foreground">Período {p.idx}</td>
                  <td className="px-3 py-2 font-medium text-foreground">{p.label}</td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {p.mIni} – {p.mFim}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
