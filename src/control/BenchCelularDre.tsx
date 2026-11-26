import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DreHRow } from "./dreHostinger";
import { gruposBenchCelular, resumoBenchCelular } from "./benchCelular";
import { formatDreMargin } from "./dreMargin";

const dinheiro = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
function Grupos({ rows, nivel = 1, faturamento }: { rows: DreHRow[]; nivel?: number; faturamento: number }) {
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  return <div className={nivel > 1 ? "pl-3 border-l border-border" : ""}>
    {gruposBenchCelular(rows, nivel).map(g => <div key={g.id} className="border-b border-border">
      <Button variant="ghost" disabled={!g.expansivel} aria-expanded={g.expansivel ? !!abertos[g.id] : undefined} onClick={() => setAbertos(a => ({ ...a, [g.id]: !a[g.id] }))} className="h-auto min-h-12 w-full justify-start gap-2 whitespace-normal rounded-none px-0 py-2 text-left disabled:opacity-100">
        {g.expansivel ? abertos[g.id] ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /> : <span className="w-4 shrink-0" />}
        <span className="min-w-0 flex-1 break-words text-xs">{g.nome}</span>
        <span className="shrink-0 text-right text-xs tabular-nums"><span className={g.valor < 0 ? "text-destructive" : "text-foreground"}>{dinheiro(g.valor)}</span><span className="block text-[11px] text-muted-foreground">{formatDreMargin(faturamento ? g.valor / faturamento * 100 : null)}</span></span>
      </Button>
      {g.expansivel && abertos[g.id] && <Grupos rows={g.rows} nivel={nivel + 1} faturamento={faturamento} />}
    </div>)}
  </div>;
}

export default function BenchCelularDre({ rows, quarters, faturamento, sinistralidade, ano }: { rows: DreHRow[]; quarters: number[]; faturamento: number[]; sinistralidade: (number | null)[]; ano?: number }) {
  const [periodo, setPeriodo] = useState<number | "acum">("acum");
  const atual = periodo !== "acum" && quarters.includes(periodo) ? periodo : "acum";
  const indice = atual === "acum" ? quarters.length : quarters.indexOf(atual);
  const r = resumoBenchCelular(rows, atual === "acum" ? quarters : [atual], faturamento[indice] ?? 0);
  return <div className="space-y-4">
    <div className="grid grid-cols-4 gap-1.5" aria-label="Trimestres">
      <Button variant={atual === "acum" ? "default" : "secondary"} onClick={() => setPeriodo("acum")} className="col-span-4">Acumulado</Button>
      {[1, 2, 3, 4].map(q => <Button key={q} variant={atual === q ? "default" : "secondary"} disabled={!quarters.includes(q)} onClick={() => setPeriodo(q)}>{q}T{String(ano ?? "").slice(-2)}</Button>)}
    </div>
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">Resultado líquido · {atual === "acum" ? "Acumulado" : `${atual}º trimestre`}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${r.resultado < 0 ? "text-destructive" : "text-primary"}`}>{dinheiro(r.resultado)}</p>
      <p className="text-xs text-muted-foreground">Margem líquida {formatDreMargin(r.margem)}</p>
    </div>
    <dl className="divide-y divide-border border-y border-border text-sm">
      <div className="flex justify-between gap-3 py-3"><dt>Faturamento</dt><dd className="tabular-nums text-right">{dinheiro(r.faturamento)}</dd></div>
      <div className="flex justify-between gap-3 py-3"><dt>Sinistralidade Contábil</dt><dd className="tabular-nums">{formatDreMargin(sinistralidade[indice] ?? null)}</dd></div>
    </dl>
    <Grupos key={`${atual}`} rows={r.rows} faturamento={r.faturamento} />
  </div>;
}