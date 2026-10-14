import { useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
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
          .select("cd_mat_alternativa,cd_vendedor,cd_motivo_cancelamento,nm_beneficiario,nm_empresa_estipulante,nm_vendedor,dt_vigencia_beneficiario,dt_desligamento,dt_reativacao")
          .eq("tp_plano", "SAUDE").lte("cd_mat_alternativa", 399999999999)
          .or(conds.join(","))
          .range(from, from + 999);
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

  const buscar = () => setAp({ ...f });
  const limpar = () => { const e = EMPTY(); setF(e); setAp(e); };

  const vcard = (l: string, v: number | null, d: string) => (
    <div className="rounded-xl border bg-card p-4 flex items-center gap-3 md:w-1/2">
      <Users className="h-8 w-8 text-primary" />
      <div><p className="text-xs text-muted-foreground">{l} · Ativos em {fmtD(d)}</p><p className="text-2xl font-bold text-primary">{v == null ? "…" : num(v)}</p></div>
    </div>
  );

  const card = (l: string, v: number, I: any, c: string, t: Tipo | null, sinal = false) => (
    <button
      key={l}
      onClick={() => t && setSel(sel === t ? null : t)}
      className={`rounded-xl border bg-card p-4 flex items-center gap-3 text-left transition ${t ? "hover:bg-muted/50 cursor-pointer" : "cursor-default"} ${sel && sel === t ? "ring-2 ring-primary" : ""}`}
    >
      <I className={`h-8 w-8 ${c}`} />
      <div><p className="text-xs text-muted-foreground">{l}</p><p className={`text-2xl font-bold ${c}`}>{loading ? "…" : (sinal && v > 0 ? "+" : "") + num(v)}</p></div>
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

      {vcard("Vidas Anteriores", vidas.ant, dAnt)}

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Movimentação</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {card("Entradas", kpi.e, UserPlus, "text-primary", "Entrada")}
          {card("Saídas", kpi.s, UserMinus, "text-destructive", "Saída")}
          {card("Reativações", kpi.r, RotateCcw, "text-primary", "Reativação")}
          {card("Saldo líquido", kpi.saldo, Scale, kpi.saldo >= 0 ? "text-primary" : "text-destructive", null, true)}
        </div>
      </section>

      <section className="space-y-2 pt-2 border-t">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><ArrowRightLeft className="h-3.5 w-3.5" />Transferências</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {card("T+ (entrada por transferência)", kpi.tp, LogIn, "text-primary", "T+")}
          {card("T− (saída por transferência)", kpi.tm, LogOut, "text-destructive", "T-")}
        </div>
      </section>

      {vcard("Vidas Finais", vidas.fin, dFin)}

      {err && <div className="p-4 text-center text-destructive">Erro: {err}</div>}
      {cortado && <div className="text-xs text-muted-foreground">Limite de busca atingido, reduza o período.</div>}

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
