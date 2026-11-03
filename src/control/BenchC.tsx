import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import DRETrial, { type DreColumn } from "./DRETrial";
import { dadosVisaoAns, valorDreAns, type BenchPlanRow, type BenchRow, type BenchVision } from "@/control/benchClassification";
import { C_BENSAUDE, C_SUGGESTED, mergeQuarters, operatorFilterName, operatorResults, faturamentoAns, benchYears } from "@/control/benchC";
import BenchResultsChart from "./BenchResultsChart";
import { loadCCatalog, loadCPeriods, loadCQuarter, loadCPlan, quarterQueryKey } from "@/control/benchCLoader";
import { prepareBenchYears } from "@/control/benchPrefetch";
import { refreshBenchYears, type BenchRefreshProgress } from "@/control/benchRefresh";
import BenchRefreshThermometer from "./BenchRefreshThermometer";
import { useAuth } from "@/control/useAuth";

export default function BenchC() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const refreshController = useRef<AbortController>();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState<BenchRefreshProgress>({ completed: 0, total: 0 });
  const [refreshError, setRefreshError] = useState<string>();
  const [year, setYear] = useState<number>();
  const [selected, setSelected] = useState<string[]>(C_SUGGESTED);
  const [active, setActive] = useState(C_BENSAUDE);
  const [vision, setVision] = useState<BenchVision | "Gráfico">("Contábil");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const catalog = useQuery({ queryKey: ["bench-c-catalog"], queryFn: loadCCatalog, staleTime: 3600000, retry: false });
  const periods = useQuery({ queryKey: ["bench-c-periods", year], queryFn: () => loadCPeriods(year), staleTime: 3600000, retry: false });
  const plan = useQuery({ queryKey: ["bench-c-plan"], staleTime: 300000, retry: false, queryFn: loadCPlan });
  const currentYear = periods.data?.year;
  const years = benchYears(periods.data?.years ?? []);
  const quarters = periods.data?.quarters ?? [];
  const queries = useQueries({ queries: quarters.map(quarter => ({ queryKey: quarterQueryKey(user?.id, currentYear, quarter), queryFn: ({ signal }: { signal: AbortSignal }) => loadCQuarter(currentYear ?? 2026, quarter, { signal }), enabled: currentYear !== undefined && !!user && !refreshing, staleTime: 3600000, retry: false, gcTime: 300000 })) });
  const byReg = useMemo(() => new Map((catalog.data ?? []).map(op => [op.reg, op])), [catalog.data]);
  const regs = [C_BENSAUDE, ...selected.filter(reg => reg !== C_BENSAUDE)];
  const current = regs.includes(active) ? active : C_BENSAUDE;
  const operator = byReg.get(current);
  const files = queries.every(query => query.isSuccess) ? queries.map(query => query.data) : [];
  const calculationError = useMemo(() => {
    try { mergeQuarters(files.filter(f => f !== undefined), current); return undefined; }
    catch (error) { return error instanceof Error ? error.message : "Não foi possível calcular os saldos trimestrais."; }
  }, [files, current]);
  const readyFiles = calculationError ? [] : files;
  const { rows, columns, faturamento } = useMemo(() => {
    const file = mergeQuarters(readyFiles.filter(f => f !== undefined), current);
    const names = new Set((plan.data?.plano ?? []).flatMap(p => [p.n2, p.n3, p.n4, p.n5].map(n => n?.split("|")[0]?.trim())));
    const extra: BenchPlanRow[] = Object.entries(file.n).filter(([code]) => !names.has(code)).map(([code, name]) => ({ _9d: "", g1: null, g2: null, g3: null, g4: null, [`n${code.length}`]: `${code}|${name}` }));
    const data: BenchRow[] = file.r.map(([code, quarter, movement]) => ({ operadora: operator?.nome ?? current, nr_ano: currentYear ?? 2026, nr_trimestre: quarter, nr_semestre: quarter <= 2 ? 1 : 2, cd_operadora_ans: Number(current), cd_conta_contabil: code, ds_descricao: "", vl_saldo_inicial: 0, vl_saldo_final: 0, vl_movimento: movement }));
    return {
      faturamento: faturamentoAns(file, [...quarters.map(q => [q]), quarters]),
      rows: dadosVisaoAns(data, [...(plan.data?.plano ?? []), ...extra], vision === "Gráfico" ? "Contábil" : vision).map(row => ({ ano: row.nr_ano, mes: row.nr_trimestre, tri: row.nr_trimestre, g1: row.g1, g2: row.g2, g3: row.g3, g4: row.g4, valor: valorDreAns(row) ?? 0 })),
      columns: [...quarters.map(q => ({ label: `${q}º tri/${currentYear}`, meses: [q], kind: "mes" as const })), { label: "Acumulado", meses: quarters, kind: "ano" as const }] as DreColumn[],
    };
  }, [readyFiles, current, operator, currentYear, quarters, plan.data, vision]);
  const failures = [catalog, periods, plan, ...queries].filter(query => query.isError);
  const loading = catalog.isPending || periods.isPending || plan.isPending || queries.some(q => q.isPending);
  const yearsKey = years.join(",");
  useEffect(() => {
    if (loading || refreshing || failures.length || !user || !currentYear) return;
    const controller = new AbortController();
    const backgroundYears = yearsKey.split(",").map(Number).filter(y => y !== currentYear);
    let pendingKey: readonly unknown[] | undefined;
    const timer = window.setTimeout(() => {
      void prepareBenchYears(backgroundYears, {
        stopped: () => controller.signal.aborted,
        periods: async y => {
          pendingKey = ["bench-c-periods", y];
          return queryClient.fetchQuery({ queryKey: pendingKey, queryFn: ({ signal }) => loadCPeriods(y, signal), staleTime: 3600000, gcTime: 300000, retry: false });
        },
        quarter: async (y, q) => {
          pendingKey = quarterQueryKey(user.id, y, q);
          await queryClient.fetchQuery({ queryKey: pendingKey, queryFn: ({ signal }) => loadCQuarter(y, q, { signal }), staleTime: 3600000, gcTime: 300000, retry: false });
          // Historical aggregates stay in Cloud, not duplicated across every year in browser memory.
          if (!controller.signal.aborted) queryClient.removeQueries({ queryKey: pendingKey, exact: true, type: "inactive" });
        },
      });
    }, 1500);
    return () => {
      controller.abort(); window.clearTimeout(timer);
      if (pendingKey) void queryClient.cancelQueries({ queryKey: pendingKey, exact: true, type: "inactive" });
    };
  }, [loading, refreshing, failures.length, user?.id, currentYear, yearsKey, queryClient]);
  useEffect(() => () => { refreshController.current?.abort(); }, []);
  const refresh = async () => {
    if (!user || refreshing) return;
    const controller = new AbortController();
    refreshController.current = controller;
    setRefreshing(true); setRefreshError(undefined); setRefreshProgress({ completed: 0, total: 0 });
    try {
      await queryClient.cancelQueries({ queryKey: ["bench-c-quarter"] });
      const latest = await periods.refetch();
      if (latest.error) throw latest.error;
      const freshPeriod = latest.data;
      await refreshBenchYears(benchYears(freshPeriod?.years ?? years), {
        stopped: () => controller.signal.aborted,
        progress: setRefreshProgress,
        periods: async y => {
          const period = await loadCPeriods(y, controller.signal);
          queryClient.setQueryData(["bench-c-periods", y], period);
          if (y === freshPeriod?.year) queryClient.setQueryData(["bench-c-periods", year], period);
          return period;
        },
        quarter: async (y, q) => {
          const key = quarterQueryKey(user.id, y, q);
          await queryClient.cancelQueries({ queryKey: key, exact: true });
          const file = await loadCQuarter(y, q, { force: true, signal: controller.signal });
          queryClient.setQueryData(key, file);
          if (y !== freshPeriod?.year) queryClient.removeQueries({ queryKey: key, exact: true, type: "inactive" });
        },
      });
      const updatedCatalog = await catalog.refetch();
      if (updatedCatalog.error) throw updatedCatalog.error;
    } catch (error) { if (!controller.signal.aborted) setRefreshError(error instanceof Error ? error.message : "Não foi possível atualizar os dados."); }
    finally { if (!controller.signal.aborted) setRefreshing(false); }
  };
  const options = (catalog.data ?? []).filter(op => !regs.includes(op.reg) && (!search || `${op.nome} ${op.reg}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")))).slice(0, 50);
  return <div className="flex h-full min-h-0 flex-col gap-3">
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-2">
      <div aria-label="Operadoras" className="flex max-w-full flex-wrap items-center gap-1 rounded-full border border-border bg-card p-1.5 shadow-sm">
        <span className="px-3 text-sm font-semibold">Operadoras</span>
        {regs.map(reg => <div key={reg} className="flex items-center gap-0.5">
          <Button variant="ghost" title={byReg.get(reg)?.nome} aria-pressed={current === reg} onClick={() => setActive(reg)} className={`h-auto min-h-8 max-w-72 whitespace-normal rounded-full text-sm ${current === reg ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{operatorFilterName(byReg.get(reg)?.nome ?? (reg === C_BENSAUDE ? "Bensaúde" : reg))}</Button>
          {reg !== C_BENSAUDE && <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" title={`Retirar ${byReg.get(reg)?.nome ?? reg}`} aria-label={`Retirar ${byReg.get(reg)?.nome ?? reg}`} onClick={() => setSelected(s => s.filter(r => r !== reg))}><X className="h-3 w-3" /></Button>}
        </div>)}
        <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button variant="ghost" className="h-8 rounded-full"><Plus className="mr-1 h-4 w-4" />Incluir OPS</Button></PopoverTrigger>
          <PopoverContent className="w-96 max-w-[calc(100vw-2rem)] p-2"><Input autoFocus placeholder="Buscar por nome ou registro ANS" value={search} onChange={e => setSearch(e.target.value)} /><div className="mt-2 max-h-80 overflow-y-auto">
            {options.map(op => <Button key={op.reg} variant="ghost" title={op.nome} className="h-auto w-full justify-start whitespace-normal px-2 py-1.5 text-left" onClick={() => { setSelected(s => [...s, op.reg]); setActive(op.reg); setSearch(""); setOpen(false); }}>{operatorFilterName(op.nome)} · {op.reg}{op.uf ? ` · ${op.uf}` : ""}</Button>)}
            {!options.length && <p className="p-2 text-sm text-muted-foreground">Nenhuma operadora encontrada.</p>}
          </div></PopoverContent>
        </Popover>
      </div>
      <div role="group" aria-label="Visão" className="flex items-center gap-0.5 rounded-full border border-border bg-card p-1.5 shadow-sm"><span className="px-3 text-sm font-semibold">Visão</span>{(["Contábil", "Gerencial", "Gráfico"] as const).map(mode => <Button key={mode} variant="ghost" aria-pressed={vision === mode} onClick={() => setVision(mode)} className={`h-8 rounded-full ${vision === mode ? "bg-primary text-primary-foreground" : "text-foreground/70"}`}>{mode}</Button>)}</div>
      <Button variant="ghost" size="icon" disabled={loading || refreshing} title="Atualizar dados da ANS" aria-label="Atualizar dados da ANS" onClick={() => { void refresh(); }}><RefreshCw className={`h-4 w-4 ${loading || refreshing ? "animate-spin motion-reduce:animate-none" : ""}`} /></Button>
    </div>
    {refreshError && <div role="alert" className="text-sm text-destructive">{refreshError}</div>}
    {refreshing ? <BenchRefreshThermometer progress={refreshProgress} /> : vision === "Gráfico" ? <BenchResultsChart year={year ?? currentYear} quarters={quarters} loading={loading || refreshing} error={calculationError ?? failures[0]?.error?.message} data={!loading && !refreshing ? operatorResults(readyFiles.filter(f => f !== undefined), regs, catalog.data ?? []) : []} /> : failures.length || calculationError ? <div role="alert" className="p-6 text-destructive">Não foi possível carregar Bench C: {calculationError ?? failures[0]?.error?.message}<Button variant="outline" className="ml-3" onClick={() => { failures.forEach(q => { void q.refetch(); }); if (calculationError) queries.forEach(q => { void q.refetch(); }); }}>Tentar novamente</Button></div>
      : loading || refreshing ? <div role="status" className="p-6 text-muted-foreground">{refreshing ? "Atualizando arquivos oficiais da ANS…" : "Buscando arquivos oficiais da ANS…"} {!refreshing && queries.length > 0 && `${queries.filter(q => q.isSuccess).length}/${queries.length} trimestres`}</div>
      : !quarters.length ? <p className="p-6 text-muted-foreground">Nenhum trimestre disponibilizado pela ANS para este ano.</p>
      : <><div className="text-center text-sm font-semibold">{operator?.nome ?? current} <span className="font-normal text-muted-foreground">· ANS {current} · {currentYear}</span></div><div className="min-h-0 flex-1 overflow-x-auto">{rows.length ? <div className="h-full min-w-[820px]"><DRETrial key={`${current}-${currentYear}`} dados={rows} ano={currentYear} meses={quarters} colunas={columns} faturamento={faturamento} semBarra alturaCompleta recolhidoInicial /></div> : <p className="p-6 text-muted-foreground">Nenhum registro DRE disponível para esta operadora nos trimestres publicados.</p>}</div></>}
    {years.length > 0 && <nav aria-label="Anos do Bench" className="mt-auto flex shrink-0 justify-center pb-2 pt-1">
      <div className="flex max-w-full flex-wrap justify-center gap-0.5 rounded-full border border-border bg-card p-1.5 shadow-sm">
        {years.map(y => <Button key={y} variant="ghost" disabled={refreshing} aria-pressed={(year ?? currentYear) === y} onClick={() => setYear(y)} className={`h-8 rounded-full px-3 ${(year ?? currentYear) === y ? "bg-primary text-primary-foreground" : "text-foreground/70"}`}>{y}</Button>)}
      </div>
    </nav>}
  </div>;
}