import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, User, FileText, Wallet, Activity, History, LayoutGrid } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { hostinger } from "@/lib/hostingerClient";
import {
  CATEGORIAS_DESPESA, despesaMes, linhaDoTempo, porCompetencia, receitaMes, registroAtual, resumoEard, statusInfo,
  type CarteiraRow, type EardRow,
} from "@/lib/painelBeneficiario";

type Modo = "nome" | "cpf" | "matricula" | "contrato" | "alternativa";
const MODOS: { id: Modo; label: string }[] = [
  { id: "nome", label: "Nome" }, { id: "cpf", label: "CPF" }, { id: "matricula", label: "Matrícula" },
  { id: "alternativa", label: "Código (mat. alternativa)" }, { id: "contrato", label: "Contrato" },
];
const ABAS = [
  { id: "resumo", label: "Resumo", icon: LayoutGrid }, { id: "benef", label: "Beneficiário", icon: User },
  { id: "contrato", label: "Contrato e Plano", icon: FileText }, { id: "fin", label: "Financeiro", icon: Wallet },
  { id: "assist", label: "Assistencial", icon: Activity }, { id: "hist", label: "Histórico", icon: History },
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
    <div className="rounded-lg border border-border bg-card p-4">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">{children}</div>
    </div>
  );
}
function Card({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold text-foreground truncate">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default function PainelBeneficiario() {
  const [modo, setModo] = useState<Modo>("nome");
  const [termo, setTermo] = useState("");
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

  async function buscar() {
    const t = termo.trim();
    if (!t) return;
    setErro(null); setBuscando(true); setResultados(null);
    try {
      let q = hostinger.from("view_ecarteira").select(COLS_BUSCA).eq("tp_plano", "SAUDE").limit(300);
      const dig = t.replace(/\D/g, "");
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
      let qe = hostinger.from("view_eard_mensal").select(COLS_EARD).eq("cd_matricula", m).order("dt_competencia").limit(1000);
      if (contrato) qe = qe.eq("cd_contrato_mv", contrato); // filtro por contrato acelera a consulta
      qe.then(({ data, error }) => {
        if (!error) { const g = porCompetencia((data ?? []) as unknown as EardRow[]); setEard(g); setComp(g.at(-1)?.dt_competencia ?? null); }
        else setEard([]);
        setEardLoading(false);
      });
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

  const EardPend = () => <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando dados assistenciais…</div>;

  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-xl font-semibold text-foreground">Painel</h2>
        <p className="text-sm text-muted-foreground">Central de Consulta do Beneficiário</p>
      </header>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {MODOS.map((m) => (
            <button key={m.id} type="button" onClick={() => setModo(m.id)}
              className={`h-7 rounded-full border px-3 text-xs transition-colors ${modo === m.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input value={termo} onChange={(e) => setTermo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && buscar()} autoFocus
              placeholder={modo === "nome" ? "Pesquisar por nome (parte do nome)…" : `Pesquisar por ${MODOS.find((x) => x.id === modo)!.label.toLowerCase()}…`}
              className="h-12 w-full rounded-lg border border-border bg-background pl-11 pr-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <button type="button" onClick={buscar} disabled={buscando}
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {buscando && <Loader2 className="h-4 w-4 animate-spin" />}Pesquisar
          </button>
        </div>
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

      {carregando && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando beneficiário…</div>}

      {atual && !carregando && (
        <>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Beneficiário selecionado</div>
                <h3 className="text-2xl font-semibold text-foreground">{atual.nm_beneficiario}</h3>
                <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                  {fmtCpf(atual.nr_cpf ?? cad?.nr_cpf) && <span>CPF {fmtCpf(atual.nr_cpf ?? cad?.nr_cpf)}</span>}
                  <span>Matrícula {atual.cd_matricula}</span>
                  {idade != null && <span>{idade} anos</span>}
                  {SEXO[atual.tp_sexo] && <span>{SEXO[atual.tp_sexo]}</span>}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-foreground">
                  <span>{atual.ds_plano}</span><span>Contrato {atual.cd_contrato}</span>
                  {!vazio(atual.nm_empresa_estipulante) && <span className="text-muted-foreground">{atual.nm_empresa_estipulante}</span>}
                </div>
              </div>
              <span className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${TONE[st.tone]}`}>{st.label}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Card label="Status" value={st.label} sub={atual.tp_status === "S" ? fmtD(atual.dt_suspensao) ?? undefined : atual.tp_status === "C" ? `desde ${fmtD(atual.dt_desligamento) ?? "—"}` : undefined} />
            <Card label="Plano" value={atual.cd_plano_alternativo ?? atual.cd_plano} sub={atual.tp_acomodacao ?? undefined} />
            <Card label="Idade" value={idade ?? "—"} sub={atual.ds_faixa_etaria ?? undefined} />
            <Card label="Vigência" value={fmtD(atual.dt_vigencia_beneficiario) ?? "—"} sub="início do beneficiário" />
            <Card label="Mensalidade (TMM)" value={fmtR(atual.vl_tmm != null ? Number(atual.vl_tmm) : null)} />
            <Card label="Despesa assistencial" value={eardLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : ultimo ? fmtR(despesaMes(ultimo)) : "—"} sub={ultimo ? `competência ${fmtComp(ultimo.dt_competencia)}` : eard ? "sem registros" : undefined} />
          </div>

          <div className="flex flex-wrap gap-1 border-b border-border">
            {ABAS.map((a) => (
              <button key={a.id} type="button" onClick={() => setAba(a.id)}
                className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors ${aba === a.id ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                <a.icon className="h-4 w-4" />{a.label}
              </button>
            ))}
          </div>

          {aba === "resumo" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Bloco titulo="Dados principais">
                <Campo label="Nome" value={atual.nm_beneficiario} /><Campo label="Matrícula" value={atual.cd_matricula} />
                <Campo label="Relacionamento" value={atual.tp_relacionamento} /><Campo label="Plano" value={atual.ds_plano} />
                <Campo label="Contrato" value={atual.cd_contrato} /><Campo label="Estipulante" value={atual.nm_empresa_estipulante} />
                <Campo label="Vigência" value={fmtD(atual.dt_vigencia_beneficiario)} /><Campo label="Status" value={st.label} />
              </Bloco>
              <div className="rounded-lg border border-border bg-card p-4">
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

          {aba === "assist" && (eardLoading ? <EardPend /> : !eard || eard.length === 0 ? <p className="text-sm text-muted-foreground">Sem registros assistenciais para esta matrícula.</p> : (
            <div className="space-y-4">
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
                <div className="rounded-lg border border-border bg-card p-4 lg:col-span-2">
                  <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Evolução mensal da despesa assistencial</h4>
                  <div className="h-64"><ResponsiveContainer>
                    <BarChart data={eard.map((r) => ({ comp: fmtComp(r.dt_competencia), ...Object.fromEntries(CATEGORIAS_DESPESA.map((c) => [c.label, Number(r[c.key] ?? 0)])) }))}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="comp" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} width={55} />
                      <Tooltip formatter={(v: number) => fmtR(v)} /><Legend wrapperStyle={{ fontSize: 11 }} />
                      {CATEGORIAS_DESPESA.map((c, i) => <Bar key={c.key} dataKey={c.label} stackId="d" fill={`hsl(var(--chart-${(i % 5) + 1}, var(--primary)))`} />)}
                    </BarChart>
                  </ResponsiveContainer></div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
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
        </>
      )}
    </section>
  );
}
