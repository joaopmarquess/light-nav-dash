import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search } from "lucide-react";

const fmt = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") {
    if (Number.isInteger(v)) return v.toLocaleString("pt-BR");
    return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  return String(v);
};

const SinistralidadeConsulta = () => {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await (supabase as any)
        .from("vw_sinistralidade")
        .select("*")
        .limit(5000);
      if (cancel) return;
      if (error) setError(error.message);
      else setRows((data as Record<string, unknown>[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const cols = useMemo(() => (rows[0] ? Object.keys(rows[0]) : []), [rows]);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const s = q.toLowerCase();
    return rows.filter((r) =>
      cols.some((c) => String(r[c] ?? "").toLowerCase().includes(s)),
    );
  }, [rows, cols, q]);

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <div className="text-sm text-muted-foreground">
          {loading ? "Carregando..." : `${filtered.length.toLocaleString("pt-BR")} registro(s)`}
        </div>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtrar..."
            className="h-9 w-64 pl-8 pr-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-destructive">Erro: {error}</div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Sem dados.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card border-b border-border">
              <tr>
                {cols.map((c) => (
                  <th
                    key={c}
                    className="text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i} className="border-b border-border/60 hover:bg-accent/40">
                  {cols.map((c) => (
                    <td key={c} className="px-3 py-1.5 whitespace-nowrap">
                      {fmt(r[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

export default SinistralidadeConsulta;
