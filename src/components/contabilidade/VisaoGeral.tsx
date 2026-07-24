import { useMemo } from "react";
import { ContabRow, fmtBR } from "./types";

const sum = (rows: ContabRow[], k: keyof ContabRow) =>
  rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export default function VisaoGeral({ rows }: { rows: ContabRow[] }) {
  const stats = useMemo(() => {
    const realizado = sum(rows, "REALIZADO");
    const debito = sum(rows, "vl_debito");
    const credito = sum(rows, "vl_credito");
    const saldo = sum(rows, "vl_saldo_final");
    const contas = new Set(rows.map((r) => r.cd_contabil)).size;
    return { realizado, debito, credito, saldo, contas };
  }, [rows]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card label="Total Realizado" value={fmtBR(stats.realizado)} />
      <Card label="Total Débito" value={fmtBR(stats.debito)} />
      <Card label="Total Crédito" value={fmtBR(stats.credito)} />
      <Card label="Saldo Final" value={fmtBR(stats.saldo)} />
      <Card label="Contas Distintas" value={stats.contas.toLocaleString("pt-BR")} />
    </div>
  );
}
