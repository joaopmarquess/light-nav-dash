import { useEffect, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { Search } from "lucide-react";

type Mode = "empresa" | "beneficiario";

interface Props {
  mode: Mode;
}

export default function SinistralidadeNova({ mode: _mode }: Props) {
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState<string>("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data, error } = await hostinger
        .from("Sinistralidade")
        .select("PERIODO");
      if (!alive) return;
      if (error) {
        console.error("PERIODO load error", error);
        setPeriodos([]);
      } else {
        const uniq = Array.from(
          new Set(
            ((data ?? []) as any[])
              .map((r) => String(r.PERIODO ?? ""))
              .filter(Boolean),
          ),
        );
        uniq.sort().reverse();
        setPeriodos(uniq);
        setPeriodo(uniq[0] ?? "");
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] p-4 flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Período</label>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            disabled={loading}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
          >
            {loading && <option>Carregando...</option>}
            {!loading && periodos.length === 0 && <option value="">—</option>}
            {periodos.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou código"
            className="h-9 w-72 pl-8 pr-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Grid ainda não configurado.
      </div>
    </section>
  );
}
