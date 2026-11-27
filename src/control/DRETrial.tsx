import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileBarChart2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import PdfPreview from "@/components/PdfPreview";
import { comporPdfRelatorio } from "@/control/relatorio/controladoriaPdf";
import type { ControladoriaReport } from "@/control/relatorio/controladoriaDados";
import { carregarVidasTrimestres, montarRelatorioTrimestral } from "@/control/relatorio/controladoriaTrimestral";
import { loadDreHostinger, loadMesesDemonstracoes, type DreHRow } from "@/control/dreHostinger";
import { formatarSinistralidadePainel, grupoPainelDre, sinistralidadeOperacionalColunas, sinistralidadeOperacionalPainel } from "@/control/drePainel";
import { sinistralidadeContabilAnsAno, sinistralidadeContabilMv } from "@/control/sinistralidadeContabil";
import { DRE_FULL_NAME, REPORT_FULL_NAME } from "@/control/dreLabels";
import { initialDreExpansion } from "@/control/dreExpansion";
import { dreMargin, formatDreMargin } from "@/control/dreMargin";
import { Button } from "@/components/ui/button";
import { colunasDre, periodoDre, trimestresFechados, type DreVisao } from "@/control/dreTrimestres";
import DreChatIa from "@/components/DreChatIa";
import { FONTE_CONTABIL_IA } from "./dreIaCarga";

// DRE (Trial): reconstruído do zero, só com o balancete MV + plano 9D (ver src/lib/dreHostinger.ts).
const ANO = 2026;
export type DreColumn = { label: string; meses: number[]; kind: "mes" | "ano" };
type Col = DreColumn;
// Período: jan até o último mês em que as contas 41 superam R$ 20 milhões; última coluna = acumulado
const colCls = (c: Col) => (c.kind === "ano" ? "bg-accent font-bold" : "");
const novo = (cols: Col[]) => cols.map(() => 0);
const somar = (arr: number[], r: DreHRow, cols: Col[]) => cols.forEach((c, i) => { if (c.meses.includes(r.mes)) arr[i] += r.valor; });

type Node = { key: string; label: string; valores: number[]; children: Node[] };

const strip = (s: string) => s.replace(/^\d+\|/, "").replace(/custas judiciais/i, "DESPESAS JUDICIAIS");
const fmt = (v: number) => {
  const s = Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v < 0 ? `(${s})` : s;
};

// Linhas da DRE no visual do Painel: contornos arredondados e tons suaves de primário por nível (fundo opaco para a coluna fixa).
const linhaCls = (depth: number) => (depth <= 1 ? "border-primary/20" : "border-border/60") + " group-hover:brightness-[0.97]";
const linhaFundo = (depth: number) => {
  const tom = depth === 0 ? 0.12 : depth === 1 ? 0.06 : 0;
  return tom ? `linear-gradient(hsl(var(--primary) / ${tom}), hsl(var(--primary) / ${tom})), hsl(var(--card))` : "hsl(var(--card))";
};

/** Linha do rodapé da DRE em cartão arredondado e tom suave próprio (tokens --dre-*). */
function LinhaRodape({ tom, titulo, valores, dica, forte }: { tom: "fat" | "res" | "sin"; titulo: string; valores: React.ReactNode[]; dica?: string; forte?: boolean }) {
  const estilo = { background: `hsl(var(--dre-${tom}-bg))`, color: `hsl(var(--dre-${tom}-fg))`, borderColor: `hsl(var(--dre-${tom}-borda))` };
  const base = `${forte ? "py-2.5 font-bold" : "py-2 font-semibold"} px-4 border-y whitespace-nowrap`;
  return <tr title={dica}>
    <td className={`${base} sticky left-0 z-[1] rounded-l-xl border-l`} style={estilo}>{titulo}</td>
    {valores.map((v, i) => <td key={i} className={`${base} text-right tabular-nums ${i === valores.length - 1 ? "rounded-r-xl border-r" : ""}`} style={estilo}>{v}</td>)}
  </tr>;
}

function buildTree(rows: DreHRow[], cols: Col[]): Node[] {
  const roots: Node[] = [];
  const map = new Map<string, Node>();
  for (const r of rows) {
    let list = roots;
    let path = "";
    for (const g of [r.g1, r.g2, r.g3, r.g4]) {
      if (!g) break;
      path += "~" + g;
      let n = map.get(path);
      if (!n) {
        n = { key: path, label: strip(g), valores: novo(cols), children: [] };
        map.set(path, n);
        list.push(n);
        list.sort((a, b) => a.key.localeCompare(b.key, "pt-BR", { numeric: true }));
      }
      somar(n.valores, r, cols);
      list = n.children;
    }
  }
  return roots;
}

const itemDe = grupoPainelDre;
const pctFmt = (v: number) => `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v)}%`;

export type DemoAba = "Painel" | "DRE" | "Histórico";
export const Barra = ({ ativa, onAba, extra, filho, direita }: { ativa: DemoAba; onAba?: (a: DemoAba) => void; historico?: boolean; extra?: React.ReactNode; filho?: React.ReactNode; direita?: React.ReactNode }) => {
  const [aberto, setAberto] = useState(true);
  return onAba ? (
    <div className="sticky bottom-0 z-20 shrink-0 bg-background py-4 flex justify-center">
      <div className="relative">
      {direita && !extra && (
        <div className="absolute left-full top-1/2 z-0 ml-2 -translate-y-1/2 inline-flex gap-0.5 rounded-full bg-card/95 backdrop-blur p-1.5 border border-border shadow-[0_6px_14px_-2px_hsl(var(--foreground)/0.28),inset_0_1px_3px_hsl(var(--foreground)/0.12)] whitespace-nowrap">{direita}</div>
      )}
      {extra && (
        <div aria-hidden={!aberto} className={`absolute left-full top-1/2 z-0 ml-2 flex items-center transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${aberto ? "-translate-y-1/2 translate-x-0 opacity-100" : "pointer-events-none -translate-y-1/2 -translate-x-[calc(100%+0.5rem)] opacity-0"}`}>
          <div className="inline-flex gap-0.5 rounded-full bg-card/95 backdrop-blur p-1.5 border border-border shadow-[0_6px_14px_-2px_hsl(var(--foreground)/0.28),inset_0_1px_3px_hsl(var(--foreground)/0.12)] whitespace-nowrap">{extra}</div>
          {filho && <div className="relative ml-3 inline-flex gap-0.5 rounded-full bg-card/90 p-1 border border-border shadow-[0_8px_16px_-2px_hsl(var(--foreground)/0.32),inset_0_1px_4px_hsl(var(--foreground)/0.16)] whitespace-nowrap">{filho}</div>}
        </div>
      )}
      <div className="relative z-10 inline-flex gap-0.5 rounded-full bg-card/90 backdrop-blur p-1.5 border border-border shadow-[0_0_16px_2px_hsl(var(--foreground)/0.18)]">
        {(["Painel", "DRE", "Histórico"] as const).map((a) => (
          <Button variant="ghost" title={a === "DRE" ? DRE_FULL_NAME : undefined} key={a} aria-expanded={a === "Histórico" && extra ? aberto : undefined} onClick={() => (a !== ativa ? onAba(a) : a === "Histórico" && extra && setAberto((v) => !v))}
            className={`rounded-full px-3 py-1 text-[13px] h-auto font-medium transition-all duration-200 ${a === "Histórico" && !extra ? "inline-flex items-center gap-1 " : ""}${a === "Histórico" && extra ? "inline-flex items-center gap-1 text-foreground/80 hover:text-primary hover:bg-card" : a === ativa ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" : "text-foreground/70 hover:text-primary hover:bg-card hover:shadow-sm hover:-translate-y-0.5"}`}>{a}{a === "Histórico" && (extra && aberto ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />)}</Button>
        ))}
      </div>
      </div>
    </div>
  ) : null;
};

type DRETrialProps = {
  painel?: boolean;
  onAba?: (a: DemoAba) => void;
  dados?: DreHRow[];
  ano?: number;
  meses?: number[];
  historico?: boolean;
  colunas?: DreColumn[];
  semBarra?: boolean;
  alturaCompleta?: boolean;
  recolhidoInicial?: boolean;
  faturamento?: number[];
  /** Bench: Sinistralidade Contábil (contas 411 ÷ 311) por coluna, exibida abaixo do RESULTADO. */
  sinistralidadeContabil?: (number | null)[];
};

// Cache em memória: trocar Painel/DRE/Histórico não recarrega nem pisca a tela.
const cacheMeses = new Map<number, number[]>();
const cacheRows = new Map<string, DreHRow[]>();

const DRETrial = ({ painel = false, onAba, dados, ano = ANO, meses: mesesProp, historico = false, colunas, semBarra = false, alturaCompleta = false, recolhidoInicial = false, faturamento, sinistralidadeContabil }: DRETrialProps = {}) => {
  const [mesesAuto, setMesesAuto] = useState<number[] | null>(() => cacheMeses.get(ano) ?? null);
  const meses = mesesProp ?? mesesAuto;
  const [rows, setRows] = useState<DreHRow[] | null>(() => dados ?? (meses ? cacheRows.get(`${ano}:${meses.join(",")}`) ?? null : null));
  const [erro, setErro] = useState<string | null>(null);
  const [chatAberto, setChatAberto] = useState(false);
  const comChat = !!onAba && !historico && !dados;
  const botaoChat = comChat ? <Button variant="ghost" size="sm" title="Abrir IA · DRE" aria-label="Abrir IA · DRE" disabled={!rows?.length || !!erro} onClick={() => setChatAberto(true)} className="rounded-full text-primary font-semibold">IA</Button> : null;
  const chat = comChat ? <DreChatIa aberto={chatAberto} onAbertoChange={setChatAberto} dados={() => ({ cubo: rows && meses && !erro ? { ano, meses, rows, fonteContabil: FONTE_CONTABIL_IA } : null, contexto: `Ano: ${ano}; meses fechados: ${(meses ?? []).join(", ")}; visão: ${painel ? "Painel" : visao}; cubos: DRE da tela e public.${FONTE_CONTABIL_IA}.` })} /> : null;
  const [open, setOpen] = useState<Record<string, boolean>>({});
  // Chave Mensal/Trimestral só na DRE principal (Histórico e Bench C definem as próprias colunas)
  const comVisao = !colunas && !historico && !painel;
  const [visao, setVisao] = useState<DreVisao>("Mensal");
  const visaoAtiva: DreVisao = comVisao ? visao : "Mensal";
  const periodo = periodoDre(meses ?? [], ano);
  const cols = useMemo<Col[]>(() => colunas ?? (meses ? colunasDre(meses, ano, visaoAtiva) : []), [meses, ano, colunas, visaoAtiva]);

  useEffect(() => {
    if (mesesProp || dados) return;
    let cancelado = false;
    const cachedMonths = cacheMeses.get(ano);
    if (cachedMonths) { setMesesAuto(cachedMonths); return; }
    setMesesAuto(null);
    loadMesesDemonstracoes(ano).then((m) => { cacheMeses.set(ano, m); if (!cancelado) setMesesAuto(m); }).catch((e) => { if (!cancelado) { setErro(e?.message || String(e)); setMesesAuto([]); } });
    return () => { cancelado = true; };
  }, [mesesProp, dados, ano]);

  useEffect(() => {
    if (dados) { setRows(dados); setErro(null); return; }
    if (!meses) { setRows(null); return; }
    if (!meses.length) { setRows([]); return; }
    let cancelado = false;
    const k = `${ano}:${meses.join(",")}`;
    const cachedRows = cacheRows.get(k);
    if (cachedRows) { setRows(cachedRows); return; }
    loadDreHostinger(ano, meses).then((r) => { cacheRows.set(k, r); if (!cancelado) setRows(r); }).catch((e) => { if (!cancelado) { setErro(e?.message || String(e)); setRows([]); } });
    return () => { cancelado = true; };
  }, [dados, ano, meses]);

  // Trimestral: "Gerar Relatório de Controladoria" com os mesmos dados DRE da tela e vidas no fim de cada trimestre.
  const [relatorio, setRelatorio] = useState<ControladoriaReport | null>(null);
  const [gerandoRel, setGerandoRel] = useState(false);
  const gerarRelatorio = async () => {
    if (!rows || !meses) return;
    const tris = trimestresFechados(meses);
    setGerandoRel(true);
    try {
      const { inicio, vidas } = await carregarVidasTrimestres(ano, tris);
      setRelatorio(montarRelatorioTrimestral({ ano, tris, rows, vidasInicio: inicio, vidas }));
    } catch (e) {
      toast.error(`Não foi possível gerar o ${REPORT_FULL_NAME}: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setGerandoRel(false); }
  };

  // Painel: Sinistralidade Contábil (contas 411 ÷ 311) — balancete MV nas Demonstrações, arquivos ANS no Histórico.
  const [sinContabil, setSinContabil] = useState<{ valor: number | null; erro?: boolean } | null>(null);
  const mesesKey = (meses ?? []).join(",");
  useEffect(() => {
    if (!painel || (!historico && dados) || (!historico && !meses)) return;
    let cancelado = false;
    setSinContabil(null);
    (historico ? sinistralidadeContabilAnsAno(ano) : sinistralidadeContabilMv(ano, meses ?? []))
      .then((valor) => { if (!cancelado) setSinContabil({ valor }); })
      .catch(() => { if (!cancelado) setSinContabil({ valor: null, erro: true }); });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [painel, historico, ano, mesesKey, !!dados]);

  // Rolagem horizontal começa à direita (colunas mais recentes e acumulado à vista).
  const rolagem = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = rolagem.current; if (el) el.scrollLeft = el.scrollWidth; }, [rows, cols]);
  const tree = useMemo(() => buildTree(rows || [], cols), [rows, cols]);
  useEffect(() => {
    setOpen(initialDreExpansion(tree, recolhidoInicial));
  }, [tree, recolhidoInicial]);
  const sinOpColunas = useMemo(() => sinistralidadeOperacionalColunas(rows || [], cols), [rows, cols]);
  // Grid: Sinistralidade Contábil (411 ÷ 311 do balancete MV) por coluna, quando a tela não recebe os valores prontos.
  const [sinContabilColunas, setSinContabilColunas] = useState<(number | null)[] | null>(null);
  const colsKey = cols.map((c) => c.meses.join(".")).join("|");
  useEffect(() => {
    if (painel || dados || sinistralidadeContabil || historico || !cols.length) { setSinContabilColunas(null); return; }
    let cancelado = false;
    setSinContabilColunas(null);
    Promise.all(cols.map((c) => sinistralidadeContabilMv(ano, c.meses).catch(() => null)))
      .then((v) => { if (!cancelado) setSinContabilColunas(v); });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [painel, historico, ano, colsKey, !!sinistralidadeContabil, !!dados]);
  const sinContabilGrid = sinistralidadeContabil ?? sinContabilColunas ?? (!historico && !painel && !dados && cols.length ? cols.map(() => undefined) : null);
  const total = useMemo(() => { const t = novo(cols); for (const r of rows || []) somar(t, r, cols); return t; }, [rows, cols]);

  const render = (nodes: Node[], depth: number): JSX.Element[] =>
    nodes.flatMap((n) => {
      const has = n.children.length > 0;
      const isOpen = open[n.key];
      return [
        <tr key={n.key} className={`group ${depth <= 1 ? "font-bold" : ""}`}>
          <td className={`${historico ? "py-[3px]" : "py-2"} pr-4 whitespace-nowrap sticky left-0 z-[1] rounded-l-lg border-y border-l transition-colors ${linhaCls(depth)}`} style={{ paddingLeft: `${0.75 + depth * 1.25}rem`, background: linhaFundo(depth) }}>
            <Button variant="ghost" type="button" disabled={!has} onClick={() => setOpen((p) => ({ ...p, [n.key]: !p[n.key] }))}
              className={`h-auto p-0 flex items-center gap-1.5 text-left text-foreground disabled:cursor-default disabled:opacity-100 ${depth <= 1 ? "font-bold" : ""}`}>
              <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${has ? "" : "invisible"} ${isOpen ? "rotate-90" : ""}`} />
              {n.label}
            </Button>
          </td>
          {n.valores.map((v, i) => (
            <td key={i} className={`${historico ? "py-[3px]" : "py-2"} px-4 text-right tabular-nums whitespace-nowrap border-y transition-colors ${linhaCls(depth)} ${i === n.valores.length - 1 ? "rounded-r-lg border-r" : ""} ${colCls(cols[i])} text-foreground`} style={{ background: linhaFundo(depth) }}>{fmt(v)}</td>
          ))}
        </tr>,
        ...(has && isOpen ? render(n.children, depth + 1) : []),
      ];
    });

  if (painel) {
    if (!rows) return <section className="bg-card rounded-xl border border-border p-6 text-sm text-muted-foreground">Carregando…</section>;
    const b: Record<string, number> = { ent: 0, desp: 0, demais: 0, adm: 0, fin: 0, imp: 0 };
    let fat = 0;
    for (const r of rows) {
      const k = itemDe(r) ?? "imp";
      b[k] += r.valor;
      if (k === "ent" && /FATUR/i.test(r.g4)) fat += r.valor;
    }
    const prim = b.ent + b.desp, tot = prim + b.demais, ebitda = tot + b.adm, rai = ebitda + b.fin, liq = rai + b.imp;
    const pf = (x: number) => (fat ? pctFmt((x / fat) * 100) : "-");
    const cards: [string, number, string, boolean?][] = [
      ["Operacionais Primários", prim, "Entradas − Despesas Assistenciais"],
      ["Operacionais Secundários", b.demais, "Demais operacionais"],
      ["Operacionais Totais", tot, "Primários + Secundários"],
      ["EBITDA", ebitda, "Operacionais Totais + Despesas Administrativas"],
      ["Financeiro", b.fin, "Resultado financeiro"],
      ["Resultado antes dos Impostos", rai, "EBITDA + Financeiro"],
      ["Impostos Federais", b.imp, "Lançados no balancete", true],
    ];
    const linhas: [string, number, 0 | 1 | 2][] = [
      ["Entradas Operacionais", b.ent, 0],
      ["(−) Despesas Assistenciais", b.desp, 0],
      ["(−) Demais Operacionais", b.demais, 0],
      ["(=) Operacionais Totais", tot, 1],
      ["(−) Despesas Administrativas", b.adm, 0],
      ["(=) EBITDA", ebitda, 1],
      ["(+) Financeiro", b.fin, 0],
      ["(=) Resultado antes dos Impostos", rai, 1],
      ["(−) Impostos Federais", b.imp, 0],
      ["(=) Resultado Líquido", liq, 2],
    ];
    return (
      <div className={`flex flex-col gap-2 ${historico ? "h-full min-h-0" : "h-[calc(100vh-9rem)]"} overflow-y-auto`}>
        <div className="rounded-xl bg-primary text-primary-foreground shadow-md px-4 py-1.5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-80">Resultado Líquido {periodo}</div>
            <div className="text-xl font-bold tabular-nums leading-tight">R$ {fmt(liq)}</div>
          </div>
          <div className="text-right text-xs leading-tight">
            <div><span className="opacity-80">Margem líquida </span><span className="text-base font-semibold tabular-nums">{pf(liq)}</span></div>
            <div className="opacity-80">Faturamento R$ {fmt(fat)} · {historico ? "Histórico do arquivo" : "Realizado do balancete"}</div>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {cards.map(([t, x, h, naoRes]) => (
            <div key={t} title={h} className="rounded-xl border border-border bg-card overflow-hidden cursor-help hover:shadow-md transition-shadow">
              <div className={`h-1 ${x < 0 ? "bg-destructive" : "bg-primary"}`} />
              <div className="px-3 py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-tight min-h-[1.3rem]">{t}</div>
                <div className={`text-base font-bold tabular-nums ${x < 0 && !naoRes ? "text-destructive" : "text-foreground"}`}>R$ {fmt(x)}</div>
                <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${x < 0 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${Math.min(100, fat ? Math.abs(x / fat) * 100 : 0)}%` }} />
                </div>
                <div className="text-[10px] text-muted-foreground">{pf(x)} do faturamento</div>
              </div>
            </div>
          ))}
        </div>
        <section className="rounded-2xl border border-border bg-card shadow-sm px-3 py-2 flex-1 min-h-0 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h3 className="text-base font-semibold text-foreground">{DRE_FULL_NAME} · {periodo}</h3>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">R$ · % fat.</span>
          </div>
          <div className="flex-1 flex flex-col justify-between gap-0.5">
            {linhas.map(([t, x, k]) => (
              <div key={t} className={`flex items-center justify-between rounded-lg border px-3 py-0.5 text-[15px] ${k === 2 ? "border-primary bg-primary text-primary-foreground font-bold" : k === 1 ? "border-primary/20 bg-primary/10 font-semibold text-foreground" : "border-border/60 text-foreground"}`}>
                <span>{t}</span>
                <span className="flex gap-6 tabular-nums">
                  <span className={k === 1 && x < 0 ? "text-destructive" : ""}>{fmt(x)}</span>
                  <span className={`w-20 text-right ${k === 2 ? "" : "text-muted-foreground"}`}>{pf(x)}</span>
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/10 px-3 py-0.5 text-[15px] font-semibold text-foreground" title="Despesas Assistenciais ÷ Entradas Operacionais">
              <span>Sinistralidade Operacional</span>
              <span className="flex gap-6 tabular-nums">
                <span>{formatarSinistralidadePainel(sinistralidadeOperacionalPainel(b.ent, b.desp))}</span>
                <span className="w-20" />
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/10 px-3 py-0.5 text-[15px] font-semibold text-foreground" title={`Contas 411 ÷ Contas 311${historico ? " · arquivos trimestrais da ANS" : " · balancete"}${sinContabil?.erro ? " · não foi possível carregar as contas" : ""}`}>
              <span>Sinistralidade Contábil</span>
              <span className="flex gap-6 tabular-nums">
                <span>{sinContabil ? formatarSinistralidadePainel(sinContabil.valor) : "…"}</span>
                <span className="w-20" />
              </span>
            </div>
          </div>
        </section>
        <Barra ativa="Painel" onAba={onAba} historico={historico} direita={botaoChat} />
        {chat}
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${historico || alturaCompleta ? "h-full" : "h-[calc(100vh-9rem)]"} min-h-0`}>
    <section className="bg-card rounded-xl border border-border shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
      <div ref={rolagem} className="flex-1 min-h-0 overflow-auto px-2">
        {!rows ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
        ) : erro ? (
          <div className="p-6 text-sm text-destructive">Erro ao carregar: {erro}</div>
        ) : !cols.length && visaoAtiva === "Trimestral" ? (
          <div className="p-6 text-sm text-muted-foreground">Ainda não há trimestre fechado em {ano}.</div>
        ) : (
          <table className="w-full h-full text-sm border-separate border-spacing-x-0 border-spacing-y-0.5">
            <thead className="sticky top-0 z-10 bg-card">
              <tr>
                <th className="sticky left-0 z-[1] bg-card p-0 pt-1.5 pb-0.5 text-left font-semibold text-primary-foreground"><div className="rounded-l-xl bg-primary py-2.5 px-4">Item</div></th>
                {cols.map((c, i) => (
                  <th key={c.label} className="bg-card p-0 pt-1.5 pb-0.5 text-right font-semibold whitespace-nowrap text-primary-foreground">
                    <div className={`py-2.5 px-4 ${i === cols.length - 1 ? "rounded-r-xl" : ""}`}
                      style={{ background: c.kind === "ano" ? "linear-gradient(hsl(var(--primary-foreground) / 0.15), hsl(var(--primary-foreground) / 0.15)), hsl(var(--primary))" : "hsl(var(--primary))" }}>{c.label}</div></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {render(tree, 0)}
              {!historico && <tr aria-hidden className="h-full"><td colSpan={cols.length + 1} /></tr>}
            </tbody>
            <tfoot className="sticky bottom-0 z-10 bg-card shadow-[0_-6px_12px_-8px_hsl(var(--foreground)/0.25)]">
              <tr aria-hidden><td colSpan={cols.length + 1} className="h-1.5 p-0" /></tr>
              {faturamento && <LinhaRodape tom="fat" titulo="Faturamento" valores={faturamento.map(fmt)} />}
              <LinhaRodape tom="res" titulo="Resultado" forte valores={total.map((v, i) => <>{fmt(v)}{faturamento && <span className="ml-2 text-xs font-normal opacity-80">{formatDreMargin(dreMargin(v, faturamento?.[i]))}</span>}</>)} />
              {!dados && <LinhaRodape tom="sin" titulo="Sinistralidade Operacional" dica="Despesas Assistenciais ÷ Entradas Operacionais" valores={sinOpColunas.map(formatarSinistralidadePainel)} />}
              {sinContabilGrid && <LinhaRodape tom="sin" titulo="Sinistralidade Contábil" dica="Contas 411 ÷ Contas 311" valores={sinContabilGrid.map((v) => v === undefined ? "…" : formatarSinistralidadePainel(v))} />}
            </tfoot>
          </table>
        )}
      </div>
    </section>
    {!semBarra && <Barra ativa="DRE" onAba={onAba} historico={historico} direita={comVisao ? <>{(["Mensal", "Trimestral"] as const).map((v) => (
      <Button key={v} variant="ghost" aria-pressed={visao === v} onClick={() => setVisao(v)}
        title={v === "Trimestral" ? "Somente trimestres fechados: 1T jan–mar, 2T abr–jun, 3T jul–set, 4T out–dez" : undefined}
        className={`rounded-full px-3 py-1 text-[13px] h-auto font-medium ${visao === v ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 hover:bg-primary hover:text-primary-foreground" : "text-foreground/70 hover:text-primary hover:bg-card"}`}>{v}</Button>
    ))}{botaoChat}{visaoAtiva === "Trimestral" && <Button variant="ghost" size="icon" title={`Gerar ${REPORT_FULL_NAME}`} aria-label={`Gerar ${REPORT_FULL_NAME}`}
        disabled={gerandoRel || !rows || !!erro || !cols.length} onClick={() => void gerarRelatorio()}
        className="ml-1 h-7 w-7 rounded-full text-foreground/70 hover:text-primary hover:bg-card">
        {gerandoRel ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <FileBarChart2 className="h-4 w-4" />}</Button>}</> : undefined} />}
    {relatorio && <PdfPreview build={async () => (await comporPdfRelatorio(relatorio)).doc}
      fileName={`Relatorio_Controladoria_Trimestral_${relatorio.period.de}_${relatorio.period.ate}.pdf`} onClose={() => setRelatorio(null)} />}
    {chat}
    </div>
  );
};

export default DRETrial;
