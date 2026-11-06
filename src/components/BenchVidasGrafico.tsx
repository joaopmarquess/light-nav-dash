import { useEffect, useState } from "react";
import { ChartLine, Undo2 } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import catalogo from "@/data/benchVidas/ans/catalogo.json";
import { adaptarVidasAns, carregarVidasAns, escalaVidasAns, periodoPadraoVidasAns } from "@/lib/benchVidasAns";
import { competenciaVidas, mesesBenchVidas, type MesVidas } from "@/lib/benchVidas";

export default function BenchVidasGrafico({ meses, ano, operadora, nome, plano, segmentacao, onDadosChange }: { meses: MesVidas[]; ano: number; operadora: string; nome?: string; plano: string; segmentacao: string; onDadosChange: (dados: MesVidas[] | null) => void }) {
  const [de, setDe] = useState(() => String(periodoPadraoVidasAns().de));
  const [ate, setAte] = useState(() => String(periodoPadraoVidasAns().ate));
  const [editandoPeriodo, setEditandoPeriodo] = useState(false);
  const [periodo, setPeriodo] = useState<{ de: number; ate: number } | null>(periodoPadraoVidasAns);
  const [serie, setSerie] = useState<MesVidas[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    if (!periodo) return;
    let ativo = true;
    setCarregando(true); setErro("");
    Promise.all(catalogo.anos.filter(a => a >= periodo.de && a <= periodo.ate).map(async a => {
      const registros = (await carregarVidasAns(a)).filter(r => r[0] === operadora);
      return mesesBenchVidas(adaptarVidasAns(registros, new Map()), operadora, a, plano, segmentacao);
    })).then(partes => { if (ativo) setSerie(partes.flat().sort((a, b) => a.competencia.localeCompare(b.competencia))); })
      .catch(() => { if (ativo) setErro("Não foi possível carregar o período. Tente novamente."); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [periodo, operadora, plano, segmentacao, tentativa]);
  const dados = periodo ? serie : meses;
  useEffect(() => {
    onDadosChange(carregando || erro ? null : dados);
  }, [dados, carregando, erro, onDadosChange]);
  const variosAnos = periodo !== null && periodo.de !== periodo.ate;
  const marcasAnuais = dados.filter((m, i) => i === 0 || m.ano !== dados[i - 1].ano).map(m => m.competencia);
  const escala = escalaVidasAns(dados.at(-1)?.saldo ?? 0);
  const invalido = Number(de) > Number(ate);
  const anos = (valor: string, alterar: (v: string) => void, label: string) => <label className="flex items-center gap-2 text-sm">{label}<Select value={valor} onValueChange={alterar}><SelectTrigger aria-label={`${label} ano do gráfico`} className="w-24"><SelectValue /></SelectTrigger><SelectContent>{catalogo.anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent></Select></label>;
  return <>
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <Button variant="outline" className="gap-2" aria-expanded={editandoPeriodo} onClick={() => setEditandoPeriodo(true)}><ChartLine className="h-4 w-4" />Por Período</Button>
      {editandoPeriodo && <>
        {anos(de, setDe, "De")}{anos(ate, setAte, "Até")}
        <Button variant="outline" disabled={invalido || carregando} onClick={() => { setPeriodo({ de: Number(de), ate: Number(ate) }); setTentativa(t => t + 1); }}>Aplicar</Button>
      </>}
      <Button variant="outline" size="icon" aria-label="Desfazer período" title="Voltar ao ano atual" onClick={() => { const padrao = periodoPadraoVidasAns(); setDe(String(padrao.de)); setAte(String(padrao.ate)); setEditandoPeriodo(false); setPeriodo(padrao); setTentativa(t => t + 1); }}><Undo2 className="h-4 w-4" /></Button>
      {editandoPeriodo && invalido && <span role="alert" className="text-sm text-destructive">De deve ser anterior ou igual a Até.</span>}
    </div>
    {carregando ? <div role="status" className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">Carregando gráfico…</div> : erro ? <div role="alert" className="flex h-[180px] items-center justify-center text-sm text-destructive">{erro}</div> : !dados.length ? <div role="status" className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">Nenhum registro no período selecionado.</div> : <>
      <div className="mb-2 text-xs text-muted-foreground">Saldo de vidas · {periodo ? `${periodo.de}–${periodo.ate}` : ano}</div>
      <div className="h-[180px] w-full" role="img" aria-label={`Evolução de Saldo de vidas de ${nome} em ${periodo ? `${periodo.de}–${periodo.ate}` : ano}`}>
        <ResponsiveContainer width="100%" height="100%"><LineChart data={dados.map(m => ({ ...m, label: competenciaVidas(m.competencia) }))} margin={{ top: 16, right: 20, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="competencia" ticks={variosAnos ? marcasAnuais : undefined} tickFormatter={v => variosAnos ? String(v).slice(0, 4) : competenciaVidas(String(v))} minTickGap={32} stroke="hsl(var(--muted-foreground))" /><YAxis width={70} domain={escala.dominio} ticks={escala.marcas} interval={0} allowDataOverflow tickFormatter={v => Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} stroke="hsl(var(--muted-foreground))" />
          <Tooltip labelFormatter={v => competenciaVidas(String(v))} formatter={(v: number) => v.toLocaleString("pt-BR")} contentStyle={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }} />
          <Line type="monotone" name="Saldo de vidas" dataKey="saldo" stroke="hsl(var(--primary))" strokeWidth={1.25} dot={{ r: 2 }} isAnimationActive={false} />
        </LineChart></ResponsiveContainer>
      </div>
    </>}
  </>;
}