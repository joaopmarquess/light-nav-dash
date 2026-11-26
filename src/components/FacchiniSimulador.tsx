import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import * as E from "@/lib/facchini/engine";

type Tabela = { id: string; nome: string; produto: string; versao: number; status: string; valores: number[]; fonte: string | null; vigencia_inicial: string | null };
type Empresa = { id: string; razao_social: string; nome_fantasia: string | null; cnpj: string | null; numero_proposta: string | null; agente_codigo: string | null; agente_nome: string | null; responsavel: string | null; data_base: string | null; observacoes: string | null; status: string };
type Dados = { faixas: E.Faixa[]; origem: string; taxaDependencia: number; premissas: E.Premissas; comparar: string[]; tabelaCheiaId?: string; produto: string };
type Sim = { id: string; nome: string; empresa_id: string | null; tabela_id: string | null; status: string; etapa: number; dados: Dados; updated_at: string };
const db = supabase as any;
const STATUS = ["Rascunho", "Em análise", "Aprovada", "Reprovada", "Arquivada"];
const ETAPAS = ["Identificação", "Composição da Carteira", "Produto e Tabela", "Premissas", "Patrocínio", "Projeção Financeira", "Comparativo", "Validações", "Relatório Final"];
const ORIGENS = ["Informada pelo proponente", "Projetada com base na carteira Bensaúde", "Calculada com base na carteira completa enviada", "Suposta"];
const novoDados = (): Dados => ({ faixas: E.FAIXAS.map(() => ({ titulares: 0, dependentes: 0 })), origem: ORIGENS[0], taxaDependencia: 0.3, premissas: { ...E.PREMISSAS_PADRAO }, comparar: [], produto: "F30" });

const Num = ({ v, money, p }: { v: number; money?: boolean; p?: boolean }) => (
  <span className={v < 0 ? "text-destructive" : ""}>{money ? E.brl(v) : p ? E.pct(v) : E.qtd(v)}</span>
);
const Selo = ({ s }: { s: string }) => (
  <span className={`rounded px-2 py-0.5 text-xs font-medium ${s === "OK" ? "bg-emerald-100 text-emerald-600" : s === "Atenção" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{s}</span>
);
const Card = ({ t, children }: { t: string; children: React.ReactNode }) => (
  <div className="rounded-md border bg-card p-3"><div className="text-xs text-muted-foreground">{t}</div><div className="text-lg font-semibold">{children}</div></div>
);
const NumIn = ({ v, on, pctMode, w = "w-28" }: { v: number; on: (n: number) => void; pctMode?: boolean; w?: string }) => (
  <Input type="number" step="any" className={`h-8 ${w}`} value={pctMode ? +(v * 100).toPrecision(12) : v}
    onChange={(e) => { const x = parseFloat(e.target.value); on(Number.isFinite(x) ? (pctMode ? x / 100 : x) : 0); }} />
);

export default function FacchiniSimulador() {
  const [tabelas, setTabelas] = useState<Tabela[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [sims, setSims] = useState<Sim[]>([]);
  const [atual, setAtual] = useState<Sim | null>(null);
  const [aba, setAba] = useState("painel");
  const carregar = async () => {
    const [t, e, s] = await Promise.all([
      db.from("facchini_tabelas").select("*").order("created_at"),
      db.from("facchini_empresas").select("*").order("razao_social"),
      db.from("facchini_simulacoes").select("*").order("updated_at", { ascending: false }),
    ]);
    if (t.error || e.error || s.error) toast.error("Não foi possível carregar os dados do simulador.");
    setTabelas((t.data ?? []).map((x: any) => ({ ...x, valores: (x.valores ?? []).map(Number) })));
    setEmpresas(e.data ?? []);
    setSims((s.data ?? []).map((x: any) => ({ ...x, dados: { ...novoDados(), ...x.dados, premissas: { ...E.PREMISSAS_PADRAO, ...(x.dados?.premissas ?? {}) } } })));
  };
  useEffect(() => { carregar(); }, []);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-auto">
      <h1 className="mb-3 text-xl font-semibold">Facchini · Simulador de Precificação</h1>
      <Tabs value={aba} onValueChange={setAba}>
        <TabsList className="flex-wrap h-auto">
          {[["painel", "Painel"], ["empresas", "Empresas"], ["tabelas", "Tabelas de Preços"], ["simulacoes", "Simulações"], ["comparativo", "Comparativo"]].map(([k, l]) => <TabsTrigger key={k} value={k}>{l}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="painel"><Painel sims={sims} tabelas={tabelas} empresas={empresas} abrir={(s) => { setAtual(s); setAba("simulacoes"); }} /></TabsContent>
        <TabsContent value="empresas"><Empresas empresas={empresas} recarregar={carregar} /></TabsContent>
        <TabsContent value="tabelas"><Tabelas tabelas={tabelas} recarregar={carregar} /></TabsContent>
        <TabsContent value="simulacoes"><Simulacoes sims={sims} atual={atual} setAtual={setAtual} tabelas={tabelas} empresas={empresas} recarregar={carregar} /></TabsContent>
        <TabsContent value="comparativo"><Comparativo tabelas={tabelas} faixas={atual?.dados.faixas ?? novoDados().faixas} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Painel({ sims, tabelas, empresas, abrir }: { sims: Sim[]; tabelas: Tabela[]; empresas: Empresa[]; abrir: (s: Sim) => void }) {
  const s = sims[0];
  const t = tabelas.find((x) => x.id === s?.tabela_id);
  if (!s || !t) return <p className="p-4 text-sm text-muted-foreground">Nenhuma simulação ainda. Crie uma em Simulações.</p>;
  const r = E.projecao(s.dados.faixas, t.valores, s.dados.premissas);
  const cheia = tabelas.find((x) => x.id === s.dados.tabelaCheiaId) ?? tabelas[0];
  const m = E.margem(r.producao.ticketGrupo, E.producao(s.dados.faixas, cheia.valores).ticketGrupo);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">Última simulação: <b>{s.nome}</b> <Button size="sm" variant="outline" onClick={() => abrir(s)}>Abrir</Button></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Card t="Empresa">{empresas.find((e) => e.id === s.empresa_id)?.razao_social ?? "—"}</Card>
        <Card t="Tabela">{t.nome}</Card>
        <Card t="Vidas">{E.qtd(r.producao.vidas)}</Card>
        <Card t="Titulares / Dependentes">{E.qtd(r.producao.titulares)} / {E.qtd(r.producao.dependentes)}</Card>
        <Card t="Produção mensal">{E.brl(r.producao.total)}</Card>
        <Card t="Ticket médio">{E.brl(r.producao.ticketGrupo)}</Card>
        <Card t="Sinistralidade / Copart.">{E.pct(s.dados.premissas.sinistralidade)} / {E.pct(s.dados.premissas.coparticipacao)}</Card>
        <Card t="Saldo 1º mês"><Num v={r.colunas.mes1.saldo} money /></Card>
        <Card t="Saldo 1º ano"><Num v={r.colunas.ano1.saldo} money /></Card>
        <Card t="Saldo 2º ano"><Num v={r.colunas.ano2.saldo} money /></Card>
        <Card t="Fator / Desconto efetivo">{E.fator(m.fatorEfetivo)} / {E.qtd(m.descontoEfetivo)}%</Card>
        <Card t="RN 63"><Selo s={r.rn63.validacao1} /> <Selo s={r.rn63.validacao2} /></Card>
      </div>
      <Graficos faixas={s.dados.faixas} precos={t.valores} />
    </div>
  );
}

function Graficos({ faixas, precos }: { faixas: E.Faixa[]; precos: number[] }) {
  const p = E.producao(faixas, precos);
  const d = p.porFaixa.map((x, i) => ({ faixa: E.FAIXAS[i], Titulares: x.titulares, Dependentes: x.dependentes, Produção: x.total }));
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="h-64 rounded-md border p-2"><ResponsiveContainer><BarChart data={d}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="faixa" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Legend /><Bar dataKey="Titulares" stackId="a" fill="hsl(var(--primary))" /><Bar dataKey="Dependentes" stackId="a" fill="hsl(var(--muted-foreground))" /></BarChart></ResponsiveContainer></div>
      <div className="h-64 rounded-md border p-2"><ResponsiveContainer><BarChart data={d}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="faixa" fontSize={10} /><YAxis fontSize={10} /><Tooltip formatter={(v: number) => E.brl(v)} /><Bar dataKey="Produção" fill="hsl(var(--primary))" /></BarChart></ResponsiveContainer></div>
    </div>
  );
}

function Empresas({ empresas, recarregar }: { empresas: Empresa[]; recarregar: () => void }) {
  const vazio = { razao_social: "", nome_fantasia: "", cnpj: "", numero_proposta: "", agente_codigo: "", agente_nome: "", responsavel: "", data_base: "", observacoes: "", status: "ativo" };
  const [f, setF] = useState<any>(vazio);
  const salvar = async () => {
    if (!f.razao_social.trim()) return toast.error("Informe a razão social.");
    const row = { ...f, data_base: f.data_base || null };
    const { error } = f.id ? await db.from("facchini_empresas").update({ ...row, updated_at: new Date().toISOString() }).eq("id", f.id) : await db.from("facchini_empresas").insert(row);
    if (error) return toast.error("Não foi possível salvar a empresa.");
    toast.success("Empresa salva."); setF(vazio); recarregar();
  };
  const campos: [string, string][] = [["razao_social", "Razão social"], ["nome_fantasia", "Nome fantasia"], ["cnpj", "CNPJ"], ["numero_proposta", "Nº da proposta"], ["agente_codigo", "Código do agente"], ["agente_nome", "Nome do agente"], ["responsavel", "Responsável"], ["data_base", "Data-base"], ["observacoes", "Observações"]];
  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-3">
        {campos.map(([k, l]) => <label key={k} className="text-xs">{l}<Input className="h-8" type={k === "data_base" ? "date" : "text"} value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>)}
      </div>
      <div className="flex gap-2"><Button size="sm" onClick={salvar}>{f.id ? "Salvar alterações" : "Cadastrar empresa"}</Button>{f.id && <Button size="sm" variant="ghost" onClick={() => setF(vazio)}>Cancelar</Button>}</div>
      <table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th>Razão social</th><th>CNPJ</th><th>Agente</th><th>Proposta</th><th /></tr></thead>
        <tbody>{empresas.map((e) => <tr key={e.id} className="border-b"><td>{e.razao_social}</td><td>{e.cnpj}</td><td>{e.agente_codigo} {e.agente_nome}</td><td>{e.numero_proposta}</td><td><Button size="sm" variant="ghost" onClick={() => setF({ ...e, data_base: e.data_base ?? "" })}>Editar</Button></td></tr>)}</tbody></table>
    </div>
  );
}

function Tabelas({ tabelas, recarregar }: { tabelas: Tabela[]; recarregar: () => void }) {
  const [sel, setSel] = useState<Tabela | null>(null);
  const [ajuste, setAjuste] = useState(0);
  const gravar = async (t: Partial<Tabela>, novo: boolean) => {
    const { id, ...rest } = t as any;
    const { error } = novo ? await db.from("facchini_tabelas").insert(rest) : await db.from("facchini_tabelas").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error("Somente administradores alteram tabelas de preços.");
    toast.success("Tabela salva."); setSel(null); recarregar();
  };
  return (
    <div className="space-y-4 overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="border-b text-left text-muted-foreground"><th>Tabela</th><th>Versão</th><th>Status</th>{E.FAIXAS.map((f) => <th key={f} className="text-right">{f}</th>)}<th>RN 63</th><th /></tr></thead>
        <tbody>{tabelas.map((t) => { const r = E.rn63(t.valores); return (
          <tr key={t.id} className={`border-b ${t.status !== "ativa" ? "opacity-50" : ""}`}><td>{t.nome}</td><td>v{t.versao}</td><td>{t.status}</td>{t.valores.map((v, i) => <td key={i} className="text-right">{E.brl(v)}</td>)}
            <td><Selo s={r.validacao1} /> <Selo s={r.validacao2} /></td>
            <td className="whitespace-nowrap"><Button size="sm" variant="ghost" onClick={() => setSel({ ...t })}>Editar</Button>
              <Button size="sm" variant="ghost" onClick={() => gravar({ ...t, nome: `${t.nome} (cópia)`, versao: 1, id: undefined } as any, true)}>Copiar</Button>
              <Button size="sm" variant="ghost" onClick={() => gravar({ id: t.id, status: t.status === "ativa" ? "inativa" : "ativa" } as any, false)}>{t.status === "ativa" ? "Inativar" : "Ativar"}</Button></td></tr>); })}</tbody>
      </table>
      {sel && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="flex flex-wrap items-end gap-2"><label className="text-xs">Nome<Input className="h-8 w-64" value={sel.nome} onChange={(e) => setSel({ ...sel, nome: e.target.value })} /></label>
            <label className="text-xs">Vigência inicial<Input type="date" className="h-8" value={sel.vigencia_inicial ?? ""} onChange={(e) => setSel({ ...sel, vigencia_inicial: e.target.value || null })} /></label>
            <label className="text-xs">Reajuste (+) / desconto (−) %<NumIn v={ajuste} on={setAjuste} pctMode /></label>
            <Button size="sm" variant="outline" onClick={() => setSel({ ...sel, valores: E.ajustarTabela(sel.valores, ajuste) })}>Aplicar</Button></div>
          <div className="flex flex-wrap gap-2">{sel.valores.map((v, i) => <label key={i} className="text-xs">{E.FAIXAS[i]}<NumIn v={v} on={(x) => { const vs = [...sel.valores]; vs[i] = x; setSel({ ...sel, valores: vs }); }} /></label>)}</div>
          <div className="flex gap-2"><Button size="sm" onClick={() => gravar({ ...sel, versao: sel.versao + 1 }, false)}>Salvar como nova versão</Button><Button size="sm" variant="ghost" onClick={() => setSel(null)}>Cancelar</Button></div>
        </div>
      )}
    </div>
  );
}

function Simulacoes({ sims, atual, setAtual, tabelas, empresas, recarregar }: { sims: Sim[]; atual: Sim | null; setAtual: (s: Sim | null) => void; tabelas: Tabela[]; empresas: Empresa[]; recarregar: () => void }) {
  const [hist, setHist] = useState<any[]>([]);
  useEffect(() => { if (atual?.id) db.from("facchini_historico").select("*").eq("simulacao_id", atual.id).order("created_at", { ascending: false }).limit(30).then((r: any) => setHist(r.data ?? [])); }, [atual?.id, atual?.updated_at]);
  const nova = async () => {
    const { data, error } = await db.from("facchini_simulacoes").insert({ nome: `Simulação ${new Date().toLocaleString("pt-BR")}`, tabela_id: tabelas.find((t) => t.nome === "Facchini")?.id ?? tabelas[0]?.id, dados: novoDados() }).select().single();
    if (error) return toast.error("Não foi possível criar a simulação.");
    await db.from("facchini_historico").insert({ simulacao_id: data.id, acao: "criada" });
    setAtual({ ...data, dados: novoDados() }); recarregar();
  };
  if (!atual) return (
    <div className="space-y-3"><Button size="sm" onClick={nova}>Nova simulação</Button>
      <table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th>Nome</th><th>Empresa</th><th>Status</th><th>Etapa</th><th>Alterada</th><th /></tr></thead>
        <tbody>{sims.map((s) => <tr key={s.id} className="border-b"><td>{s.nome}</td><td>{empresas.find((e) => e.id === s.empresa_id)?.razao_social ?? "—"}</td><td>{s.status}</td><td>{s.etapa}</td><td>{new Date(s.updated_at).toLocaleString("pt-BR")}</td><td><Button size="sm" variant="ghost" onClick={() => setAtual(s)}>Abrir</Button></td></tr>)}</tbody></table></div>
  );
  return <Assistente s={atual} setS={setAtual} tabelas={tabelas} empresas={empresas} recarregar={recarregar} hist={hist} />;
}

function Assistente({ s, setS, tabelas, empresas, recarregar, hist }: { s: Sim; setS: (s: Sim | null) => void; tabelas: Tabela[]; empresas: Empresa[]; recarregar: () => void; hist: any[] }) {
  const [etapa, setEtapa] = useState(s.etapa || 1);
  const d = s.dados, pr = d.premissas;
  const t = tabelas.find((x) => x.id === s.tabela_id);
  const cheia = tabelas.find((x) => x.id === d.tabelaCheiaId) ?? tabelas[0];
  const r = useMemo(() => t ? E.projecao(d.faixas, t.valores, pr) : null, [d, t]);
  const up = (dd: Partial<Dados>) => setS({ ...s, dados: { ...d, ...dd } });
  const upP = (pp: Partial<E.Premissas>) => up({ premissas: { ...pr, ...pp } });
  const salvar = async (prox: number) => {
    const resultados = r ? { versao: E.REGRA_VERSAO, calculado_em: new Date().toISOString(), totais: { vidas: r.producao.vidas, producao: r.producao.total, ticket: r.producao.ticketGrupo }, colunas: r.colunas, patrocinio: r.patrocinio, rn63: r.rn63 } : {};
    const { error } = await db.from("facchini_simulacoes").update({ nome: s.nome, empresa_id: s.empresa_id, tabela_id: s.tabela_id, status: s.status, etapa: prox, dados: d, resultados, updated_at: new Date().toISOString() }).eq("id", s.id);
    if (error) return toast.error("Não foi possível salvar a etapa.");
    await db.from("facchini_historico").insert({ simulacao_id: s.id, acao: `etapa ${etapa} salva`, detalhe: { etapa: ETAPAS[etapa - 1], saldoAno1: r?.colunas.ano1.saldo ?? null } });
    setEtapa(prox); setS({ ...s, etapa: prox, updated_at: new Date().toISOString() }); recarregar();
  };
  const res = E.resumoCarteira(d.faixas);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => setS(null)}>← Simulações</Button>
        <Input className="h-8 w-72" value={s.nome} onChange={(e) => setS({ ...s, nome: e.target.value })} />
        <select className="h-8 rounded border bg-background px-2 text-sm" value={s.status} onChange={(e) => setS({ ...s, status: e.target.value })}>{STATUS.map((x) => <option key={x}>{x}</option>)}</select>
      </div>
      <div className="flex flex-wrap gap-1">{ETAPAS.map((n, i) => <button key={n} onClick={() => salvar(i + 1)} className={`rounded px-2 py-1 text-xs ${etapa === i + 1 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{i + 1}. {n}</button>)}</div>

      {etapa === 1 && <div className="space-y-2"><label className="text-xs">Empresa<select className="ml-2 h-8 rounded border bg-background px-2 text-sm" value={s.empresa_id ?? ""} onChange={(e) => setS({ ...s, empresa_id: e.target.value || null })}><option value="">—</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.razao_social}</option>)}</select></label>
        {empresas.length === 0 && <p className="text-xs text-muted-foreground">Cadastre a empresa na aba Empresas.</p>}</div>}

      {etapa === 2 && <div className="space-y-2">
        <div className="flex flex-wrap items-end gap-3"><label className="text-xs">Origem<select className="ml-2 h-8 rounded border bg-background px-2 text-sm" value={d.origem} onChange={(e) => up({ origem: e.target.value })}>{ORIGENS.map((o) => <option key={o}>{o}</option>)}</select></label>
          <label className="text-xs">Taxa de dependência %<NumIn v={d.taxaDependencia} on={(x) => up({ taxaDependencia: x })} pctMode /></label>
          <Button size="sm" variant="outline" onClick={() => up({ faixas: E.projetarDependentes(d.faixas.map((f) => f.titulares), d.taxaDependencia) })}>Projetar dependentes</Button></div>
        <table className="text-sm"><thead><tr className="text-xs text-muted-foreground"><th className="text-left">Faixa</th><th>Titulares</th><th>Dependentes</th><th className="text-right">Vidas</th></tr></thead>
          <tbody>{res.linhas.map((l, i) => <tr key={i}><td className="pr-4">{E.FAIXAS[i]}</td>
            <td><NumIn w="w-24" v={l.titulares} on={(x) => { const f = [...d.faixas]; f[i] = { ...f[i], titulares: x }; up({ faixas: f }); }} /></td>
            <td><NumIn w="w-24" v={l.dependentes} on={(x) => { const f = [...d.faixas]; f[i] = { ...f[i], dependentes: x }; up({ faixas: f }); }} /></td>
            <td className="text-right">{E.qtd(l.vidas)}</td></tr>)}
            <tr className="border-t font-semibold"><td>Total</td><td>{E.qtd(res.titulares)}</td><td>{E.qtd(res.dependentes)}</td><td className="text-right">{E.qtd(res.vidas)}</td></tr></tbody></table>
        <div className="grid grid-cols-3 gap-2">{res.grupos.map((g) => <Card key={g.nome} t={g.nome}>{E.qtd(g.vidas)} <span className="text-xs text-muted-foreground">({E.pct(g.percentual)}) T {E.qtd(g.titulares)} · D {E.qtd(g.dependentes)}</span></Card>)}</div>
      </div>}

      {etapa === 3 && <div className="flex flex-wrap gap-4">
        <label className="text-xs">Tabela aplicada<select className="ml-2 h-8 rounded border bg-background px-2 text-sm" value={s.tabela_id ?? ""} onChange={(e) => setS({ ...s, tabela_id: e.target.value })}>{tabelas.filter((x) => x.status === "ativa").map((x) => <option key={x.id} value={x.id}>{x.nome} v{x.versao}</option>)}</select></label>
        <label className="text-xs">Tabela cheia de referência<select className="ml-2 h-8 rounded border bg-background px-2 text-sm" value={cheia?.id ?? ""} onChange={(e) => up({ tabelaCheiaId: e.target.value })}>{tabelas.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select></label>
        <label className="text-xs">Produto<select className="ml-2 h-8 rounded border bg-background px-2 text-sm" value={d.produto} onChange={(e) => up({ produto: e.target.value })}><option value="F30">F30 · Fácil 30 (Enfermaria)</option><option value="SBB">SBB · Super Bem</option></select></label>
      </div>}

      {etapa === 4 && <div className="grid gap-2 md:grid-cols-4">
        {([["produtividade", "Produtividade %", true], ["limiteProdutividade", "Limite de produtividade R$", false], ["sinistralidade", "Sinistralidade %", true], ["coparticipacao", "Coparticipação %", true], ["taxaAdesaoValor", "Taxa de adesão por vida R$", false], ["mesesCoparticipacaoAno1", "Meses de copart. no 1º ano", false], ["coparticipacaoAno2", "Copart. no 2º ano %", true], ["produtividadeMesesAno1", "Meses de produtividade no 1º ano", false], ["produtividadeMesesAno2", "Meses de produtividade no 2º ano", false], ["limiteRn63", "Limite RN 63 (× 1ª faixa)", false]] as const).map(([k, l, p]) =>
          <label key={k} className="text-xs">{l}<NumIn v={pr[k] as number} on={(x) => upP({ [k]: x } as any)} pctMode={p} /></label>)}
        <label className="text-xs">Cobrar taxa de adesão<input type="checkbox" className="ml-2" checked={pr.taxaAdesaoAtiva} onChange={(e) => upP({ taxaAdesaoAtiva: e.target.checked })} /></label>
        <label className="text-xs">Base da taxa<select className="ml-2 h-8 rounded border bg-background px-2 text-sm" value={pr.taxaAdesaoBase} onChange={(e) => upP({ taxaAdesaoBase: e.target.value as E.BaseAdesao })}><option value="titulares">Titulares</option><option value="dependentes">Dependentes</option><option value="todas">Todas as vidas</option><option value="manual">Quantidade manual</option></select></label>
        {pr.taxaAdesaoBase === "manual" && <label className="text-xs">Vidas (manual)<NumIn v={pr.taxaAdesaoManual} on={(x) => upP({ taxaAdesaoManual: x })} /></label>}
        <div className="text-xs">Sinistralidade líquida: <b>{E.pct(E.sinistralidadeLiquida(pr.sinistralidade, pr.coparticipacao))}</b></div>
      </div>}

      {etapa === 5 && r && <div className="space-y-2">
        <div className="flex gap-3"><label className="text-xs">Patrocínio titular %<NumIn v={pr.patrocinioTitular} on={(x) => upP({ patrocinioTitular: x })} pctMode /></label><label className="text-xs">Patrocínio dependente %<NumIn v={pr.patrocinioDependente} on={(x) => upP({ patrocinioDependente: x })} pctMode /></label></div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4"><Card t="Empresa">{E.brl(r.patrocinio.empresa)} ({E.pct(r.patrocinio.pctEmpresa)})</Card><Card t="Beneficiários">{E.brl(r.patrocinio.beneficiarios)} ({E.pct(r.patrocinio.pctBeneficiarios)})</Card><Card t="Empresa · titulares">{E.brl(r.patrocinio.empresaTitulares)}</Card><Card t="Empresa · dependentes">{E.brl(r.patrocinio.empresaDependentes)}</Card></div>
      </div>}

      {(etapa === 6 || etapa === 9) && r && <Projecao r={r} />}
      {etapa === 7 && <Comparativo tabelas={tabelas} faixas={d.faixas} />}
      {(etapa === 8 || etapa === 9) && t && r && <Validacoes r={r} faixas={d.faixas} t={t} cheia={cheia} />}
      {etapa === 9 && <div className="space-y-2"><Graficos faixas={d.faixas} precos={t?.valores ?? []} />
        <h3 className="text-sm font-semibold">Histórico</h3><ul className="text-xs">{hist.map((h) => <li key={h.id}>{new Date(h.created_at).toLocaleString("pt-BR")} — {h.acao}</li>)}</ul></div>}

      <div className="flex gap-2"><Button size="sm" variant="outline" disabled={etapa === 1} onClick={() => salvar(etapa - 1)}>Voltar</Button><Button size="sm" onClick={() => salvar(Math.min(9, etapa + 1))}>{etapa === 9 ? "Salvar" : "Salvar e avançar"}</Button></div>
    </div>
  );
}

function Projecao({ r }: { r: ReturnType<typeof E.projecao> }) {
  const linhas: [string, keyof typeof r.colunas.mes1, boolean][] = [["Produção", "producao", false], ["Produtividade", "produtividade", false], ["Taxa de adesão", "adesao", false], ["Despesa assistencial", "despesa", false], ["Coparticipação", "coparticipacao", false], ["Despesa assistencial líquida", "liquida", false], ["Saldo", "saldo", false], ["Margem", "margem", true]];
  return (
    <table className="text-sm"><thead><tr className="text-xs text-muted-foreground"><th className="text-left">Projeção</th><th className="px-4 text-right">1º mês</th><th className="px-4 text-right">1º ano</th><th className="px-4 text-right">2º ano</th></tr></thead>
      <tbody>{linhas.map(([l, k, p]) => <tr key={k} className={k === "saldo" ? "border-t font-semibold" : ""}><td>{l}</td>{(["mes1", "ano1", "ano2"] as const).map((c) => <td key={c} className="px-4 text-right"><Num v={r.colunas[c][k]} money={!p} p={p} /></td>)}</tr>)}
        <tr className="text-xs text-muted-foreground"><td colSpan={4}>Produtividade calculada {E.brl(r.produtividade.calculada)}, aplicada {E.brl(r.produtividade.aplicada)} · Taxa de adesão sobre {E.qtd(r.vidasAdesao)} vidas</td></tr></tbody></table>
  );
}

function Validacoes({ r, faixas, t, cheia }: { r: ReturnType<typeof E.projecao>; faixas: E.Faixa[]; t: Tabela; cheia: Tabela }) {
  const m = E.margem(r.producao.ticketGrupo, E.producao(faixas, cheia.valores).ticketGrupo);
  const [adic, setAdic] = useState(0.1);
  const lin = E.linear(faixas, t.valores, adic);
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="rounded-md border p-3 text-sm space-y-1"><b>RN 63</b><div>1ª→7ª: {E.fator(r.rn63.r1_7)} · 7ª→10ª: {E.fator(r.rn63.r7_10)} · 10ª/1ª: {E.fator(r.rn63.r10_1)}</div><div>RN 63 I <Selo s={r.rn63.validacao1} /> · RN 63 II <Selo s={r.rn63.validacao2} /></div></div>
      <div className="rounded-md border p-3 text-sm space-y-1"><b>Margem de preço</b><div>Mínimo {E.brl(m.minimo)} · Máximo {E.brl(m.maximo)}</div><div>Ticket proposto {E.brl(m.ticketProposto)} · cheia {E.brl(m.ticketCheia)}</div><div>Fator efetivo {E.fator(m.fatorEfetivo)} · Desconto {E.qtd(m.descontoEfetivo)}%</div></div>
      <div className="rounded-md border p-3 text-sm space-y-1"><b>Tabela linear</b><div className="flex gap-1">{[0, 0.1, 0.2, 0.25].map((x) => <Button key={x} size="sm" variant={adic === x ? "default" : "outline"} onClick={() => setAdic(x)}>{x ? `+${x * 100}%` : "Ref."}</Button>)}<NumIn w="w-20" v={adic} on={setAdic} pctMode /></div>
        <div>Linear {E.brl(lin.linear)} → {E.brl(lin.resultado)} · Produção {E.brl(lin.producaoTotal)}</div></div>
    </div>
  );
}

function Comparativo({ tabelas, faixas }: { tabelas: Tabela[]; faixas: E.Faixa[] }) {
  const [ids, setIds] = useState<string[]>([]);
  const sel = (ids.length ? ids : tabelas.slice(0, 4).map((t) => t.id)).map((id) => tabelas.find((t) => t.id === id)!).filter(Boolean);
  const prods = sel.map((t) => E.producao(faixas, t.valores));
  const base = prods[0]?.total ?? 0;
  const vidas = E.resumoCarteira(faixas).linhas;
  const precosChart = E.FAIXAS.map((f, i) => Object.fromEntries([["faixa", f], ...sel.map((t) => [t.nome, t.valores[i]])]));
  const cores = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))", "hsl(35 90% 50%)"];
  const ext = prods.length ? [Math.max(...prods.map((p) => p.total)), Math.min(...prods.map((p) => p.total))] : [0, 0];
  return (
    <div className="space-y-3 overflow-x-auto">
      <div className="flex flex-wrap gap-2 text-xs">{tabelas.map((t) => { const on = sel.some((x) => x.id === t.id); return <label key={t.id}><input type="checkbox" checked={on} onChange={() => { const cur = sel.map((x) => x.id); setIds(on ? cur.filter((x) => x !== t.id) : cur.length < 4 ? [...cur, t.id] : cur); }} /> {t.nome}</label>; })} <span className="text-muted-foreground">(até 4; a primeira é a base das diferenças)</span></div>
      <table className="w-full text-xs"><thead><tr className="border-b text-muted-foreground"><th className="text-left">Faixa</th><th className="text-right">Vidas</th>{sel.map((t) => <th key={t.id} className="text-right">{t.nome}</th>)}</tr></thead>
        <tbody>{E.FAIXAS.map((f, i) => <tr key={f} className="border-b"><td>{f}</td><td className="text-right">{E.qtd(vidas[i].vidas)}</td>{sel.map((t) => { const dif = t.valores[i] - sel[0].valores[i]; return <td key={t.id} className="text-right">{E.brl(t.valores[i])}{t !== sel[0] && <div className={dif < 0 ? "text-destructive" : "text-muted-foreground"}>{E.brl(dif)} ({E.pct(E.div(dif, sel[0].valores[i]))})</div>}</td>; })}</tr>)}
          <tr className="font-semibold"><td>Produção total</td><td />{prods.map((p, i) => <td key={i} className="text-right">{E.brl(p.total)}{ext[0] !== ext[1] && p.total === ext[0] ? " ▲" : p.total === ext[1] && ext[0] !== ext[1] ? " ▼" : ""}</td>)}</tr>
          <tr><td>Ticket médio</td><td />{prods.map((p, i) => <td key={i} className="text-right">{E.brl(p.ticketGrupo)}</td>)}</tr>
          <tr><td>Diferença vs. base</td><td />{prods.map((p, i) => <td key={i} className="text-right"><Num v={p.total - base} money /> ({E.pct(E.div(p.total - base, base))})</td>)}</tr>
          <tr><td>RN 63</td><td />{sel.map((t) => { const r = E.rn63(t.valores); return <td key={t.id} className="text-right"><Selo s={r.validacao1} /> <Selo s={r.validacao2} /></td>; })}</tr></tbody></table>
      <div className="h-64 rounded-md border p-2"><ResponsiveContainer><LineChart data={precosChart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="faixa" fontSize={10} /><YAxis fontSize={10} /><Tooltip formatter={(v: number) => E.brl(v)} /><Legend />{sel.map((t, i) => <Line key={t.id} dataKey={t.nome} stroke={cores[i]} />)}</LineChart></ResponsiveContainer></div>
    </div>
  );
}
