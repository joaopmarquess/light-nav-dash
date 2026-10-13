import { useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
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
          .select("cd_mat_alternativa,nm_beneficiario,nm_empresa_estipulante,nm_cidade_plano,cd_uf_plano,nm_vendedor,vl_tmm,dt_vigencia_beneficiario,dt_desligamento,dt_reativacao")
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

  const [grp, setGrp] = useState("nenhum");
  const [aberto, setAberto] = useState<Record<string, boolean>>({});
  const grupos = useMemo(() => {
    if (grp === "nenhum") return [];
    const key = (e: Ev) => grp === "empresa" ? (e.r.nm_empresa_estipulante || "SEM EMPRESA")
      : grp === "cidade" ? (e.r.nm_cidade_plano ? cidade(e.r) : "SEM CIDADE")
      : grp === "vendedor" ? (e.r.nm_vendedor || "SEM VENDEDOR") : e.data;
    const m = new Map<string, Ev[]>();
    for (const e of lista) { const k = String(key(e)).trim(); if (!m.has(k)) m.set(k, []); m.get(k)!.push(e); }
    return [...m.entries()].map(([k, it]) => {
      const c = (t: string) => it.filter((x) => x.tipo === t).length;
      const e = c("Entrada"), r = c("Reativação"), s = c("Saída");
      return { k, it, e, r, s, saldo: e + r - s };
    }).sort((a, b) => grp === "dia" ? b.k.localeCompare(a.k) : b.it.length - a.it.length);
  }, [lista, grp]);
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
    </tr>
  );

  const buscar = () => setAp({ ...f });
  const limpar = () => { const e = EMPTY(); setF(e); setAp(e); };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4 flex flex-wrap items-end gap-3">
        <label className="text-xs text-muted-foreground">De<Input type="date" value={f.de} onChange={(e) => setF({ ...f, de: e.target.value })} className="w-40" /></label>
        <label className="text-xs text-muted-foreground">Até<Input type="date" value={f.ate} onChange={(e) => setF({ ...f, ate: e.target.value })} className="w-40" /></label>
        <label className="text-xs text-muted-foreground">Tipo
          <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="entradas">Entradas</SelectItem>
              <SelectItem value="reativacoes">Reativações</SelectItem>
              <SelectItem value="saidas">Saídas</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <Input placeholder="Nome, matrícula ou contrato" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} onKeyDown={(e) => e.key === "Enter" && buscar()} className="w-60" />
        <Input placeholder="Empresa" value={f.empresa} onChange={(e) => setF({ ...f, empresa: e.target.value })} className="w-44" />
        <Input placeholder="Cidade" value={f.cidade} onChange={(e) => setF({ ...f, cidade: e.target.value })} className="w-44" />
        <label className="text-xs text-muted-foreground">Agrupar por
          <Select value={grp} onValueChange={(v) => { setGrp(v); setAberto({}); }}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhum">Sem agrupar</SelectItem>
              <SelectItem value="empresa">Empresa</SelectItem>
              <SelectItem value="cidade">Cidade</SelectItem>
              <SelectItem value="vendedor">Vendedor</SelectItem>
              <SelectItem value="dia">Dia</SelectItem>
            </SelectContent>
          </Select>
        </label>
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

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr>{COLS.map((c) => (
                <th key={c.key} onClick={() => setSort((s) => ({ k: c.key, asc: s.k === c.key ? !s.asc : true }))}
                  className={`px-3 py-2 font-medium cursor-pointer select-none whitespace-nowrap ${c.align === "right" ? "text-right" : "text-left"}`}>
                  {c.label}{sort.k === c.key && (sort.asc ? <ArrowUp className="inline h-3 w-3 ml-1" /> : <ArrowDown className="inline h-3 w-3 ml-1" />)}
                </th>))}
              </tr>
            </thead>
            <tbody>
              {grp === "nenhum" ? lista.slice(0, 2000).map(linha) : grupos.map((g) => (
                <>
                  <tr key={g.k} onClick={() => setAberto((p) => ({ ...p, [g.k]: !p[g.k] }))} className="border-t bg-muted/30 hover:bg-muted cursor-pointer font-medium">
                    <td colSpan={COLS.length} className="px-3 py-2">
                      <span className="inline-flex items-center gap-2">
                        {aberto[g.k] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        {grp === "dia" ? fmtD(g.k) : g.k}
                      </span>
                      <span className="float-right text-xs font-normal text-muted-foreground">
                        Entradas <b className="text-foreground">{num(g.e)}</b> · Reativações <b className="text-foreground">{num(g.r)}</b> · Saídas <b className="text-destructive">{num(g.s)}</b> · Saldo <b className={g.saldo >= 0 ? "text-primary" : "text-destructive"}>{g.saldo > 0 ? "+" : ""}{num(g.saldo)}</b>
                      </span>
                    </td>
                  </tr>
                  {aberto[g.k] && g.it.map(linha)}
                </>
              ))}
            </tbody>
          </table>
          {loading && <div className="p-6 flex justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Carregando…</div>}
          {err && <div className="p-6 text-center text-destructive">Erro: {err}</div>}
          {!loading && !err && evs.length === 0 && <div className="p-6 text-center text-muted-foreground">Nenhuma movimentação no período.</div>}
        </div>
        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
          {num(evs.length)} movimentações{grp !== "nenhum" ? ` em ${num(grupos.length)} grupos` : ""}{grp === "nenhum" && evs.length > 2000 ? " (exibindo as 2.000 primeiras pela ordem escolhida)" : ""}{cortado ? " — limite de busca atingido, reduza o período" : ""}
        </div>
      </div>
    </div>
  );
}
