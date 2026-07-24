import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { ContabRow, fmtBR, MESES } from "./types";
import { stripPrefix } from "./groupings";

type Granularity = "mes" | "trimestre" | "ano";

export default function EvolucaoTemporal({ rows }: { rows: ContabRow[] }) {
  const [gran, setGran] = useState<Granularity>("mes");

  const { series, g1Keys } = useMemo(() => {
    const keyOf = (r: ContabRow) => {
      if (gran === "mes") return { label: `${MESES[r.nr_mes - 1]}/${String(r.nr_ano).slice(2)}`, ord: r.nr_ano * 100 + r.nr_mes };
      if (gran === "trimestre") return { label: `${r.nr_ano} T${r.nr_trimestre}`, ord: r.nr_ano * 10 + r.nr_trimestre };
      return { label: String(r.nr_ano), ord: r.nr_ano };
    };
    const g1Set = new Set<string>();
    const map = new Map<string, any>();
    for (const r of rows) {
      const { label, ord } = keyOf(r);
      const g1 = stripPrefix(r.G1) || "—";
      g1Set.add(g1);
      const cur = map.get(label) ?? { label, ord, realizado: 0 };
      const v = Number(r.REALIZADO) || 0;
      cur.realizado += v;
      cur[g1] = (cur[g1] || 0) + v;
      map.set(label, cur);
    }
    return {
      series: [...map.values()].sort((a, b) => a.ord - b.ord),
      g1Keys: [...g1Set],
    };
  }, [rows, gran]);

  const palette = [
    "hsl(var(--primary))",
    "hsl(var(--destructive))",
    "hsl(var(--muted-foreground))",
    "#0ea5e9",
    "#22c55e",
    "#eab308",
    "#a855f7",
    "#f97316",
  ];

  return (
    <section className="space-y-4">
      <div className="flex gap-2">
        {(["mes", "trimestre", "ano"] as Granularity[]).map((g) => (
          <button
            key={g}
            onClick={() => setGran(g)}
            className={`h-8 px-3 rounded-md border text-xs capitalize ${
              gran === g
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-foreground hover:bg-accent"
            }`}
          >
            {g === "mes" ? "Mês" : g === "trimestre" ? "Trimestre" : "Ano"}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <div className="text-sm font-medium mb-2">Realizado (total)</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
              <Tooltip formatter={(v: number) => fmtBR(v)} />
              <Line type="monotone" dataKey="realizado" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <div className="text-sm font-medium mb-2">Realizado por G1</div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
              <Tooltip formatter={(v: number) => fmtBR(v)} />
              <Legend />
              {g1Keys.map((k, i) => (
                <Line key={k} type="monotone" dataKey={k} stroke={palette[i % palette.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
