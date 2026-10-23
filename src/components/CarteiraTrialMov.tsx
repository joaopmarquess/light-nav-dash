import { useEffect, useMemo, useRef, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { type BlocoMes, type TransfPar, type TipoReentrada } from "@/lib/transferencias";
import { podeCalcularMovimentacao, resumoMovimentacao } from "@/lib/movimentacaoResumo";
import { normalizarVendedor } from "@/lib/vendedorTransferencia";
import { mesesMovimentacao, ultimosMesesMovimentacao, somarTotaisMovimentacao, fluxoMensalMovimentacao, fechamentosMensaisMovimentacao, combinarFluxosEVidas, type VidasMensais, type FluxoMensal, type TotaisMovimentacao } from "@/lib/movimentacaoCarga";
import MovimentacaoCrescimentoMensal from "@/components/MovimentacaoCrescimentoMensal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, UserPlus, UserMinus, Scale, RotateCcw, ArrowRightLeft, LogIn, LogOut, Users, Eye, EyeOff, LoaderCircle } from "lucide-react";

type Row = Record<string, any>;
type Tipo = "Entrada" | "Reativação" | "Saída" | "T+" | "T-";
type Ev = { data: string; tipo: Tipo; r: Row; par?: TransfPar };
const LIMITE = 30000;

const hojeISO = () => new Date().toISOString().slice(0, 10);
const inicioMes = () => hojeISO().slice(0, 8) + "01";
const dia = (v: any) => (v ? String(v).slice(0, 10) : "");
const fmtD = (v: string) => (v ? v.split("-").reverse().join("/") : "—");
const num = (n: number) => n.toLocaleString("pt-BR");
const fmtMat = (v: any) => {
  const d = String(v ?? "").replace(/\D/g, "");
  if (d.length <= 8) return d || "—";
  const r = d.slice(-8);
  return `${Number(d.slice(0, -8))}/${r.slice(0, 6)}-${r.slice(6)}`;
};
const fmtCpf = (v: string) => { const d = v.replace(/\D/g, "").padStart(11, "0"); return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`; };
const addMes = (d: string, n: number) => { const x = new Date(d.slice(0, 7) + "-01T12:00:00"); x.setMonth(x.getMonth() + n); return x.toISOString().slice(0, 10); };


type F = { de: string; ate: string };
// Padrão: 01/01 do ano atual até o último dia do mês anterior (em janeiro, até hoje).
const EMPTY = (): F => {
  const h = hojeISO(), de = h.slice(0, 4) + "-01-01";
  const u = new Date(inicioMes() + "T12:00:00"); u.setDate(0);
  const ate = u.toISOString().slice(0, 10);
  return { de, ate: ate < de ? h : ate };
};
type Sel = { tipo: Tipo; sub?: TipoReentrada; bloco?: BlocoMes } | null;

export default function CarteiraTrialMov() {
  const [f, setF] = useState<F>(EMPTY());
  const [ap, setAp] = useState<F | null>(null);
  const [mesSelecionado, setMesSelecionado] = useState<F | null>(null);
  const periodoIndicadores = mesSelecionado ?? ap;
  const [totaisMensais, setTotaisMensais] = useState<Record<string, TotaisMovimentacao>>({});
  const [vidasSelecionadas, setVidasSelecionadas] = useState<{ ant: number | null; fin: number | null }>({ ant: null, fin: null });
  const cacheVidas = useRef(new Map<string, Promise<number>>());
  const cacheDetalhes = useRef(new Map<string, Ev[]>());
  const [evs, setEvs] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [cortado, setCortado] = useState(false);
  const [vidas, setVidas] = useState<{ ant: number | null; fin: number | null }>({ ant: null, fin: null });
  const [sel, setSel] = useState<Sel>(null);
  const [depuracaoAberta, setDepuracaoAberta] = useState(false);
  const [totais, setTotais] = useState<TotaisMovimentacao | null>(null);
  const [mensal, setMensal] = useState<FluxoMensal[]>([]);
  const [vidasMensais, setVidasMensais] = useState<VidasMensais[]>([]);
  const [mensalLoading, setMensalLoading] = useState(false);
  const [mensalErro, setMensalErro] = useState<string | null>(null);
  const dadosGrafico = useMemo(() => combinarFluxosEVidas(mensal, vidasMensais), [mensal, vidasMensais]);
  const [detalhesLoading, setDetalhesLoading] = useState(false);
  const [detalhesErro, setDetalhesErro] = useState<string | null>(null);
  const [detalhesProntos, setDetalhesProntos] = useState(false);
  const [detalhesEtapa, setDetalhesEtapa] = useState("");
  useEffect(() => {
    if (!podeCalcularMovimentacao(ap)) return;
    let off = false;
    setLoading(true); setErr(null); setTotais(null); setMensal([]); setTotaisMensais({});
    (async () => {
      try {
        const meses = mesesMovimentacao(ap);
        const rows: Row[] = [];
        for (let i = 0; i < meses.length; i += 2) {
          if (off) return;
          setEtapa(`Calculando mês ${Math.min(i + 2, meses.length)} de ${meses.length}…`);
          const res = await Promise.all(meses.slice(i, i + 2).map(async m => {
            const { data, error } = await hostinger.rpc("carteira_movimentacao_totais", { p_de: m.de, p_ate: m.ate });
            if (error) throw new Error(error.code === "PGRST202" || error.code === "42883"
              ? "A função de totais ainda precisa ser instalada na base da carteira."
              : error.message);
            const row = Array.isArray(data) ? data[0] : data;
            if (!row) throw new Error("A função de totais não retornou os resultados do período.");
            return row as Row;
          }));
          rows.push(...res);
        }
        if (!off) {
          setTotais(somarTotaisMovimentacao(rows));
          setTotaisMensais(Object.fromEntries(rows.map((row, indice) => [meses[indice].de.slice(0, 7), somarTotaisMovimentacao([row])])));
          setMensal(rows.map((row, indice) => fluxoMensalMovimentacao(meses[indice].de.slice(0, 7), row)));
        }
      } catch (e: any) { if (!off) setErr(e.message); }
      finally { if (!off) setLoading(false); }
    })();
    return () => { off = true; };
  }, [ap]);
  // Movimentação calculada na base pela função carteira_movimentacao (regra de transferência no servidor).
  const precisaDetalhes = depuracaoAberta || sel !== null;
  useEffect(() => {
    if (!podeCalcularMovimentacao(periodoIndicadores) || !precisaDetalhes || detalhesProntos || !totais) return;
    const chave = `${periodoIndicadores.de}/${periodoIndicadores.ate}`;
    const cached = cacheDetalhes.current.get(chave);
    if (cached) { setEvs(cached); setDetalhesProntos(true); setDetalhesLoading(false); return; }
    let off = false;
    (async () => {
      setDetalhesLoading(true); setDetalhesErro(null); setEvs([]); setCortado(false); setDetalhesEtapa("Carregando detalhes…");
      const rows: Row[] = [];
      // Divide o período em meses: cada mês é independente (a função liga ±1 mês), evitando tempo esgotado.
      const meses = mesesMovimentacao(periodoIndicadores);
      const pag = (m: F, from: number) => hostinger.rpc("carteira_movimentacao", { p_de: m.de, p_ate: m.ate })
        .order("tipo").order("data").order("mat").range(from, from + 999);
      const doMes = async (m: F) => {
        const out: Row[] = [];
        for (let from = 0; ; from += 1000) {
          if (off) return out;
          let r = await pag(m, from);
          if (r.error) r = await pag(m, from);
          if (r.error) throw new Error(r.error.message);
          out.push(...((r.data as Row[]) ?? []));
          if (((r.data as Row[]) ?? []).length < 1000) break;
        }
        return out;
      };
      try {
        for (let i = 0; i < meses.length; i += 2) {
          setDetalhesEtapa(`Carregando detalhes: mês ${Math.min(i + 2, meses.length)} de ${meses.length}…`);
          const res = await Promise.all(meses.slice(i, i + 2).map(doMes));
          if (off) return;
          for (const r of res) rows.push(...r);
        }
      } catch (e: any) { if (!off) { setDetalhesErro(e.message); setDetalhesLoading(false); } return; }
      const out: Ev[] = rows.map((x) => {
        const r = normalizarVendedor({ cd_mat_alternativa: x.mat, nm_beneficiario: x.nome, nm_empresa_estipulante: x.empresa, nm_vendedor: x.nm_vendedor, cd_vendedor: x.cd_vendedor, nr_cpf: x.cpf });
        const par: TransfPar | undefined = x.tipo === "T+" || x.tipo === "T-" ? {
          cpf: String(x.cpf ?? ""), nome: x.nome ?? "", matAnterior: String(x.mat_anterior ?? ""), saida: dia(x.saida), motivo: x.motivo,
          matNova: String(x.mat_nova ?? ""), entrada: dia(x.entrada), vendedor: x.cd_vendedor_novo, nmVendedor: x.nm_vendedor_novo, tipo: x.tipo_reentrada as TipoReentrada,
        } : undefined;
        return { tipo: x.tipo as Tipo, data: dia(x.data), r, par };
      });
      if (!off) { cacheDetalhes.current.set(chave, out); setEvs(out); setDetalhesProntos(true); setDetalhesLoading(false); }
    })();
    return () => { off = true; };
  }, [periodoIndicadores, precisaDetalhes, detalhesProntos, totais]);

  const consultarVidas = (d: string): Promise<number> => {
    const cached = cacheVidas.current.get(d);
    if (cached) return cached;
    const request = Promise.resolve(hostinger.rpc("carteira_trial_kpis", { p_data: d, p_q: null, p_empresa: null, p_cidade: null }))
      .then(({ data, error }: any) => {
        if (error) throw new Error(error.message);
        const r = Array.isArray(data) ? data[0] : data;
        if (r?.ativos == null) throw new Error("Não foi possível consultar as vidas ativas.");
        return Number(r.ativos);
      }).catch((error: Error) => { cacheVidas.current.delete(d); throw error; });
    cacheVidas.current.set(d, request);
    return request;
  };
  useEffect(() => {
    setVidasSelecionadas({ ant: null, fin: null });
    if (!mesSelecionado) return;
    let off = false;
    const anterior = new Date(`${mesSelecionado.de}T00:00:00Z`);
    anterior.setUTCDate(anterior.getUTCDate() - 1);
    const final = new Date(`${mesSelecionado.ate}T00:00:00Z`);
    final.setUTCDate(final.getUTCDate() + 1);
    Promise.all([consultarVidas(anterior.toISOString().slice(0, 10)), consultarVidas(final.toISOString().slice(0, 10))])
      .then(([ant, fin]) => { if (!off) setVidasSelecionadas({ ant, fin }); })
      .catch((e: Error) => { if (!off) setErr(e.message); });
    return () => { off = true; };
  }, [mesSelecionado]);

  const dAnt = useMemo(() => { if (!ap) return ""; const d = new Date(ap.de + "T12:00:00"); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); }, [ap?.de]);
  const dFin = useMemo(() => { if (!ap) return ""; const d = new Date(ap.ate + "T12:00:00"); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); }, [ap?.ate]);
  useEffect(() => {
    let off = false;
    setVidas({ ant: null, fin: null });
    setVidasMensais([]); setMensalLoading(false); setMensalErro(null);
    if (!podeCalcularMovimentacao(ap)) return;
    const at = consultarVidas;
    Promise.all([at(dAnt), at(dFin)]).then(([ant, fin]) => { if (!off) setVidas({ ant, fin }); })
      .catch((e: Error) => { if (!off) setErr(e.message); });
    setMensalLoading(true);
    (async () => {
      try {
        const datas = fechamentosMensaisMovimentacao(ap);
        const pontos: VidasMensais[] = [];
        for (let i = 0; i < datas.length; i += 2) {
          if (off) return;
          pontos.push(...await Promise.all(datas.slice(i, i + 2).map(async data => ({ mes: data.slice(0, 7), data, vidas: await at(data) }))));
        }
        if (!off) setVidasMensais(pontos);
      } catch (e: any) { if (!off) setMensalErro(e.message); }
      finally { if (!off) setMensalLoading(false); }
    })();
    return () => { off = true; };
  }, [ap, dAnt, dFin]);

  const kpi = (mesSelecionado ? totaisMensais[mesSelecionado.de.slice(0, 7)] : totais) ?? { e: 0, r: 0, s: 0, tp: 0, tm: 0 };
  const vidasIndicadores = mesSelecionado ? vidasSelecionadas : vidas;
  const resumo = resumoMovimentacao(kpi.e, kpi.s, kpi.r, kpi.tp, kpi.tm);

  const bl = (x: Ev): BlocoMes | null => {
    if (!x.par) return null;
    if (x.par.saida.slice(0, 7) === x.par.entrada.slice(0, 7)) return "mesmo";
    return x.tipo === "T+" ? "anterior" : "proximo";
  };
  const lista = useMemo(
    () => (sel ? evs.filter((x) => x.tipo === sel.tipo && (!sel.sub || x.par?.tipo === sel.sub) && (!sel.bloco || bl(x) === sel.bloco)).sort((a, b) => b.data.localeCompare(a.data)) : []),
    [evs, sel],
  );
  const isT = sel?.tipo === "T+" || sel?.tipo === "T-";
  const same = (t: Tipo, sub?: TipoReentrada, bloco?: BlocoMes) => sel?.tipo === t && sel?.sub === sub && sel?.bloco === bloco;
  const toggle = (t: Tipo, sub?: TipoReentrada, bloco?: BlocoMes) => setSel(same(t, sub, bloco) ? null : { tipo: t, sub, bloco });
  const nB = (t: Tipo, b: BlocoMes, sub?: TipoReentrada) => evs.filter((x) => x.tipo === t && bl(x) === b && (!sub || x.par?.tipo === sub)).length;
  const resetDetalhes = () => { setDepuracaoAberta(false); setSel(null); setEvs([]); setDetalhesProntos(false); setDetalhesErro(null); setDetalhesLoading(false); };
  const buscar = () => { if (podeCalcularMovimentacao(f)) { resetDetalhes(); cacheVidas.current.clear(); cacheDetalhes.current.clear(); setMesSelecionado(null); setAp({ ...f }); } };
  const limpar = () => { resetDetalhes(); setMesSelecionado(null); cacheVidas.current.clear(); cacheDetalhes.current.clear(); setTotais(null); setMensal([]); setTotaisMensais({}); setF(EMPTY()); setAp(null); setErr(null); setLoading(false); setVidas({ ant: null, fin: null }); };
  const selecionarMes = (mes: F | null) => { resetDetalhes(); setErr(null); setMesSelecionado(mes); };
  const v = (n: number) => (detalhesLoading || !detalhesProntos ? "…" : num(n));

  const card = (label: string, value: number | null, Icon: typeof Users, negative = false, tipo: Tipo | null = null, neutral = false) => (
    <div className="relative min-w-0">
    <Button variant="outline" title={label} disabled={Boolean(tipo) && (loading || !totais)} onClick={() => tipo && toggle(tipo)}
      className={`h-36 w-full flex-col items-center justify-center gap-4 rounded-lg border-l-[6px] bg-card px-5 text-center whitespace-normal ${neutral ? "border-l-muted-foreground" : negative ? "border-l-destructive" : "border-l-primary"} ${tipo && same(tipo) ? "ring-2 ring-primary" : ""}`}>
      <span className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground"><Icon className="h-4 w-4 shrink-0" />{label}</span>
      <span className={`text-2xl font-bold tabular-nums ${neutral ? "text-foreground" : negative ? "text-destructive" : "text-primary"}`}>{loading || value == null || (!neutral && !totais) ? "…" : num(value)}</span>
    </Button>
    {label === "Transferências Líq." && <Button variant="ghost" size="icon" disabled={loading || !totais}
      className="absolute right-1 top-1 h-7 w-7 text-muted-foreground"
      aria-label={depuracaoAberta ? "Ocultar depuração" : "Abrir depuração"}
      title={depuracaoAberta ? "Ocultar depuração" : "Abrir depuração"}
      aria-expanded={depuracaoAberta} aria-controls="depuracao-transferencias"
      onClick={() => { setDepuracaoAberta(aberta => !aberta); if (isT) setSel(null); }}>
      {depuracaoAberta ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
    </Button>}
    </div>
  );

  const quadro = (tipo: "T+" | "T-") => {
    const entrada = tipo === "T+";
    const linhas: { label: string; bloco: BlocoMes; dica: string }[] = entrada ? [
      { label: "Entrou vindo do mês anterior", bloco: "anterior", dica: "Saída no mês anterior à nova entrada" },
      { label: "Entrou no mesmo mês", bloco: "mesmo", dica: "Saída e nova entrada no mesmo mês" },
    ] : [
      { label: "Saiu no mesmo mês", bloco: "mesmo", dica: "Saída e nova entrada no mesmo mês" },
      { label: "Saiu no mês anterior", bloco: "proximo", dica: "Saída no período, no mês anterior à reentrada; entrada no mês seguinte" },
    ];
    const celula = (sub?: TipoReentrada, bloco?: BlocoMes) => (
      <Button variant="ghost" disabled={detalhesLoading || !detalhesProntos} onClick={() => toggle(tipo, sub, bloco)}
        className={`h-11 w-full justify-end rounded-md text-base tabular-nums ${same(tipo, sub, bloco) ? "bg-muted ring-1 ring-primary" : ""}`}>
        {v(bloco ? nB(tipo, bloco, sub) : evs.filter(x => x.tipo === tipo && (!sub || x.par?.tipo === sub)).length)}
      </Button>
    );
    return <section className="min-w-0 space-y-3">
      <h3 className={`flex items-center gap-2 text-base font-semibold ${entrada ? "text-primary" : "text-destructive"}`}>
        {entrada ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
        {entrada ? "Entradas por Transferência" : "Saídas por Transferência"}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] text-sm">
          <thead className="border-y bg-muted/40 text-muted-foreground"><tr><th className="w-[49%] py-3 text-left" />{["Pura", "Revenda", "Total"].map(h => <th key={h} className="px-4 py-3 text-right font-medium">{h}</th>)}</tr></thead>
          <tbody>{linhas.map(l => <tr key={l.bloco} className="border-b"><th title={l.dica} className="py-3 pr-3 text-left font-normal">{l.label}</th><td>{celula("Pura", l.bloco)}</td><td>{celula("Revenda", l.bloco)}</td><td className="font-semibold">{celula(undefined, l.bloco)}</td></tr>)}</tbody>
          <tfoot className="border-b bg-muted/30 font-semibold"><tr><th className="py-3 text-left">Total</th><td>{celula("Pura")}</td><td>{celula("Revenda")}</td><td>{celula()}</td></tr></tfoot>
        </table>
      </div>
    </section>;
  };

  return (
    <div className="space-y-4">
      {loading && <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle aria-hidden="true" className="h-5 w-5 text-primary motion-safe:animate-spin" />{etapa}
      </div>}
      <div className="border-b pb-4 flex flex-wrap items-end gap-3">
        <label className="text-xs text-muted-foreground">De<Input type="date" value={f.de} onChange={(e) => setF({ ...f, de: e.target.value })} className="w-40" /></label>
        <label className="text-xs text-muted-foreground">Até<Input type="date" value={f.ate} onChange={(e) => setF({ ...f, ate: e.target.value })} className="w-40" /></label>
        <Button onClick={buscar} disabled={loading || !podeCalcularMovimentacao(f)}><Search className="h-4 w-4 mr-1" />Calcular</Button>
        <Button variant="outline" onClick={limpar} disabled={loading}><X className="h-4 w-4 mr-1" />Limpar</Button>
        {ap && !loading && !mensalLoading && totais && <div className="flex flex-wrap gap-2" role="group" aria-label="Período dos indicadores">
          <Button variant={mesSelecionado ? "outline" : "default"} aria-pressed={!mesSelecionado} onClick={() => selecionarMes(null)}>Período completo</Button>
          {ultimosMesesMovimentacao(ap).map(mes => <Button key={mes.de} variant={mesSelecionado?.de === mes.de ? "default" : "outline"} aria-pressed={mesSelecionado?.de === mes.de} title={`${fmtD(mes.de)} a ${fmtD(mes.ate)}`} onClick={() => selecionarMes(mes)}>
            {new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${mes.de}T00:00:00Z`))}
          </Button>)}
        </div>}
      </div>

      {ap && <>
      {periodoIndicadores && <p className="text-xs text-muted-foreground">{fmtD(periodoIndicadores.de)} a {fmtD(periodoIndicadores.ate)}</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {card("Anterior", vidasIndicadores.ant, Users, false, null, true)}
        {card("Vendas", kpi.e, UserPlus, false, "Entrada")}
        {card("Cancelamentos", -kpi.s, UserMinus, true, "Saída")}
        {card("Reativações", kpi.r, RotateCcw, false, "Reativação")}
        {card("Transferências Líq.", resumo.transferenciasLiquidas, ArrowRightLeft, resumo.transferenciasLiquidas < 0)}
        {card("Final", vidasIndicadores.fin, Users, false, null, true)}
        {card("Crescimento", resumo.crescimento, Scale, resumo.crescimento < 0)}
      </div>
      {err && <div className="p-4 text-center text-destructive">Erro: {err}</div>}
      {mensalLoading && <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-5 w-5 motion-safe:animate-spin" />Consultando vidas no fechamento de cada mês…</div>}
      {mensalErro && <div role="alert" className="text-destructive">Erro no gráfico: {mensalErro}</div>}
      {cortado && <div className="text-xs text-muted-foreground">Limite de busca atingido, reduza o período.</div>}
      <div className={`grid h-[900px] w-full min-w-0 sm:h-[680px] motion-safe:transition-[grid-template-rows] motion-safe:duration-500 motion-safe:ease-in-out ${depuracaoAberta ? "grid-rows-[520px_minmax(0,1fr)] xl:grid-rows-[360px_minmax(0,1fr)]" : "grid-rows-[0px_minmax(0,1fr)]"}`}>
      <div className={`min-h-0 overflow-hidden motion-safe:transition-opacity motion-safe:duration-500 ${depuracaoAberta ? "visible opacity-100" : "invisible opacity-0"}`} aria-hidden={!depuracaoAberta}>
      <section id="depuracao-transferencias" className="h-full space-y-5 overflow-auto border-t pb-4 pt-5">
        <h2 className="text-lg font-semibold">Saldo das Transferências: <span className="tabular-nums">{num(resumo.transferenciasLiquidas)}</span></h2>
        {detalhesLoading && <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-5 w-5 motion-safe:animate-spin" />{detalhesEtapa}</div>}
        {detalhesErro && <div role="alert" className="text-destructive">Erro: {detalhesErro}</div>}
        <div className="grid gap-8 xl:grid-cols-2">{quadro("T+")}{quadro("T-")}</div>
      </section>
      </div>
       <div className="h-full min-h-0 w-full min-w-0">
       {!loading && !mensalLoading && totais && dadosGrafico.length > 0 && <MovimentacaoCrescimentoMensal dados={dadosGrafico} ajustarAltura />}
       </div>
      </div>
      </>}

      {sel && !depuracaoAberta && detalhesLoading && <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-5 w-5 motion-safe:animate-spin" />{detalhesEtapa}</div>}
      {sel && !depuracaoAberta && detalhesErro && <div role="alert" className="text-destructive">Erro: {detalhesErro}</div>}
      {sel && !loading && !detalhesLoading && detalhesProntos && (
        <div className="rounded-xl border bg-card overflow-auto max-h-[60vh]">
          <div className="px-4 py-2 text-sm font-medium border-b">{sel.tipo}{sel.sub ? ` · ${sel.sub}` : ""} · {num(lista.length)} registro(s){isT ? " · ligação por CPF" : ""}</div>
          <table className="w-full text-xs">
            <thead className="bg-muted/40 sticky top-0">
              <tr>{(isT ? ["CPF", "Beneficiário", "Matrícula anterior", "Saída", "Motivo", "Matrícula nova", "Entrada", "Vendedor (reentrada)", "Tipo"] : ["Data", "Matrícula", "Beneficiário", "Empresa", "Vendedor"]).map((h) => <th key={h} className="px-3 py-1.5 text-left">{h}</th>)}</tr>
            </thead>
            <tbody>
              {lista.map((e, i) => e.par ? (
                <tr key={i} className="border-t">
                  <td className="px-3 py-1 whitespace-nowrap">{e.par.cpf ? fmtCpf(e.par.cpf) : "—"}</td>
                  <td className="px-3 py-1">{e.par.nome}</td>
                  <td className="px-3 py-1 whitespace-nowrap">{fmtMat(e.par.matAnterior)}</td>
                  <td className="px-3 py-1">{fmtD(e.par.saida)}</td>
                  <td className="px-3 py-1">{e.par.motivo ?? "—"}</td>
                  <td className="px-3 py-1 whitespace-nowrap">{fmtMat(e.par.matNova)}</td>
                  <td className="px-3 py-1">{fmtD(e.par.entrada)}</td>
                  <td className="px-3 py-1">{e.par.vendedor ?? ""} {e.par.nmVendedor ?? ""}</td>
                  <td className="px-3 py-1">{e.par.tipo}</td>
                </tr>
              ) : (
                <tr key={i} className="border-t">
                  <td className="px-3 py-1">{fmtD(e.data)}</td>
                  <td className="px-3 py-1 whitespace-nowrap">{fmtMat(e.r.cd_mat_alternativa)}</td>
                  <td className="px-3 py-1">{e.r.nm_beneficiario}</td>
                  <td className="px-3 py-1">{e.r.nm_empresa_estipulante ?? "—"}</td>
                  <td className="px-3 py-1">{e.r.nm_vendedor ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
