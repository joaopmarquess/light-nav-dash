import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadDreHostinger, loadMesesDemonstracoes } from "@/control/dreHostinger";
import { mergeOrcamento } from "@/control/orcamentoLocal";
import { projetarPorVariacaoMedia } from "@/control/projecaoOrcamento";
import { aplicarRealizadoMv, valoresOrcamento, type OrcRow } from "@/control/orcamentoDre";
import { AvisoErroDados } from "@/components/AvisoErroDados";
import { LoaderCircle } from "lucide-react";

// Versão de celular do Orçamento 2026: mesmas fontes da tela de computador (orcamento_2026 + realizado MV,
// meses abertos pelo Projetado) e o mesmo encadeamento do Painel; a tela de computador não muda.
const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
type Sel = "acum" | number | `t${number}`;
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function OrcamentoCelular() {
  const [rows, setRows] = useState<OrcRow[] | null>(null);
  const [fechados, setFechados] = useState<number[]>([]);
  const [sel, setSel] = useState<Sel>("acum");
  const [err, setErr] = useState<unknown>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setErr(null); setRows(null);
    (async () => {
      const { data, error } = await supabase.from("orcamento_2026").select("*").order("item").order("nr_mes");
      if (error) throw error;
      const f = await loadMesesDemonstracoes(2026);
      const ult = f.length ? Math.max(...f) : 0;
      const mv = f.length ? await loadDreHostinger(2026, f) : [];
      const base = mergeOrcamento((data || []).map((r: any) => ({ item: r.item || "", mes: Number(r.nr_mes) || 0, previsto: Number(r.previsto) || 0, realizado: Number(r.realizado) || 0, projetado: Number(r.projetado) || 0 })));
      const comMv = aplicarRealizadoMv(base, mv).map(r => (r.mes <= ult ? r : { ...r, realizado: 0 }));
      setFechados(f); setRows(projetarPorVariacaoMedia(comMv, ult));
    })().catch(setErr);
  }, [tick]);

  const r = useMemo(() => {
    if (!rows) return null;
    const meses = sel === "acum" ? [1,2,3,4,5,6,7,8,9,10,11,12] : typeof sel === "string" ? [1,2,3].map(i => (Number(sel.slice(1)) - 1) * 3 + i) : [sel];
    const items = Array.from(new Set(rows.map(x => x.item)));
    const { soma } = valoresOrcamento(rows);
    const v = (re: RegExp) => { const s = soma(items.filter(i => re.test(i)), meses); return [s.realizado, s.previsto] as const; };
    const add = (...a: (readonly [number, number])[]) => [a.reduce((t, x) => t + x[0], 0), a.reduce((t, x) => t + x[1], 0)] as const;
    const fat = v(/\|\s*FATURAMENTO/i), ent = add(fat, v(/COPARTICIPA/i)), desp = v(/DESPESAS ASSISTENCIAIS/i);
    const demais = add(v(/IMPOSTOS DIRETOS/i), v(/PROVIS[ÕO]ES OPERACIONAIS/i), v(/COMERCIALIZA/i), v(/OUTRAS RECEITAS OPERACIONAIS/i));
    const tot = add(ent, desp, demais), adm = add(v(/\|\s*PESSOAL/i), v(/MARKETING/i), v(/INFORM[ÁA]TICA/i), v(/DEMAIS DESPESAS ADMINISTRATIVAS/i));
    const ebitda = add(tot, adm), fin = v(/FINANCEIRO/i), rai = add(ebitda, fin);
    const imp = [rai[0] > 0 ? -rai[0] * 0.34 : 0, rai[1] > 0 ? -rai[1] * 0.34 : 0] as const, liq = add(rai, imp);
    const linhas: [string, readonly [number, number], 0 | 1 | 2][] = [
      ["Entradas Operacionais", ent, 0], ["(−) Despesas Assistenciais", desp, 0], ["(−) Demais Operacionais", demais, 0],
      ["(=) Operacionais Totais", tot, 1], ["(−) Despesas Administrativas", adm, 0], ["(=) EBITDA", ebitda, 1],
      ["(+) Financeiro", fin, 0], ["(=) Resultado antes dos Impostos", rai, 1], ["(−) Impostos Federais", imp, 0], ["(=) Resultado Líquido", liq, 2],
    ];
    return { fat, liq, ebitda, linhas, aberto: meses.some(m => !fechados.includes(m)) };
  }, [rows, sel, fechados]);

  if (err) return <div className="p-4"><AvisoErroDados erro={err} onTentar={() => setTick(t => t + 1)} /></div>;
  if (!r) return <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Carregando orçamento…</p>;
  const bt = (k: Sel, rot: string, extra = "") => <button key={String(k)} onClick={() => setSel(k)} className={`rounded-md py-1.5 text-sm uppercase ${extra} ${sel === k ? "bg-primary text-primary-foreground" : fechados.includes(k as number) || typeof k !== "number" ? "bg-muted text-muted-foreground" : "bg-muted/50 text-muted-foreground italic"}`}>{rot}</button>;
  const pf = (x: number) => (r.fat[0] ? `${((x / r.fat[0]) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "-");
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="grid grid-cols-4 gap-1.5">
        {bt("acum", "Acumulado 2026", "col-span-4")}
        {[1, 2, 3, 4].map(t => [1, 2, 3].map(i => (t - 1) * 3 + i).map(m => bt(m, MESES[m - 1])).concat(bt(`t${t}`, `${t}T26`, "font-semibold")))}
      </div>
      <p className="text-xs text-muted-foreground">{r.aberto ? "Inclui meses ainda abertos, mostrados pelo Projetado (em itálico nos botões)." : "Realizado."} Comparação com o Previsto.</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Resultado Líquido</p>
          <p className={`mt-1 text-2xl font-semibold tabular-nums ${r.liq[0] < 0 ? "text-destructive" : "text-primary"}`}>{brl(r.liq[0])}</p>
          <p className="text-xs text-muted-foreground">{pf(r.liq[0])} do faturamento · Previsto {brl(r.liq[1])}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">EBITDA</p><p className="mt-1 text-lg font-semibold tabular-nums">{brl(r.ebitda[0])}</p><p className="text-[11px] text-muted-foreground">Prev. {brl(r.ebitda[1])}</p></div>
        <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Faturamento</p><p className="mt-1 text-lg font-semibold tabular-nums">{brl(r.fat[0])}</p><p className="text-[11px] text-muted-foreground">Prev. {brl(r.fat[1])}</p></div>
      </div>
      <div className="divide-y divide-border border-y border-border">
        {r.linhas.map(([nome, [v, p], n]) => (
          <div key={nome} className={`flex items-baseline justify-between gap-3 py-2.5 text-sm ${n ? "font-semibold" : ""}`}>
            <span className="min-w-0">{nome}</span>
            <span className="text-right tabular-nums"><span className={v < 0 ? "text-destructive" : ""}>{brl(v)}</span><span className="block text-[11px] font-normal text-muted-foreground">Prev. {brl(p)}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}
