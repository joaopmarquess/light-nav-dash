import { Fragment, useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertCircle, CalendarRange, ChevronDown, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { hostinger } from "@/lib/hostingerClient";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { agruparPorAno, anosSinistralidade, dominioCentrado, saldoCompetencia, saldoLimiteSin, sinistralidade, somaVazia, somarTotais, type AnoAgrupado, type SomaCompetencia } from "@/lib/sinistralidadeCompetencias";

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
  const [anoSel, setAnoSel] = useState<number | null>(null);
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

  const alternar = (ano: number) => { setAbertos(s => { const n = new Set(s); n.has(ano) ? n.delete(ano) : n.add(ano); return n; }); };
  const sel = anos.find(a => a.ano === anoSel) ?? anos[anos.length - 1];
  const limiteAno = sel ? saldoLimiteSin(sel.soma, 0.9) / Math.max(1, sel.meses.length) : 0;
  const serie = (sel?.meses ?? []).map(m => ({ mes: String(m.mes).padStart(2, "0"), saldo: saldoCompetencia(m.soma), limite: limiteAno }));
  const topo = Math.max(limiteAno, ...serie.map(x => x.saldo));
  const fundo = Math.min(limiteAno, ...serie.map(x => x.saldo));
  const corte = topo > fundo ? (topo - limiteAno) / (topo - fundo) : 0.5;
  const gradId = `sin-barriga-${useId().replace(/:/g, "")}`;
  const curto = (v: number) => `${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
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
        <div className="grid min-h-0 items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-h-0 w-full overflow-auto rounded-md border border-border">
            <Table>
              <TableHeader><TableRow><TableHead>Período</TableHead>{cols.map(([l]) => <TableHead key={l} className="whitespace-nowrap text-right">{l}</TableHead>)}</TableRow></TableHeader>
              <TableBody>{anos.map(a => {
                const aberto = abertos.has(a.ano);
                return (
                  <Fragment key={a.ano}>
                    <TableRow className={`cursor-pointer font-semibold ${sel?.ano === a.ano ? "bg-primary/10" : "bg-muted/40"}`} onClick={() => setAnoSel(a.ano)} aria-selected={sel?.ano === a.ano}>
                      <TableCell className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-1"><button type="button" aria-expanded={aberto} aria-label={aberto ? `Recolher meses de ${a.ano}` : `Expandir meses de ${a.ano}`} onClick={e => { e.stopPropagation(); alternar(a.ano); }} className="rounded p-0.5 hover:bg-muted">{aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>{a.ano}<span className="ml-2 text-xs font-normal text-muted-foreground">{a.meses.length} meses</span></span>
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
          {sel && (
            <div className="w-full min-w-0 rounded-md border border-border bg-card p-4">
              <h3 className="mb-3 text-base font-semibold text-foreground">Evolução mensal do saldo · {sel.ano}<span className="ml-3 text-xs font-normal text-muted-foreground">--- Limite Sin 90%</span></h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={serie} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis domain={dominioCentrado(serie.map(x => x.saldo), serie.map(x => x.limite))} allowDataOverflow tickFormatter={curto} stroke="hsl(var(--muted-foreground))" fontSize={12} width={70} />
                    <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip formatter={(v: number, n: string) => [fmt(v), n === "limite" ? "Limite Sin 90%" : "Saldo"]} labelFormatter={l => `${l}/${sel.ano}`} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <defs><linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset={corte} stopColor="hsl(var(--chart-sin-ok))" stopOpacity={0.3} />
                      <stop offset={corte} stopColor="hsl(var(--chart-sin-alerta))" stopOpacity={0.3} />
                    </linearGradient></defs>
                    <Area type="monotone" dataKey="saldo" baseValue={limiteAno} stroke="none" fill={`url(#${gradId})`} isAnimationActive={false} tooltipType="none" />
                    <Line type="linear" dataKey="limite" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="6 4" dot={false} />
                    <Line type="monotone" dataKey="saldo" stroke="hsl(var(--chart-vidas))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
