import { useEffect, useState } from "react";
import { dw } from "@/lib/dwClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const OrcamentoDW = () => {
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error, count } = await dw
        .from("icontabil_orcamento")
        .select("*", { count: "exact" })
        .limit(100);
      if (error) {
        setError(error.message);
        return;
      }
      setRows(data ?? []);
      setCount(count ?? null);
    })();
  }, []);

  if (error) {
    return (
      <section className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="text-sm font-semibold text-rose-600">Erro ao ler icontabil_orcamento</h3>
        <pre className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">{error}</pre>
      </section>
    );
  }

  if (!rows) {
    return (
      <section className="bg-card rounded-xl border border-border shadow-sm p-6 text-sm text-muted-foreground">
        Carregando…
      </section>
    );
  }

  if (rows.length === 0) {
    return (
      <section className="bg-card rounded-xl border border-border shadow-sm p-6 text-sm text-muted-foreground">
        Sem registros retornados (verifique RLS/policy de SELECT para anon).
      </section>
    );
  }

  const cols = Object.keys(rows[0]);

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-semibold text-foreground">icontabil_orcamento</h3>
        <span className="text-xs text-muted-foreground">
          {rows.length} de {count ?? "?"} linhas
        </span>
      </div>
      <div className="max-h-[calc(100vh-14rem)] overflow-auto rounded-md border border-border">
        <Table>
          <TableHeader className="sticky top-0 bg-muted">
            <TableRow>
              {cols.map((c) => (
                <TableHead key={c} className="whitespace-nowrap">{c}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                {cols.map((c) => (
                  <TableCell key={c} className="whitespace-nowrap text-xs">
                    {r[c] === null || r[c] === undefined ? "" : String(r[c])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
};

export default OrcamentoDW;
