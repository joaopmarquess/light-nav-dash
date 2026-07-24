import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ContabRow, fmtBR } from "./types";

const GROUPS: { key: keyof ContabRow; label: string }[] = [
  { key: "G1", label: "G1" },
  { key: "G2", label: "G2" },
  { key: "G3", label: "G3" },
  { key: "G4", label: "G4" },
  { key: "O1", label: "O1" },
];

function splitLabel(v: string | null): string {
  if (!v || v === "-" || v === "0") return "—";
  const i = v.indexOf("|");
  return i < 0 ? v : v.slice(i + 1);
}

export default function AnalisesGerenciais({ rows }: { rows: ContabRow[] }) {
  const [dim, setDim] = useState<keyof ContabRow>("G1");

  const data = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const key = splitLabel(r[dim] as string | null);
      map.set(key, (map.get(key) || 0) + (Number(r.REALIZADO) || 0));
    }
    return [...map.entries()]
      .map(([label, realizado]) => ({ label, realizado }))
      .sort((a, b) => Math.abs(b.realizado) - Math.abs(a.realizado));
  }, [rows, dim]);

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {GROUPS.map((g) => (
            <button
              key={g.key as string}
              onClick={() => setDim(g.key)}
              className={`h-8 px-3 rounded-md border text-xs ${
                dim === g.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-foreground hover:bg-accent"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">{data.length} grupos</div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.slice(0, 20)}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
            <Tooltip formatter={(v: number) => fmtBR(v)} />
            <Bar dataKey="realizado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="overflow-auto max-h-64">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{String(dim)}</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Realizado</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-t border-border/60">
                <td className="px-3 py-1.5">{d.label}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmtBR(d.realizado)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
