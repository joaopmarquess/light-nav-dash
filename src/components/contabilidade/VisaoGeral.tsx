import { useMemo } from "react";
import { ContabRow, fmtBR } from "./types";
import { stripPrefix } from "./groupings";

const sumRealizado = (rows: ContabRow[]) =>
  rows.reduce((a, r) => a + (Number(r.REALIZADO) || 0), 0);

function Card({ label, value, hint, negative }: { label: string; value: string; hint?: string; negative?: boolean }) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${negative ? "text-destructive" : "text-foreground"}`}>{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export default function VisaoGeral({ rows }: { rows: ContabRow[] }) {
  const stats = useMemo(() => {
    const realizado = sumRealizado(rows);
    const contas = new Set(rows.map((r) => r.cd_contabil)).size;
    const lancamentos = rows.length;

    const g1Map = new Map<string, number>();
    for (const r of rows) {
      const k = stripPrefix(r.G1) || "—";
      g1Map.set(k, (g1Map.get(k) || 0) + (Number(r.REALIZADO) || 0));
    }
    const porG1 = [...g1Map.entries()]
      .map(([label, v]) => ({ label, v }))
      .sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
    return { realizado, contas, lancamentos, porG1 };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card label="Resultado do Período (Realizado)" value={fmtBR(stats.realizado)} negative={stats.realizado < 0} />
        <Card label="Contas Distintas" value={stats.contas.toLocaleString("pt-BR")} />
        <Card label="Lançamentos" value={stats.lancamentos.toLocaleString("pt-BR")} />
      </div>

      <section className="bg-card rounded-xl border border-border shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Realizado por G1</h2>
          <p className="text-xs text-muted-foreground">Mesmo agrupamento e filtro (N2 31–49, 61) usado na DRE.</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-6 py-2">G1</th>
              <th className="text-right font-medium px-6 py-2">Realizado</th>
            </tr>
          </thead>
          <tbody>
            {stats.porG1.map((r) => (
              <tr key={r.label} className="border-t border-border/60">
                <td className="px-6 py-1.5">{r.label}</td>
                <td className={`px-6 py-1.5 text-right tabular-nums ${r.v < 0 ? "text-destructive" : ""}`}>{fmtBR(r.v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
