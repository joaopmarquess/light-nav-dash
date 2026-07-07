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

type Row = {
  CDREGUSR: number | null;
  VIGENCIA_BENEFICIARIO: string | null;
  ULTIMA_REATIVACAO: string | null;
  ULTIMO_CANCELAMENTO: string | null;
  Faixa_etaria: string | null;
};

const PAGE = 1000;

const toISO = (s: string): string | null => {
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
};

// Ordena as faixas etárias de forma lógica (pega o primeiro número)
const faixaSortKey = (s: string) => {
  if (!s) return 999;
  if (/^sem/i.test(s)) return 1000;
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 998;
};

const AtivosEm = ({ dateValue }: Props) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
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
      setProgress(0);
      setTotal(null);
      try {
        const ref = toISO(dateValue);
        if (!ref) throw new Error(`Data de referência inválida: ${dateValue}`);

        let count = 0;
        let processed = 0;
        let lastId: number | null = null;
        const byFaixa = new Map<string, number>();

        while (true) {
          if (abort) return;
          let q = dw
            .from("sv_ecarteira_lovable")
            .select(
              "CDREGUSR,VIGENCIA_BENEFICIARIO,ULTIMA_REATIVACAO,ULTIMO_CANCELAMENTO,Faixa_etaria"
            )
            .order("CDREGUSR", { ascending: true })
            .limit(PAGE);
          if (lastId !== null) q = q.gt("CDREGUSR", lastId);
          const { data, error } = await q;
          if (error) throw error;
          const rows = (data ?? []) as Row[];
          if (rows.length === 0) break;
          for (const r of rows) {
            const vig = r.VIGENCIA_BENEFICIARIO;
            if (!vig || vig > ref) continue;
            const reat = r.ULTIMA_REATIVACAO;
            const canc = r.ULTIMO_CANCELAMENTO;
            if (!canc || (reat && reat > canc)) {
              count++;
              const f = r.Faixa_etaria || "Sem faixa";
              byFaixa.set(f, (byFaixa.get(f) || 0) + 1);
            }
          }
          processed += rows.length;
          lastId = rows[rows.length - 1].CDREGUSR as number;
          setProgress(processed);
          setTotal(processed);
          if (rows.length < PAGE) break;
        }
        if (!abort) {
          const arr = Array.from(byFaixa.entries())
            .map(([faixa, ativos]) => ({ faixa, ativos }))
            .sort((a, b) => faixaSortKey(a.faixa) - faixaSortKey(b.faixa));
          setPorFaixa(arr);
          setAtivos(count);
          setLoading(false);
        }
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
          Fonte: <code>sv_ecarteira_lovable</code> · Data de referência:{" "}
          {dateValue ? fmtDateBR(dateValue) : "—"}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center text-muted-foreground text-sm py-8">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Processando… {fmtInt(progress)}
          {total ? ` / ${fmtInt(total)}` : ""}
        </div>
      ) : error ? (
        <div className="text-destructive text-sm">Erro: {error}</div>
      ) : (
        <div className="py-4 space-y-6">
          <div>
            <div className="text-5xl font-bold tabular-nums text-foreground">
              {ativos !== null ? fmtInt(ativos) : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Total analisado: {total !== null ? fmtInt(total) : "—"}
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
