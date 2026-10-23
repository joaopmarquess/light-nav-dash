import { useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { blocoMes, transfEntradas, transfSaidas, type BlocoMes, type TransfMat, type TransfPar, type TipoReentrada } from "@/lib/transferencias";
import { normalizarVendedor } from "@/lib/vendedorTransferencia";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, UserPlus, UserMinus, Scale, RotateCcw, ArrowRightLeft, LogIn, LogOut, Users } from "lucide-react";

type Row = Record<string, any>;
type Tipo = "Entrada" | "Reativação" | "Saída" | "T+" | "T-";
type Ev = { data: string; tipo: Tipo; r: Row; par?: TransfPar };
const LIMITE = 30000;
const MOT_T_PADRAO = [6, 7, 18, 26, 29, 101, 102, 104, 106, 208, 216];

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
const toMat = (r: Row): TransfMat => ({ cpf: String(r.nr_cpf ?? ""), mat: String(r.cd_mat_alternativa), nome: r.nm_beneficiario ?? "", vig: dia(r.dt_vigencia_beneficiario), desl: dia(r.dt_desligamento), vendedor: r.cd_vendedor == null ? null : Number(r.cd_vendedor), nmVendedor: r.nm_vendedor, motivo: r.cd_motivo_cancelamento == null ? null : Number(r.cd_motivo_cancelamento) });

type F = { de: string; ate: string };
const EMPTY = (): F => ({ de: inicioMes(), ate: hojeISO() });
type Sel = { tipo: Tipo; sub?: TipoReentrada; bloco?: BlocoMes } | null;

export default function CarteiraTrialMov() {
  const [f, setF] = useState<F>(EMPTY());
  const [ap, setAp] = useState<F>(EMPTY());
  const [evs, setEvs] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [cortado, setCortado] = useState(false);
  const [vidas, setVidas] = useState<{ ant: number | null; fin: number | null }>({ ant: null, fin: null });
  const [sel, setSel] = useState<Sel>(null);
  // Movimentação calculada na base pela função carteira_movimentacao (regra de transferência no servidor).
  useEffect(() => {
    let off = false;
    (async () => {
      setLoading(true); setErr(null); setEvs([]); setCortado(false); setSel(null); setEtapa("Calculando movimentações…");
      const rows: Row[] = [];
      const pag = (from: number) => hostinger.rpc("carteira_movimentacao", { p_de: ap.de, p_ate: ap.ate })
        .order("tipo").order("data").order("mat").range(from, from + 999);
      for (let from = 0; from < LIMITE; from += 4000) {
        const res = await Promise.all([0, 1, 2, 3].map((i) => pag(from + i * 1000)));
        if (off) return;
        const e = res.find((r) => r.error);
        if (e?.error) { setErr(e.error.message); setLoading(false); return; }
        for (const r of res) rows.push(...((r.data as Row[]) ?? []));
        if (res.some((r) => ((r.data as Row[]) ?? []).length < 1000)) break;
        if (from + 4000 >= LIMITE) setCortado(true);
      }
      const out: Ev[] = rows.map((x) => {
        const r = { cd_mat_alternativa: x.mat, nm_beneficiario: x.nome, nm_empresa_estipulante: x.empresa, nm_vendedor: x.nm_vendedor, cd_vendedor: x.cd_vendedor, nr_cpf: x.cpf };
        const par: TransfPar | undefined = x.tipo === "T+" || x.tipo === "T-" ? {
          cpf: String(x.cpf ?? ""), nome: x.nome ?? "", matAnterior: String(x.mat_anterior ?? ""), saida: dia(x.saida), motivo: x.motivo,
          matNova: String(x.mat_nova ?? ""), entrada: dia(x.entrada), vendedor: x.cd_vendedor_novo, nmVendedor: x.nm_vendedor_novo, tipo: x.tipo_reentrada as TipoReentrada,
        } : undefined;
        return { tipo: x.tipo as Tipo, data: dia(x.data), r, par };
      });
      if (!off) { setEvs(out); setLoading(false); }
    })();
    return () => { off = true; };
  }, [ap]);

  const dAnt = useMemo(() => { const d = new Date(ap.de + "T12:00:00"); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); }, [ap.de]);
  const dFin = useMemo(() => { const d = new Date(ap.ate + "T12:00:00"); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); }, [ap.ate]);
  useEffect(() => {
    let off = false;
    setVidas({ ant: null, fin: null });
    const at = (d: string) => hostinger.rpc("carteira_trial_kpis", { p_data: d, p_q: null, p_empresa: null, p_cidade: null })
      .then(({ data }: any) => { const r = Array.isArray(data) ? data[0] : data; return r ? Number(r.ativos) : null; });
    Promise.all([at(dAnt), at(dFin)]).then(([ant, fin]) => { if (!off) setVidas({ ant, fin }); });
    return () => { off = true; };
  }, [dAnt, dFin]);

  const kpi = useMemo(() => {
    const c = (t: Tipo, sub?: TipoReentrada) => evs.filter((x) => x.tipo === t && (!sub || x.par?.tipo === sub)).length;
    return { e: c("Entrada"), r: c("Reativação"), s: c("Saída"), tp: c("T+"), tpP: c("T+", "Pura"), tpR: c("T+", "Revenda"), tm: c("T-"), tmP: c("T-", "Pura"), tmR: c("T-", "Revenda") };
  }, [evs]);
  const saldo = kpi.e + kpi.r + kpi.tp - kpi.s - kpi.tm;

  const bl = (x: Ev) => (x.par && (x.tipo === "T+" || x.tipo === "T-") ? blocoMes(x.tipo, x.par) : null);
  const lista = useMemo(
    () => (sel ? evs.filter((x) => x.tipo === sel.tipo && (!sel.sub || x.par?.tipo === sel.sub) && (!sel.bloco || bl(x) === sel.bloco)).sort((a, b) => b.data.localeCompare(a.data)) : []),
    [evs, sel],
  );
  const isT = sel?.tipo === "T+" || sel?.tipo === "T-";
  const same = (t: Tipo, sub?: TipoReentrada, bloco?: BlocoMes) => sel?.tipo === t && sel?.sub === sub && sel?.bloco === bloco;
  const toggle = (t: Tipo, sub?: TipoReentrada, bloco?: BlocoMes) => setSel(same(t, sub, bloco) ? null : { tipo: t, sub, bloco });
  const nB = (t: Tipo, b: BlocoMes, sub?: TipoReentrada) => evs.filter((x) => x.tipo === t && bl(x) === b && (!sub || x.par?.tipo === sub)).length;
  const BLOCOS: { b: BlocoMes; t: Tipo; titulo: string; dica: string }[] = [
    { b: "anterior", t: "T+", titulo: "Entrou vindo do mês anterior", dica: "Saída por transferência no mês anterior e entrada no período" },
    { b: "mesmo", t: "T+", titulo: "Entrou no mesmo mês", dica: "Saída e entrada no mesmo mês" },
    { b: "proximo", t: "T-", titulo: "Vai entrar no próximo mês", dica: "Saída no período e entrada no mês seguinte" },
  ];

  const buscar = () => setAp({ ...f });
  const limpar = () => { const e = EMPTY(); setF(e); setAp(e); };
  const v = (n: number) => (loading ? "…" : num(n));

  const vcard = (l: string, val: number | null, d: string) => (
    <div title={`${l} · Ativos em ${fmtD(d)}`} className="rounded-xl border bg-card px-3 py-10 border-l-[6px] border-l-muted-foreground flex items-center justify-center gap-2 cursor-help">
      <Users className="h-5 w-5 text-primary" />
      <p className="text-xl font-bold leading-none text-primary">{val == null ? "…" : num(val)}</p>
    </div>
  );
  const card = (l: string, val: number, I: any, c: string, t: Tipo | null, sinal = false) => (
    <button key={l} title={l} onClick={() => t && toggle(t)}
      className={`rounded-xl border bg-card px-3 py-10 border-l-[6px] ${c === "text-destructive" ? "border-l-destructive" : "border-l-primary"} flex items-center justify-center gap-2 transition ${t ? "hover:bg-muted/50 cursor-pointer" : "cursor-default"} ${t && same(t) ? "ring-2 ring-primary" : ""}`}>
      <I className={`h-5 w-5 ${c}`} />
      <p className={`text-xl font-bold leading-none ${c}`}>{loading ? "…" : (sinal && val > 0 ? "+" : "") + num(val)}</p>
    </button>
  );
  const linha = (t: Tipo, sub: TipoReentrada, val: number, dica: string) => (
    <button type="button" title={dica} onClick={() => toggle(t, sub)}
      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted/50 ${same(t, sub) ? "ring-2 ring-primary" : ""}`}>
      <span>Transferência {sub}</span><span className="font-semibold tabular-nums">{v(val)}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4 flex flex-wrap items-end gap-3">
        <label className="text-xs text-muted-foreground">De<Input type="date" value={f.de} onChange={(e) => setF({ ...f, de: e.target.value })} className="w-40" /></label>
        <label className="text-xs text-muted-foreground">Até<Input type="date" value={f.ate} onChange={(e) => setF({ ...f, ate: e.target.value })} className="w-40" /></label>
        <Button onClick={buscar} disabled={loading}><Search className="h-4 w-4 mr-1" />Buscar</Button>
        <Button variant="outline" onClick={limpar} disabled={loading}><X className="h-4 w-4 mr-1" />Limpar</Button>
        {loading && <span className="text-xs text-muted-foreground">{etapa}</span>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {vcard("Vidas Anteriores", vidas.ant, dAnt)}
        {card("+ Entradas (sem transferência)", kpi.e, UserPlus, "text-primary", "Entrada")}
        {card("− Saídas (sem transferência)", kpi.s, UserMinus, "text-destructive", "Saída")}
        {card("+ Reativações", kpi.r, RotateCcw, "text-primary", "Reativação")}
        {card("+ T+ · entradas por transferência", kpi.tp, LogIn, "text-primary", "T+")}
        {card("− T− · saídas por transferência", kpi.tm, LogOut, "text-destructive", "T-")}
        {card("Saldo de Crescimento do Período", saldo, Scale, saldo < 0 ? "text-destructive" : "text-primary", null, true)}
        {vcard("Vidas Finais", vidas.fin, dFin)}
      </div>

      {err && <div className="p-4 text-center text-destructive">Erro: {err}</div>}
      {cortado && <div className="text-xs text-muted-foreground">Limite de busca atingido, reduza o período.</div>}

      <div className="grid gap-3 md:grid-cols-3">
        {BLOCOS.map(({ b, t, titulo, dica }) => (
          <section key={b} title={dica} className={`rounded-xl border bg-card p-3 ${same(t, undefined, b) ? "ring-2 ring-primary" : ""}`}>
            <button type="button" onClick={() => toggle(t, undefined, b)} className="mb-1 flex w-full items-center justify-between rounded-md px-3 py-1 hover:bg-muted/50">
              <h3 className={`text-sm font-semibold ${t === "T+" ? "text-primary" : "text-destructive"}`}>{titulo}</h3>
              <span className={`text-xl font-bold tabular-nums ${t === "T+" ? "text-primary" : "text-destructive"}`}>{v(nB(t, b))}</span>
            </button>
            {(["Pura", "Revenda"] as TipoReentrada[]).map((s) => (
              <button key={s} type="button" onClick={() => toggle(t, s, b)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm hover:bg-muted/50 ${same(t, s, b) ? "ring-2 ring-primary" : ""}`}>
                <span>Transferência {s}</span><span className="font-semibold tabular-nums">{v(nB(t, b, s))}</span>
              </button>
            ))}
          </section>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr]">
        <section className="rounded-xl border bg-card p-3">
          <div className="mb-2 flex items-center justify-between px-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-primary"><LogIn className="h-4 w-4" />Entradas por transferência (T+)</h3><span className="text-xl font-bold text-primary">{v(kpi.tp)}</span></div>
          {linha("T+", "Pura", kpi.tpP, "Nova matrícula com vendedor 273 ou 274")}
          {linha("T+", "Revenda", kpi.tpR, "Nova matrícula com outro vendedor")}
        </section>
        <section className="flex flex-col items-center justify-center rounded-xl border bg-card px-6 py-3 text-center">
          <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
          <span className="mt-1 text-xs text-muted-foreground">Saldo de transferências</span>
          <span className={`text-2xl font-bold ${kpi.tp - kpi.tm < 0 ? "text-destructive" : "text-primary"}`}>{loading ? "…" : (kpi.tp - kpi.tm > 0 ? "+" : "") + num(kpi.tp - kpi.tm)}</span>
          <span className="mt-1 max-w-[14rem] text-[11px] text-muted-foreground">Motivo do grupo Transferência e nova entrada do mesmo CPF no mesmo mês ou no mês seguinte</span>
        </section>
        <section className="rounded-xl border bg-card p-3">
          <div className="mb-2 flex items-center justify-between px-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-destructive"><LogOut className="h-4 w-4" />Saídas por transferência (T−)</h3><span className="text-xl font-bold text-destructive">{v(kpi.tm)}</span></div>
          {linha("T-", "Pura", kpi.tmP, "Reentrada com vendedor 273 ou 274")}
          {linha("T-", "Revenda", kpi.tmR, "Reentrada com outro vendedor")}
        </section>
      </div>

      {sel && !loading && (
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
