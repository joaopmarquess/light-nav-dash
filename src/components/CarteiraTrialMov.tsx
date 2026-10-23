import { useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { classificarTransferencias, type TransfCand, type TransfEv, type TransfGrupo, type TransfItem } from "@/lib/transferencias";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, UserPlus, UserMinus, Scale, RotateCcw, ArrowRightLeft, LogIn, LogOut, Users } from "lucide-react";

type Row = Record<string, any>;
type Tipo = "Entrada" | "Reativação" | "Saída" | "T+" | "T-";
type Ev = { data: string; tipo: Tipo; r: Row };
const LIMITE = 30000;
const VEND_T = new Set([273, 274]);
const MOT_T = new Set([6, 7, 18, 26, 29, 101, 102, 104, 106, 208, 216]);

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

type F = { de: string; ate: string };
const EMPTY = (): F => ({ de: inicioMes(), ate: hojeISO() });

export default function CarteiraTrialMov() {
  const [f, setF] = useState<F>(EMPTY());
  const [ap, setAp] = useState<F>(EMPTY());
  const [evs, setEvs] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cortado, setCortado] = useState(false);
  const [vidas, setVidas] = useState<{ ant: number | null; fin: number | null }>({ ant: null, fin: null });
  const [sel, setSel] = useState<Tipo | null>(null);

  useEffect(() => {
    let off = false;
    (async () => {
      setLoading(true); setErr(null); setEvs([]); setCortado(false);
      const { de, ate } = ap;
      const fim = `${ate}T23:59:59`;
      const conds = [
        `and(dt_vigencia_beneficiario.gte.${de},dt_vigencia_beneficiario.lte.${fim})`,
        `and(dt_reativacao.gte.${de},dt_reativacao.lte.${fim})`,
        `and(dt_desligamento.gte.${de},dt_desligamento.lte.${fim})`,
      ];
      const rows: Row[] = [];
      for (let from = 0; from < LIMITE; from += 1000) {
        const { data, error } = await hostinger.from("view_ecarteira")
          .select("cd_mat_alternativa,cd_vendedor,cd_motivo_cancelamento,nm_beneficiario,nr_cpf,nm_empresa_estipulante,nm_vendedor,dt_nascimento,dt_vigencia_beneficiario,dt_desligamento,dt_reativacao")
          .eq("tp_plano", "SAUDE").lte("cd_mat_alternativa", 399999999999)
          .or(conds.join(","))
          .order("cd_mat_alternativa").order("dt_vigencia_beneficiario").order("dt_desligamento").range(from, from + 999);
        if (off) return;
        if (error) { setErr(error.message); setLoading(false); return; }
        rows.push(...(data ?? []));
        if ((data ?? []).length < 1000) break;
        if (from + 1000 >= LIMITE) setCortado(true);
      }
      const inR = (d: string) => d && d >= de && d <= ate;
      const out: Ev[] = []; const seen = new Set<string>();
      const add = (tipo: Tipo, d: string, r: Row) => {
        const k = `${tipo}|${r.cd_mat_alternativa}|${d}`;
        if (seen.has(k)) return; seen.add(k); out.push({ tipo, data: d, r });
      };
      for (const r of rows) {
        // Código 274 é transferência: registros gravados com nome de pessoa contam como "TRANSFERENCIA DE CONTRATO".
        if (Number(r.cd_vendedor) === 274) r.nm_vendedor = "TRANSFERENCIA DE CONTRATO";
        const v = dia(r.dt_vigencia_beneficiario), c = dia(r.dt_desligamento), a = dia(r.dt_reativacao);
        if (inR(v)) add(VEND_T.has(Number(r.cd_vendedor)) ? "T+" : "Entrada", v, r);
        if (inR(a)) add("Reativação", a, r);
        if (inR(c)) add(MOT_T.has(Number(r.cd_motivo_cancelamento)) ? "T-" : "Saída", c, r);
      }
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
    const c = (t: Tipo) => evs.filter((x) => x.tipo === t).length;
    const e = c("Entrada"), r = c("Reativação"), s = c("Saída");
    return { e, r, s, saldo: e + r - s, tp: c("T+"), tm: c("T-") };
  }, [evs]);

  const lista = useMemo(
    () => (sel ? evs.filter((x) => x.tipo === sel).sort((a, b) => b.data.localeCompare(a.data)) : []),
    [evs, sel],
  );

  const [transf, setTransf] = useState<{ loading: boolean; res: ReturnType<typeof classificarTransferencias> | null }>({ loading: false, res: null });
  const [grupoSel, setGrupoSel] = useState<TransfGrupo | null>(null);
  useEffect(() => {
    if (loading) return;
    let off = false;
    const ev = (t: Tipo): TransfEv[] => evs.filter((x) => x.tipo === t).map((x) => ({ cpf: String(x.r.nr_cpf ?? ""), mat: String(x.r.cd_mat_alternativa), nome: x.r.nm_beneficiario ?? "", data: x.data }));
    const chegadas = ev("T+"), partidas = ev("T-");
    setGrupoSel(null);
    if (!chegadas.length && !partidas.length) { setTransf({ loading: false, res: classificarTransferencias([], [], [], ap.de, ap.ate) }); return; }
    setTransf({ loading: true, res: null });
    (async () => {
      const cpfs = [...new Set([...chegadas, ...partidas].map((x) => x.cpf).filter(Boolean))];
      const cand: TransfCand[] = [];
      for (let i = 0; i < cpfs.length; i += 80) {
        const { data } = await hostinger.from("view_ecarteira")
          .select("cd_mat_alternativa,nr_cpf,dt_vigencia_beneficiario,dt_desligamento")
          .eq("tp_plano", "SAUDE").in("nr_cpf", cpfs.slice(i, i + 80)).limit(5000);
        if (off) return;
        for (const r of data ?? []) cand.push({ cpf: String(r.nr_cpf ?? ""), mat: String(r.cd_mat_alternativa), vig: dia(r.dt_vigencia_beneficiario), desl: dia(r.dt_desligamento) });
      }
      if (!off) setTransf({ loading: false, res: classificarTransferencias(chegadas, partidas, cand, ap.de, ap.ate) });
    })();
    return () => { off = true; };
  }, [evs, loading, ap]);

  const buscar = () => setAp({ ...f });
  const limpar = () => { const e = EMPTY(); setF(e); setAp(e); };

  const vcard = (l: string, v: number | null, d: string) => (
    <div title={`${l} · Ativos em ${fmtD(d)}`} className="rounded-xl border bg-card px-3 py-2 flex items-center justify-center gap-2 cursor-help">
      <Users className="h-5 w-5 text-primary" />
      <p className="text-xl font-bold leading-none text-primary">{v == null ? "…" : num(v)}</p>
    </div>
  );

  const card = (l: string, v: number, I: any, c: string, t: Tipo | null, sinal = false) => (
    <button
      key={l}
      title={l}
      onClick={() => t && setSel(sel === t ? null : t)}
      className={`rounded-xl border bg-card px-3 py-2 flex items-center justify-center gap-2 text-left transition ${t ? "hover:bg-muted/50 cursor-pointer" : "cursor-default"} ${sel && sel === t ? "ring-2 ring-primary" : ""}`}
    >
      <I className={`h-5 w-5 ${c}`} />
      <p className={`text-xl font-bold leading-none ${c}`}>{loading ? "…" : (sinal && v > 0 ? "+" : "") + num(v)}</p>
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4 flex flex-wrap items-end gap-3">
        <label className="text-xs text-muted-foreground">De<Input type="date" value={f.de} onChange={(e) => setF({ ...f, de: e.target.value })} className="w-40" /></label>
        <label className="text-xs text-muted-foreground">Até<Input type="date" value={f.ate} onChange={(e) => setF({ ...f, ate: e.target.value })} className="w-40" /></label>
        <Button onClick={buscar} disabled={loading}><Search className="h-4 w-4 mr-1" />Buscar</Button>
        <Button variant="outline" onClick={limpar} disabled={loading}><X className="h-4 w-4 mr-1" />Limpar</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {vcard("Vidas Anteriores", vidas.ant, dAnt)}
        {card("+ Entradas", kpi.e, UserPlus, "text-primary", "Entrada")}
        {card("− Saídas", kpi.s, UserMinus, "text-destructive", "Saída")}
        {card("+ Reativações", kpi.r, RotateCcw, "text-primary", "Reativação")}
        {card("+ T+", kpi.tp, LogIn, "text-primary", "T+")}
        {card("− T−", kpi.tm, LogOut, "text-destructive", "T-")}
        {card("Saldo de Crescimento do Período", kpi.e + kpi.r + kpi.tp - kpi.s - kpi.tm, Scale, kpi.e + kpi.r + kpi.tp - kpi.s - kpi.tm < 0 ? "text-destructive" : "text-primary", null, true)}
        {vcard("Vidas Finais", vidas.fin, dFin)}
      </div>

      {err && <div className="p-4 text-center text-destructive">Erro: {err}</div>}
      {cortado && <div className="text-xs text-muted-foreground">Limite de busca atingido, reduza o período.</div>}

      <TransferenciasBlocos transf={transf} grupoSel={grupoSel} setGrupoSel={setGrupoSel} />

      {sel && !loading && (
        <div className="rounded-xl border bg-card overflow-auto max-h-[60vh]">
          <div className="px-4 py-2 text-sm font-medium border-b">{sel} · {num(lista.length)} registro(s)</div>
          <table className="w-full text-xs">
            <thead className="bg-muted/40 sticky top-0">
              <tr>{["Data", "Matrícula", "Beneficiário", "Empresa", "Vendedor"].map((h) => <th key={h} className="px-3 py-1.5 text-left">{h}</th>)}</tr>
            </thead>
            <tbody>
              {lista.map((e, i) => (
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

const fmtCpf = (v: string) => { const d = v.replace(/\D/g, "").padStart(11, "0"); return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`; };

const ROTULOS: Record<TransfGrupo, string> = {
  veioAntes: "Vieram de antes",
  dentroChegada: "Trocaram dentro do período",
  semAnterior: "Sem saída anterior",
  dentro: "Trocaram dentro do período",
  depois: "Vão entrar depois",
  semNova: "Sem nova matrícula",
};

function TransferenciasBlocos({ transf, grupoSel, setGrupoSel }: {
  transf: { loading: boolean; res: ReturnType<typeof classificarTransferencias> | null };
  grupoSel: TransfGrupo | null;
  setGrupoSel: (g: TransfGrupo | null) => void;
}) {
  const g = transf.res?.grupos;
  const n = (k: TransfGrupo) => (g ? num(g[k].length) : "…");
  const linha = (k: TransfGrupo, dica: string) => (
    <button key={k} type="button" title={dica} onClick={() => setGrupoSel(grupoSel === k ? null : k)}
      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted/50 ${grupoSel === k ? "ring-2 ring-primary" : ""}`}>
      <span>{ROTULOS[k]}</span><span className="font-semibold tabular-nums">{n(k)}</span>
    </button>
  );
  const total = (ks: TransfGrupo[]) => (g ? num(ks.reduce((a, k) => a + g[k].length, 0)) : "…");
  const saldo = transf.res?.saldo ?? 0;
  const itens: TransfItem[] = grupoSel && g ? g[grupoSel] : [];
  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr]">
        <section className="rounded-xl border bg-card p-3">
          <div className="mb-2 flex items-center justify-between px-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-primary"><LogIn className="h-4 w-4" />Transferências que chegaram</h3><span className="text-xl font-bold text-primary">{total(["veioAntes", "dentroChegada", "semAnterior"])}</span></div>
          {linha("veioAntes", "Saíram antes do início do período e entraram dentro dele")}
          {linha("dentroChegada", "Saída e entrada dentro do período")}
          {linha("semAnterior", "Entraram por transferência sem matrícula anterior na base")}
        </section>
        <section className="flex flex-col items-center justify-center rounded-xl border bg-card px-6 py-3 text-center">
          <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
          <span className="mt-1 text-xs text-muted-foreground">Saldo de transferências</span>
          <span className={`text-2xl font-bold ${saldo < 0 ? "text-destructive" : "text-primary"}`}>{transf.res ? (saldo > 0 ? "+" : "") + num(saldo) : "…"}</span>
          <span className="mt-1 max-w-[12rem] text-[11px] text-muted-foreground">Trocas dentro do período não alteram o saldo</span>
        </section>
        <section className="rounded-xl border bg-card p-3">
          <div className="mb-2 flex items-center justify-between px-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-destructive"><LogOut className="h-4 w-4" />Transferências que partiram</h3><span className="text-xl font-bold text-destructive">{total(["dentro", "depois", "semNova"])}</span></div>
          {linha("dentro", "Saíram e entraram em nova matrícula dentro do período")}
          {linha("depois", "Saíram no período e a nova matrícula começa depois dele")}
          {linha("semNova", "Saíram sem outra matrícula com o mesmo CPF")}
        </section>
      </div>
      {grupoSel && g && (
        <div className="rounded-xl border bg-card overflow-auto max-h-[50vh]">
          <div className="px-4 py-2 text-sm font-medium border-b">{ROTULOS[grupoSel]} · {num(itens.length)} registro(s) · ligação por CPF</div>
          <table className="w-full text-xs">
            <thead className="bg-muted/40 sticky top-0"><tr>{["CPF", "Beneficiário", "Matrícula anterior", "Saída", "Matrícula nova", "Entrada"].map((h) => <th key={h} className="px-3 py-1.5 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {itens.map((i, k) => (
                <tr key={k} className="border-t">
                  <td className="px-3 py-1 whitespace-nowrap">{i.cpf ? fmtCpf(i.cpf) : "—"}</td>
                  <td className="px-3 py-1">{i.nome}</td>
                  <td className="px-3 py-1 whitespace-nowrap">{i.matAnterior ? fmtMat(i.matAnterior) : "—"}</td>
                  <td className="px-3 py-1">{fmtD(i.saida ?? "")}</td>
                  <td className="px-3 py-1 whitespace-nowrap">{i.matNova ? fmtMat(i.matNova) : "—"}</td>
                  <td className="px-3 py-1">{fmtD(i.entrada ?? "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
