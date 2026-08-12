import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { hostinger } from "@/lib/hostingerClient";

interface Props {
  dateValue?: string;
}

const toISO = (s: string): string | null => {
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
};

type CityRow = { cidade: string; uf: string; vidas: number };

const DEFAULT_REF = "2026-08-12";

const AtivosCidade = ({ dateValue }: Props) => {
  const [ref, setRef] = useState<string>(() => toISO(dateValue ?? "") ?? DEFAULT_REF);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CityRow[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!ref) return;
    let abort = false;
    (async () => {
      setLoading(true);
      setError(null);
      setRows([]);
      try {
        // chave -> set de vidas distintas
        const byCity = new Map<string, { cidade: string; uf: string; vidas: Set<string> }>();

        const pageSize = 1000;
        let from = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data, error } = await hostinger
            .from("carteira_beneficiario")
            .select('"CIDADE_OFICIAL","UF_CIDADE_OFICIAL","CDREGUSR","NOME_BENEFICIARIO"')
            .lte("primeira_vigencia", ref)
            .or(`ultimo_cancelamento.is.null,ultimo_cancelamento.gt.${ref}`)
            .order("CDREGUSR", { ascending: true })
            .range(from, from + pageSize - 1);
          if (error) throw error;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const chunk = (data ?? []) as any[];
          for (const r of chunk) {
            const cidade = String(r.CIDADE_OFICIAL ?? "").trim() || "(sem cidade)";
            const uf = String(r.UF_CIDADE_OFICIAL ?? "").trim().toUpperCase();
            const key = `${uf}|${cidade}`;
            const vida = String(r.CDREGUSR ?? r.NOME_BENEFICIARIO ?? "").trim();
            if (!byCity.has(key)) byCity.set(key, { cidade, uf, vidas: new Set() });
            if (vida) byCity.get(key)!.vidas.add(vida);
          }
          if (chunk.length < pageSize) break;
          from += pageSize;
        }
        if (abort) return;

        setRows(
          Array.from(byCity.values())
            .map((c) => ({ cidade: c.cidade, uf: c.uf, vidas: c.vidas.size }))
            .sort((a, b) => b.vidas - a.vidas),
        );
        setLoading(false);
      } catch (e: unknown) {
        if (!abort) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      }
    })();
    return () => {
      abort = true;
    };
  }, [ref]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(
      (r) => r.cidade.toLowerCase().includes(t) || r.uf.toLowerCase().includes(t),
    );
  }, [rows, q]);

  const total = useMemo(() => filtered.reduce((s, r) => s + r.vidas, 0), [filtered]);
  const max = Math.max(1, ...filtered.map((r) => r.vidas));
  const fmtInt = (n: number) => n.toLocaleString("pt-BR");

  const exportCsv = () => {
    const esc = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const lines = [
      "Cidade;UF;Vidas",
      ...filtered.map((r) => [esc(r.cidade), esc(r.uf), String(r.vidas)].join(";")),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ativos_por_cidade_${ref}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col min-h-0">
      <div className="flex items-center justify-between gap-3 p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <span>Ativos em</span>
          <input
            type="date"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            className="h-9 px-2 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          ·{" "}
          <span className="font-semibold tabular-nums">{fmtInt(total)}</span> vidas ·{" "}
          <span className="tabular-nums">{fmtInt(filtered.length)}</span> cidade(s)
        </div>
        <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={exportCsv}
          disabled={loading || filtered.length === 0}
          className="h-9 px-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-background text-sm text-foreground hover:bg-accent disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Exportar CSV
        </button>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtrar cidade ou UF"
            className="h-9 w-56 pl-8 pr-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando…
          </div>
        ) : error ? (
          <div className="p-4 text-destructive text-sm">Erro: {error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Sem dados.</div>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-card border-b border-border">
              <tr className="text-muted-foreground">
                <th className="text-left font-medium px-4 py-2 w-10">#</th>
                <th className="text-left font-medium px-4 py-2">Cidade</th>
                <th className="text-left font-medium px-2 py-2 w-16">UF</th>
                <th className="text-right font-medium px-4 py-2 w-28">Vidas</th>
                <th className="text-right font-medium px-4 py-2 w-24">%</th>
                <th className="px-4 py-2 w-40"> </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const share = total > 0 ? (r.vidas / total) * 100 : 0;
                return (
                  <tr key={`${r.uf}|${r.cidade}`} className="border-b border-border/60 hover:bg-accent/40">
                    <td className="px-4 py-1.5 text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="px-4 py-1.5 text-foreground whitespace-nowrap">{r.cidade}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{r.uf}</td>
                    <td className="px-4 py-1.5 text-right font-semibold text-foreground tabular-nums">
                      {fmtInt(r.vidas)}
                    </td>
                    <td className="px-4 py-1.5 text-right text-muted-foreground tabular-nums">
                      {share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                    </td>
                    <td className="px-4 py-1.5">
                      <div className="h-2 rounded-full bg-accent overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${(r.vidas / max) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 bg-card border-t border-border">
              <tr>
                <td className="px-4 py-2" />
                <td className="px-4 py-2 font-semibold text-foreground" colSpan={2}>
                  Total
                </td>
                <td className="px-4 py-2 text-right font-semibold text-foreground tabular-nums">
                  {fmtInt(total)}
                </td>
                <td className="px-4 py-2 text-right text-muted-foreground">100%</td>
                <td className="px-4 py-2" />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </section>
  );
};

export default AtivosCidade;
