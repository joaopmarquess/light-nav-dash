import { useEffect, useState } from "react";
import { odo, type OdoPagamento } from "@/lib/odoClient";
import { FileText, Globe2 } from "lucide-react";

const brl = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const brDate = (iso: string | null) => {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export default function OdoRelatorios() {
  const [mes, setMes] = useState<string>(new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState<OdoPagamento[]>([]);
  useEffect(() => {
    (async () => {
      const start = `${mes}-01`;
      const [y, m] = mes.split("-").map(Number);
      const endDate = new Date(y, m, 0);
      const end = endDate.toISOString().slice(0, 10);
      const { data } = await odo
        .from("odo_fornecedor")
        .select("*")
        .gte("vencimento", start)
        .lte("vencimento", end)
        .order("vencimento");
      setRows((data as OdoPagamento[]) ?? []);
    })();
  }, [mes]);

  const openReport = (tipo: "lista" | "global") => {
    const url =
      tipo === "global"
        ? `/odo-relatorio?tipo=global&mes=${mes}`
        : `/odo-relatorio?tipo=lista&mes=${mes}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm h-[calc(100vh-9rem)] flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Relatórios</h2>
          <p className="text-xs text-muted-foreground">
            Emita o relatório por lista (todos do mês) ou o global consolidado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm"
          />
          <button
            onClick={() => openReport("lista")}
            className="h-9 px-4 rounded-md border border-border text-sm font-medium flex items-center gap-2 hover:bg-accent"
          >
            <FileText className="h-4 w-4" /> Por lista
          </button>
          <button
            onClick={() => openReport("global")}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90"
          >
            <Globe2 className="h-4 w-4" /> Global do mês
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <p className="text-sm text-muted-foreground mb-3">
          Pré-visualização — {rows.length} lançamento(s) em {mes}
        </p>
        <table className="w-full text-sm border border-border rounded-md overflow-hidden">
          <thead className="bg-muted/60">
            <tr>
              <th className="text-left px-3 py-2">Vencimento</th>
              <th className="text-left px-3 py-2">Fornecedor</th>
              <th className="text-left px-3 py-2">Objeto</th>
              <th className="text-right px-3 py-2">Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-1.5">{brDate(r.vencimento)}</td>
                <td className="px-3 py-1.5">{r.fornecedor}</td>
                <td className="px-3 py-1.5">{r.objeto}</td>
                <td className="px-3 py-1.5 text-right">{brl(r.vl_bruto)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground text-xs">
                  Nenhum lançamento no mês.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
