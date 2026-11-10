import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, User, Users, FileText, Wallet, Activity, History, LayoutGrid, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { hostinger } from "@/lib/hostingerClient";
import { carregarUltimaCompetenciaValida } from "@/lib/sinistralidadeValida";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CATEGORIAS_DESPESA, comporCodigoAlternativo, despesaMes, faixaFamilia, grupoFamiliar, linhaDoTempo, membrosFamilia, periodoAssistencial, ateUltimaValida, porCompetencia, receitaMes, registroAtual, resultadoAssistencial, resumoEard, statusInfo,
  type CarteiraRow, type EardRow, type MembroFamilia, type ResultadoMes,
} from "@/lib/painelBeneficiario";

type Modo = "nome" | "cpf" | "matricula" | "contrato" | "alternativa";
const MODOS: { id: Modo; label: string }[] = [
  { id: "alternativa", label: "Código" },
  { id: "cpf", label: "CPF" }, { id: "nome", label: "Nome" }, { id: "matricula", label: "Matrícula MV" },
  { id: "contrato", label: "Contrato" },
];
const ABAS = [
  { id: "resumo", label: "Resumo", icon: LayoutGrid }, { id: "benef", label: "Beneficiário", icon: User },
  { id: "contrato", label: "Contrato e Plano", icon: FileText }, { id: "fin", label: "Financeiro", icon: Wallet },
  { id: "assist", label: "Assistencial", icon: Activity }, { id: "familia", label: "Grupo Familiar", icon: Users },
  { id: "hist", label: "Histórico", icon: History },
] as const;
type Aba = (typeof ABAS)[number]["id"];

const COLS_BUSCA = "cd_matricula,nm_beneficiario,nr_cpf,cd_contrato,ds_plano,tp_status,dt_momento,nm_empresa_estipulante,tp_relacionamento";
const COLS_EARD = "dt_competencia,vl_rec_cpp,vl_rec_copart,vl_rec_outros,vl_desp_consulta,vl_desp_urgencia,vl_desp_internacao,vl_desp_terapia,vl_desp_exame,vl_desp_outros,perc_sinistralidade";

const vazio = (v: unknown) => v === null || v === undefined || v === "" || v === "None";
const fmtD = (v: unknown) => { if (vazio(v)) return null; const s = String(v).slice(0, 10).split("-"); return s.length === 3 ? `${s[2]}/${s[1]}/${s[0]}` : String(v); };
const fmtR = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const fmtCpf = (v: unknown) => { const d = String(v ?? "").replace(/\D/g, ""); if (!d || /^0+$/.test(d)) return null; const p = d.padStart(11, "0"); return `${p.slice(0, 3)}.${p.slice(3, 6)}.${p.slice(6, 9)}-${p.slice(9)}`; };
const fmtComp = (c: number) => `${String(c).slice(4, 6)}/${String(c).slice(0, 4)}`;
const SEXO: Record<string, string> = { M: "Masculino", F: "Feminino" };

const TONE: Record<string, string> = {
  ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  warn: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  bad: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  neutral: "bg-muted text-muted-foreground border-border",
};

function Campo({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "" || value === "None") return null;
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground truncate" title={typeof value === "string" ? value : undefined}>{value}</div>
    </div>
  );
}
function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">{children}</div>
    </div>
  );
}
function Card({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-1.5">
      <div className="text-[10px] uppercase leading-tight tracking-wide text-muted-foreground">{label}</div>
      <div className="truncate text-base font-semibold leading-snug text-foreground">{value}</div>
      {sub && <div className="truncate text-[11px] leading-tight text-muted-foreground">{sub}</div>}
    </div>
  );
}

const fmtDec = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (v: number | null) => (v == null ? "—" : `${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);
const MES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const fmtMesCurto = (c: number) => `${MES_ABREV[(c % 100) - 1]}/${String(Math.floor(c / 100)).slice(2)}`;
const LINHAS_RESULTADO: { key: keyof ResultadoMes; label: string; tip: string; destaque?: boolean; pct?: boolean }[] = [
  { key: "receita", label: "Receita", tip: "vl_rec_cpp + vl_rec_outros" },
  { key: "copart", label: "Coparticipação", tip: "vl_rec_copart" },
  { key: "totalReceitas", label: "Total Receitas", tip: "Receita + Coparticipação", destaque: true },
  { key: "despesa", label: "Despesas", tip: "Soma das seis colunas vl_desp_*", destaque: true },
  { key: "saldo", label: "Saldo", tip: "Total Receitas − Despesas", destaque: true },
  { key: "sinistralidade", label: "Sinistralidade", tip: "Despesas ÷ Total Receitas", pct: true },
];

const ESCOPOS = ["Beneficiário", "Família"] as const;
type Escopo = (typeof ESCOPOS)[number];
type EardFamilia = EardRow & { cd_matricula: number };
type Familia = { membros: MembroFamilia[]; eard: EardFamilia[]; ate: number };

function GrupoFamiliar({ familia, loading, erro, matSelecionada }: { familia: Familia | null; loading: boolean; erro: string | null; matSelecionada: number | null }) {
  const meses = useMemo(() => (familia ? periodoAssistencial(familia.ate) : []), [familia]);
  const g = useMemo(() => (familia ? grupoFamiliar(familia.membros, familia.eard, meses) : null), [familia, meses]);
  const valoresU12 = (t: ResultadoMes) => (<>
    <td className="whitespace-nowrap px-2 text-right">{fmtDec(t.receita)}</td>
    <td className="whitespace-nowrap px-2 text-right">{fmtDec(t.copart)}</td>
    <td className="whitespace-nowrap px-2 text-right">{fmtDec(t.despesa)}</td>
    <td className={`whitespace-nowrap px-2 text-right ${t.saldo < 0 ? "text-destructive" : ""}`}>{fmtDec(t.saldo)}</td>
  </>);
  if (erro) return <p className="text-sm text-destructive">{erro}</p>;
  if (loading || !familia || !g) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando o grupo familiar…</div>;
  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Membros do contrato do titular</h4>
        <span className="text-xs text-muted-foreground">
          {familia.membros.length} {familia.membros.length === 1 ? "pessoa" : "pessoas"} · mesmo Plano e Contrato · sinistralidade U12 de {fmtComp(meses[0])} a {fmtComp(meses.at(-1)!)}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs tabular-nums">
          <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 text-left" title="Dependente">Dep</th><th className="px-2 text-left">Nome</th><th className="px-2 text-left" title="Relacionamento">Relac.</th><th className="px-2 text-left">Status</th>
              <th className="px-2 text-right" title="Nascimento · dt_nascimento">Nasc.</th>
              <th className="px-2 text-right" title="Mensalidade · vl_tmm da situação mais recente">Mens.</th>
              <th className="px-2 text-right" title="Receita U12 · vl_rec_cpp + vl_rec_outros">Rec.</th>
              <th className="px-2 text-right" title="Coparticipação U12 · vl_rec_copart">Copart.</th>
              <th className="px-2 text-right" title="Despesa U12 · soma das seis colunas vl_desp_*">Desp.</th>
              <th className="px-2 text-right" title="Saldo U12 · Receita + Coparticipação − Despesa">Saldo</th>
              <th className="px-2 text-right" title="Sinistralidade U12 · Despesa ÷ (Receita + Coparticipação)">% Sin. U12</th>
            </tr>
          </thead>
          <tbody>{g.linhas.map(({ membro: m, mensalidade, u12, sinistralidadeU12, temDado }) => (
            <tr key={m.cd_matricula} className={`border-t border-border ${m.cd_matricula === matSelecionada ? "bg-primary/5 font-medium" : ""}`}>
              <td className="px-2 py-1.5">{m.dep}</td><td className="px-2">{m.nm_beneficiario}</td>
              <td className="px-2">{m.tp_relacionamento ?? "—"}</td><td className="px-2">{statusInfo(m.tp_status).label}</td>
              <td className="px-2 text-right">{fmtD(m.dt_nascimento) ?? "—"}</td>
              <td className="whitespace-nowrap px-2 text-right">{fmtR(mensalidade)}</td>
              {temDado ? valoresU12(u12) : <td colSpan={4} className="px-2 text-right text-muted-foreground">sem registros no período</td>}
              <td className="px-2 text-right">{temDado ? fmtPct(sinistralidadeU12) : "—"}</td>
            </tr>))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/40 font-semibold">
              <td className="px-2 py-1.5" colSpan={5}>Total do grupo</td>
              <td className="whitespace-nowrap px-2 text-right">{fmtR(g.total.mensalidade)}</td>
              {g.total.u12.temDado ? valoresU12(g.total.u12) : <td colSpan={4} className="px-2 text-right">—</td>}
              <td className="px-2 text-right">{fmtPct(g.total.sinistralidadeU12)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function ResultadoAssistencial({ eard, ate, escopo, onEscopo, familia, familiaLoading, familiaErro }: {
  eard: EardRow[]; ate: number; escopo: Escopo; onEscopo: (e: Escopo) => void;
  familia: Familia | null; familiaLoading: boolean; familiaErro: string | null;
}) {
  const meses = useMemo(() => periodoAssistencial(ate), [ate]);
  const fonte = escopo === "Família" ? familia?.eard ?? [] : eard;
  const { meses: linhas, total } = useMemo(() => resultadoAssistencial(fonte, meses), [fonte, meses]);
  const porMembro = useMemo(() => (escopo === "Família" && familia
    ? familia.membros.map((m) => ({ m, t: resultadoAssistencial(familia.eard.filter((r) => r.cd_matricula === m.cd_matricula), meses).total }))
    : []), [escopo, familia, meses]);
  const aguardando = escopo === "Família" && (familiaLoading || (!familia && !familiaErro));
  const celula = (m: ResultadoMes, l: (typeof LINHAS_RESULTADO)[number]) => {
    if (!m.temDado) return <span className="text-muted-foreground/60">—</span>;
    if (l.pct) return fmtPct(m.sinistralidade);
    const v = m[l.key] as number;
    return <span className={l.key === "saldo" && v < 0 ? "text-destructive" : undefined}>{fmtDec(v)}</span>;
  };
  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Receitas, despesas, saldo e sinistralidade</h4>
          <div role="group" aria-label="Beneficiário ou família" title="Família = mesmo Plano e mesmo Contrato, todos os dependentes"
            className="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
            {ESCOPOS.map((e) => (
              <Button key={e} type="button" variant="ghost" aria-pressed={escopo === e} onClick={() => onEscopo(e)}
                className={`h-7 rounded-full px-3 text-xs ${escopo === e ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "bg-muted"}`}>
                {e}
              </Button>
            ))}
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{fmtComp(meses[0])} a {fmtComp(meses.at(-1)!)} · 12 meses</span>
      </div>
      {escopo === "Família" && familia && (
        <p className="text-xs text-muted-foreground">
          Grupo familiar · {familia.membros.length} {familia.membros.length === 1 ? "pessoa" : "pessoas"} no mesmo Plano e Contrato
        </p>
      )}
      {aguardando ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando o grupo familiar…</div>
        : escopo === "Família" && familiaErro ? <p className="text-sm text-destructive">{familiaErro}</p> : (<>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Total Receitas" value={total.temDado ? fmtR(total.totalReceitas) : "—"} sub="no período" />
        <Card label="Despesas" value={total.temDado ? fmtR(total.despesa) : "—"} sub="no período" />
        <Card label="Saldo" value={total.temDado ? <span className={total.saldo < 0 ? "text-destructive" : undefined}>{fmtR(total.saldo)}</span> : "—"} sub="Total Receitas − Despesas" />
        <Card label="Sinistralidade" value={total.temDado ? fmtPct(total.sinistralidade) : "—"} sub="Despesas ÷ Total Receitas" />
      </div>
      {!total.temDado ? <p className="text-sm text-muted-foreground">{escopo === "Família" ? "Sem registros do grupo familiar no período." : "Sem registros desta matrícula no período."}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground">
              <tr><th className="sticky left-0 bg-muted px-2 py-1.5 text-left">Indicador</th>
                {linhas.map((m) => <th key={m.comp} className="px-2 text-right font-semibold text-foreground">{fmtMesCurto(m.comp)}</th>)}
                <th className="px-2 text-right font-semibold text-foreground">Total</th></tr>
            </thead>
            <tbody>{LINHAS_RESULTADO.map((l) => (
              <tr key={l.key} className={`border-t border-border ${l.destaque ? "font-medium" : ""}`}>
                <td className="sticky left-0 bg-card px-2 py-1.5 text-left" title={l.tip}>{l.label}</td>
                {linhas.map((m) => <td key={m.comp} className="whitespace-nowrap px-2 text-right">{celula(m, l)}</td>)}
                <td className="whitespace-nowrap bg-muted/40 px-2 text-right font-semibold">{celula(total, l)}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      )}
      {porMembro.length > 0 && (
        <div className="overflow-x-auto">
          <h5 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Por membro da família · total do período</h5>
          <table className="w-full text-xs tabular-nums">
            <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground">
              <tr><th className="px-2 py-1.5 text-left">Dep</th><th className="px-2 text-left">Nome</th><th className="px-2 text-left">Relacionamento</th><th className="px-2 text-left">Status</th>
                <th className="px-2 text-right">Total Receitas</th><th className="px-2 text-right">Despesas</th><th className="px-2 text-right">Saldo</th><th className="px-2 text-right">Sinistralidade</th></tr>
            </thead>
            <tbody>{porMembro.map(({ m, t }) => (
              <tr key={m.cd_matricula} className="border-t border-border">
                <td className="px-2 py-1.5">{m.dep}</td><td className="px-2">{m.nm_beneficiario}</td><td className="px-2">{m.tp_relacionamento ?? "—"}</td><td className="px-2">{statusInfo(m.tp_status).label}</td>
                {t.temDado ? (<>
                  <td className="px-2 text-right">{fmtDec(t.totalReceitas)}</td><td className="px-2 text-right">{fmtDec(t.despesa)}</td>
                  <td className={`px-2 text-right ${t.saldo < 0 ? "text-destructive" : ""}`}>{fmtDec(t.saldo)}</td><td className="px-2 text-right">{fmtPct(t.sinistralidade)}</td>
                </>) : <td colSpan={4} className="px-2 text-right text-muted-foreground">sem registros no período</td>}
              </tr>))}
            </tbody>
          </table>
        </div>
      )}
      </>)}
    </div>
  );
}

export default function PainelBeneficiario() {
  const [modo, setModo] = useState<Modo>("nome");
  const [termo, setTermo] = useState("");
  const [codigo, setCodigo] = useState({ plano: "", contrato: "", dep: "" });
  const planoRef = useRef<HTMLInputElement>(null);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultados, setResultados] = useState<CarteiraRow[] | null>(null);
  const [mat, setMat] = useState<number | null>(null);
  const [aba, setAba] = useState<Aba>("resumo");

  const [movs, setMovs] = useState<CarteiraRow[]>([]);
  const [cad, setCad] = useState<Record<string, any> | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [eard, setEard] = useState<EardRow[] | null>(null);
  const [eardLoading, setEardLoading] = useState(false);
  const [comp, setComp] = useState<number | null>(null);
  // Última competência válida da base (despesas acima de R$ 20 milhões), AAAAMM.
  const [ultimaValida, setUltimaValida] = useState<number | null>(null);
  const [escopo, setEscopo] = useState<Escopo>("Beneficiário");
  const [familia, setFamilia] = useState<Familia | null>(null);
  const [familiaLoading, setFamiliaLoading] = useState(false);
  const [familiaErro, setFamiliaErro] = useState<string | null>(null);

  useEffect(() => {
    if (modo === "alternativa") planoRef.current?.focus();
  }, [modo]);

  function limpar() {
    setTermo(""); setCodigo({ plano: "", contrato: "", dep: "" });
    setErro(null); setResultados(null); setMat(null); setAba("resumo");
    setMovs([]); setCad(null); setEard(null); setComp(null);
    setEscopo("Beneficiário"); setFamilia(null); setFamiliaErro(null);
    if (modo === "alternativa") planoRef.current?.focus();
  }

  async function buscar() {
    const t = termo.trim();
    if (modo !== "alternativa" && !t) return;
    setErro(null); setBuscando(true); setResultados(null);
    try {
      let q = hostinger.from("view_ecarteira").select(COLS_BUSCA).eq("tp_plano", "SAUDE").limit(300);
      const dig = modo === "alternativa" ? comporCodigoAlternativo(codigo.plano, codigo.contrato, codigo.dep) : t.replace(/\D/g, "");
      if (modo === "alternativa") setCodigo({ plano: dig.slice(0, 4), contrato: dig.slice(4, 10), dep: dig.slice(-2) });
      if (modo === "nome") { if (t.length < 3) throw new Error("Digite ao menos 3 letras do nome."); q = q.ilike("nm_beneficiario", `%${t.toUpperCase()}%`); }
      else if (!dig) throw new Error("Informe apenas números para este tipo de pesquisa.");
      else if (modo === "cpf") q = q.eq("nr_cpf", String(Number(dig)));
      else if (modo === "matricula") q = q.eq("cd_matricula", Number(dig));
      else if (modo === "alternativa") q = q.eq("cd_mat_alternativa", Number(dig));
      else q = q.eq("cd_contrato", Number(dig));
      const { data, error } = await q;
      if (error) throw error;
      const m = new Map<number, CarteiraRow[]>();
      for (const r of (data ?? []) as unknown as CarteiraRow[]) m.set(r.cd_matricula, [...(m.get(r.cd_matricula) ?? []), r]);
      const lista = [...m.values()].map((rs) => registroAtual(rs)!).sort((a, b) => String(a.nm_beneficiario).localeCompare(String(b.nm_beneficiario)));
      setResultados(lista);
      if (lista.length === 1) selecionar(lista[0].cd_matricula);
    } catch (e: any) { setErro(e?.message ?? String(e)); }
    finally { setBuscando(false); }
  }

  async function selecionar(m: number) {
    setMat(m); setAba("resumo"); setCarregando(true); setMovs([]); setCad(null); setEard(null); setComp(null); setErro(null);
    setEscopo("Beneficiário"); setFamilia(null); setFamiliaErro(null); setFamiliaLoading(false);
    try {
      const [a, b] = await Promise.all([
        hostinger.from("view_ecarteira").select("*").eq("cd_matricula", m).limit(500),
        hostinger.from("beneficiarios").select("*").eq("cd_matricula", m).limit(1),
      ]);
      if (a.error) throw a.error;
      const rows = (a.data ?? []) as CarteiraRow[];
      setMovs(rows);
      setCad(b.data?.[0] ?? null);
      const atual = registroAtual(rows);
      const contrato = b.data?.[0]?.cd_contrato_mv ?? atual?.cd_contrato;
      setEardLoading(true);
      let qe = hostinger.from("view_eard_mensal").select(COLS_EARD).eq("cd_matricula", m).order("dt_competencia", { ascending: false }).limit(1000); // mais recentes primeiro: o limite nunca corta o período assistencial
      if (contrato) qe = qe.eq("cd_contrato_mv", contrato); // filtro por contrato acelera a consulta
      Promise.all([qe, ultimaCompetencia()]).then(([{ data, error }, ult]) => {
        if (!error && ult != null) { const g = ateUltimaValida(porCompetencia((data ?? []) as unknown as EardRow[]), ult); setEard(g); setComp(g.at(-1)?.dt_competencia ?? null); }
        else setEard([]);
      }).catch(() => setEard([])).finally(() => setEardLoading(false));
    } catch (e: any) { setErro(e?.message ?? String(e)); }
    finally { setCarregando(false); }
  }

  const atual = useMemo(() => registroAtual(movs), [movs]);
  const st = statusInfo(atual?.tp_status);
  const ultimo = eard?.at(-1) ?? null;
  const resumo = useMemo(() => (eard ? resumoEard(eard) : null), [eard]);
  const doMes = useMemo(() => eard?.find((r) => r.dt_competencia === comp) ?? null, [eard, comp]);
  const serie = useMemo(() => (eard ?? []).map((r) => ({ comp: fmtComp(r.dt_competencia), Receita: receitaMes(r), Despesa: despesaMes(r) })), [eard]);
  const eventos = useMemo(() => linhaDoTempo(movs, cad), [movs, cad]);
  const idade = atual?.dt_nascimento ? Math.floor((Date.now() - new Date(atual.dt_nascimento).getTime()) / 31557600000) : cad?.nr_idade_atual;


  /** Última competência válida (AAAAMM) ou null quando nenhum mês passa de R$ 20 milhões de despesa. */
  async function ultimaCompetencia(): Promise<number | null> {
    const u = await carregarUltimaCompetenciaValida();
    const v = u ? u.ano * 100 + u.mes : null;
    setUltimaValida(v);
    return v;
  }

  async function carregarFamilia() {
    if (familia || familiaLoading) return;
    const faixa = faixaFamilia(atual?.cd_mat_alternativa ?? cad?.cd_mat_alternativa);
    if (!faixa) { setFamiliaErro("Beneficiário sem código alternativo: não dá para identificar o grupo familiar."); return; }
    setFamiliaLoading(true); setFamiliaErro(null);
    try {
      const { data, error } = await hostinger.from("view_ecarteira")
        .select("cd_matricula,cd_mat_alternativa,nm_beneficiario,tp_relacionamento,tp_status,dt_momento,tp_plano,cd_contrato,dt_nascimento,vl_tmm")
        .eq("tp_plano", "SAUDE").gte("cd_mat_alternativa", faixa.de).lte("cd_mat_alternativa", faixa.ate).limit(2000);
      if (error) throw error;
      const rows = (data ?? []) as unknown as CarteiraRow[];
      const membros = membrosFamilia(rows);
      const mats = membros.map((x) => x.cd_matricula);
      if (!mats.length && mat) mats.push(mat);
      const ult = await ultimaCompetencia();
      if (ult == null) throw new Error("Nenhum mês da base tem despesas acima de R$ 20 milhões.");
      const meses = periodoAssistencial(ult);
      const contratos = [...new Set(rows.map((r) => r.cd_contrato).filter((c) => c != null))];
      let q = hostinger.from("view_eard_mensal").select(`cd_matricula,${COLS_EARD}`).in("cd_matricula", mats)
        .gte("dt_competencia", meses[0]).lte("dt_competencia", meses.at(-1)!).limit(10000);
      if (contratos.length) q = q.in("cd_contrato_mv", contratos); // filtro por contrato acelera a consulta
      const e = await q;
      if (e.error) throw e.error;
      setFamilia({ membros, eard: (e.data ?? []) as unknown as EardFamilia[], ate: ult });
    } catch (err: any) { setFamiliaErro(err?.message ?? String(err)); }
    finally { setFamiliaLoading(false); }
  }
  const painelBenef = carregando || (!!atual && mat != null);
  function mudarEscopo(e: Escopo) { setEscopo(e); if (e === "Família") carregarFamilia(); }
  const EardPend = () => <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando dados assistenciais…</div>;

  return (
    <section className="flex h-full min-h-0 flex-col gap-1.5">
      <div className="shrink-0 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className={`min-w-0 ${painelBenef ? "lg:w-[min(36rem,45%)] lg:shrink-0" : "w-full"}`}>
        <div className={modo === "alternativa" ? "grid w-fit max-w-full" : ""}>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {MODOS.map((m) => (
            <Button key={m.id} type="button" variant="outline" onClick={() => setModo(m.id)}
              className={`h-7 rounded-full px-3 py-0 text-xs transition-colors ${modo === m.id ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
              {m.label}
            </Button>
          ))}
        </div>
        <div className={modo === "alternativa" ? "flex w-0 min-w-full flex-wrap items-end gap-2 sm:flex-nowrap" : "flex flex-wrap items-end gap-2"}>
          {modo === "alternativa" ? (
            <div className="grid min-w-0 flex-1 basis-full grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,0.7fr)] gap-2 sm:basis-0">
              {([
                { key: "plano", label: "Plano", tamanho: 4 },
                { key: "contrato", label: "Contrato", tamanho: 6 },
                { key: "dep", label: "Dep", tamanho: 2 },
              ] as const).map(({ key, label, tamanho }) => (
                <label key={key} htmlFor={`codigo-${key}`} className="min-w-0 space-y-1 text-xs text-muted-foreground">
                  <span>{label}</span>
                  <Input id={`codigo-${key}`} type="text" inputMode="numeric" maxLength={tamanho}
                    ref={key === "plano" ? planoRef : undefined}
                    value={codigo[key]} placeholder={"0".repeat(tamanho)}
                    onChange={(e) => setCodigo((anterior) => ({ ...anterior, [key]: e.target.value.replace(/\D/g, "").slice(0, tamanho) }))}
                    onKeyDown={(e) => e.key === "Enter" && buscar()}
                    className="h-10 px-2 text-sm tabular-nums" />
                </label>
              ))}
            </div>
          ) : <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input value={termo} onChange={(e) => setTermo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && buscar()} autoFocus
              placeholder={modo === "nome" ? "Pesquisar por nome (parte do nome)…" : `Pesquisar por ${MODOS.find((x) => x.id === modo)?.label.toLowerCase() ?? "código"}…`}
              className="h-10 w-full rounded-lg border border-border bg-background pl-11 pr-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>}
          <Button type="button" onClick={buscar} disabled={buscando}
            className={modo === "alternativa" ? "h-10 shrink-0 px-3" : "h-10 px-6"}>
            {buscando && <Loader2 className="h-4 w-4 animate-spin" />}Pesquisar
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={limpar}
            aria-label="Limpar consulta" title="Limpar consulta" disabled={buscando || carregando || eardLoading}
            className="h-10 w-10 shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
        </div>
        </div>
        {painelBenef && (
          <div className="min-w-0 flex-1 border-t border-border pt-3 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            {carregando || !atual ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando beneficiário…</div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Beneficiário selecionado</div>
                  <h3 className="text-lg font-semibold leading-tight text-foreground">{atual.nm_beneficiario}</h3>
                  <div className="mt-0.5 flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                    {fmtCpf(atual.nr_cpf ?? cad?.nr_cpf) && <span>CPF {fmtCpf(atual.nr_cpf ?? cad?.nr_cpf)}</span>}
                    <span>Matrícula {atual.cd_matricula}</span>
                    {idade != null && <span>{idade} anos</span>}
                    {SEXO[atual.tp_sexo] && <span>{SEXO[atual.tp_sexo]}</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 text-sm text-foreground">
                    <span>{atual.ds_plano}</span><span>Contrato {atual.cd_contrato}</span>
                    {!vazio(atual.nm_empresa_estipulante) && <span className="text-muted-foreground">{atual.nm_empresa_estipulante}</span>}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full border px-3 py-1 text-sm font-semibold ${TONE[st.tone]}`}>{st.label}</span>
              </div>
            )}
          </div>
        )}
        </div>
        {atual && !carregando && (
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 md:grid-cols-3 xl:grid-cols-6">
              <Card label="Status" value={st.label} sub={atual.tp_status === "S" ? fmtD(atual.dt_suspensao) ?? undefined : atual.tp_status === "C" ? `desde ${fmtD(atual.dt_desligamento) ?? "—"}` : undefined} />
              <Card label="Plano" value={atual.cd_plano_alternativo ?? atual.cd_plano} sub={atual.tp_acomodacao ?? undefined} />
              <Card label="Idade" value={idade ?? "—"} sub={atual.ds_faixa_etaria ?? undefined} />
              <Card label="Vigência" value={fmtD(atual.dt_vigencia_beneficiario) ?? "—"} sub="início do beneficiário" />
              <Card label="Mensalidade (TMM)" value={fmtR(atual.vl_tmm != null ? Number(atual.vl_tmm) : null)} />
              <Card label="Despesa assistencial" value={eardLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : ultimo ? fmtR(despesaMes(ultimo)) : "—"} sub={ultimo ? `competência ${fmtComp(ultimo.dt_competencia)}` : eard ? "sem registros" : undefined} />
            </div>
        )}
        {erro && <p className="mt-2 text-xs text-destructive">{erro}</p>}
        {resultados && resultados.length === 0 && <p className="mt-2 text-xs text-muted-foreground">Nenhum beneficiário encontrado.</p>}
        {resultados && resultados.length > 1 && (
          <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/60 text-[10px] uppercase text-muted-foreground">
                <tr><th className="px-2 py-1.5 text-left">Nome</th><th className="px-2 text-left">Matrícula</th><th className="px-2 text-left">CPF</th><th className="px-2 text-left">Contrato</th><th className="px-2 text-left">Plano</th><th className="px-2 text-left">Estipulante</th><th className="px-2 text-center">Status</th></tr>
              </thead>
              <tbody>
                {resultados.map((r) => { const s = statusInfo(r.tp_status); return (
                  <tr key={r.cd_matricula} onClick={() => selecionar(r.cd_matricula)} className={`cursor-pointer border-t border-border hover:bg-accent/40 ${mat === r.cd_matricula ? "bg-accent/60" : ""}`}>
                    <td className="px-2 py-1.5 font-medium">{r.nm_beneficiario}</td><td className="px-2 tabular-nums">{r.cd_matricula}</td>
                    <td className="px-2 tabular-nums">{fmtCpf(r.nr_cpf) ?? "—"}</td><td className="px-2 tabular-nums">{r.cd_contrato}</td>
                    <td className="px-2">{r.ds_plano}</td><td className="px-2 truncate max-w-[220px]">{r.nm_empresa_estipulante}</td>
                    <td className="px-2 text-center"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TONE[s.tone]}`}>{s.label}</span></td>
                  </tr>); })}
              </tbody>
            </table>
            {resultados.length >= 300 && <p className="p-2 text-[11px] text-muted-foreground">Muitos resultados — refine a pesquisa.</p>}
          </div>
        )}
      </div>

      {atual && !carregando && (
        <>
          <nav aria-label="Seções do beneficiário" className="flex shrink-0 flex-wrap gap-1 border-b border-border">
            {ABAS.map((a) => (
              <button key={a.id} type="button" aria-pressed={aba === a.id} onClick={() => { setAba(a.id); if (a.id === "familia") carregarFamilia(); }}
                className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors ${aba === a.id ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                <a.icon className="h-4 w-4" />{a.label}
              </button>
            ))}
          </nav>
          {/* Formato único: um só quadro de conteúdo, limitado ao fim da tela, com rolagem interna. */}
          <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-sm">
          {aba === "resumo" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Bloco titulo="Dados principais">
                <Campo label="Nome" value={atual.nm_beneficiario} /><Campo label="Matrícula" value={atual.cd_matricula} />
                <Campo label="Relacionamento" value={atual.tp_relacionamento} /><Campo label="Plano" value={atual.ds_plano} />
                <Campo label="Contrato" value={atual.cd_contrato} /><Campo label="Estipulante" value={atual.nm_empresa_estipulante} />
                <Campo label="Vigência" value={fmtD(atual.dt_vigencia_beneficiario)} /><Campo label="Status" value={st.label} />
              </Bloco>
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assistencial e financeiro (todo o histórico)</h4>
                {eardLoading ? <EardPend /> : resumo && eard!.length ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Campo label="Receita" value={fmtR(resumo.receita)} /><Campo label="Coparticipação" value={fmtR(resumo.copart)} />
                    <Campo label="Despesa assistencial" value={fmtR(resumo.despesa)} />
                    <Campo label="Sinistralidade" value={resumo.sinistralidade == null ? "—" : `${resumo.sinistralidade.toFixed(2).replace(".", ",")}%`} />
                    <div className="col-span-full h-40">
                      <ResponsiveContainer><BarChart data={serie.slice(-12)}><XAxis dataKey="comp" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} width={50} /><Tooltip formatter={(v: number) => fmtR(v)} /><Bar dataKey="Receita" fill="hsl(var(--primary))" /><Bar dataKey="Despesa" fill="hsl(var(--destructive))" /></BarChart></ResponsiveContainer>
                    </div>
                  </div>
                ) : <p className="text-sm text-muted-foreground">Sem registros assistenciais para esta matrícula.</p>}
              </div>
            </div>
          )}

          {aba === "benef" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Bloco titulo="Identificação">
                <Campo label="Nome" value={atual.nm_beneficiario} /><Campo label="CPF" value={fmtCpf(atual.nr_cpf ?? cad?.nr_cpf)} />
                <Campo label="Nascimento" value={fmtD(atual.dt_nascimento ?? cad?.dt_nascimento)} /><Campo label="Idade" value={idade} />
                <Campo label="Sexo" value={SEXO[atual.tp_sexo] ?? atual.tp_sexo} /><Campo label="Faixa etária" value={atual.ds_faixa_etaria} />
              </Bloco>
              <Bloco titulo="Vínculo">
                <Campo label="Matrícula" value={atual.cd_matricula} /><Campo label="Mat. alternativa" value={atual.cd_mat_alternativa ?? cad?.cd_mat_alternativa} />
                <Campo label="Relacionamento" value={atual.tp_relacionamento ?? cad?.tp_relacionamento} /><Campo label="Tipo de usuário" value={cad?.tp_usuario === "T" ? "Titular" : cad?.tp_usuario === "D" ? "Dependente" : cad?.tp_usuario} />
                <Campo label="Responsável financeiro" value={cad?.nm_resp_financeiro ?? atual.nm_resp_financeiro} />
              </Bloco>
              <Bloco titulo="Localização">
                <Campo label="Cidade do plano" value={atual.nm_cidade_plano} /><Campo label="UF" value={atual.cd_uf_plano} />
                <Campo label="Regional" value={atual.nm_regional_plano} /><Campo label="IBGE" value={atual.cd_ibge_cidade_plano} />
              </Bloco>
              <Bloco titulo="Situação cadastral">
                <Campo label="Status" value={st.label} /><Campo label="Cadastro" value={fmtD(atual.dt_cadastro ?? cad?.dt_cadastro)} />
                <Campo label="Desligamento" value={fmtD(atual.dt_desligamento ?? cad?.dt_ult_desligamento)} /><Campo label="Motivo do desligamento" value={atual.ds_motivo_cancelamento ?? cad?.ds_motivo_deslig} />
                <Campo label="Suspensão" value={fmtD(atual.dt_suspensao ?? cad?.dt_ult_suspensao)} /><Campo label="Motivo da suspensão" value={atual.ds_motivo_suspensao ?? cad?.ds_motivo_suspensao} />
                <Campo label="Última alteração" value={fmtD(cad?.dt_ult_alteracao)} />
              </Bloco>
            </div>
          )}

          {aba === "contrato" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Bloco titulo="Contrato">
                <Campo label="Código do contrato" value={atual.cd_contrato} /><Campo label="Contrato alternativo" value={cad?.cd_contrato_alternativo} />
                <Campo label="Vigência do contrato" value={fmtD(atual.dt_vigencia_contrato)} /><Campo label="Tipo de contratação" value={atual.tp_contratacao} />
                <Campo label="PME" value={atual.sn_pme === "S" ? "Sim" : atual.sn_pme === "N" ? "Não" : null} />
                <Campo label="Estipulante" value={atual.nm_empresa_estipulante} /><Campo label="Empresa associada" value={atual.nm_empresa_associ} />
                <Campo label="CNPJ associada" value={atual.cd_cnpj_empresa_assoc} /><Campo label="Cidade do contrato" value={atual.nm_cidade_contrato} />
                <Campo label="UF do contrato" value={atual.cd_uf_contrato} /><Campo label="Regional do contrato" value={atual.nm_regional_contrato} />
                <Campo label="CEP do contrato" value={atual.cd_cep_contrato} />
              </Bloco>
              <Bloco titulo="Plano / Produto">
                <Campo label="Código do plano" value={atual.cd_plano} /><Campo label="Plano alternativo" value={atual.cd_plano_alternativo} />
                <Campo label="Nome do plano" value={atual.ds_plano} /><Campo label="Produto (ANS)" value={atual.cd_produto_ms} />
                <Campo label="Tipo do plano" value={cad?.tp_plano ?? atual.tp_plano} /><Campo label="Acomodação" value={atual.tp_acomodacao} />
                <Campo label="Recuperação" value={atual.tp_recuperacao} /><Campo label="Cidade do plano" value={atual.nm_cidade_plano} />
                <Campo label="Regional do plano" value={atual.nm_regional_plano} /><Campo label="Vendedor" value={atual.nm_vendedor} />
                <Campo label="Campanha" value={atual.nm_campanha_marketing} />
              </Bloco>
            </div>
          )}

          {aba === "fin" && (
            <div className="space-y-4">
              <Bloco titulo="Mensalidade e responsável">
                <Campo label="Mensalidade (TMM)" value={atual.vl_tmm != null ? fmtR(Number(atual.vl_tmm)) : null} />
                <Campo label="Último reajuste" value={fmtD(atual.dt_ult_reajuste)} />
                <Campo label="Responsável financeiro" value={cad?.nm_resp_financeiro ?? atual.nm_resp_financeiro} />
              </Bloco>
              {eardLoading ? <EardPend /> : eard && eard.length > 0 && (
                <div className="overflow-auto rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground"><tr><th className="px-2 py-1.5 text-left">Competência</th><th className="px-2 text-right">Contraprestação</th><th className="px-2 text-right">Coparticipação</th><th className="px-2 text-right">Outras receitas</th><th className="px-2 text-right">Receita total</th></tr></thead>
                    <tbody>{[...eard].reverse().map((r) => (
                      <tr key={r.dt_competencia} className="border-t border-border"><td className="px-2 py-1.5">{fmtComp(r.dt_competencia)}</td><td className="px-2 text-right tabular-nums">{fmtR(Number(r.vl_rec_cpp ?? 0))}</td><td className="px-2 text-right tabular-nums">{fmtR(Number(r.vl_rec_copart ?? 0))}</td><td className="px-2 text-right tabular-nums">{fmtR(Number(r.vl_rec_outros ?? 0))}</td><td className="px-2 text-right font-medium tabular-nums">{fmtR(receitaMes(r))}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {aba === "assist" && (eardLoading ? <EardPend /> : !eard || eard.length === 0 ? <div className="space-y-4">{ultimaValida != null && <ResultadoAssistencial eard={[]} ate={ultimaValida} escopo={escopo} onEscopo={mudarEscopo} familia={familia} familiaLoading={familiaLoading} familiaErro={familiaErro} />}<p className="text-sm text-muted-foreground">Sem registros assistenciais para esta matrícula.</p></div> : (
            <div className="space-y-4">
              <ResultadoAssistencial eard={eard} ate={ultimaValida!} escopo={escopo} onEscopo={mudarEscopo} familia={familia} familiaLoading={familiaLoading} familiaErro={familiaErro} />
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Competência</span>
                <select value={comp ?? ""} onChange={(e) => setComp(Number(e.target.value))} className="h-8 rounded-md border border-border bg-background px-2 text-sm">
                  {[...eard].reverse().map((r) => <option key={r.dt_competencia} value={r.dt_competencia}>{fmtComp(r.dt_competencia)}</option>)}
                </select>
              </div>
              {doMes && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
                  {CATEGORIAS_DESPESA.map((c) => <Card key={c.key} label={c.label} value={fmtR(Number(doMes[c.key] ?? 0))} />)}
                  <Card label="Despesa total" value={fmtR(despesaMes(doMes))} />
                  <Card label="Sinistralidade" value={receitaMes(doMes) > 0 ? `${((despesaMes(doMes) / receitaMes(doMes)) * 100).toFixed(2).replace(".", ",")}%` : "—"} />
                </div>
              )}
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-lg border border-border bg-muted/20 p-4 lg:col-span-2">
                  <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Evolução mensal da despesa assistencial</h4>
                  <div className="h-64"><ResponsiveContainer>
                    <BarChart data={eard.map((r) => ({ comp: fmtComp(r.dt_competencia), ...Object.fromEntries(CATEGORIAS_DESPESA.map((c) => [c.label, Number(r[c.key] ?? 0)])) }))}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="comp" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} width={55} />
                      <Tooltip formatter={(v: number) => fmtR(v)} /><Legend wrapperStyle={{ fontSize: 11 }} />
                      {CATEGORIAS_DESPESA.map((c, i) => <Bar key={c.key} dataKey={c.label} stackId="d" fill={i === 5 ? "hsl(var(--muted-foreground))" : `hsl(var(--chart-${i + 1}))`} />)}
                    </BarChart>
                  </ResponsiveContainer></div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Composição (todo o histórico)</h4>
                  {resumo!.porCategoria.map((c) => { const p = resumo!.despesa > 0 ? (c.valor / resumo!.despesa) * 100 : 0; return (
                    <div key={c.key} className="mb-2">
                      <div className="flex justify-between text-xs"><span>{c.label}</span><span className="tabular-nums">{fmtR(c.valor)} · {p.toFixed(1).replace(".", ",")}%</span></div>
                      <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${p}%` }} /></div>
                    </div>); })}
                </div>
              </div>
              <div className="overflow-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground"><tr><th className="px-2 py-1.5 text-left">Competência</th>{CATEGORIAS_DESPESA.map((c) => <th key={c.key} className="px-2 text-right">{c.label}</th>)}<th className="px-2 text-right">Despesa</th><th className="px-2 text-right">Receita</th><th className="px-2 text-right">Sinistr.</th></tr></thead>
                  <tbody>{[...eard].reverse().map((r) => { const d = despesaMes(r), rc = receitaMes(r); return (
                    <tr key={r.dt_competencia} className="border-t border-border"><td className="px-2 py-1.5">{fmtComp(r.dt_competencia)}</td>
                      {CATEGORIAS_DESPESA.map((c) => <td key={c.key} className="px-2 text-right tabular-nums">{fmtR(Number(r[c.key] ?? 0))}</td>)}
                      <td className="px-2 text-right font-medium tabular-nums">{fmtR(d)}</td><td className="px-2 text-right tabular-nums">{fmtR(rc)}</td><td className="px-2 text-right tabular-nums">{rc > 0 ? `${((d / rc) * 100).toFixed(1).replace(".", ",")}%` : "—"}</td></tr>); })}</tbody>
                </table>
              </div>
            </div>
          ))}

          {aba === "familia" && <GrupoFamiliar familia={familia} loading={familiaLoading} erro={familiaErro} matSelecionada={mat} />}

          {aba === "hist" && (
            <ol className="relative ml-3 border-l border-border">
              {eventos.map((e, i) => (
                <li key={i} className="mb-4 ml-5">
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-background bg-primary" />
                  <div className="text-xs tabular-nums text-muted-foreground">{fmtD(e.data)}</div>
                  <div className="text-sm font-medium text-foreground">{e.evento}</div>
                  {e.descricao && <div className="text-xs text-muted-foreground">{e.descricao}</div>}
                </li>
              ))}
            </ol>
          )}
          </div>
        </>
      )}
    </section>
  );
}
