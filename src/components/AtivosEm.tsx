import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { dw } from "@/lib/dwClient";

interface Props {
  dateValue: string; // yyyy-mm-dd
}

type Row = {
  CDREGUSR: number | null;
  VIGENCIA_BENEFICIARIO: string | null;
  ULTIMA_REATIVACAO: string | null;
  ULTIMO_CANCELAMENTO: string | null;
};


const PAGE = 1000;

// Converte "dd/mm/yyyy" ou "yyyy-mm-dd" para "yyyy-mm-dd"
const toISO = (s: string): string | null => {
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
};


const AtivosEm = ({ dateValue }: Props) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [ativos, setAtivos] = useState<number | null>(null);

  useEffect(() => {
    if (!dateValue) return;
    let abort = false;
    (async () => {
      setLoading(true);
      setError(null);
      setAtivos(null);
      setProgress(0);
      setTotal(null);
      try {
        const ref = toISO(dateValue); // normaliza para yyyy-mm-dd
        if (!ref) throw new Error(`Data de referência inválida: ${dateValue}`);

        let count = 0;
        let processed = 0;
        let lastId: number | null = null;
        // Keyset pagination por CDREGUSR (evita timeout de OFFSET profundo)
        while (true) {
          if (abort) return;
          let q = dw
            .from("sv_ecarteira_lovable")
            .select("CDREGUSR,VIGENCIA_BENEFICIARIO,ULTIMA_REATIVACAO,ULTIMO_CANCELAMENTO")
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
            if (!canc || (reat && reat > canc)) count++;
          }
          processed += rows.length;
          lastId = rows[rows.length - 1].CDREGUSR as number;
          setProgress(processed);
          setTotal(processed);
          if (rows.length < PAGE) break;
        }

        if (!abort) {
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
        <div className="py-4">
          <div className="text-5xl font-bold tabular-nums text-foreground">
            {ativos !== null ? fmtInt(ativos) : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Total analisado: {total !== null ? fmtInt(total) : "—"}
          </div>
        </div>
      )}
    </section>
  );
};

export default AtivosEm;
