import { Fragment, useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { useGruposVendedor } from "@/lib/vendedorGrupo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, Loader2, Search, X, UserPlus, UserMinus, Scale, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";

type Row = Record<string, any>;
type Ev = { data: string; tipo: "Entrada" | "Reativação" | "Saída"; r: Row };
const LIMITE = 30000;

const hojeISO = () => new Date().toISOString().slice(0, 10);
const inicioMes = () => hojeISO().slice(0, 8) + "01";
const dia = (v: any) => (v ? String(v).slice(0, 10) : "");
const fmtD = (v: string) => (v ? v.split("-").reverse().join("/") : "—");
const brl = (v: any) => (v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const num = (n: number) => n.toLocaleString("pt-BR");
const fmtMat = (v: any) => {
  const d = String(v ?? "").replace(/\D/g, "");
  if (d.length <= 8) return d || "—";
  const r = d.slice(-8);
  return `${Number(d.slice(0, -8))}/${r.slice(0, 6)}-${r.slice(6)}`;
};
const cidade = (r: Row) => (r.nm_cidade_plano ? `${r.nm_cidade_plano}${r.cd_uf_plano ? ` (${r.cd_uf_plano})` : ""}` : "—");

const COLS: { key: string; label: string; align?: "right" }[] = [
  { key: "data", label: "Data" },
  { key: "tipo", label: "Tipo" },
  { key: "mat", label: "Matrícula" },
  { key: "nome", label: "Beneficiário" },
  { key: "empresa", label: "Empresa" },
  { key: "cidade", label: "Cidade" },
  { key: "vendedor", label: "Vendedor" },
  { key: "valor", label: "Mensalidade", align: "right" },
  { key: "vidas", label: "Vidas", align: "right" },
];
const val = (e: Ev, k: string): any =>
  k === "data" ? e.data : k === "tipo" ? e.tipo : k === "mat" ? Number(e.r.cd_mat_alternativa ?? 0)
  : k === "nome" ? e.r.nm_beneficiario ?? "" : k === "empresa" ? e.r.nm_empresa_estipulante ?? ""
  : k === "cidade" ? e.r.nm_cidade_plano ?? "" : k === "vendedor" ? e.r.nm_vendedor ?? "" : Number(e.r.vl_tmm ?? 0);

type F = { de: string; ate: string; tipo: string; q: string; empresa: string; cidade: string };
const EMPTY = (): F => ({ de: inicioMes(), ate: hojeISO(), tipo: "todas", q: "", empresa: "", cidade: "" });

export default function CarteiraTrialMov() {
  const [f, setF] = useState<F>(EMPTY());
  const [ap, setAp] = useState<F>(EMPTY());
  const [evs, setEvs] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cortado, setCortado] = useState(false);
  const [sort, setSort] = useState<{ k: string; asc: boolean }>({ k: "data", asc: false });

  useEffect(() => {
    let off = false;
    (async () => {
      setLoading(true); setErr(null); setEvs([]); setCortado(false);
      const { de, ate } = ap;
      const fim = `${ate}T23:59:59`;
      const conds: string[] = [];
      const T = ap.tipo, all = T === "todas";
      if (all || T === "entradas") conds.push(`and(dt_vigencia_beneficiario.gte.${de},dt_vigencia_beneficiario.lte.${fim})`);
      if (all || T === "reativacoes") conds.push(`and(dt_reativacao.gte.${de},dt_reativacao.lte.${fim})`);
      if (all || T === "saidas") conds.push(`and(dt_desligamento.gte.${de},dt_desligamento.lte.${fim})`);
      const rows: Row[] = [];
      for (let from = 0; from < LIMITE; from += 1000) {
        let q = hostinger.from("view_ecarteira")
          .select("cd_mat_alternativa,cd_vendedor,nm_beneficiario,nm_empresa_estipulante,nm_cidade_plano,cd_uf_plano,nm_vendedor,vl_tmm,dt_vigencia_beneficiario,dt_desligamento,dt_reativacao")
          .eq("tp_plano", "SAUDE").lte("cd_mat_alternativa", 399999999999)
          .or(conds.join(","))
          .range(from, from + 999);
        const s = ap.q.trim();
        if (s) q = /^\d+$/.test(s) ? q.or(`cd_mat_alternativa.eq.${s},cd_contrato.eq.${s}`) : q.ilike("nm_beneficiario", `%${s}%`);
        if (ap.empresa.trim()) q = q.ilike("nm_empresa_estipulante", `%${ap.empresa.trim()}%`);
        if (ap.cidade.trim()) q = q.ilike("nm_cidade_plano", `%${ap.cidade.trim()}%`);
        const { data, error } = await q;
        if (off) return;
        if (error) { setErr(error.message); setLoading(false); return; }
        rows.push(...(data ?? []));
        if ((data ?? []).length < 1000) break;
        if (from + 1000 >= LIMITE) setCortado(true);
      }
      const inR = (d: string) => d && d >= de && d <= ate;
      const out: Ev[] = []; const seen = new Set<string>();
      const add = (tipo: Ev["tipo"], d: string, r: Row) => {
        const k = `${tipo}|${r.cd_mat_alternativa}|${d}`;
        if (seen.has(k)) return; seen.add(k); out.push({ tipo, data: d, r });
      };
      for (const r of rows) {
        const v = dia(r.dt_vigencia_beneficiario), c = dia(r.dt_desligamento), a = dia(r.dt_reativacao);
        if ((all || T === "entradas") && inR(v)) add("Entrada", v, r);
        if ((all || T === "reativacoes") && inR(a)) add("Reativação", a, r);
        if ((all || T === "saidas") && inR(c)) add("Saída", c, r);
      }
      if (!off) { setEvs(out); setLoading(false); }
    })();
    return () => { off = true; };
  }, [ap]);

  const kpi = useMemo(() => {
    const c = (t: string) => evs.filter((x) => x.tipo === t).length;
    const e = c("Entrada"), r = c("Reativação"), s = c("Saída");
    return { e, r, s, saldo: e + r - s };
  }, [evs]);

  const lista = useMemo(() => {
    const m = sort.asc ? 1 : -1;
    return [...evs].sort((a, b) => {
      const x = val(a, sort.k), y = val(b, sort.k);
      return (typeof x === "number" ? x - y : String(x).localeCompare(String(y), "pt-BR")) * m;
    });
  }, [evs, sort]);

  const gv = useGruposVendedor();
  const [grp, setGrp] = useState("nenhum");
  const [aberto, setAberto] = useState<Record<string, boolean>>({});
  const agrupa = (list: Ev[], key: (e: Ev) => string) => {
    const m = new Map<string, Ev[]>();
    for (const e of list) { const k = String(key(e)).trim(); if (!m.has(k)) m.set(k, []); m.get(k)!.push(e); }
    return [...m.entries()].map(([k, it]) => {
      const c = (t: string) => it.filter((x) => x.tipo === t).length;
      const e = c("Entrada"), r = c("Reativação"), s = c("Saída");
      const vidas = new Set(it.map((x) => String(x.r.cd_mat_alternativa))).size;
      return { k, it, e, r, s, saldo: e + r - s, vidas };
    }).sort((a, b) => grp === "dia" ? b.k.localeCompare(a.k) : b.it.length - a.it.length);
  };
  const grupos = useMemo(() => {
    if (grp === "nenhum") return [];
    const key = (e: Ev) => grp === "empresa" ? (e.r.nm_empresa_estipulante || "SEM EMPRESA")
      : grp === "cidade" ? (e.r.nm_cidade_plano ? cidade(e.r) : "SEM CIDADE")
      : grp === "grupo" ? (gv[e.r.cd_vendedor] || "SEM GRUPO") : e.data;
    return agrupa(lista, key).map((g) => ({ ...g, sub: grp === "grupo" ? agrupa(g.it, (e) => e.r.nm_vendedor || "SEM VENDEDOR") : null }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista, grp, gv]);
  const vlr = (g: { saldo: number; vidas: number }) => ap.tipo === "todas"
    ? <span className={g.saldo >= 0 ? "text-primary" : "text-destructive"}>{g.saldo > 0 ? "+" : ""}{num(g.saldo)}</span> : num(g.vidas);
  const vidasTot = useMemo(() => new Set(evs.map((x) => String(x.r.cd_mat_alternativa))).size, [evs]);
  const linha = (e: Ev, i: number) => (
    <tr key={i} className="border-t hover:bg-muted/50">
      <td className="px-3 py-1.5">{fmtD(e.data)}</td>
      <td className="px-3 py-1.5"><Badge variant={e.tipo === "Saída" ? "destructive" : e.tipo === "Reativação" ? "secondary" : "default"}>{e.tipo}</Badge></td>
      <td className="px-3 py-1.5 whitespace-nowrap">{fmtMat(e.r.cd_mat_alternativa)}</td>
      <td className="px-3 py-1.5">{e.r.nm_beneficiario}</td>
      <td className="px-3 py-1.5">{e.r.nm_empresa_estipulante ?? "—"}</td>
      <td className="px-3 py-1.5">{cidade(e.r)}</td>
      <td className="px-3 py-1.5">{e.r.nm_vendedor ?? "—"}</td>
      <td className="px-3 py-1.5 text-right">{brl(e.r.vl_tmm)}</td>
      <td className="px-3 py-1.5 text-right text-muted-foreground">{ap.tipo === "todas" && e.tipo === "Saída" ? "-1" : ap.tipo === "todas" ? "+1" : "1"}</td>
    </tr>
  );

  const buscar = () => setAp({ ...f });
  const limpar = () => { const e = EMPTY(); setF(e); setAp(e); };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4 flex flex-wrap items-end gap-3">
        <label className="text-xs text-muted-foreground">De<Input type="date" value={f.de} onChange={(e) => setF({ ...f, de: e.target.value })} className="w-40" /></label>
        <label className="text-xs text-muted-foreground">Até<Input type="date" value={f.ate} onChange={(e) => setF({ ...f, ate: e.target.value })} className="w-40" /></label>
        <Button onClick={buscar} disabled={loading}><Search className="h-4 w-4 mr-1" />Buscar</Button>
        <Button variant="outline" onClick={limpar} disabled={loading}><X className="h-4 w-4 mr-1" />Limpar</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { l: "Entradas", v: kpi.e, I: UserPlus, c: "text-primary" },
          { l: "Reativações", v: kpi.r, I: RotateCcw, c: "text-primary" },
          { l: "Saídas", v: kpi.s, I: UserMinus, c: "text-destructive" },
          { l: "Saldo líquido", v: kpi.saldo, I: Scale, c: kpi.saldo >= 0 ? "text-primary" : "text-destructive" },
        ].map(({ l, v, I, c }) => (
          <div key={l} className="rounded-xl border bg-card p-4 flex items-center gap-3">
            <I className={`h-8 w-8 ${c}`} />
            <div><p className="text-xs text-muted-foreground">{l}</p><p className={`text-2xl font-bold ${c}`}>{loading ? "…" : (l === "Saldo líquido" && v > 0 ? "+" : "") + num(v)}</p></div>
          </div>
        ))}
      </div>

      {err && <div className="p-4 text-center text-destructive">Erro: {err}</div>}
      {cortado && <div className="text-xs text-muted-foreground">Limite de busca atingido, reduza o período.</div>}
    </div>
  );
}
