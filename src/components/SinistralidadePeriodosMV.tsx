import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CalendarRange, ChevronDown, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { hostinger } from "@/lib/hostingerClient";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { agruparPorAno, anosSinistralidade, saldoCompetencia, sinistralidade, somaVazia, somarTotais, type AnoAgrupado, type SomaCompetencia } from "@/lib/sinistralidadeCompetencias";

const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
type Col = "recCpp" | "recCopart" | "recTotal" | "despTotal" | "saldo" | "sin";
const cols: [string, Col][] = [
  ["Rec. CPP", "recCpp"], ["Rec. Copart.", "recCopart"], ["Rec. Total", "recTotal"],
  ["Desp. Total", "despTotal"], ["Saldo", "saldo"], ["Sin", "sin"],
];
const valor = (s: SomaCompetencia, k: Col) => {
  if (k === "saldo") return fmt(saldoCompetencia(s));
  if (k === "sin") { const v = sinistralidade(s); return v == null ? "—" : `${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`; }
  return fmt(s[k]);
};

interface Rpc { nr_ano: number; nr_mes: number; rec_cpp: number; rec_copart: number; rec_total: number; desp_total: number }

export default function SinistralidadePeriodosMV() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anos, setAnos] = useState<AnoAgrupado[]>([]);
  const [abertos, setAbertos] = useState<Set<number>>(new Set());
  const ctrl = useRef<AbortController | null>(null);

  const carregar = useCallback(async () => {
    ctrl.current?.abort();
    const controller = new AbortController();
    ctrl.current = controller;
    setLoading(true); setError(null);
    try {
      const res = await Promise.all(anosSinistralidade(new Date()).map(async ({ ano, ateMes }) => {
        const r = await hostinger.rpc("sinistralidade_mv_competencias", { p_ano: ano, p_ate_mes: ateMes }).abortSignal(controller.signal);
        if (r.error) throw r.error;
        return (r.data ?? []) as Rpc[];
      }));
      if (controller.signal.aborted) return;
      setAnos(agruparPorAno(res.flat().map(d => ({ ano: d.nr_ano, mes: d.nr_mes, soma: { ...somaVazia(), recCpp: Number(d.rec_cpp), recCopart: Number(d.rec_copart), recTotal: Number(d.rec_total), despTotal: Number(d.desp_total) } }))));
    } catch {
      if (!controller.signal.aborted) setError("Não foi possível consultar a função sinistralidade_mv_competencias. Tente novamente.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => { void carregar(); return () => ctrl.current?.abort(); }, [carregar]);

  const alternar = (ano: number) => setAbertos(s => { const n = new Set(s); n.has(ano) ? n.delete(ano) : n.add(ano); return n; });
  const total = somarTotais(anos.map(a => a.soma));
  const forte = (k: Col) => (k === "recCpp" || k === "recCopart" ? "" : "font-semibold");

  return (
    <section className="flex h-full min-h-0 flex-col gap-6" aria-labelledby="sin-periodos-title">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="sin-periodos-title" className="flex items-center gap-2 text-2xl font-semibold text-foreground"><CalendarRange className="h-6 w-6 text-primary" />Períodos</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sinistralidade · Receitas e despesas por ano · Fonte: view_eard_mensal</p>
        </div>
        <Button variant="outline" disabled={loading} onClick={() => void carregar()}><RefreshCw className={loading ? "animate-spin" : ""} />Atualizar</Button>
      </header>

      {loading ? (
        <div role="status" className="flex items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />Consultando períodos…</div>
      ) : error ? (
        <div role="alert" className="flex items-start gap-3 border-y border-border py-6"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" /><p className="text-sm text-muted-foreground">{error}</p></div>
      ) : (
        <div className="min-h-0 overflow-auto rounded-md border border-border">
          <Table>
            <TableHeader><TableRow><TableHead>Período</TableHead>{cols.map(([l]) => <TableHead key={l} className="whitespace-nowrap text-right">{l}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{anos.map(a => {
              const aberto = abertos.has(a.ano);
              return (
                <Fragment key={a.ano}>
                  <TableRow className="cursor-pointer bg-muted/40 font-semibold" onClick={() => alternar(a.ano)} aria-expanded={aberto}>
                    <TableCell className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">{aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{a.ano}<span className="ml-2 text-xs font-normal text-muted-foreground">{a.meses.length} meses</span></span>
                    </TableCell>
                    {cols.map(([lb, k]) => <TableCell key={lb} className="whitespace-nowrap text-right tabular-nums">{valor(a.soma, k)}</TableCell>)}
                  </TableRow>
                  {aberto && a.meses.map(m => (
                    <TableRow key={`${a.ano}-${m.mes}`}>
                      <TableCell className="whitespace-nowrap pl-10 text-muted-foreground">{String(m.mes).padStart(2, "0")}/{a.ano}</TableCell>
                      {cols.map(([lb, k]) => <TableCell key={lb} className={`whitespace-nowrap text-right tabular-nums ${forte(k)}`}>{valor(m.soma, k)}</TableCell>)}
                    </TableRow>
                  ))}
                </Fragment>
              );
            })}</TableBody>
            <TableFooter><TableRow><TableCell className="font-semibold">Total</TableCell>{cols.map(([lb, k]) => <TableCell key={lb} className="whitespace-nowrap text-right font-semibold tabular-nums">{valor(total, k)}</TableCell>)}</TableRow></TableFooter>
          </Table>
        </div>
      )}
    </section>
  );
}
