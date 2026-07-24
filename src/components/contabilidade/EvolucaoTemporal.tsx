import { useMemo, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { ContabRow, fmtBR, MESES } from "./types";

type Granularity = "mes" | "trimestre" | "ano";

export default function EvolucaoTemporal({ rows }: { rows: ContabRow[] }) {
  const [gran, setGran] = useState<Granularity>("mes");

  const series = useMemo(() => {
    if (gran === "mes") {
      const map = new Map<string, { label: string; ord: number; realizado: number; debito: number; credito: number }>();
      for (const r of rows) {
        const key = `${r.nr_ano}-${String(r.nr_mes).padStart(2, "0")}`;
        const cur = map.get(key) ?? { label: `${MESES[r.nr_mes - 1]}/${String(r.nr_ano).slice(2)}`, ord: r.nr_ano * 100 + r.nr_mes, realizado: 0, debito: 0, credito: 0 };
        cur.realizado += Number(r.REALIZADO) || 0;
        cur.debito += Number(r.vl_debito) || 0;
        cur.credito += Number(r.vl_credito) || 0;
        map.set(key, cur);
      }
      return [...map.values()].sort((a, b) => a.ord - b.ord);
    }
    if (gran === "trimestre") {
      const map = new Map<string, { label: string; ord: number; realizado: number; debito: number; credito: number }>();
      for (const r of rows) {
        const key = `${r.nr_ano}-T${r.nr_trimestre}`;
        const cur = map.get(key) ?? { label: `${r.nr_ano} T${r.nr_trimestre}`, ord: r.nr_ano * 10 + r.nr_trimestre, realizado: 0, debito: 0, credito: 0 };
        cur.realizado += Number(r.REALIZADO) || 0;
        cur.debito += Number(r.vl_debito) || 0;
        cur.credito += Number(r.vl_credito) || 0;
        map.set(key, cur);
      }
      return [...map.values()].sort((a, b) => a.ord - b.ord);
    }
    const map = new Map<number, { label: string; ord: number; realizado: number; debito: number; credito: number }>();
    for (const r of rows) {
      const cur = map.get(r.nr_ano) ?? { label: String(r.nr_ano), ord: r.nr_ano, realizado: 0, debito: 0, credito: 0 };
      cur.realizado += Number(r.REALIZADO) || 0;
      cur.debito += Number(r.vl_debito) || 0;
      cur.credito += Number(r.vl_credito) || 0;
      map.set(r.nr_ano, cur);
    }
    return [...map.values()].sort((a, b) => a.ord - b.ord);
  }, [rows, gran]);

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
        <div className="text-sm font-medium mb-2">Realizado</div>
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
        <div className="text-sm font-medium mb-2">Débito × Crédito</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
              <Tooltip formatter={(v: number) => fmtBR(v)} />
              <Legend />
              <Bar dataKey="debito" name="Débito" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="credito" name="Crédito" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
