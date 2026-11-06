import { useEffect, useState } from "react";
import { ChartLine, GitCompareArrows, Layers, Layers2, Undo2 } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Tooltip as Dica, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import catalogo from "@/data/benchVidas/ans/catalogo.json";
import { adaptarVidasAns, carregarVidasAns, compararOperadorasVidasAns, escalaVidasAns, limitesPeriodoVidasAns, periodoPadraoVidasAns, planosDisponiveisAns } from "@/lib/benchVidasAns";
import { competenciaVidas, mesesBenchVidas, type MesVidas, type PlanoVidas } from "@/lib/benchVidas";

const modalidadesGrafico = [
  { plano: "PIF", cor: "hsl(var(--chart-1))" },
  { plano: "PCE", cor: "hsl(var(--chart-4))" },
  { plano: "PCA", cor: "hsl(var(--chart-fin))" },
] as const;

const coresComparacao = ["hsl(var(--chart-1))", "hsl(var(--chart-4))", "hsl(var(--chart-fin))", "hsl(var(--hospital-red))"];

export default function BenchVidasGrafico({ meses, ano, operadora, nome, plano, segmentacao, onDadosChange, opsSelecionadas }: { meses: MesVidas[]; ano: number; operadora: string; nome?: string; plano: string; segmentacao: string; onDadosChange: (dados: MesVidas[] | null) => void; opsSelecionadas: { reg: string; nome: string }[] }) {
  const [de, setDe] = useState(() => String(limitesPeriodoVidasAns(catalogo.anos).de));
  const [ate, setAte] = useState(() => String(limitesPeriodoVidasAns(catalogo.anos).ate));
  const [editandoPeriodo, setEditandoPeriodo] = useState(false);
  const [periodo, setPeriodo] = useState<{ de: number; ate: number } | null>(periodoPadraoVidasAns);
  const [serie, setSerie] = useState<MesVidas[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [mostrarModalidades, setMostrarModalidades] = useState(false);
  const [presentes, setPresentes] = useState<Record<string, PlanoVidas[]>>({});
  const [compararOps, setCompararOps] = useState(false);
  const [comparacao, setComparacao] = useState<ReturnType<typeof compararOperadorasVidasAns>>([]);
  const [carregandoOps, setCarregandoOps] = useState(false);
  const [erroOps, setErroOps] = useState("");
  useEffect(() => {
    if (!compararOps) return;
    let ativo = true;
    setCarregandoOps(true); setErroOps("");
    const intervalo = periodo ?? { de: ano, ate: ano };
    const selecionadas = new Set(opsSelecionadas.map(o => o.reg));
    Promise.all(catalogo.anos.filter(a => a >= intervalo.de && a <= intervalo.ate).map(async a => adaptarVidasAns((await carregarVidasAns(a)).filter(r => selecionadas.has(r[0])), new Map())))
      .then(partes => { if (ativo) setComparacao(compararOperadorasVidasAns(partes.flat(), [...selecionadas], intervalo.de, intervalo.ate, plano, segmentacao)); })
      .catch(() => { if (ativo) setErroOps("Não foi possível comparar as operadoras. Tente novamente."); })
      .finally(() => { if (ativo) setCarregandoOps(false); });
    return () => { ativo = false; };
  }, [compararOps, periodo, ano, opsSelecionadas, plano, segmentacao, tentativa]);
  useEffect(() => {
    if (!periodo) return;
    let ativo = true;
    setCarregando(true); setErro("");
    Promise.all(catalogo.anos.filter(a => a >= periodo.de && a <= periodo.ate).map(async a => {
      const registros = (await carregarVidasAns(a)).filter(r => r[0] === operadora);
      const dadosAno = adaptarVidasAns(registros, new Map());
      const mesesAno = mesesBenchVidas(dadosAno, operadora, a, plano, segmentacao);
      const disponiveis = planosDisponiveisAns(dadosAno, operadora, a, segmentacao).filter(p => plano === "todos" || p === plano);
      const porCompetencia = Object.fromEntries(mesesAno.map(m => [m.competencia, disponiveis.filter(p => dadosAno.some(r => r.competencia === m.competencia && r.plano === p && r.tipo === "saldo" && (segmentacao === "todos" || r.segmentacao === segmentacao)))]));
      return { meses: mesesAno, presentes: porCompetencia };
    })).then(partes => { if (ativo) { setSerie(partes.flatMap(p => p.meses).sort((a, b) => a.competencia.localeCompare(b.competencia))); setPresentes(Object.assign({}, ...partes.map(p => p.presentes))); } })
      .catch(() => { if (ativo) setErro("Não foi possível carregar o período. Tente novamente."); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [periodo, operadora, plano, segmentacao, tentativa]);
  const dados = periodo ? serie : meses;
  useEffect(() => {
    onDadosChange(carregando || erro ? null : dados);
  }, [dados, carregando, erro, onDadosChange]);
  const variosAnos = periodo !== null && periodo.de !== periodo.ate;
  const dadosPorCompetencia = new Map(dados.map(m => [m.competencia, m]));
  const pontos = compararOps && !carregandoOps && !erroOps ? comparacao.map(p => ({ ...dadosPorCompetencia.get(p.competencia), competencia: p.competencia, saldos: p.saldos })) : dados;
  const marcasAnuais = pontos.filter((m, i) => i === 0 || m.competencia.slice(0, 4) !== pontos[i - 1].competencia.slice(0, 4)).map(m => m.competencia);
  const escala = escalaVidasAns(compararOps && !carregandoOps && !erroOps ? Math.max(dados.at(-1)?.saldo ?? 0, ...opsSelecionadas.map(o => [...comparacao].reverse().find(p => p.saldos[o.reg] != null)?.saldos[o.reg] ?? 0)) : dados.at(-1)?.saldo ?? 0);
  const modalidades = modalidadesGrafico.filter(m => dados.some(d => presentes[d.competencia]?.includes(m.plano)));
  const invalido = Number(de) > Number(ate);
  const anos = (valor: string, alterar: (v: string) => void, label: string) => <label className="flex items-center gap-2 text-sm">{label}<Select value={valor} onValueChange={alterar}><SelectTrigger aria-label={`${label} ano do gráfico`} className="w-24"><SelectValue /></SelectTrigger><SelectContent>{catalogo.anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent></Select></label>;
  return <>
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <Button variant="outline" className="gap-2" aria-expanded={editandoPeriodo} onClick={() => { if (!editandoPeriodo) { const limites = limitesPeriodoVidasAns(catalogo.anos); setDe(String(limites.de)); setAte(String(limites.ate)); } setEditandoPeriodo(true); }}><ChartLine className="h-4 w-4" />Por Período</Button>
      {editandoPeriodo && <>
        {anos(de, setDe, "De")}{anos(ate, setAte, "Até")}
        <Button variant="outline" disabled={invalido || carregando} onClick={() => { setPeriodo({ de: Number(de), ate: Number(ate) }); setTentativa(t => t + 1); }}>Aplicar</Button>
      </>}
      <Button variant="outline" size="icon" aria-label="Desfazer período" title="Voltar ao ano atual" onClick={() => { const padrao = periodoPadraoVidasAns(); setDe(String(padrao.de)); setAte(String(padrao.ate)); setEditandoPeriodo(false); setPeriodo(padrao); setTentativa(t => t + 1); }}><Undo2 className="h-4 w-4" /></Button>
      <Dica><TooltipTrigger asChild><Button variant={mostrarModalidades ? "secondary" : "outline"} size="icon" aria-label={mostrarModalidades ? "Ocultar modalidades" : "Mostrar modalidades"} aria-pressed={mostrarModalidades} onClick={() => setMostrarModalidades(v => !v)}>{mostrarModalidades ? <Layers2 className="h-4 w-4" /> : <Layers className="h-4 w-4" />}</Button></TooltipTrigger><TooltipContent>{mostrarModalidades ? "Ocultar modalidades" : "Mostrar modalidades"}</TooltipContent></Dica>
      <Dica><TooltipTrigger asChild><Button variant={compararOps ? "secondary" : "outline"} size="icon" aria-label={compararOps ? "Ocultar comparação OPS" : "Mostrar comparação OPS"} aria-pressed={compararOps} onClick={() => setCompararOps(v => !v)}><GitCompareArrows className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>{compararOps ? "Ocultar comparação OPS" : "Comparar OPS"}</TooltipContent></Dica>
      <span className="ml-auto text-xs text-muted-foreground">Saldo de vidas · {periodo ? `${periodo.de}–${periodo.ate}` : ano}</span>
      {editandoPeriodo && invalido && <span role="alert" className="text-sm text-destructive">De deve ser anterior ou igual a Até.</span>}
    </div>
    {compararOps && carregandoOps && <p role="status" className="mb-2 text-xs text-muted-foreground">Carregando comparação…</p>}
    {compararOps && erroOps && <div role="alert" className="mb-2 text-sm text-destructive">{erroOps}<Button variant="ghost" onClick={() => setTentativa(t => t + 1)}>Tentar novamente</Button></div>}
    {carregando ? <div role="status" className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">Carregando gráfico…</div> : erro ? <div role="alert" className="flex h-[180px] items-center justify-center text-sm text-destructive">{erro}</div> : !dados.length ? <div role="status" className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">Nenhum registro no período selecionado.</div> : <>
      <div className="h-[180px] w-full" role="img" aria-label={`Evolução de Saldo de vidas de ${nome} em ${periodo ? `${periodo.de}–${periodo.ate}` : ano}`}>
        <ResponsiveContainer width="100%" height="100%"><LineChart data={pontos} margin={{ top: 16, right: 20, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="competencia" ticks={variosAnos ? marcasAnuais : undefined} tick={{ fontSize: 11 }} tickFormatter={v => variosAnos ? String(v).slice(0, 4) : competenciaVidas(String(v))} minTickGap={32} stroke="hsl(var(--muted-foreground))" /><YAxis width={70} domain={escala.dominio} ticks={escala.marcas} tick={{ fontSize: 11 }} interval={0} allowDataOverflow tickFormatter={v => Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} stroke="hsl(var(--muted-foreground))" />
          <Tooltip labelFormatter={v => competenciaVidas(String(v))} formatter={(v: number) => v.toLocaleString("pt-BR")} contentStyle={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }} />
          <Line type="monotone" name={compararOps ? `${nome} · ANS ${operadora}` : "Saldo de vidas"} dataKey="saldo" stroke="hsl(var(--chart-2))" strokeWidth={1.25} dot={{ r: 2 }} connectNulls={false} isAnimationActive={false} />
          {compararOps && !carregandoOps && !erroOps && opsSelecionadas.filter(o => o.reg !== operadora).map((o, i) => <Line key={o.reg} type="monotone" name={`${o.nome} · ANS ${o.reg}`} dataKey={p => p.saldos?.[o.reg] ?? null} stroke={coresComparacao[i % coresComparacao.length]} strokeDasharray={i >= coresComparacao.length ? "4 3" : undefined} strokeWidth={1.25} dot={{ r: 2 }} connectNulls={false} isAnimationActive={false} />)}
          {mostrarModalidades && modalidades.map(m => <Line key={m.plano} type="monotone" name={compararOps ? `${nome} · ${m.plano}` : m.plano} dataKey={(d: MesVidas) => presentes[d.competencia]?.includes(m.plano) ? d.planos?.[m.plano].saldo ?? null : null} stroke={m.cor} strokeWidth={1.25} dot={{ r: 2 }} connectNulls={false} isAnimationActive={false} />)}
          {(mostrarModalidades || compararOps) && <Legend iconType="plainline" wrapperStyle={{ fontSize: 11 }} />}
        </LineChart></ResponsiveContainer>
      </div>
    </>}
  </>;
}