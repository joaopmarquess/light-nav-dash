import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronRight, Download, Plus, Search, TrendingDown, UserCheck, UserPlus, Users, X } from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip as Dica, XAxis, YAxis } from "recharts";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import catalogoTrimestral from "@/data/benchVidas/ans/catalogo.json";
import catalogoJson from "@/data/benchVidas/mensal/catalogo.json";
import { nomeOperadoraAns } from "@/lib/benchVidasAns";
import { agregarMensal, ajustarFiltros, campoDisponivel, anosDoPeriodo, CAMPOS_MENSAL, camposCompativeis, competenciaMensal, cuboPara, INDICADORES_MENSAL, opcoesCampo, periodoPadrao, resumoMensal, rotuloValor, totalPeriodo, valorIndicador, type CampoMensal, type CatalogoMensal, type Filtros, type IndicadorMensal } from "@/lib/benchVidasMensal";
import { carregarVidasMensal } from "@/lib/benchVidasMensalDados";

const catalogo = catalogoJson as unknown as CatalogoMensal & { inicio: string; fim: string; competencias: string[]; origem: string; operadoras: { reg: string; razaoSocial: string; modalidade: string }[] };
const COMPETENCIAS = catalogo.competencias.map(Number);
const CURTOS: Record<string, string> = { "366561": "Bensaúde", "327417": "Austaclínicas", "350249": "H.B. Saúde", "335100": "Unimed Rio Preto" };
const FIXA = "366561";
// Mesma base de operadoras do Trimestral; as que não aparecem nos arquivos mensais (05/2021 em diante) ficam sem dados mensais.
const MENSAIS = new Map(catalogo.operadoras.map(o => [o.reg, o]));
const OPERADORAS = catalogoTrimestral.operadoras.map(o => {
  const m = MENSAIS.get(o.reg);
  return { reg: o.reg, razaoSocial: m?.razaoSocial ?? o.nome, modalidade: m?.modalidade ?? "", nome: nomeOperadoraAns(CURTOS[o.reg] ?? o.nome), mensal: Boolean(m) };
}).sort((a, b) => Number(b.mensal) - Number(a.mensal) || a.nome.localeCompare(b.nome, "pt-BR"));
const POR_REG = new Map(OPERADORAS.map(o => [o.reg, o]));
const INICIAIS = ["366561", "327417", "350249", "335100"].filter(r => POR_REG.has(r));
const nf = (v: number | null) => v === null ? "—" : v.toLocaleString("pt-BR");
const sinal = (v: number | null) => v === null ? "—" : `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR")}`;
const rotuloCampo = (c: CampoMensal) => CAMPOS_MENSAL.find(x => x.id === c)?.rotulo ?? c;
const BUSCA: CampoMensal[] = ["municipio", "plano"];

function Bloco({ titulo, aberto, alternar, children, acao }: { titulo: string; aberto: boolean; alternar: () => void; children: ReactNode; acao?: ReactNode }) {
  return <section className="bench-panel shrink-0">
    <div className="bench-panel-heading flex items-center justify-between">
      <Button variant="ghost" onClick={alternar} aria-expanded={aberto} className="h-10 flex-1 justify-start gap-2 text-sm font-semibold"><ChevronRight className={`h-4 w-4 transition-transform motion-reduce:transition-none ${aberto ? "rotate-90" : ""}`} />{titulo}</Button>
      {aberto && acao}
    </div>
    {aberto && <div className="bench-panel-body">{children}</div>}
  </section>;
}

function FiltroBusca({ campo, valor, alterar, disponiveis }: { campo: CampoMensal; valor?: number; alterar: (v?: number) => void; disponiveis?: Set<number> }) {
  const [aberto, setAberto] = useState(false); const [busca, setBusca] = useState("");
  const opcoes = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return opcoesCampo(catalogo, campo).filter(o => (!disponiveis || disponiveis.has(o.indice)) && (!termo || o.rotulo.toLocaleLowerCase("pt-BR").includes(termo))).slice(0, 200);
  }, [busca, campo, disponiveis]);
  return <Popover open={aberto} onOpenChange={setAberto}>
    <PopoverTrigger asChild><Button variant="outline" aria-label={rotuloCampo(campo)} className="h-9 w-48 justify-between gap-2 px-3 font-normal"><span className="truncate">{valor === undefined ? "Todos" : rotuloValor(catalogo, campo, valor)}</span><Search className="h-3.5 w-3.5 shrink-0 opacity-60" /></Button></PopoverTrigger>
    <PopoverContent className="w-80 max-w-[calc(100vw-2rem)] p-2">
      <Input autoFocus aria-label={`Buscar ${rotuloCampo(campo)}`} placeholder={`Buscar ${rotuloCampo(campo).toLowerCase()}`} value={busca} onChange={e => setBusca(e.target.value)} />
      <div className="mt-2 max-h-64 overflow-auto">
        <Button variant="ghost" className="h-auto w-full justify-start text-left" onClick={() => { alterar(undefined); setAberto(false); }}>Todos</Button>
        {opcoes.map(o => <Button key={o.indice} variant="ghost" className="h-auto w-full justify-start whitespace-normal text-left" onClick={() => { alterar(o.indice); setAberto(false); setBusca(""); }}>{o.rotulo}</Button>)}
        {!opcoes.length && <p className="p-2 text-sm text-muted-foreground">Nada encontrado.</p>}
      </div>
    </PopoverContent>
  </Popover>;
}

export default function BenchVidasMensal({ navegacao }: { navegacao: ReactNode }) {
  const padrao = periodoPadrao(COMPETENCIAS);
  const [operadora, setOperadora] = useState(FIXA);
  const [selecionadas, setSelecionadas] = useState(INICIAIS);
  const [opsAberto, setOpsAberto] = useState(false); const [busca, setBusca] = useState("");
  const opcoesOps = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return OPERADORAS.filter(o => !selecionadas.includes(o.reg) && (!termo || o.reg.includes(termo) || o.nome.toLocaleLowerCase("pt-BR").includes(termo) || o.razaoSocial.toLocaleLowerCase("pt-BR").includes(termo))).slice(0, 100);
  }, [busca, selecionadas]);
  const [de, setDe] = useState(padrao.de); const [ate, setAte] = useState(padrao.ate);
  const [indicador, setIndicador] = useState<IndicadorMensal>("ativos");
  const [detalhar, setDetalhar] = useState<CampoMensal>("contratacao");
  const [filtros, setFiltros] = useState<Filtros>({});
  const [graficoAberto, setGraficoAberto] = useState(true); const [gridAberto, setGridAberto] = useState(true);
  const [linhas, setLinhas] = useState<number[][]>([]); const [carregando, setCarregando] = useState(true); const [erro, setErro] = useState(""); const [tentativa, setTentativa] = useState(0);
  const cubo = cuboPara(detalhar, filtros);
  const anos = useMemo(() => anosDoPeriodo(de, ate), [de, ate]);

  useEffect(() => {
    let ativo = true; setCarregando(true); setErro("");
    carregarVidasMensal(operadora, anos, cubo).then(r => { if (ativo) setLinhas(r); }).catch(e => { if (ativo) { setLinhas([]); setErro(e instanceof Error ? e.message : "Não foi possível carregar a base mensal da ANS."); } }).finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [operadora, anos, cubo, tentativa]);

  const resultado = useMemo(() => agregarMensal(linhas, cubo, catalogo, { de, ate, detalhar, filtros }), [linhas, cubo, de, ate, detalhar, filtros]);
  const resumo = resumoMensal(resultado.total, resultado.competencias);
  const compativeis = useMemo(() => new Set(camposCompativeis(detalhar, filtros)), [detalhar, filtros]);
  const atual = POR_REG.get(operadora);
  // Valores existentes na operadora e no período carregado, para listar só o que aparece nos dados.
  const presentes = useMemo(() => {
    const memo = new Map<CampoMensal, Set<number>>();
    return (c: CampoMensal): Set<number> | undefined => {
      if (!campoDisponivel(cubo, c)) return undefined;
      if (!memo.has(c)) memo.set(c, new Set(agregarMensal(linhas, cubo, catalogo, { de, ate, detalhar: c, filtros: Object.fromEntries(Object.entries(filtros).filter(([k]) => k !== c)) as Filtros }).linhas.map(l => l.indice)));
      return memo.get(c);
    };
  }, [linhas, cubo, de, ate, filtros]);

  const escolherDetalhar = (c: CampoMensal) => { setDetalhar(c); setFiltros(f => { const { [c]: _, ...resto } = f; return ajustarFiltros(c, resto); }); };
  const alterarFiltro = (c: CampoMensal, v?: number) => setFiltros(f => { const n = { ...f }; if (v === undefined) delete n[c]; else n[c] = v; return n; });
  const aplicarLinha = (indice: number) => { if (indice >= 0) alterarFiltro(detalhar, indice); };
  const ultimo = resultado.competencias.at(-1);

  const dadosGrafico = resultado.competencias.map(c => { const m = resultado.total.get(c)!; return { mes: competenciaMensal(c), Ativos: m.ativos, Adesões: m.aderidos, Cancelamentos: m.cancelados }; });
  const baixar = () => {
    const cab = [rotuloCampo(detalhar), ...resultado.competencias.map(competenciaMensal), indicador === "ativos" ? `Ativos ${ultimo ? competenciaMensal(ultimo) : ""}` : "Total"];
    const corpo = resultado.linhas.map(l => [l.rotulo, ...resultado.competencias.map(c => { const m = l.meses.get(c); return m ? valorIndicador(m, indicador) : null; }), totalPeriodo(l.meses, resultado.competencias, indicador)]);
    const ws = XLSX.utils.aoa_to_sheet([[`${atual?.nome} · ANS ${operadora} · ${INDICADORES_MENSAL.find(i => i.id === indicador)?.rotulo}`], cab, ...corpo, ["Total", ...resultado.competencias.map(c => valorIndicador(resultado.total.get(c)!, indicador)), totalPeriodo(resultado.total, resultado.competencias, indicador)]]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Bench Vidas Mensal"); XLSX.writeFile(wb, `bench_vidas_mensal_${operadora}_${de}_${ate}.xlsx`);
  };

  return <div className="bench-vidas flex h-full min-h-0 flex-col gap-3">
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-2">
      {navegacao}
      <div aria-label="Operadoras" className="flex max-h-44 max-w-full flex-wrap items-center justify-center gap-1 overflow-y-auto rounded-lg border border-border bg-card p-1.5 shadow-sm sm:max-h-none sm:rounded-full">
        <span className="px-3 text-sm font-semibold">Operadoras</span>
        {selecionadas.map(reg => { const o = POR_REG.get(reg); if (!o) return null; return <div key={reg} className="flex items-center gap-0.5">
          <Button variant="ghost" aria-pressed={operadora === reg} title={`${o.razaoSocial} · ANS ${reg}`} onClick={() => setOperadora(reg)} className={`h-auto min-h-8 max-w-72 whitespace-normal rounded-full text-sm ${operadora === reg ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "bg-muted"}`}>{o.nome}</Button>
          {reg !== FIXA && <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" title={`Retirar ${o.nome}`} aria-label={`Retirar ${o.nome}`} onClick={() => { setSelecionadas(l => l.filter(r => r !== reg)); if (operadora === reg) setOperadora(FIXA); }}><X className="h-3 w-3" /></Button>}
        </div>; })}
        <Popover open={opsAberto} onOpenChange={setOpsAberto}><PopoverTrigger asChild><Button variant="ghost" className="h-8 gap-1 rounded-full"><Plus className="h-4 w-4" />Incluir OPS</Button></PopoverTrigger><PopoverContent className="w-80 max-w-[calc(100vw-2rem)] p-2"><Input autoFocus aria-label="Buscar operadora" placeholder="Buscar por nome ou registro ANS" value={busca} onChange={e => setBusca(e.target.value)} /><div className="mt-2 max-h-60 overflow-auto">{opcoesOps.map(o => <Button key={o.reg} variant="ghost" disabled={!o.mensal} title={o.mensal ? undefined : "Sem dados mensais: a operadora não aparece nos arquivos mensais da ANS (05/2021 em diante)"} className="h-auto w-full flex-col items-start gap-0 whitespace-normal text-left" onClick={() => { setSelecionadas(l => [...l, o.reg]); setOperadora(o.reg); setOpsAberto(false); setBusca(""); }}><span>{o.nome} · {o.reg}</span>{!o.mensal && <span className="text-xs text-muted-foreground">Sem dados mensais</span>}</Button>)}{!opcoesOps.length && <p className="p-2 text-sm text-muted-foreground">Nenhuma operadora disponível.</p>}</div></PopoverContent></Popover>
      </div>
    </div>
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
      <div className="bench-filters space-y-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-16 text-sm font-semibold">Período</span>
          <label className="flex items-center gap-2 text-sm">De<Select value={String(de)} onValueChange={v => { const n = Number(v); setDe(n); if (n > ate) setAte(n); }}><SelectTrigger aria-label="Mês inicial" className="w-28"><SelectValue /></SelectTrigger><SelectContent>{COMPETENCIAS.map(c => <SelectItem key={c} value={String(c)}>{competenciaMensal(c)}</SelectItem>)}</SelectContent></Select></label>
          <label className="flex items-center gap-2 text-sm">Até<Select value={String(ate)} onValueChange={v => { const n = Number(v); setAte(n); if (n < de) setDe(n); }}><SelectTrigger aria-label="Mês final" className="w-28"><SelectValue /></SelectTrigger><SelectContent>{COMPETENCIAS.map(c => <SelectItem key={c} value={String(c)}>{competenciaMensal(c)}</SelectItem>)}</SelectContent></Select></label>
          <div role="group" aria-label="Indicador" className="flex items-center gap-0.5 rounded-full border border-border bg-card p-1">
            {INDICADORES_MENSAL.map(i => <Button key={i.id} variant="ghost" aria-pressed={indicador === i.id} onClick={() => setIndicador(i.id)} className={`h-7 rounded-full px-3 text-xs ${indicador === i.id ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "text-foreground/70"}`}>{i.rotulo}</Button>)}
          </div>
          <div aria-label="Identificação da operadora" className="ml-auto flex min-w-0 flex-col items-end text-right text-xs">
            <strong className="break-words">{atual?.nome} <span className="font-normal text-muted-foreground">· ANS {operadora} {atual?.modalidade ? ` · ${atual.modalidade.toLowerCase()}` : ""}</span></strong>
            <span className="text-muted-foreground">ANS mensal · {competenciaMensal(catalogo.inicio)}–{competenciaMensal(catalogo.fim)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-16 text-sm font-semibold">Detalhar</span>
          <div role="group" aria-label="Detalhar por" className="flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-card p-1 sm:rounded-full">
            {CAMPOS_MENSAL.filter(c => !c.soFiltro).map(c => <Button key={c.id} variant="ghost" aria-pressed={detalhar === c.id} onClick={() => escolherDetalhar(c.id)} className={`h-7 rounded-full px-3 text-xs ${detalhar === c.id ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "text-foreground/70"}`}>{c.rotulo}</Button>)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="w-16 text-sm font-semibold">Filtros</span>
          {CAMPOS_MENSAL.filter(c => c.id !== detalhar).map(c => {
            const ok = compativeis.has(c.id); const valor = filtros[c.id];
            const controle = BUSCA.includes(c.id)
              ? <FiltroBusca campo={c.id} valor={valor} alterar={v => alterarFiltro(c.id, v)} disponiveis={presentes(c.id)} />
              : <Select value={valor === undefined ? "todos" : String(valor)} onValueChange={v => alterarFiltro(c.id, v === "todos" ? undefined : Number(v))}>
                  <SelectTrigger aria-label={c.rotulo} className="h-9 w-40"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="todos">Todos</SelectItem>{opcoesCampo(catalogo, c.id).filter(o => { const p = presentes(c.id); return !p || p.has(o.indice) || valor === o.indice; }).map(o => <SelectItem key={o.indice} value={String(o.indice)}>{o.rotulo}</SelectItem>)}</SelectContent>
                </Select>;
            return <label key={c.id} className={`flex items-center gap-1.5 text-xs ${ok ? "" : "opacity-45"}`}>
              <span className={valor !== undefined ? "font-semibold text-primary" : "text-muted-foreground"}>{c.rotulo}</span>
              {ok ? controle : <Tooltip><TooltipTrigger asChild><span className="inline-flex h-9 w-28 items-center rounded-md border border-dashed border-border px-2 text-muted-foreground">Indisponível</span></TooltipTrigger><TooltipContent className="max-w-xs">A ANS não traz {c.rotulo.toLowerCase()} junto com {cubo === "M" || detalhar === "municipio" || filtros.municipio !== undefined ? "município" : cubo === "P" ? "plano" : "este detalhamento"} nestes arquivos.</TooltipContent></Tooltip>}
            </label>;
          })}
          {Object.keys(filtros).length > 0 && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Limpar filtros" onClick={() => setFiltros({})}><X className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Limpar filtros</TooltipContent></Tooltip>}
        </div>
      </div>

      {carregando ? <p role="status" className="py-8 text-sm text-muted-foreground">Carregando dados mensais…</p>
        : erro ? <div role="alert" className="py-8 text-sm text-destructive">{erro}<Button variant="outline" className="ml-3" onClick={() => setTentativa(t => t + 1)}>Tentar novamente</Button></div>
        : !resumo ? <p role="status" className="py-8 text-sm text-muted-foreground">Nenhum registro para os filtros selecionados.</p>
        : <>
          <div className="bench-kpis bench-kpis-4">
            <div className="bench-kpi" aria-label="Ativos no início"><p className="bench-kpi-title">Ativos no início<Users aria-hidden="true" /></p><p className="bench-kpi-value">{nf(resumo.ativosInicio)}</p><p className="bench-kpi-date">{competenciaMensal(resumo.inicio)}</p></div>
            <div className="bench-kpi bench-kpi-final" aria-label="Ativos no fim"><p className="bench-kpi-title">Ativos no fim<UserCheck aria-hidden="true" /></p><p className="bench-kpi-value">{nf(resumo.ativosFim)}<span className="ml-1 text-sm font-medium">({sinal(resumo.variacao)}{resumo.percentual === null ? "" : ` · ${resumo.percentual.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`})</span></p><p className="bench-kpi-date">{competenciaMensal(resumo.fim)}</p></div>
            <div className="bench-kpi bench-kpi-adesao" aria-label="Adesões"><p className="bench-kpi-title">Adesões<UserPlus aria-hidden="true" /></p><p className="bench-kpi-value">{nf(resumo.aderidos)}</p><p className="bench-kpi-date">soma {competenciaMensal(resumo.inicio)}–{competenciaMensal(resumo.fim)}</p></div>
            <div className="bench-kpi bench-kpi-cancel" aria-label="Cancelamentos"><p className="bench-kpi-title">Cancelamentos<TrendingDown aria-hidden="true" /></p><p className="bench-kpi-value">{nf(resumo.cancelados)}<span className="ml-1 text-sm font-medium">(saldo {sinal(resumo.aderidos - resumo.cancelados)})</span></p><p className="bench-kpi-date">soma {competenciaMensal(resumo.inicio)}–{competenciaMensal(resumo.fim)}</p></div>
          </div>
          <Bloco titulo="Gráfico" aberto={graficoAberto} alternar={() => setGraficoAberto(s => !s)}>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dadosGrafico} margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="mov" tick={{ fontSize: 11 }} tickFormatter={v => Number(v).toLocaleString("pt-BR")} width={56} />
                  <YAxis yAxisId="ativos" orientation="right" tick={{ fontSize: 11 }} tickFormatter={v => Number(v).toLocaleString("pt-BR")} width={64} domain={["auto", "auto"]} />
                  <Dica formatter={(v: number) => v.toLocaleString("pt-BR")} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="mov" dataKey="Adesões" fill="hsl(var(--chart-fin))" radius={[3, 3, 0, 0]} />
                  <Bar yAxisId="mov" dataKey="Cancelamentos" fill="hsl(var(--chart-4))" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="ativos" dataKey="Ativos" stroke="hsl(var(--chart-vidas))" strokeWidth={2} dot={{ r: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Barras: adesões e cancelamentos do mês (escala à esquerda). Linha: ativos no mês (escala à direita).</p>
          </Bloco>
          <Bloco titulo={`Grid · ${INDICADORES_MENSAL.find(i => i.id === indicador)?.rotulo} por ${rotuloCampo(detalhar).toLowerCase()}`} aberto={gridAberto} alternar={() => setGridAberto(s => !s)} acao={<Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={baixar} aria-label="Baixar grid mensal em xlsx"><Download className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Baixar grid (xlsx)</TooltipContent></Tooltip>}>
            <div className="max-h-[28rem] overflow-auto">
              <table className="w-full border-collapse text-xs tabular-nums">
                <thead className="sticky top-0 z-10"><tr>
                  <th className="sticky left-0 z-10 bg-secondary px-2 py-1.5 text-left font-semibold">{rotuloCampo(detalhar)}</th>
                  {resultado.competencias.map(c => <th key={c} className="whitespace-nowrap px-2 py-1.5 text-right font-semibold">{competenciaMensal(c)}</th>)}
                  <th className="whitespace-nowrap border-l border-border px-2 py-1.5 text-right font-semibold">{indicador === "ativos" ? `Ativos ${ultimo ? competenciaMensal(ultimo) : ""}` : "Total"}</th>
                </tr></thead>
                <tbody>
                  {resultado.linhas.map(l => <tr key={l.indice} className="cursor-pointer border-b border-border/60 hover:bg-accent/60" title={l.indice >= 0 ? `Filtrar ${rotuloCampo(detalhar).toLowerCase()} = ${l.rotulo}` : undefined} onClick={() => aplicarLinha(l.indice)}>
                    <td className="sticky left-0 max-w-64 truncate bg-card px-2 py-1">{l.rotulo}</td>
                    {resultado.competencias.map(c => { const m = l.meses.get(c); const v = m ? valorIndicador(m, indicador) : null; return <td key={c} className="px-2 py-1 text-right">{indicador === "saldo" ? sinal(v) : nf(v)}</td>; })}
                    <td className="border-l border-border px-2 py-1 text-right font-semibold">{indicador === "saldo" ? sinal(totalPeriodo(l.meses, resultado.competencias, indicador)) : nf(totalPeriodo(l.meses, resultado.competencias, indicador))}</td>
                  </tr>)}
                </tbody>
                <tfoot className="sticky bottom-0"><tr className="bg-secondary font-semibold">
                  <td className="sticky left-0 bg-secondary px-2 py-1.5">Total</td>
                  {resultado.competencias.map(c => { const v = valorIndicador(resultado.total.get(c)!, indicador); return <td key={c} className="px-2 py-1.5 text-right">{indicador === "saldo" ? sinal(v) : nf(v)}</td>; })}
                  <td className="border-l border-border px-2 py-1.5 text-right">{indicador === "saldo" ? sinal(totalPeriodo(resultado.total, resultado.competencias, indicador)) : nf(totalPeriodo(resultado.total, resultado.competencias, indicador))}</td>
                </tr></tfoot>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Clique numa linha para usá-la como filtro. Ativos: quantidade no mês, sem somar meses. Adesões e cancelamentos: movimentos informados pela ANS em cada mês, somados no total. Quantidades de vínculos, não de pessoas únicas.</p>
          </Bloco>
        </>}
    </div>
  </div>;
}
