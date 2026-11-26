import { useEffect, useMemo, useState } from "react";
import { loadDreHostinger, loadMesesDemonstracoes, type DreHRow } from "@/control/dreHostinger";
import { resumoPainelDre, sinistralidadeOperacionalPainel, formatarSinistralidadePainel } from "@/control/drePainel";
import { AvisoErroDados } from "@/components/AvisoErroDados";
import { LoaderCircle } from "lucide-react";

// Versão de celular das Demonstrações (DRE): mesmas consultas e o mesmo resumo do Painel do Control; a tela de computador não muda.
const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const ANO = 2026;
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pct = (v: number | null) => (v == null ? "-" : `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);

export default function DRECelular() {
  const [rows, setRows] = useState<DreHRow[] | null>(null);
  const [meses, setMeses] = useState<number[]>([]);
  const [sel, setSel] = useState<number | "acum">("acum");
  const [err, setErr] = useState<unknown>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setErr(null); setRows(null);
    loadMesesDemonstracoes(ANO).then(async ms => { setMeses(ms); setRows(await loadDreHostinger(ANO, ms)); }).catch(setErr);
  }, [tick]);
  const r = useMemo(() => rows && resumoPainelDre(sel === "acum" ? rows : rows.filter(x => x.mes === sel)), [rows, sel]);
  if (err) return <div className="p-4"><AvisoErroDados erro={err} onTentar={() => setTick(t => t + 1)} /></div>;
  if (!r) return <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Carregando DRE…</p>;
  const ent = r.linhas[0][1], desp = r.linhas[1][1];
  const per = sel === "acum" ? `Acumulado ${MESES[0]}–${MESES[meses.length - 1]}/${String(ANO).slice(2)}` : `${MESES[sel - 1]}/${String(ANO).slice(2)}`;
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["acum", ...meses.slice().reverse()] as const).map(m => (
          <button key={m} onClick={() => setSel(m)} className={`shrink-0 rounded-md px-3 py-1.5 text-sm ${sel === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {m === "acum" ? "Acumulado" : MESES[m - 1]}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{per}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Resultado Líquido</p>
          <p className={`mt-1 text-2xl font-semibold tabular-nums ${r.liq < 0 ? "text-destructive" : "text-primary"}`}>{brl(r.liq)}</p>
          <p className="text-xs text-muted-foreground">{pct(r.pctFat(r.liq))} do faturamento</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">EBITDA</p><p className="mt-1 text-lg font-semibold tabular-nums">{brl(r.cards[3][1])}</p></div>
        <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Sinistralidade Oper.</p><p className="mt-1 text-lg font-semibold tabular-nums">{formatarSinistralidadePainel(sinistralidadeOperacionalPainel(ent, desp))}</p></div>
      </div>
      <div className="divide-y divide-border border-y border-border">
        {r.linhas.map(([nome, v, n]) => (
          <div key={nome} className={`flex items-baseline justify-between gap-3 py-2.5 text-sm ${n ? "font-semibold" : ""}`}>
            <span className="min-w-0">{nome}</span>
            <span className="text-right tabular-nums"><span className={v < 0 ? "text-destructive" : ""}>{brl(v)}</span><span className="block text-[11px] font-normal text-muted-foreground">{pct(r.pctFat(v))}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}
