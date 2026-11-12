import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronRight, Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip as Dica, XAxis, YAxis } from "recharts";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { base100, compararMensal, competenciaMensal, INDICADORES_MENSAL, totalPeriodo, valorIndicador, type CatalogoMensal, type Cubo, type Filtros, type IndicadorMensal } from "@/lib/benchVidasMensal";
import { carregarVidasMensal } from "@/lib/benchVidasMensalDados";

export type OpsComparar = { reg: string; nome: string; razaoSocial: string; mensal: boolean };
const CORES = ["--chart-vidas", "--chart-1", "--chart-4", "--chart-fin", "--chart-op", "--chart-desp", "--chart-copart", "--chart-adm"];
const cor = (i: number) => `hsl(var(${CORES[i % CORES.length]}))`;
const nf = (v: number | null | undefined) => v === null || v === undefined ? "—" : v.toLocaleString("pt-BR");
const sinal = (v: number | null | undefined) => v === null || v === undefined ? "—" : `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR")}`;
const pct = (v: number | null | undefined) => v === null || v === undefined ? "—" : `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const dicaEstilo = { background: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", fontSize: 12 };

function Bloco({ titulo, aberto, alternar, children, acao }: { titulo: string; aberto: boolean; alternar: () => void; children: ReactNode; acao?: ReactNode }) {
  return <section className="bench-panel shrink-0">
    <div className="bench-panel-heading flex items-center justify-between">
      <Button variant="ghost" onClick={alternar} aria-expanded={aberto} className="h-10 flex-1 justify-start gap-2 text-sm font-semibold"><ChevronRight className={`h-4 w-4 transition-transform motion-reduce:transition-none ${aberto ? "rotate-90" : ""}`} />{titulo}</Button>
      {aberto && acao}
    </div>
    {aberto && <div className="bench-panel-body">{children}</div>}
  </section>;
}

export default function BenchVidasComparar({ ops, catalogo, cubo, filtros, de, ate, anos, indicador }: { ops: OpsComparar[]; catalogo: CatalogoMensal; cubo: Cubo; filtros: Filtros; de: number; ate: number; anos: number[]; indicador: IndicadorMensal }) {
  const comDados = useMemo(() => ops.filter(o => o.mensal), [ops]);
  const semDados = ops.filter(o => !o.mensal);
  const [series, setSeries] = useState<{ reg: string; linhas: number[][] }[]>([]);
  const [carregando, setCarregando] = useState(true); const [erro, setErro] = useState(""); const [tentativa, setTentativa] = useState(0);
  const [graficosAbertos, setGraficosAbertos] = useState(true); const [gridAberto, setGridAberto] = useState(true);
  const [escala, setEscala] = useState<"vidas" | "base100">("vidas");
  const chave = comDados.map(o => o.reg).join(",");

  useEffect(() => {
    let ativo = true; setCarregando(true); setErro("");
    Promise.all(comDados.map(async o => ({ reg: o.reg, linhas: await carregarVidasMensal(o.reg, anos, cubo) })))
      .then(r => { if (ativo) setSeries(r); })
      .catch(() => { if (ativo) { setSeries([]); setErro("Não foi possível carregar a comparação das operadoras."); } })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, anos, cubo, tentativa]);

  const resultado = useMemo(() => compararMensal(series, cubo, catalogo, { de, ate, filtros }), [series, cubo, catalogo, de, ate, filtros]);
  const linhas = useMemo(() => {
    const porReg = new Map(comDados.map((o, i) => [o.reg, { ...o, i }]));
    return resultado.ops.filter(o => porReg.has(o.reg)).map(o => ({ ...o, op: porReg.get(o.reg)! }));
  }, [resultado, comDados]);
  const rotuloIndicador = INDICADORES_MENSAL.find(i => i.id === indicador)?.rotulo ?? "";
  const comps = resultado.competencias;
  const ultimo = comps.at(-1);

  const dadosLinha = useMemo(() => {
    const indices = new Map(linhas.map(l => [l.reg, base100(l.total, comps)]));
    return comps.map(c => Object.fromEntries([["mes", competenciaMensal(c)], ...linhas.map(l => [l.reg, escala === "base100" ? indices.get(l.reg)!.get(c) ?? null : l.total.get(c)?.ativos ?? null])]));
  }, [linhas, comps, escala]);
  const dadosMov = linhas.filter(l => l.resumo).map(l => ({ nome: l.op.nome, Adesões: l.resumo!.aderidos, Cancelamentos: l.resumo!.cancelados, Saldo: l.resumo!.aderidos - l.resumo!.cancelados }));
  const dadosCresc = linhas.filter(l => l.resumo).map(l => ({ nome: l.op.nome, i: l.op.i, Crescimento: l.resumo!.percentual === null ? null : Number(l.resumo!.percentual.toFixed(2)) }));

  const baixar = () => {
    const resumo = [["Operadora", "Registro ANS", "Início", "Ativos no início", "Adesões", "Cancelamentos", "Saldo", "Fim", "Ativos no fim", "Variação", "Variação %"],
      ...linhas.map(l => { const r = l.resumo; return [l.op.nome, l.reg, r ? competenciaMensal(r.inicio) : "", r?.ativosInicio ?? null, r?.aderidos ?? null, r?.cancelados ?? null, r ? r.aderidos - r.cancelados : null, r ? competenciaMensal(r.fim) : "", r?.ativosFim ?? null, r?.variacao ?? null, r?.percentual === null || !r ? null : Number(r.percentual.toFixed(2))]; })];
    const grid = [["Operadora", "Registro ANS", ...comps.map(competenciaMensal), indicador === "ativos" ? `Ativos ${ultimo ? competenciaMensal(ultimo) : ""}` : "Total"],
      ...linhas.map(l => [l.op.nome, l.reg, ...comps.map(c => { const m = l.total.get(c); return m ? valorIndicador(m, indicador) : null; }), totalPeriodo(l.total, l.competencias, indicador)])];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[`Comparação · ${competenciaMensal(de)}–${competenciaMensal(ate)}`], ...resumo]), "Resumo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[`${rotuloIndicador} · ${competenciaMensal(de)}–${competenciaMensal(ate)}`], ...grid]), "Grid");
    XLSX.writeFile(wb, `bench_vidas_comparar_${de}_${ate}.xlsx`);
  };

  if (comDados.length < 2) return <p role="status" className="py-8 text-sm text-muted-foreground">Inclua pelo menos duas operadoras com dados mensais para comparar.</p>;
  if (carregando) return <p role="status" className="py-8 text-sm text-muted-foreground">Carregando comparação de {comDados.length} operadoras…</p>;
  if (erro) return <div role="alert" className="py-8 text-sm text-destructive">{erro}<Button variant="outline" className="ml-3" onClick={() => setTentativa(t => t + 1)}>Tentar novamente</Button></div>;

  return <div className="space-y-3">
    <div aria-label="Operadoras comparadas" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {linhas.map(l => { const r = l.resumo; return <div key={l.reg} className="bench-kpi" style={{ "--bench-tone": `var(${CORES[l.op.i % CORES.length]})` } as CSSProperties} aria-label={`Resumo ${l.op.nome}`}>
        <p className="bench-kpi-title" title={`${l.op.razaoSocial} · ANS ${l.reg}`}><span className="truncate">{l.op.nome}</span><span className="shrink-0 font-normal text-muted-foreground">ANS {l.reg}</span></p>
        {r ? <>
          <p className="bench-kpi-value">{nf(r.ativosFim)}<span className="ml-1 text-sm font-medium">({sinal(r.variacao)} · {pct(r.percentual)})</span></p>
          <p className="bench-kpi-date">ativos em {competenciaMensal(r.fim)} · início {nf(r.ativosInicio)} em {competenciaMensal(r.inicio)}</p>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-xs tabular-nums">
            <div><dt className="text-muted-foreground">Adesões</dt><dd className="font-semibold">{nf(r.aderidos)}</dd></div>
            <div><dt className="text-muted-foreground">Cancelamentos</dt><dd className="font-semibold">{nf(r.cancelados)}</dd></div>
            <div><dt className="text-muted-foreground">Saldo</dt><dd className="font-semibold">{sinal(r.aderidos - r.cancelados)}</dd></div>
          </dl>
        </> : <p className="mt-3 text-sm text-muted-foreground">Sem registros no período e filtros.</p>}
      </div>; })}
    </div>
    {semDados.length > 0 && <p className="text-xs text-muted-foreground">Fora da comparação, sem dados mensais da ANS: {semDados.map(o => o.nome).join(", ")}.</p>}

    <Bloco titulo="Gráficos" aberto={graficosAbertos} alternar={() => setGraficosAbertos(s => !s)}>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">Evolução de ativos</span>
        <div role="group" aria-label="Escala da evolução" className="flex items-center gap-0.5 rounded-full border border-border bg-card p-1">
          {([["vidas", "Vidas"], ["base100", "Base 100"]] as const).map(([id, rotulo]) => <Button key={id} variant="ghost" aria-pressed={escala === id} onClick={() => setEscala(id)} className={`h-7 rounded-full px-3 text-xs ${escala === id ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "text-foreground/70"}`}>{rotulo}</Button>)}
        </div>
      </div>
      <div className="h-72 w-full" role="img" aria-label={`Evolução de ativos das operadoras comparadas, ${competenciaMensal(de)}–${competenciaMensal(ate)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dadosLinha} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} width={64} domain={["auto", "auto"]} stroke="hsl(var(--muted-foreground))" tickFormatter={v => Number(v).toLocaleString("pt-BR", { maximumFractionDigits: escala === "base100" ? 1 : 0 })} />
            {escala === "base100" && <ReferenceLine y={100} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 3" />}
            <Dica contentStyle={dicaEstilo} formatter={(v: number) => v === null ? "—" : v.toLocaleString("pt-BR", { maximumFractionDigits: escala === "base100" ? 1 : 0 })} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
            {linhas.map(l => <Line key={l.reg} name={l.op.nome} dataKey={l.reg} stroke={cor(l.op.i)} strokeWidth={l.op.i === 0 ? 2.5 : 1.5} dot={{ r: 2 }} connectNulls={false} isAnimationActive={false} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{escala === "base100" ? "Base 100: ativos de cada mês divididos pelos ativos do primeiro mês da operadora no período, para comparar ritmos de crescimento em portes diferentes." : "Ativos informados pela ANS no mês, por operadora."}</p>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold">Movimentos no período</p>
          <div className="h-64 w-full" role="img" aria-label="Adesões, cancelamentos e saldo por operadora">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosMov} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} interval={0} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} width={64} stroke="hsl(var(--muted-foreground))" tickFormatter={v => Number(v).toLocaleString("pt-BR")} />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                <Dica contentStyle={dicaEstilo} formatter={(v: number) => v.toLocaleString("pt-BR")} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Adesões" fill="hsl(var(--chart-fin))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Cancelamentos" fill="hsl(var(--chart-4))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Saldo" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Crescimento de ativos (%)</p>
          <div className="h-64 w-full" role="img" aria-label="Crescimento percentual de ativos por operadora">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosCresc} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} interval={0} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} width={56} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${Number(v).toLocaleString("pt-BR")}%`} />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                <Dica contentStyle={dicaEstilo} formatter={(v: number) => pct(v)} />
                <Bar dataKey="Crescimento" radius={[3, 3, 0, 0]}>{dadosCresc.map(d => <Cell key={d.nome} fill={cor(d.i)} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Crescimento: ativos no fim ÷ ativos no início do período − 1. Movimentos: soma das adesões e cancelamentos informados mês a mês.</p>
    </Bloco>

    <Bloco titulo={`Grid · ${rotuloIndicador} por operadora`} aberto={gridAberto} alternar={() => setGridAberto(s => !s)} acao={<Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={baixar} aria-label="Baixar comparação em xlsx"><Download className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Baixar comparação (xlsx)</TooltipContent></Tooltip>}>
      <div className="max-h-[28rem] overflow-auto">
        <table className="w-full border-collapse text-xs tabular-nums">
          <thead className="sticky top-0 z-10"><tr>
            <th className="sticky left-0 z-10 bg-secondary px-2 py-1.5 text-left font-semibold">Operadora</th>
            {comps.map(c => <th key={c} className="whitespace-nowrap px-2 py-1.5 text-right font-semibold">{competenciaMensal(c)}</th>)}
            <th className="whitespace-nowrap border-l border-border px-2 py-1.5 text-right font-semibold">{indicador === "ativos" ? `Ativos ${ultimo ? competenciaMensal(ultimo) : ""}` : "Total"}</th>
            {indicador === "ativos" && <th className="whitespace-nowrap px-2 py-1.5 text-right font-semibold">Variação</th>}
          </tr></thead>
          <tbody>
            {linhas.map(l => { const total = totalPeriodo(l.total, l.competencias, indicador); return <tr key={l.reg} className="border-b border-border/60">
              <td className="sticky left-0 max-w-64 bg-card px-2 py-1" title={`${l.op.razaoSocial} · ANS ${l.reg}`}><span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: cor(l.op.i) }} aria-hidden="true" />{l.op.nome}</td>
              {comps.map(c => { const m = l.total.get(c); const v = m ? valorIndicador(m, indicador) : null; return <td key={c} className="px-2 py-1 text-right">{indicador === "saldo" ? sinal(v) : nf(v)}</td>; })}
              <td className="border-l border-border px-2 py-1 text-right font-semibold">{indicador === "saldo" ? sinal(total) : nf(total)}</td>
              {indicador === "ativos" && <td className="px-2 py-1 text-right">{pct(l.resumo?.percentual)}</td>}
            </tr>; })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Mesmo período e filtros para todas as operadoras; os totais não somam operadoras entre si. Ativos: quantidade no mês, sem somar meses. Adesões e cancelamentos: movimentos informados pela ANS, somados no total. Quantidades de vínculos, não de pessoas únicas.</p>
    </Bloco>
  </div>;
}
