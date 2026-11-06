import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronRight, Download, Plus, X } from "lucide-react";
import BenchVidasGrafico from "./BenchVidasGrafico";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import catalogo from "@/data/benchVidas/ans/catalogo.json";
import { adaptarVidasAns, carregarVidasAns, nomeOperadoraAns, planosDisponiveisAns } from "@/lib/benchVidasAns";
import { competenciaVidas, mesesBenchVidas, nomeBenchVidas, PLANOS_VIDAS, resumoBenchVidas, ROTULOS_VIDAS, TIPOS_VIDAS, type BenchVida, type MesVidas, type TipoVidas } from "@/lib/benchVidas";

const nomes: Record<string, string> = { "366561": "Bensaúde", "327417": "Austaclínicas", "350249": "H.B. Saúde", "335100": "Unimed Rio Preto" };
const operadoras = catalogo.operadoras.map(o => ({ ...o, nomeCompleto: o.nome, nome: nomeOperadoraAns(nomes[o.reg] ?? o.nome) }));
const nomesOps = new Map(operadoras.map(o => [o.reg, o.nome]));
const anos = catalogo.anos;
const segmentos = ["Plano de saúde", "Odontológico"];
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const nf = (valor: number | null) => valor === null ? "Não informado" : valor.toLocaleString("pt-BR");

function Bloco({ titulo, aberto, alternar, children, acao }: { titulo: string; aberto: boolean; alternar: () => void; children: ReactNode; acao?: ReactNode }) {
  return <section className="shrink-0 rounded-lg border border-border bg-card shadow-sm">
    <div className="flex items-center justify-between px-2">
      <Button variant="ghost" onClick={alternar} aria-expanded={aberto} className="h-10 flex-1 justify-start gap-2 text-sm font-semibold"><ChevronRight className={`h-4 w-4 transition-transform motion-reduce:transition-none ${aberto ? "rotate-90" : ""}`} />{titulo}</Button>
      {aberto && acao}
    </div>
    {aberto && <div className="border-t border-border p-3">{children}</div>}
  </section>;
}

function GridVidas({ meses, plano, tipo, planosPorMes }: { meses: MesVidas[]; plano: string; tipo: string; planosPorMes: Map<string, typeof PLANOS_VIDAS[number][]> }) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const tipos = tipo === "todos" ? [...TIPOS_VIDAS] : TIPOS_VIDAS.filter(t => t === tipo);
  const toggle = (key: string) => setAbertos(s => { const next = new Set(s); next.has(key) ? next.delete(key) : next.add(key); return next; });
  const expansor = (key: string, label: string) => <Button variant="ghost" size="icon" aria-label={`${abertos.has(key) ? "Recolher" : "Expandir"} ${label}`} aria-expanded={abertos.has(key)} onClick={() => toggle(key)} className="mr-1 h-6 w-6"><ChevronRight className={`h-4 w-4 transition-transform motion-reduce:transition-none ${abertos.has(key) ? "rotate-90" : ""}`} /></Button>;
  const resumo = resumoBenchVidas(meses);
  const celulas = (valores: Record<TipoVidas, number | null>) => tipos.map(t => <td key={t} className="border-l border-border px-3 py-2 text-right tabular-nums">{nf(valores[t])}</td>);
  return <div className="max-h-[460px] overflow-auto">
    <table className="w-full min-w-[620px] text-sm">
      <thead className="sticky top-0 z-10 bg-muted"><tr><th className="px-3 py-2 text-left">Ano</th><th className="px-3 py-2 text-left">Mês</th><th className="px-3 py-2 text-left">Contratação</th>{tipos.map(t => <th key={t} className="border-l border-border px-3 py-2 text-right">{ROTULOS_VIDAS[t]}</th>)}</tr></thead>
      <tbody>
        <tr className="border-t border-border bg-muted/40 font-semibold"><td className="px-3 py-1.5">{expansor("ano", String(meses[0]?.ano))}{meses[0]?.ano}</td><td className="px-3 py-2 text-muted-foreground">{meses.length} trimestres</td><td>Total</td>{celulas(resumo)}</tr>
        {abertos.has("ano") && [...meses].reverse().map(m => <FragmentoMes key={m.competencia} mes={m} aberto={abertos.has(m.competencia)} expansor={expansor(m.competencia, competenciaVidas(m.competencia))} planos={(planosPorMes.get(m.competencia) ?? []).filter(p => plano === "todos" || p === plano)} celulas={celulas} />)}
      </tbody>
    </table>
  </div>;
}

function FragmentoMes({ mes, aberto, expansor, planos, celulas }: { mes: MesVidas; aberto: boolean; expansor: ReactNode; planos: typeof PLANOS_VIDAS[number][]; celulas: (v: Record<TipoVidas, number | null>) => ReactNode }) {
  return <>
    <tr className="border-t border-border font-medium"><td className="px-3 py-2 pl-10">{mes.ano}</td><td className="px-3 py-1.5">{expansor}{MESES[mes.mes - 1]}</td><td>Total</td>{celulas(mes)}</tr>
    {aberto && planos.map(p => <tr key={p} className="border-t border-border/50 text-muted-foreground"><td className="px-3 py-2 pl-10">{mes.ano}</td><td className="px-3 py-2 pl-10">{MESES[mes.mes - 1]}</td><td className="px-3 py-2">{p}</td>{celulas(mes.planos[p])}</tr>)}
  </>;
}

export default function BenchVidas() {
  const [selecionadas, setSelecionadas] = useState(["366561", "327417", "350249", "335100"]);
  const [operadora, setOperadora] = useState("366561");
  const [ano, setAno] = useState(anos.at(-1) ?? 2026);
  const [plano, setPlano] = useState("todos");
  const tipo = "saldo";
  const [segmentacao, setSegmentacao] = useState("todos");
  const [graficoAberto, setGraficoAberto] = useState(true);
  const [gridAberto, setGridAberto] = useState(false);
  const [opsAberto, setOpsAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [dados, setDados] = useState<BenchVida[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    let ativo = true;
    setCarregando(true); setErro(""); setDados([]);
    carregarVidasAns(ano).then(registros => {
      if (ativo) setDados(adaptarVidasAns(registros, nomesOps));
    }).catch(() => { if (ativo) setErro("Não foi possível carregar os dados da ANS."); }).finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [ano, tentativa]);
  const planosDisponiveis = useMemo(() => planosDisponiveisAns(dados, operadora, ano, segmentacao), [dados, operadora, ano, segmentacao]);
  const planoAtual = planosDisponiveis.some(p => p === plano) ? plano : "todos";
  const meses = useMemo(() => mesesBenchVidas(dados, operadora, ano, planoAtual, segmentacao), [dados, operadora, ano, planoAtual, segmentacao]);
  const planosPorMes = useMemo(() => new Map(meses.map(m => [m.competencia, planosDisponiveisAns(dados, operadora, ano, segmentacao, m.competencia)])), [dados, operadora, ano, segmentacao, meses]);
  const resumo = resumoBenchVidas(meses);
  const atual = operadoras.find(o => o.reg === operadora);
  const opcoes = operadoras.filter(o => !selecionadas.includes(o.reg) && `${o.nome} ${o.nomeCompleto} ${o.reg}`.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR")));
  const baixar = () => {
    const rows = dados.filter(r => r.operadora === operadora && r.ano === ano && (planoAtual === "todos" || planoAtual === r.plano) && tipo === r.tipo && (segmentacao === "todos" || segmentacao === r.segmentacao)).map(r => [nomeBenchVidas(r.nome), competenciaVidas(r.competencia), r.plano, ROTULOS_VIDAS[r.tipo], r.vidas ?? "Não informado"]);
    const ws = XLSX.utils.aoa_to_sheet([["Operadora", "Mês", "Contratação", "Tipo", "Vidas"], ...rows]);
    ws["!cols"] = [{ wch: 32 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 12 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Bench Vidas"); XLSX.writeFile(wb, `bench_vidas_${operadora}_${ano}.xlsx`);
  };
  return <div className="flex h-full min-h-0 flex-col gap-3">
    <div className="flex shrink-0 justify-center">
      <div aria-label="Operadoras" className="flex max-h-44 max-w-full flex-wrap items-center justify-center gap-1 overflow-y-auto rounded-lg border border-border bg-card p-1.5 shadow-sm sm:max-h-none sm:rounded-full">
        <span className="px-3 text-sm font-semibold">Operadoras</span>
        {selecionadas.map(reg => { const op = operadoras.find(o => o.reg === reg); return <div key={reg} className="flex items-center gap-0.5">
          <Button variant="ghost" aria-pressed={operadora === reg} title={`ANS ${reg}`} onClick={() => setOperadora(reg)} className={`h-auto min-h-8 max-w-72 whitespace-normal rounded-full text-sm ${operadora === reg ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{op?.nome}</Button>
          {reg !== "366561" && <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" title={`Retirar ${op?.nome}`} aria-label={`Retirar ${op?.nome}`} onClick={() => { setSelecionadas(s => s.filter(r => r !== reg)); if (operadora === reg) setOperadora("366561"); }}><X className="h-3 w-3" /></Button>}
        </div>; })}
        <Popover open={opsAberto} onOpenChange={setOpsAberto}><PopoverTrigger asChild><Button variant="ghost" className="h-8 gap-1 rounded-full"><Plus className="h-4 w-4" />Incluir OPS</Button></PopoverTrigger><PopoverContent className="w-80 max-w-[calc(100vw-2rem)] p-2"><Input autoFocus aria-label="Buscar operadora" placeholder="Buscar por nome ou registro ANS" value={busca} onChange={e => setBusca(e.target.value)} /><div className="mt-2 max-h-60 overflow-auto">{opcoes.map(o => <Button key={o.reg} variant="ghost" className="h-auto w-full justify-start whitespace-normal text-left" onClick={() => { setSelecionadas(s => [...s, o.reg]); setOperadora(o.reg); setOpsAberto(false); setBusca(""); }}>{o.nome} · {o.reg}</Button>)}{!opcoes.length && <p className="p-2 text-sm text-muted-foreground">Nenhuma operadora disponível.</p>}</div></PopoverContent></Popover>
      </div>
    </div>
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
      <div className="flex flex-wrap items-center gap-3 border-y border-border py-3">
        <span className="text-sm font-semibold">Filtros</span>
        <label className="flex items-center gap-2 text-sm">Contratação<Select value={planoAtual} onValueChange={setPlano}><SelectTrigger aria-label="Contratação" className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todas</SelectItem>{planosDisponiveis.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></label>
        <label className="flex items-center gap-2 text-sm">Segmentação<Select value={segmentacao} onValueChange={setSegmentacao}><SelectTrigger aria-label="Segmentação" className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todas</SelectItem>{segmentos.map(s => <SelectItem key={s} value={s}>{s === "plano_saude" ? "Plano de saúde" : s}</SelectItem>)}</SelectContent></Select></label>
        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Limpar filtros" onClick={() => { setPlano("todos"); setSegmentacao("todos"); }}><X className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Limpar filtros</TooltipContent></Tooltip>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><strong>{atual?.nome} <span className="font-normal text-muted-foreground">· ANS {operadora} · {ano}</span></strong><span className="text-xs text-muted-foreground">ANS · {competenciaVidas(catalogo.inicio)}–{competenciaVidas(catalogo.fim)}</span></div>
      {carregando ? <p role="status" className="py-8 text-sm text-muted-foreground">Carregando {ano}…</p> : erro ? <div role="alert" className="py-8 text-sm text-destructive">{erro}<Button variant="outline" className="ml-3" onClick={() => setTentativa(t => t + 1)}>Tentar novamente</Button></div> : meses.length ? <>
        <div className="border-y border-border">
          <div className="px-4 py-3"><p className="text-xs text-muted-foreground">{ROTULOS_VIDAS.saldo} · {competenciaVidas(meses.at(-1)?.competencia ?? "")}</p><p className="mt-1 text-xl font-semibold tabular-nums">{nf(resumo.saldo)}</p></div>
        </div>
        <Bloco titulo="Gráfico" aberto={graficoAberto} alternar={() => setGraficoAberto(s => !s)}>
          <BenchVidasGrafico meses={meses} ano={ano} operadora={operadora} nome={atual?.nome} plano={planoAtual} segmentacao={segmentacao} />
        </Bloco>
        <Bloco titulo="Grid" aberto={gridAberto} alternar={() => setGridAberto(s => !s)} acao={<Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={baixar} aria-label="Baixar Bench Vidas em xlsx"><Download className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Baixar grid expandido (xlsx)</TooltipContent></Tooltip>}>
          <GridVidas key={`${operadora}-${ano}-${planoAtual}-${tipo}-${segmentacao}`} meses={meses} plano={planoAtual} tipo={tipo} planosPorMes={planosPorMes} />
          <p className="mt-2 text-xs text-muted-foreground">Saldo anual: último trimestre disponível, sem somar estoques. Quantidades de vínculos, não de pessoas únicas. Contratação combinada preservada sem distribuição entre PIF e PCE.</p>
        </Bloco>
      </> : <p role="status" className="py-8 text-sm text-muted-foreground">Nenhum registro para os filtros selecionados.</p>}
    </div>
    <nav aria-label="Anos do Bench Vidas" className="flex shrink-0 justify-center pb-2 pt-1"><div className="flex max-w-full flex-wrap items-center justify-center gap-0.5 rounded-full border border-border bg-card p-1.5 shadow-sm"><span className="px-3 text-sm font-semibold">Ano</span>{anos.map(a => <Button key={a} variant="ghost" aria-pressed={ano === a} onClick={() => setAno(a)} className={`h-8 rounded-full px-3 ${ano === a ? "bg-primary text-primary-foreground" : "text-foreground/70"}`}>{a}</Button>)}</div></nav>
  </div>;
}