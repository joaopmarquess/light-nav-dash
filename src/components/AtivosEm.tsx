import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { dw } from "@/lib/dwClient";

interface Props {
  dateValue: string;
}

type Row = {
  CDREGUSR: number | string | null;
  VIGENCIA_BENEFICIARIO: string | null;
  ULTIMA_REATIVACAO: string | null;
  ULTIMO_CANCELAMENTO: string | null;
};

const AtivosEm = ({ dateValue }: Props) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true);
      setError(null);
      setRows([]);
      setProgress(0);
      try {
        const pageSize = 1000;
        let from = 0;
        const all: Row[] = [];
        while (true) {
          const { data, error } = await dw
            .from("sv_ecarteira_lovable")
            .select("CDREGUSR,VIGENCIA_BENEFICIARIO,ULTIMA_REATIVACAO,ULTIMO_CANCELAMENTO")
            .order("CDREGUSR", { ascending: true })
            .range(from, from + pageSize - 1);

          if (abort) return;
          if (error) throw error;
          if (!data || data.length === 0) break;
          all.push(...(data as Row[]));
          setProgress(all.length);
          if (data.length < pageSize) break;
          from += pageSize;
        }
        if (!abort) {
          setRows(all);
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
  }, []);

  const fmtInt = (n: number) => n.toLocaleString("pt-BR");
  const fmtDate = (s: string | null) => {
    if (!s) return "";
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
  };

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-foreground">Beneficiários</h2>
        <p className="text-xs text-muted-foreground">
          Fonte: <code>sv_ecarteira_lovable</code> · Data de referência (input): {dateValue || "—"} · Total: {fmtInt(rows.length)}

        </p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando… {fmtInt(progress)}
        </div>
      ) : error ? (
        <div className="text-destructive text-sm">Erro: {error}</div>
      ) : (
        <div className="flex-1 overflow-auto border border-border rounded-md">
          <table className="w-full text-xs tabular-nums">
            <thead className="bg-muted sticky top-0">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">CDREGUSR</th>
                <th className="px-3 py-2 font-medium">VIGENCIA_BENEFICIARIO</th>
                <th className="px-3 py-2 font-medium">ULTIMA_REATIVACAO</th>
                <th className="px-3 py-2 font-medium">ULTIMO_CANCELAMENTO</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border hover:bg-muted/50">
                  <td className="px-3 py-1">{r.CDREGUSR ?? ""}</td>
                  <td className="px-3 py-1">{fmtDate(r.VIGENCIA_BENEFICIARIO)}</td>
                  <td className="px-3 py-1">{fmtDate(r.ULTIMA_REATIVACAO)}</td>
                  <td className="px-3 py-1">{fmtDate(r.ULTIMO_CANCELAMENTO)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default AtivosEm;
