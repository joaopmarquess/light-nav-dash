import { useState } from "react";
import { RotateCcw } from "lucide-react";

const parseBR = (v: string) => Number(v.replace(/\./g, "").replace(",", ".")) || 0;

const NumInput = ({ value, dec, className, onChange }: { value: number; dec: number; className: string; onChange: (v: number) => void }) => {
  const [edit, setEdit] = useState<string | null>(null);
  const shown = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(value);
  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      value={edit ?? shown}
      onFocus={() => setEdit(shown)}
      onChange={(e) => { setEdit(e.target.value); onChange(parseBR(e.target.value)); }}
      onBlur={() => setEdit(null)}
    />
  );
};

type Linha = { id: string; vidas: number; ticket: number; entradas: number; saidas: number };
type Campo = "vidas" | "ticket" | "entradas" | "saidas";
const BASE: Linha[] = [
  { id: "PIF", vidas: 36025, ticket: 595.89, entradas: 50, saidas: 450 },
  { id: "PCA", vidas: 25351, ticket: 323.27, entradas: 1000, saidas: 50 },
  { id: "PCE", vidas: 9881, ticket: 277.68, entradas: 500, saidas: 50 },
];

const n0 = (v: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(v);
const n2 = (v: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const ABAS = ["Faturamento", "Despesas Assistenciais", "Demais Operacionais", "Despesas Administrativas", "Financeiro", "Impostos Federais", "DRE"];

const OrcamentoFaturamento = () => {
  const [rows, setRows] = useState<Linha[]>(BASE);
  const [aba, setAba] = useState("Faturamento");
  const set = (i: number, k: Campo, v: number) =>
    setRows((p) => p.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  const mensal26 = (r: Linha) => r.vidas * r.ticket;
  const cresc = (r: Linha) => (r.entradas - r.saidas) * 12;
  const vidas27 = (r: Linha) => r.vidas + cresc(r);
  // média de jan/27 a dez/27 (vidas crescem mês a mês)
  const mensal27 = (r: Linha) => (r.vidas + 6.5 * (r.entradas - r.saidas)) * r.ticket;
  const sum = (f: (r: Linha) => number) => rows.reduce((s, r) => s + f(r), 0);

  const tV26 = sum((r) => r.vidas), tM26 = sum(mensal26);
  const tV27 = sum(vidas27), tM27 = sum(mensal27);

  const inp = "w-24 rounded border border-border px-2 py-1 text-right tabular-nums font-semibold bg-yellow-100/60";
  const td = "px-2 py-0.5 text-right tabular-nums whitespace-nowrap";
  const tot = (v: string) => <span className="inline-block w-24 px-2 text-right">{v}</span>;

  const MESES = ["2026", ...["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"].map((m) => `${m}/27`)];
  const mesVal = (r: Linha, k: number) => (r.vidas + k * (r.entradas - r.saidas)) * r.ticket;
  const totLinha = (r: Linha) => MESES.slice(1).reduce((s, _, j) => s + mesVal(r, j + 1), 0);

  return (
    <div className="space-y-4">
    <section className="bg-card rounded-xl border border-border shadow-sm p-2 space-y-1">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold cursor-help" title="Mensal 2026 = Vidas × Ticket; Anual = Mensal × 12. Mensal 2027 = média mensal de jan/27 a dez/27; Anual 2027 = Total 2027. Crescimento = (Entradas − Saídas) × 12. Vidas 2027 = Vidas 2026 + Crescimento. Ticket 2027 = Ticket 2026. Ticket total = Mensal total ÷ Vidas totais.">Orçamento — Faturamento 2026 × 2027</h3>
        <button
          onClick={() => setRows(BASE)}
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-0 text-sm hover:bg-muted"
        >
          <RotateCcw className="h-4 w-4" /> Restaurar
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th />
              <th colSpan={4} className="text-center px-2 py-0 border-l border-border">2026</th>
              <th colSpan={7} className="text-center px-2 py-0 border-l border-border">2027</th>
            </tr>
            <tr>
              <th className="text-left px-2 py-0.5">Planos</th>
              <th className="text-center px-2 py-0.5 border-l border-border">Vidas</th>
              <th className="text-center px-2 py-0.5">Ticket Méd.</th>
              <th className="text-right px-2 py-0.5">Mensal</th>
              <th className="text-right px-2 py-0.5">Anual</th>
              <th className="text-center px-2 py-0.5 border-l border-border">Entradas</th>
              <th className="text-center px-2 py-0.5">Saídas</th>
              <th className="text-right px-2 py-0.5">Crescimento</th>
              <th className="text-right px-2 py-0.5">Vidas</th>
              <th className="text-right px-2 py-0.5">Ticket Méd.</th>
              <th className="text-right px-2 py-0.5">Mensal</th>
              <th className="text-right px-2 py-0.5">Anual</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-2 py-0 font-medium">{r.id}</td>
                <td className="px-2 py-0 text-center border-l border-border"><NumInput dec={0} className={inp} value={r.vidas} onChange={(v) => set(i, "vidas", v)} /></td>
                <td className="px-2 py-0 text-center"><NumInput dec={2} className={inp} value={r.ticket} onChange={(v) => set(i, "ticket", v)} /></td>
                <td className={td}>{n2(mensal26(r))}</td>
                <td className={td}>{n2(mensal26(r) * 12)}</td>
                <td className="px-2 py-0 text-center border-l border-border"><NumInput dec={0} className={inp} value={r.entradas} onChange={(v) => set(i, "entradas", v)} /></td>
                <td className="px-2 py-0 text-center"><NumInput dec={0} className={inp} value={r.saidas} onChange={(v) => set(i, "saidas", v)} /></td>
                <td className={td}>{n0(cresc(r))}</td>
                <td className={td}>{n0(vidas27(r))}</td>
                <td className={td}>{n2(r.ticket)}</td>
                <td className={td}>{n2(mensal27(r))}</td>
                <td className={td}>{n2(mensal27(r) * 12)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-border bg-muted/60 font-semibold">
              <td className="px-2 py-0.5">TOTAL</td>
              <td className="px-2 py-0.5 text-center tabular-nums border-l border-border">{tot(n0(tV26))}</td>
              <td className="px-2 py-0.5 text-center tabular-nums">{tot(n2(tV26 ? tM26 / tV26 : 0))}</td>
              <td className={td}>{n2(tM26)}</td>
              <td className={td}>{n2(tM26 * 12)}</td>
              <td className="px-2 py-0.5 text-center tabular-nums border-l border-border">{tot(n0(sum((r) => r.entradas)))}</td>
              <td className="px-2 py-0.5 text-center tabular-nums">{tot(n0(sum((r) => r.saidas)))}</td>
              <td className={td}>{n0(sum(cresc))}</td>
              <td className={td}>{n0(tV27)}</td>
              <td className={td}>{n2(tV27 ? tM27 / tV27 : 0)}</td>
              <td className={td}>{n2(tM27)}</td>
              <td className={td}>{n2(tM27 * 12)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <div className="flex flex-wrap gap-2">
      {ABAS.map((a) => (
        <button
          key={a}
          onClick={() => setAba(a)}
          className={`rounded-md border px-3 py-1.5 text-sm ${aba === a ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
        >
          {a}
        </button>
      ))}
    </div>
    {aba !== "Faturamento" ? (
      <section className="bg-card rounded-xl border border-dashed border-border shadow-sm p-8 text-center space-y-1">
        <h3 className="text-sm font-semibold">{aba}</h3>
        <p className="text-sm text-muted-foreground">Quadro ilustrativo — conteúdo em construção.</p>
      </section>
    ) : (
    <section className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold cursor-help" title="A cada mês, Vidas = mês anterior + Entradas − Saídas; valor = Vidas × Ticket. Total 2027 = soma de jan/27 a dez/27.">Faturamento mensal — jan/27 a dez/27</h3>
        <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 text-sm">Crescimento: <b className="tabular-nums">{tM26 ? `${Math.round((tM27 / tM26 - 1) * 100)}%` : "-"}</b></span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="text-left px-2 py-2">Planos</th>
              {MESES.slice(1).map((m) => <th key={m} className="text-right px-2 py-2 whitespace-nowrap">{m}</th>)}
              <th className="text-right px-2 py-2 border-l border-border">Total 2027</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-2 py-1.5 font-medium">{r.id}</td>
                {MESES.slice(1).map((m, k) => <td key={m} className={td}>{n2(mesVal(r, k + 1))}</td>)}
                <td className={`${td} border-l border-border font-semibold`}>{n2(totLinha(r))}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-border bg-muted/60 font-semibold">
              <td className="px-2 py-2">TOTAL</td>
              {MESES.slice(1).map((m, k) => <td key={m} className={td}>{n2(sum((r) => mesVal(r, k + 1)))}</td>)}
              <td className={`${td} border-l border-border`}>{n2(sum(totLinha))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    )}
    </div>
  );
};

export default OrcamentoFaturamento;
