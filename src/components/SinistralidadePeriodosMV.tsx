import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CalendarRange, Loader2, RefreshCw } from "lucide-react";
import { hostinger } from "@/lib/hostingerClient";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { acumular, competenciasDoAno, somaVazia, somarTotais, type LinhaEard, type SomaCompetencia } from "@/lib/sinistralidadeCompetencias";

const CAMPOS = "vl_desp_consulta,vl_desp_urgencia,vl_desp_outros,vl_rec_cpp,vl_rec_copart,vl_rec_outros";
const FILTRO = "vl_desp_consulta.neq.0,vl_desp_urgencia.neq.0,vl_desp_outros.neq.0,vl_rec_cpp.neq.0,vl_rec_copart.neq.0,vl_rec_outros.neq.0";
const PAGINA = 1000;
const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Linha { ano: number; mes: number; soma: SomaCompetencia }

async function somarMes(ano: number, mes: number, signal: AbortSignal): Promise<SomaCompetencia> {
  const head = await hostinger.from("view_eard_mensal").select("cd_matricula", { count: "exact", head: true })
    .eq("nr_ano", ano).eq("nr_mes", mes).or(FILTRO).abortSignal(signal);
  if (head.error) throw head.error;
  const total = head.count ?? 0;
  const offsets = Array.from({ length: Math.ceil(total / PAGINA) }, (_, i) => i * PAGINA);
  let soma = somaVazia();
  for (let i = 0; i < offsets.length; i += 6) {
    const lotes = await Promise.all(offsets.slice(i, i + 6).map(async o => {
      const r = await hostinger.from("view_eard_mensal").select(CAMPOS).eq("nr_ano", ano).eq("nr_mes", mes).or(FILTRO)
        .order("cd_matricula").order("dt_competencia").range(o, o + PAGINA - 1).abortSignal(signal);
      if (r.error) throw r.error;
      return (r.data ?? []) as LinhaEard[];
    }));
    lotes.forEach(l => { soma = acumular(soma, l); });
  }
  return soma;
}

export default function SinistralidadePeriodosMV() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [progresso, setProgresso] = useState({ feito: 0, total: 0 });
  const [ctrl, setCtrl] = useState<AbortController | null>(null);

  const carregar = useCallback(async () => {
    const controller = new AbortController();
    setCtrl(old => { old?.abort(); return controller; });
    const comps = competenciasDoAno(new Date());
    setLoading(true); setError(null); setLinhas([]); setProgresso({ feito: 0, total: comps.length });
    try {
      const res: Linha[] = [];
      for (let i = 0; i < comps.length; i += 2) {
        const par = await Promise.all(comps.slice(i, i + 2).map(async c => ({ ...c, soma: await somarMes(c.ano, c.mes, controller.signal) })));
        if (controller.signal.aborted) return;
        res.push(...par);
        setLinhas([...res]);
        setProgresso({ feito: res.length, total: comps.length });
      }
    } catch {
      if (!controller.signal.aborted) setError("Não foi possível consultar view_eard_mensal. Tente novamente.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => () => ctrl?.abort(), [ctrl]);

  const total = somarTotais(linhas.map(l => l.soma));
  const cols: [string, keyof SomaCompetencia][] = [
    ["Desp. Consulta", "consulta"], ["Desp. Urgência", "urgencia"], ["Desp. Outros", "outros"], ["Desp. Total", "despTotal"],
    ["Rec. CPP", "recCpp"], ["Rec. Copart.", "recCopart"], ["Rec. Total", "recTotal"],
  ];
  const destaque = (k: keyof SomaCompetencia) => k === "despTotal" || k === "recTotal" ? "font-semibold" : "";

  return (
    <section className="flex h-full min-h-0 flex-col gap-6" aria-labelledby="sin-periodos-title">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="sin-periodos-title" className="flex items-center gap-2 text-2xl font-semibold text-foreground"><CalendarRange className="h-6 w-6 text-primary" />Períodos</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sinistralidade · Despesas e receitas por competência · Fonte: view_eard_mensal</p>
        </div>
        <Button variant="outline" disabled={loading} onClick={() => void carregar()}><RefreshCw className={loading ? "animate-spin" : ""} />Atualizar</Button>
      </header>

      {loading && (
        <div role="status" className="flex items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />Somando competência {Math.min(progresso.feito + 1, progresso.total)} de {progresso.total}…</div>
      )}
      {error ? (
        <div role="alert" className="flex items-start gap-3 border-y border-border py-6 text-foreground"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" /><p className="text-sm text-muted-foreground">{error}</p></div>
      ) : linhas.length > 0 && (
        <div className="min-h-0 overflow-auto rounded-md border border-border">
          <Table>
            <TableHeader><TableRow><TableHead>Competência</TableHead>{cols.map(([l]) => <TableHead key={l} className="whitespace-nowrap text-right">{l}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{linhas.map(l => (
              <TableRow key={`${l.ano}-${l.mes}`}>
                <TableCell className="whitespace-nowrap">{String(l.mes).padStart(2, "0")}/{l.ano}</TableCell>
                {cols.map(([lb, k]) => <TableCell key={lb} className={`whitespace-nowrap text-right tabular-nums ${destaque(k)}`}>{fmt(l.soma[k])}</TableCell>)}
              </TableRow>
            ))}</TableBody>
            {!loading && <TableFooter><TableRow><TableCell className="font-semibold">Total</TableCell>{cols.map(([lb, k]) => <TableCell key={lb} className="whitespace-nowrap text-right font-semibold tabular-nums">{fmt(total[k])}</TableCell>)}</TableRow></TableFooter>}
          </Table>
        </div>
      )}
    </section>
  );
}
