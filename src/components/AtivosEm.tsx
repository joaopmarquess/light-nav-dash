import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { dw } from "@/lib/dwClient";

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
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ref = parseBR(dateValue);
    if (!ref) return;
    const refISO = ref.toISOString().slice(0, 10);
    let abort = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const base = () =>
          dw
            .from("sv_ecarteira_lovable")
            .select("*", { count: "exact", head: true })
            .eq("Plano_de", "Saúde")
            .lte("VIGENCIA_BENEFICIARIO", refISO);

        // Regra: SE(B<=ref; SE(C="" E D=""; 1; SE(C=""; 1; SE(C<D; 1; 0))); 0)
        // => ativo quando VIGENCIA<=ref E (ULTIMA_REATIVACAO é nula OU ULTIMA_REATIVACAO < ULTIMO_CANCELAMENTO)
        // A) ULTIMA_REATIVACAO nula
        const qA = base().is("ULTIMA_REATIVACAO", null);
        // B) ULTIMA_REATIVACAO < ULTIMO_CANCELAMENTO (ambas não-nulas por definição da comparação)
        const qB = base().filter("ULTIMA_REATIVACAO", "lt", "ULTIMO_CANCELAMENTO");

        const [rA, rB] = await Promise.all([qA, qB]);
        if (rA.error) throw rA.error;
        if (rB.error) throw rB.error;

        if (!abort) {
          setCount((rA.count ?? 0) + (rB.count ?? 0));
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
          Regra: <code>Plano_de = 'Saúde'</code> · <code>VIGENCIA_BENEFICIARIO ≤ data</code> · ativo quando <code>ULTIMO_CANCELAMENTO</code> é nulo, ou <code>ULTIMO_CANCELAMENTO &gt; data</code>, ou (<code>ULTIMO_CANCELAMENTO ≤ data</code> e <code>ULTIMA_REATIVACAO ≤ data</code>).
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
