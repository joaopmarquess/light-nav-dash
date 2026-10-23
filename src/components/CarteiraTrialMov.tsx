import { useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { transfEntradas, transfSaidas, type TransfMat, type TransfPar, type TipoReentrada } from "@/lib/transferencias";
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
type Sel = { tipo: Tipo; sub?: TipoReentrada } | null;

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
  const [motT, setMotT] = useState<Set<number> | null>(null);

  useEffect(() => {
    hostinger.from("motivo_cancelamento_grupo").select("cd_motivo_cancelamento,gp_motivo_cancelamento").then(({ data }) => {
      const s = new Set((data ?? []).filter((x: any) => String(x.gp_motivo_cancelamento).trim().toLowerCase() === "transferência").map((x: any) => Number(x.cd_motivo_cancelamento)));
      setMotT(s.size ? s : new Set(MOT_T_PADRAO));
    });
  }, []);

  useEffect(() => {
    if (!motT) return;
    let off = false;
    (async () => {
      setLoading(true); setErr(null); setEvs([]); setCortado(false); setSel(null); setEtapa("Buscando movimentações…");
      const { de, ate } = ap;
      const fim = `${ate}T23:59:59`;
      const conds = [
        `and(dt_vigencia_beneficiario.gte.${de},dt_vigencia_beneficiario.lte.${fim})`,
        `and(dt_reativacao.gte.${de},dt_reativacao.lte.${fim})`,
        `and(dt_desligamento.gte.${de},dt_desligamento.lte.${fim})`,
      ];
      const SEL = "cd_mat_alternativa,cd_vendedor,cd_motivo_cancelamento,nm_beneficiario,nr_cpf,nm_empresa_estipulante,nm_vendedor,dt_vigencia_beneficiario,dt_desligamento,dt_reativacao";
      const rows: Row[] = [];
      for (let from = 0; from < LIMITE; from += 1000) {
        const { data, error } = await hostinger.from("view_ecarteira").select(SEL)
          .eq("tp_plano", "SAUDE").lte("cd_mat_alternativa", 399999999999)
          .or(conds.join(","))
          .order("cd_mat_alternativa").order("dt_vigencia_beneficiario").order("dt_desligamento").range(from, from + 999);
        if (off) return;
        if (error) { setErr(error.message); setLoading(false); return; }
        rows.push(...(data ?? []).map(normalizarVendedor));
        if ((data ?? []).length < 1000) break;
        if (from + 1000 >= LIMITE) setCortado(true);
      }
      const inR = (d: string) => d && d >= de && d <= ate;
      const entradas: Row[] = [], saidas: Row[] = [], reat: Row[] = [];
      const seen = new Set<string>();
      const uniq = (t: string, d: string, r: Row) => { const k = `${t}|${r.cd_mat_alternativa}|${d}`; if (seen.has(k)) return false; seen.add(k); return true; };
      for (const r of rows) {
        const v = dia(r.dt_vigencia_beneficiario), c = dia(r.dt_desligamento), a = dia(r.dt_reativacao);
        if (inR(v) && uniq("E", v, r)) entradas.push(r);
        if (inR(a) && uniq("R", a, r)) reat.push(r);
        if (inR(c) && uniq("S", c, r)) saidas.push(r);
      }

      // Candidatos por CPF: entradas e saídas com motivo de transferência
      setEtapa("Ligando transferências por CPF…");
      const cpfs = [...new Set([...entradas, ...saidas.filter((r) => motT.has(Number(r.cd_motivo_cancelamento)))]
        .map((r) => String(r.nr_cpf ?? "")).filter(Boolean))];
      const cand: TransfMat[] = [];
      const lotes: string[][] = [];
      for (let i = 0; i < cpfs.length; i += 80) lotes.push(cpfs.slice(i, i + 80));
      const ini = addMes(de, -1), lim = `${addMes(ate, 2)}`;
      for (let i = 0; i < lotes.length; i += 6) {
        const res = await Promise.all(lotes.slice(i, i + 6).map((l) => hostinger.from("view_ecarteira").select(SEL)
          .eq("tp_plano", "SAUDE").in("nr_cpf", l)
          .or(`and(dt_vigencia_beneficiario.gte.${ini},dt_vigencia_beneficiario.lt.${lim}),and(dt_desligamento.gte.${ini},dt_desligamento.lt.${lim})`)
          .limit(5000)));
        if (off) return;
        for (const { data } of res) for (const r of data ?? []) cand.push(toMat(normalizarVendedor(r)));
      }
      const tMais = transfEntradas(entradas.map(toMat), cand, motT);
      const tMenos = transfSaidas(saidas.map(toMat), cand, motT);

      const out: Ev[] = [];
      for (const r of entradas) { const v = dia(r.dt_vigencia_beneficiario); const p = tMais.get(`${r.cd_mat_alternativa}|${v}`); out.push({ tipo: p ? "T+" : "Entrada", data: v, r, par: p }); }
      for (const r of reat) out.push({ tipo: "Reativação", data: dia(r.dt_reativacao), r });
      for (const r of saidas) { const c = dia(r.dt_desligamento); const p = tMenos.get(`${r.cd_mat_alternativa}|${c}`); out.push({ tipo: p ? "T-" : "Saída", data: c, r, par: p }); }
      if (!off) { setEvs(out); setLoading(false); }
    })();
    return () => { off = true; };
  }, [ap, motT]);

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

  const lista = useMemo(
    () => (sel ? evs.filter((x) => x.tipo === sel.tipo && (!sel.sub || x.par?.tipo === sel.sub)).sort((a, b) => b.data.localeCompare(a.data)) : []),
    [evs, sel],
  );
  const isT = sel?.tipo === "T+" || sel?.tipo === "T-";
  const same = (t: Tipo, sub?: TipoReentrada) => sel?.tipo === t && sel?.sub === sub;
  const toggle = (t: Tipo, sub?: TipoReentrada) => setSel(same(t, sub) ? null : { tipo: t, sub });

  const buscar = () => setAp({ ...f });
  const limpar = () => { const e = EMPTY(); setF(e); setAp(e); };
  const v = (n: number) => (loading ? "…" : num(n));

  const vcard = (l: string, val: number | null, d: string) => (
    <div title={`${l} · Ativos em ${fmtD(d)}`} className="rounded-xl border bg-card px-3 py-2 flex items-center justify-center gap-2 cursor-help">
      <Users className="h-5 w-5 text-primary" />
      <p className="text-xl font-bold leading-none text-primary">{val == null ? "…" : num(val)}</p>
    </div>
  );
  const card = (l: string, val: number, I: any, c: string, t: Tipo | null, sinal = false) => (
    <button key={l} title={l} onClick={() => t && toggle(t)}
      className={`rounded-xl border bg-card px-3 py-2 flex items-center justify-center gap-2 transition ${t ? "hover:bg-muted/50 cursor-pointer" : "cursor-default"} ${t && same(t) ? "ring-2 ring-primary" : ""}`}>
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
