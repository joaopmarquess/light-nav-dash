import { useEffect, useState } from "react";
import { odo, type OdoLog } from "@/lib/odoClient";
import { Loader2 } from "lucide-react";

export default function OdoAcoes() {
  const [rows, setRows] = useState<OdoLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await odo
        .from("odo_log")
        .select("*")
        .order("momento", { ascending: false })
        .limit(1000);
      setRows((data as OdoLog[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) =>
    filter
      ? [r.protocolo, r.operador, r.acao, r.descricao]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(filter.toLowerCase()))
      : true,
  );

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Ações / Log</h2>
          <p className="text-xs text-muted-foreground">{filtered.length} registro(s)</p>
        </div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar por protocolo, operador, ação…"
          className="h-9 w-80 px-3 rounded-md border border-border bg-background text-sm"
        />
      </div>
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Nenhuma ação registrada.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/60 backdrop-blur text-foreground/70">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Momento</th>
                <th className="text-left px-4 py-2 font-medium">Protocolo</th>
                <th className="text-left px-4 py-2 font-medium">Ação</th>
                <th className="text-left px-4 py-2 font-medium">Operador</th>
                <th className="text-left px-4 py-2 font-medium">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-accent/40">
                  <td className="px-4 py-2">{r.momento?.slice(0, 19).replace("T", " ")}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.protocolo}</td>
                  <td className="px-4 py-2">{r.acao}</td>
                  <td className="px-4 py-2">{r.operador}</td>
                  <td className="px-4 py-2">{r.descricao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
