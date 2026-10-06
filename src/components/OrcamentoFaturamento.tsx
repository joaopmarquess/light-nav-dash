import { useState } from "react";
import { RotateCcw } from "lucide-react";

type Linha = { id: string; anteriores: number; entradas: number; saidas: number; ticket: number };
type Campo = "anteriores" | "entradas" | "saidas" | "ticket";
const BASE: Linha[] = [
  { id: "PIF", anteriores: 50000, entradas: 0, saidas: 0, ticket: 520 },
  { id: "PCA", anteriores: 30000, entradas: 0, saidas: 0, ticket: 230 },
  { id: "PCE", anteriores: 4000, entradas: 0, saidas: 0, ticket: 210 },
];

const n0 = (v: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(v);
const n2 = (v: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const OrcamentoFaturamento = () => {
  const [rows, setRows] = useState<Linha[]>(BASE);
  const set = (i: number, k: Campo, v: string) =>
    setRows((p) => p.map((r, j) => (j === i ? { ...r, [k]: Number(v.replace(",", ".")) || 0 } : r)));

  const futuras = (r: Linha) => r.anteriores + r.entradas - r.saidas;
  const fat = (r: Linha) => futuras(r) * r.ticket * 12;
  const sum = (f: (r: Linha) => number) => rows.reduce((s, r) => s + f(r), 0);
  const totFut = sum(futuras);
  const totFat = sum(fat);
  const totTicket = totFut ? totFat / 12 / totFut : 0;

  const inp = "w-28 rounded border border-border px-2 py-1 text-right tabular-nums font-semibold";
  const yel = `${inp} bg-yellow-100/60`;

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Orçamento — Faturamento (anual)</h3>
        <button
          onClick={() => setRows(BASE)}
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
        >
          <RotateCcw className="h-4 w-4" /> Restaurar
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Grupo</th>
              <th className="text-left px-3 py-2">ID1</th>
              <th className="text-right px-3 py-2">Vidas Anteriores</th>
              <th className="text-right px-3 py-2">Entradas</th>
              <th className="text-right px-3 py-2">Saídas</th>
              <th className="text-right px-3 py-2">Vidas Futuras</th>
              <th className="text-right px-3 py-2">Ticket</th>
              <th className="text-right px-3 py-2">Faturamento</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-1.5">FATURAMENTO</td>
                <td className="px-3 py-1.5">{r.id}</td>
                {(["anteriores", "entradas", "saidas"] as Campo[]).map((k) => (
                  <td key={k} className="px-3 py-1.5 text-right">
                    <input type="number" className={yel} value={r[k]} onChange={(e) => set(i, k, e.target.value)} />
                  </td>
                ))}
                <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{n0(futuras(r))}</td>
                <td className="px-3 py-1.5 text-right">
                  <input type="number" step="0.01" className={`${inp} bg-orange-100/60`} value={r.ticket} onChange={(e) => set(i, "ticket", e.target.value)} />
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">{n2(fat(r))}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-border bg-muted/60 font-semibold">
              <td className="px-3 py-2">FATURAMENTO</td>
              <td className="px-3 py-2">TOTAL</td>
              <td className="px-3 py-2 text-right tabular-nums">{n0(sum((r) => r.anteriores))}</td>
              <td className="px-3 py-2 text-right tabular-nums">{n0(sum((r) => r.entradas))}</td>
              <td className="px-3 py-2 text-right tabular-nums">{n0(sum((r) => r.saidas))}</td>
              <td className="px-3 py-2 text-right tabular-nums">{n0(totFut)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{n2(totTicket)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{n2(totFat)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Vidas Futuras = Vidas Anteriores + Entradas − Saídas. Faturamento = Vidas Futuras × Ticket × 12. Ticket total =
        Faturamento total ÷ 12 ÷ Vidas Futuras totais.
      </p>
    </section>
  );
};

export default OrcamentoFaturamento;
