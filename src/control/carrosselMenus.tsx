// Slides de outros menus (Carteira, Sinistralidade, Assistencial, Bench, Financeiro) no carrossel do Control.
// Cada slide carrega sozinho e reutiliza as consultas e regras das telas; falhas só omitem o slide.
import { useEffect, useMemo, useState, type ReactElement } from "react";
import { Bar, BarChart, CartesianGrid, ComposedChart, LabelList, Legend, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { hostinger } from "@/lib/hostingerClient";
import { supabase } from "@/integrations/supabase/client";
import { carregarUltimaCompetenciaValida, totaisDoAno } from "@/lib/sinistralidadeValida";
import { ultimos12Sinistralidade, vidasPorUf, rotuloMes } from "./carrosselMenusRegras";
import catalogoJson from "@/data/benchVidas/mensal/catalogo.json";
import { compararMensal, periodoPadrao, competenciaMensal, type CatalogoMensal } from "@/lib/benchVidasMensal";
import { carregarVidasMensal } from "@/lib/benchVidasMensalDados";
import { agrupar, COLUNAS_CR, consolidarTitulos, medir, normalizarLinha, pctInadimplencia } from "@/lib/inadimplencia";

export type SlideMenu = { title: string; subtitle: string; chart: ReactElement };
const catalogo = catalogoJson as unknown as CatalogoMensal & { competencias: string[] };
const OPS: [string, string][] = [["366561", "Bensaúde"], ["327417", "Austaclínicas"], ["350249", "H.B. Saúde"], ["335100", "Unimed Rio Preto"]];
const CORES = ["#2563eb", "#f59e0b", "#a855f7", "#ef4444"];
const int = (v: number) => Math.round(v).toLocaleString("pt-BR");
const mi = (v: number) => `${(v / 1e6).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`;
const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const pct = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const tipStyle = { borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" };
const eixo = { axisLine: false, tickLine: false } as const;
const hoje = () => new Date().toISOString().slice(0, 10);

async function slideCarteira(): Promise<SlideMenu> {
  const data = hoje();
  const { data: rows, error } = await hostinger.rpc("carteira_trial_geo", { p_data: data });
  if (error) throw error;
  const dados = vidasPorUf(((rows ?? []) as { uf: string; ativos: number }[]).map((r) => ({ uf: String(r.uf ?? "").trim().toUpperCase(), ativos: Number(r.ativos) || 0 })));
  const total = dados.reduce((s, d) => s + d.vidas, 0);
  return { title: "Carteira · Vidas ativas por estado", subtitle: `Carteira › Área Geográfica · ativos em ${data.split("-").reverse().join("/")} · ${int(total)} vidas`, chart: (
    <BarChart data={dados} margin={{ top: 32, right: 24, left: 8, bottom: 0 }}>
      <CartesianGrid vertical={false} strokeDasharray="4 6" opacity={0.25} /><XAxis dataKey="uf" {...eixo} tickMargin={10} /><YAxis {...eixo} width={70} tickFormatter={int} />
      <Tooltip formatter={(v: number) => [int(v), "Vidas"]} contentStyle={tipStyle} />
      <Bar dataKey="vidas" name="Vidas" fill="#3b82f6" radius={[8, 8, 0, 0]} isAnimationActive={false}><LabelList dataKey="vidas" position="top" formatter={int} fontSize={12} fontWeight={600} /></Bar>
    </BarChart>) };
}

async function dadosSinistralidade() {
  const ultima = await carregarUltimaCompetenciaValida();
  if (!ultima) throw new Error("Sem competência válida.");
  const totais = (await Promise.all([ultima.ano - 1, ultima.ano].map(totaisDoAno))).flat();
  return { ultima, serie: ultimos12Sinistralidade(totais, ultima) };
}

function slideSinistralidade({ ultima, serie }: Awaited<ReturnType<typeof dadosSinistralidade>>): SlideMenu {
  return { title: "Sinistralidade · Últimos 12 meses", subtitle: `Sinistralidade › Períodos · até ${rotuloMes(ultima.ano, ultima.mes)} · despesas ÷ receitas`, chart: (
    <LineChart data={serie} margin={{ top: 32, right: 32, left: 8, bottom: 0 }}>
      <CartesianGrid vertical={false} strokeDasharray="4 6" opacity={0.25} /><XAxis dataKey="mes" {...eixo} tickMargin={10} /><YAxis {...eixo} width={60} tickFormatter={(v) => `${v}%`} domain={["dataMin - 5", "dataMax + 5"]} allowDecimals={false} />
      <Tooltip formatter={(v: number) => [pct(v), "Sinistralidade"]} contentStyle={tipStyle} />
      <ReferenceLine y={100} stroke="#dc2626" strokeDasharray="6 4" ifOverflow="hidden" />
      <Line type="monotone" dataKey="Sinistralidade" stroke="#2563eb" strokeWidth={4} dot={{ r: 5 }} isAnimationActive={false}><LabelList dataKey="Sinistralidade" position="top" formatter={pct} fontSize={12} fontWeight={600} /></Line>
    </LineChart>) };
}

function slideAssistencial({ ultima, serie }: Awaited<ReturnType<typeof dadosSinistralidade>>): SlideMenu {
  return { title: "Assistencial · Receitas x Despesas assistenciais", subtitle: `Últimos 12 meses até ${rotuloMes(ultima.ano, ultima.mes)} · view_eard_mensal`, chart: (
    <ComposedChart data={serie} margin={{ top: 24, right: 24, left: 8, bottom: 0 }}>
      <CartesianGrid vertical={false} strokeDasharray="4 6" opacity={0.25} /><XAxis dataKey="mes" {...eixo} tickMargin={10} /><YAxis {...eixo} width={70} tickFormatter={mi} />
      <Tooltip formatter={(v: number, n: string) => [brl(v), n]} contentStyle={tipStyle} /><Legend />
      <Bar dataKey="Receitas" fill="#60a5fa" radius={[6, 6, 0, 0]} isAnimationActive={false} />
      <Bar dataKey="Despesas" fill="#f87171" radius={[6, 6, 0, 0]} isAnimationActive={false} />
    </ComposedChart>) };
}

async function slideBench(): Promise<SlideMenu> {
  const comps = catalogo.competencias.map(Number);
  const { de, ate } = periodoPadrao(comps);
  const anos = [...new Set([Math.floor(de / 100), Math.floor(ate / 100)])];
  const series = await Promise.all(OPS.map(async ([reg]) => ({ reg, linhas: await carregarVidasMensal(reg, anos, "A") })));
  const r = compararMensal(series, "A", catalogo, { de, ate, filtros: {} });
  const dados = r.competencias.map((c) => Object.fromEntries([["mes", competenciaMensal(c)], ...r.ops.map((o) => [OPS.find(([g]) => g === o.reg)![1], o.total.get(c)?.ativos ?? null])]));
  return { title: "Bench · Vidas ativas por operadora", subtitle: `Bench › Vidas · ANS mensal ${competenciaMensal(de)}–${competenciaMensal(ate)} · saúde e odonto`, chart: (
    <LineChart data={dados} margin={{ top: 24, right: 32, left: 8, bottom: 0 }}>
      <CartesianGrid vertical={false} strokeDasharray="4 6" opacity={0.25} /><XAxis dataKey="mes" {...eixo} tickMargin={10} /><YAxis {...eixo} width={80} tickFormatter={int} />
      <Tooltip formatter={(v: number, n: string) => [int(v), n]} contentStyle={tipStyle} /><Legend />
      {OPS.map(([, nome], i) => <Line key={nome} type="monotone" dataKey={nome} stroke={CORES[i]} strokeWidth={i === 0 ? 4 : 2.5} dot={false} connectNulls={false} isAnimationActive={false} />)}
    </LineChart>) };
}

async function lerContas() {
  const ler = async (dw: boolean) => {
    const linhas: Record<string, unknown>[] = [];
    for (let de = 0; ; de += 1000) {
      const q = dw ? hostinger.from("contas_a_receber").select(COLUNAS_CR).order("cd_itcon_rec").order("dt_recebimento", { nullsFirst: true }).order("vl_recebido")
        : supabase.from("financeiro_contas_receber").select(COLUNAS_CR).order("id");
      const { data, error } = await q.range(de, de + 999);
      if (error) throw error;
      linhas.push(...((data ?? []) as unknown as Record<string, unknown>[]));
      if (!data || data.length < 1000) break;
    }
    return linhas;
  };
  try { return await ler(true); } catch (e) { if (["PGRST205", "42P01"].includes(String((e as { code?: string })?.code))) return ler(false); throw e; }
}

async function slideFinanceiro(): Promise<SlideMenu> {
  const posicao = hoje();
  const titulos = consolidarTitulos((await lerContas()).map(normalizarLinha));
  const grupos = agrupar(medir(titulos, posicao), ["competencia"], posicao).slice(-12);
  const dados = grupos.map((g) => ({ mes: g.rotulo, "Em aberto": g.metricas.emAberto, Inadimplência: (pctInadimplencia(g.metricas) ?? 0) * 100 }));
  return { title: "Financeiro · Inadimplência por competência", subtitle: `Financeiro › Inadimplência · posição em ${posicao.split("-").reverse().join("/")} · valor em aberto e % sobre o a receber`, chart: (
    <ComposedChart data={dados} margin={{ top: 32, right: 24, left: 8, bottom: 0 }}>
      <CartesianGrid vertical={false} strokeDasharray="4 6" opacity={0.25} /><XAxis dataKey="mes" {...eixo} tickMargin={10} />
      <YAxis yAxisId="v" {...eixo} width={80} tickFormatter={(v) => brl(v).replace(/,\d+$/, "")} /><YAxis yAxisId="p" orientation="right" {...eixo} width={50} tickFormatter={(v) => `${v}%`} />
      <Tooltip formatter={(v: number, n: string) => [n === "Inadimplência" ? pct(v) : brl(v), n]} contentStyle={tipStyle} /><Legend />
      <Bar yAxisId="v" dataKey="Em aberto" fill="#fca5a5" radius={[6, 6, 0, 0]} isAnimationActive={false} />
      <Line yAxisId="p" type="monotone" dataKey="Inadimplência" stroke="#dc2626" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false}><LabelList dataKey="Inadimplência" position="top" formatter={pct} fontSize={11} fontWeight={600} /></Line>
    </ComposedChart>) };
}

/** Ordem do menu lateral: Carteira, Sinistralidade, Assistencial, Bench, Financeiro. */
export function useSlidesMenus() {
  const [slides, setSlides] = useState<(SlideMenu | null)[]>([null, null, null, null, null]);
  useEffect(() => {
    let vivo = true;
    const por = (i: number, p: Promise<SlideMenu>) => p.then((s) => { if (vivo) setSlides((xs) => xs.map((x, j) => (j === i ? s : x))); }).catch(() => {});
    const sin = dadosSinistralidade();
    por(0, slideCarteira());
    por(1, sin.then(slideSinistralidade));
    por(2, sin.then(slideAssistencial));
    por(3, slideBench());
    por(4, slideFinanceiro());
    return () => { vivo = false; };
  }, []);
  return useMemo(() => slides.filter((s): s is SlideMenu => s !== null), [slides]);
}
