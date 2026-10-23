import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CalendarRange, Loader2, RefreshCw } from "lucide-react";
import { dw } from "@/lib/dwClient";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function SinistralidadePeriodosMV() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [count, setCount] = useState<number | null>(null);

  const carregar = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    setRows([]);
    try {
      let query = dw.from("view_eard_mensal").select("*", { count: "exact" }).limit(100);
      if (signal) query = query.abortSignal(signal);
      const result = await query;
      if (signal?.aborted) return;
      if (result.error) {
        const unavailable = ["PGRST205", "42P01"].includes(result.error.code);
        setError(unavailable
          ? "A fonte view_eard_mensal ainda não foi encontrada na conexão atual. Os indicadores por período aguardam o acesso a essa visão."
          : "Não foi possível consultar view_eard_mensal. Tente novamente após verificar sua disponibilidade e a permissão de leitura.");
        return;
      }
      setRows((result.data ?? []) as Record<string, unknown>[]);
      setCount(result.count);
    } catch {
      if (!signal?.aborted) setError("Não foi possível acessar a fonte mensal. Tente novamente.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void carregar(controller.signal);
    return () => controller.abort();
  }, [carregar]);

  const columns = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <section className="flex h-full min-h-0 flex-col gap-6" aria-labelledby="sin-periodos-title">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="sin-periodos-title" className="flex items-center gap-2 text-2xl font-semibold text-foreground"><CalendarRange className="h-6 w-6 text-primary" />Períodos</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sinistralidade · Fonte: view_eard_mensal</p>
        </div>
        <Button variant="outline" disabled={loading} onClick={() => void carregar()}><RefreshCw className={loading ? "animate-spin" : ""} />Atualizar</Button>
      </header>

      {loading ? (
        <div role="status" className="flex items-center gap-3 border-y border-border py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />Consultando períodos…</div>
      ) : error ? (
        <div role="alert" className="flex items-start gap-3 border-y border-border py-6 text-foreground"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" /><div><h3 className="font-semibold">Fonte mensal indisponível</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{error}</p></div></div>
      ) : rows.length === 0 ? (
        <p className="border-y border-border py-8 text-sm text-muted-foreground">Nenhum registro mensal disponível.</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <p className="text-sm text-muted-foreground">Prévia da fonte mensal · {rows.length} de {count ?? "—"} registros. Indicadores por período aguardam validação das colunas da fonte.</p>
          <div className="min-h-0 overflow-auto rounded-md border border-border">
            <Table><TableHeader><TableRow>{columns.map(column => <TableHead key={column} className="whitespace-nowrap">{column}</TableHead>)}</TableRow></TableHeader>
              <TableBody>{rows.map((row, index) => <TableRow key={index}>{columns.map(column => <TableCell key={column} className="whitespace-nowrap">{row[column] == null ? "—" : typeof row[column] === "object" ? JSON.stringify(row[column]) : String(row[column])}</TableCell>)}</TableRow>)}</TableBody>
            </Table>
          </div>
        </div>
      )}
    </section>
  );
}