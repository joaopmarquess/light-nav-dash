import { useEffect, useMemo, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import plansData from "@/data/plans.json";

type Dataset = { p: number[]; v: number[]; r: number[]; c: number[] };
type Plan = { p: string; n: string };

const EPOCH = Date.UTC(1970, 0, 1);
const DAY = 86400000;

// dd/mm/aaaa -> Date (UTC)
function parseBR(s: string): Date | null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  return isNaN(d.getTime()) ? null : d;
}

interface Props {
  dateValue: string;
}

const AtivosEm = ({ dateValue }: Props) => {
  const [data, setData] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let abort = false;
    setLoading(true);
    fetch("/data/ativos.json")
      .then((r) => r.json())
      .then((j) => {
        if (!abort) {
          setData(j);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!abort) {
          setError(String(e));
          setLoading(false);
        }
      });
    return () => {
      abort = true;
    };
  }, []);

  const plans = plansData as Plan[];
  const refDate = parseBR(dateValue);

  const results = useMemo(() => {
    if (!data || !refDate) return [];
    const ref = Math.floor((refDate.getTime() - EPOCH) / DAY);
    const yearEnd = Math.floor(
      (Date.UTC(new Date().getUTCFullYear(), 11, 31) - EPOCH) / DAY,
    );
    const totals = new Map<number, number>();
    const { p, v, r, c } = data;
    for (let i = 0; i < p.length; i++) {
      const vig = v[i];
      const reat = r[i];
      const canc = c[i];
      const end = canc >= 0 && canc > reat ? canc : yearEnd;
      if (ref < end && vig >= 0 && ref >= vig) {
        totals.set(p[i], (totals.get(p[i]) || 0) + 1);
      }
    }
    const q = filter.trim().toLowerCase();
    const list: { plano: string; nome: string; vidas: number }[] = [];
    for (const [idx, vidas] of totals) {
      const pl = plans[idx];
      if (!pl) continue;
      if (
        !q ||
        pl.n.toLowerCase().includes(q) ||
        pl.p.toLowerCase().includes(q)
      ) {
        list.push({ plano: pl.p || "(sem código)", nome: pl.n || "(sem nome)", vidas });
      }
    }
    list.sort((a, b) => b.vidas - a.vidas);
    return list;
  }, [data, refDate?.getTime(), filter, plans]);

  const totalVidas = useMemo(
    () => results.reduce((s, r) => s + r.vidas, 0),
    [results],
  );
  const totalPlanos = results.length;

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Vidas ativas por plano
          </h2>
          <p className="text-xs text-muted-foreground">
            {refDate
              ? `Data de referência: ${dateValue}`
              : "Informe a data no formato dd/mm/aaaa no campo acima"}
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar por PLANO ou NOME_PLANO…"
            className="h-9 w-full pl-9 pr-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando dados…
        </div>
      )}
      {error && (
        <div className="flex-1 flex items-center justify-center text-destructive text-sm">
          Erro ao carregar: {error}
        </div>
      )}
      {!loading && !error && !refDate && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Digite uma data válida para ver os resultados.
        </div>
      )}
      {!loading && !error && refDate && (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 px-1">
            <span>
              {totalPlanos} plano{totalPlanos === 1 ? "" : "s"}
            </span>
            <span>
              Total:{" "}
              <span className="font-semibold text-foreground">
                {totalVidas.toLocaleString("pt-BR")}
              </span>{" "}
              vidas
            </span>
          </div>
          <div className="flex-1 overflow-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 sticky top-0">
                <tr>
                  <th className="text-left font-medium text-muted-foreground px-4 py-2 w-32">
                    PLANO
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-2">
                    NOME_PLANO
                  </th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-2 w-32">
                    VIDAS
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Nenhum plano encontrado.
                    </td>
                  </tr>
                )}
                {results.map((row) => (
                  <tr
                    key={`${row.plano}-${row.nome}`}
                    className="border-t border-border hover:bg-accent/40"
                  >
                    <td className="px-4 py-2 text-foreground tabular-nums">
                      {row.plano}
                    </td>
                    <td className="px-4 py-2 text-foreground">{row.nome}</td>
                    <td className="px-4 py-2 text-right font-medium text-foreground tabular-nums">
                      {row.vidas.toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
              {results.length > 0 && (
                <tfoot className="sticky bottom-0">
                  <tr className="bg-muted/60 border-t-2 border-border">
                    <td className="px-4 py-2 font-semibold text-foreground" colSpan={2}>
                      Total ({totalPlanos.toLocaleString("pt-BR")} plano{totalPlanos === 1 ? "" : "s"})
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-foreground tabular-nums">
                      {totalVidas.toLocaleString("pt-BR")}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </section>
  );
};

export default AtivosEm;
