import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { ContabRow, fmtBR } from "./types";

type SortKey =
  | "cd_contabil" | "ds_conta" | "tp_conta"
  | "vl_saldo_inicial" | "vl_debito" | "vl_credito" | "vl_movimento" | "vl_saldo_final";

const PAGE = 100;

export default function Balancete({ rows }: { rows: ContabRow[] }) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("cd_contabil");
  const [asc, setAsc] = useState(true);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = t
      ? rows.filter(
          (r) =>
            r.cd_contabil?.toLowerCase().includes(t) ||
            r.ds_conta?.toLowerCase().includes(t)
        )
      : rows;
    const sorted = [...base].sort((a, b) => {
      const va = a[sortKey] as any;
      const vb = b[sortKey] as any;
      if (typeof va === "number" && typeof vb === "number") return asc ? va - vb : vb - va;
      return asc
        ? String(va ?? "").localeCompare(String(vb ?? ""))
        : String(vb ?? "").localeCompare(String(va ?? ""));
    });
    return sorted;
  }, [rows, q, sortKey, asc]);

  const total = filtered.length;
  const pageRows = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE));

  const th = (label: string, k: SortKey, align: "left" | "right" = "left") => (
    <th
      className={`px-3 py-2 text-xs font-medium text-muted-foreground ${
        align === "right" ? "text-right" : "text-left"
      } cursor-pointer select-none`}
      onClick={() => {
        if (sortKey === k) setAsc((v) => !v);
        else { setSortKey(k); setAsc(true); }
        setPage(0);
      }}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === k && (asc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </span>
    </th>
  );

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm flex flex-col overflow-hidden">
      <div className="p-3 border-b border-border flex items-center justify-between gap-3">
        <div className="relative">
          <Search className="h-4 w-4 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            placeholder="Buscar por conta ou descrição…"
            className="h-9 w-80 pl-8 pr-3 rounded-md border border-border bg-background text-sm"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {total.toLocaleString("pt-BR")} lançamentos
        </div>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 sticky top-0">
            <tr>
              {th("Conta", "cd_contabil")}
              {th("Descrição", "ds_conta")}
              {th("Tipo", "tp_conta")}
              {th("Saldo Inicial", "vl_saldo_inicial", "right")}
              {th("Débito", "vl_debito", "right")}
              {th("Crédito", "vl_credito", "right")}
              {th("Movimento", "vl_movimento", "right")}
              {th("Saldo Final", "vl_saldo_final", "right")}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => (
              <tr key={`${r.cd_contabil}-${i}`} className="border-t border-border/60 hover:bg-accent/30">
                <td className="px-3 py-1.5 font-mono text-xs">{r.cd_contabil}</td>
                <td className="px-3 py-1.5">{r.ds_conta}</td>
                <td className="px-3 py-1.5">{r.tp_conta}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmtBR(r.vl_saldo_inicial)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmtBR(r.vl_debito)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmtBR(r.vl_credito)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmtBR(r.vl_movimento)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmtBR(r.vl_saldo_final)}</td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={8} className="text-center text-muted-foreground py-8">Sem dados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-2 border-t border-border flex items-center justify-end gap-2 text-xs">
        <button
          className="h-7 px-2 rounded border border-border disabled:opacity-40"
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          ‹
        </button>
        <span>{page + 1} / {totalPages}</span>
        <button
          className="h-7 px-2 rounded border border-border disabled:opacity-40"
          disabled={page + 1 >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          ›
        </button>
      </div>
    </section>
  );
}
