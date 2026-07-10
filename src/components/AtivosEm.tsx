import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { dw } from "@/lib/dwClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

interface Props {
  dateValue: string;
}

const toISO = (s: string): string | null => {
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
};

const faixaSortKey = (s: string) => {
  if (!s) return 999;
  if (/^sem/i.test(s)) return 1000;
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 998;
};

const AtivosEm = ({ dateValue }: Props) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ativos, setAtivos] = useState<number | null>(null);
  const [porFaixa, setPorFaixa] = useState<{ faixa: string; ativos: number }[]>([]);

  useEffect(() => {
    if (!dateValue) return;
    let abort = false;
    (async () => {
      setLoading(true);
      setError(null);
      setAtivos(null);
      setPorFaixa([]);
      try {
        const ref = toISO(dateValue);
        if (!ref) throw new Error(`Data de referência inválida: ${dateValue}`);

        // Consulta direta em public.sv_ecarteira_ativos (novo projeto DW).
        // Paginação para superar o limite padrão de 1000 linhas.
        const pageSize = 1000;
        let from = 0;
        const acc: { Faixa_etaria: string | null }[] = [];
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data, error } = await dw
            .from("sv_ecarteira_ativos")
            .select("Faixa_etaria")
            .lte("DATA_INICIO_ATIVO", ref)
            .gte("DATA_FIM_ATIVO", ref)
            .range(from, from + pageSize - 1);
          if (error) throw error;
          const chunk = (data ?? []) as { Faixa_etaria: string | null }[];
          acc.push(...chunk);
          if (chunk.length < pageSize) break;
          from += pageSize;
        }
        if (abort) return;

        const map = new Map<string, number>();
        for (const r of acc) {
          const k = r.Faixa_etaria || "Sem faixa";
          map.set(k, (map.get(k) ?? 0) + 1);
        }
        const arr = Array.from(map, ([faixa, ativos]) => ({ faixa, ativos }))
          .sort((a, b) => faixaSortKey(a.faixa) - faixaSortKey(b.faixa));
        setPorFaixa(arr);
        setAtivos(acc.length);
        setLoading(false);
      } catch (e: any) {
        if (!abort) {
          setError(e?.message ?? String(e));
          setLoading(false);
        }
      }
    })();
    return () => {
      abort = true;
    };
  }, [dateValue]);

  const fmtInt = (n: number) => n.toLocaleString("pt-BR");
  const fmtDateBR = (s: string) => {
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
  };

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Beneficiários ativos</h2>
        <p className="text-xs text-muted-foreground">
          Fonte: <code>public.sv_ecarteira_ativos</code> · Data de referência:{" "}
          {dateValue ? fmtDateBR(dateValue) : "—"}
        </p>
      </div>


      {loading ? (
        <div className="flex items-center text-muted-foreground text-sm py-8">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Carregando…
        </div>
      ) : error ? (
        <div className="text-destructive text-sm">Erro: {error}</div>
      ) : (
        <div className="py-4 space-y-6">
          <div>
            <div className="text-5xl font-bold tabular-nums text-foreground">
              {ativos !== null ? fmtInt(ativos) : "—"}
            </div>
          </div>

          {porFaixa.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Ativos por faixa etária
              </h3>
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={porFaixa}
                    margin={{ top: 20, right: 16, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="faixa"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtInt} />
                    <Tooltip
                      formatter={(v: number) => [fmtInt(v), "Ativos"]}
                      labelFormatter={(l) => `Faixa: ${l}`}
                    />
                    <Bar dataKey="ativos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                      <LabelList
                        dataKey="ativos"
                        position="top"
                        formatter={(v: number) => fmtInt(v)}
                        className="fill-foreground"
                        style={{ fontSize: 11 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default AtivosEm;
