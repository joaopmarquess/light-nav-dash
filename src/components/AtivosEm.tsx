import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { dw } from "@/lib/dwClient";

type Row = {
  VIGENCIA_BENEFICIARIO: string | null;
  ULTIMA_REATIVACAO: string | null;
  ULTIMO_CANCELAMENTO: string | null;
};

function parseBR(s: string): Date | null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  return isNaN(d.getTime()) ? null : d;
}
function parseISO(s: string | null): number | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  return isNaN(t) ? null : t;
}

interface Props {
  dateValue: string;
}

const AtivosEm = ({ dateValue }: Props) => {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ref = parseBR(dateValue);
    if (!ref) return;
    const refISO = ref.toISOString().slice(0, 10);
    const refMs = ref.getTime();
    let abort = false;
    (async () => {
      setLoading(true);
      setError(null);
      const pageSize = 1000;
      let from = 0;
      let active = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await dw
          .from("sv_ecarteira_lovable")
          .select('"VIGENCIA_BENEFICIARIO","ULTIMA_REATIVACAO","ULTIMO_CANCELAMENTO"')
          .eq("Plano_de", "Saúde")
          .lte("VIGENCIA_BENEFICIARIO", refISO)
          .or(`ULTIMO_CANCELAMENTO.is.null,ULTIMO_CANCELAMENTO.gte.${refISO},ULTIMA_REATIVACAO.not.is.null`)
          .range(from, from + pageSize - 1);
        if (error) {
          if (!abort) { setError(error.message); setLoading(false); }
          return;
        }
        const batch = (data ?? []) as Row[];
        for (const r of batch) {
          const vig = parseISO(r.VIGENCIA_BENEFICIARIO);
          if (vig === null || refMs < vig) continue;
          const reat = parseISO(r.ULTIMA_REATIVACAO);
          const canc = parseISO(r.ULTIMO_CANCELAMENTO);
          const isActive = canc === null || (reat !== null && reat > canc) || refMs < canc;
          if (isActive) active++;
        }
        if (batch.length < pageSize) break;
        from += pageSize;
        if (from > 1000000) break;
      }
      if (!abort) { setCount(active); setLoading(false); }
    })();
    return () => { abort = true; };
  }, [dateValue]);

  const refDate = parseBR(dateValue);
  const fmtInt = (n: number) => n.toLocaleString("pt-BR");

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Vidas ativas</h2>
        <p className="text-xs text-muted-foreground">
          {refDate ? `Data de referência: ${dateValue}` : "Informe a data no formato dd/mm/aaaa no campo acima"} · fonte: <code>sv_ecarteira_lovable</code>
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Regra: <code>Plano_de = 'Saúde'</code> · <code>VIGENCIA_BENEFICIARIO ≤ data</code> · ativo quando <code>ULTIMO_CANCELAMENTO</code> é nulo, ou <code>ULTIMA_REATIVACAO &gt; ULTIMO_CANCELAMENTO</code>, ou <code>ULTIMO_CANCELAMENTO &gt; data</code>.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center">
        {!refDate ? (
          <div className="text-muted-foreground text-sm">Digite uma data válida para ver os resultados.</div>
        ) : loading ? (
          <div className="flex items-center text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando…
          </div>
        ) : error ? (
          <div className="text-destructive text-sm">Erro: {error}</div>
        ) : (
          <div className="text-center">
            <div className="text-6xl font-bold text-foreground tabular-nums">{fmtInt(count ?? 0)}</div>
            <div className="mt-2 text-sm text-muted-foreground">vidas ativas</div>
          </div>
        )}
      </div>
    </section>
  );
};

export default AtivosEm;
