import { useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Loader2, Search, X, Users, UserCheck, UserX, Building2 } from "lucide-react";

type Row = Record<string, any>;
const TABLE = "view_ecarteira";
const PAGE = 200;

const fmtD = (v: any) => v ? new Date(v).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—";
const brl = (v: any) => v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtMat = (v: any) => {
  if (v == null || String(v).trim() === "") return "—";
  const d = String(v).trim().replace(/\D/g, "");
  if (d.length <= 8) return String(v).trim();
  const r = d.slice(-8);
  return `${Number(d.slice(0, -8))}/${r.slice(0, 6)}-${r.slice(6)}`;
};
const maxD = (a: any, b: any) => (!a ? b : !b ? a : (String(a) > String(b) ? a : b));
function agrupar(rows: Row[], hoje: string): Row[] {
  const m = new Map<string, Row>();
  for (const r of rows) {
    const k = String(r.cd_mat_alternativa ?? r.cd_matricula ?? Math.random()).trim();
    const o = m.get(k);
    if (!o) { m.set(k, { ...r }); continue; }
    const base = String(r.dt_vigencia_beneficiario ?? "") > String(o.dt_vigencia_beneficiario ?? "") ? { ...r } : o;
    base.dt_vigencia_beneficiario = maxD(o.dt_vigencia_beneficiario, r.dt_vigencia_beneficiario);
    base.dt_desligamento = maxD(o.dt_desligamento, r.dt_desligamento);
    base.dt_reativacao = maxD(o.dt_reativacao, r.dt_reativacao);
    m.set(k, base);
  }
  return [...m.values()].map((r) => ({ ...r, st: calcStatus(r, hoje) }));
}
const dia = (v: any) => (v ? String(v).slice(0, 10) : "");
function calcStatus(r: Row, hoje: string): "A" | "F" | "C" {
  const vig = dia(r.dt_vigencia_beneficiario), can = dia(r.dt_desligamento), rea = dia(r.dt_reativacao);
  if (vig && vig > hoje) return "F";
  if (vig && vig <= hoje) {
    if (!can && !rea) return "A";
    if (rea && rea <= hoje && (!can || rea > can)) return "A";
  }
  return "C";
}
const ST: Record<string, [string, any]> = { A: ["Ativo", "default"], F: ["Futuro", "secondary"], C: ["Cancelado", "destructive"] };
const COLS: { key: string; label: string; fmt?: (v: any) => string; align?: "right" }[] = [
  { key: "cd_mat_alternativa", label: "Matrícula", fmt: (v) => fmtMat(v) },
  { key: "nm_beneficiario", label: "Beneficiário" },
  { key: "tp_acomodacao", label: "Acomodação" },
  { key: "nm_empresa_estipulante", label: "Empresa" },
  { key: "nm_cidade_plano", label: "Cidade" },
  { key: "vl_tmm", label: "Mensalidade", align: "right", fmt: brl },
  { key: "dt_nascimento", label: "Nascimento", fmt: fmtD },
  { key: "dt_vigencia_beneficiario", label: "Vigência", fmt: fmtD },
  { key: "dt_desligamento", label: "Cancelamento", fmt: fmtD },
  { key: "dt_reativacao", label: "Reativação", fmt: fmtD },
  { key: "st", label: "Status" },
];
const cidadeUf = (r: Row) => r.nm_cidade_plano ? `${String(r.nm_cidade_plano).trim()} (${String(r.cd_uf_plano ?? "").trim()})` : "—";

const fmtDate = (v: any) => v ? new Date(v).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—";
const ALL = "__all__";

type Filters = { q: string; status: string; tipo: string; sexo: string; pme: string; uf: string; cidade: string; empresa: string };
const EMPTY: Filters = { q: "", status: ALL, tipo: "SAUDE", sexo: ALL, pme: ALL, uf: ALL, cidade: "", empresa: "" };

function applyFilters(q: any, f: Filters) {
  if (f.q.trim()) {
    const t = f.q.trim();
    q = /^\d+$/.test(t) ? q.or(`cd_mat_alternativa.eq.${t},cd_contrato.eq.${t}`) : q.ilike("nm_beneficiario", `%${t}%`);
  }
  q = q.eq("tp_plano", "SAUDE").lte("cd_mat_alternativa", 399999999999);
  if (f.sexo !== ALL) q = q.eq("tp_sexo", f.sexo);
  if (f.pme !== ALL) q = q.eq("sn_pme", f.pme);
  if (f.uf !== ALL) q = q.eq("cd_uf_plano", f.uf);
  if (f.cidade.trim()) q = q.ilike("nm_cidade_plano", `%${f.cidade.trim()}%`);
  if (f.empresa.trim()) q = q.ilike("nm_empresa_estipulante", `%${f.empresa.trim()}%`);
  return q;
}

function useDebounced<T>(v: T, ms = 400) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

export default function CarteiraTrial() {
  const [f, setF] = useState<Filters>(EMPTY);
  const df = useDebounced(f);
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ key: string; asc: boolean }>({ key: "nm_beneficiario", asc: true });
  const [raw, setRaw] = useState<Row[]>([]);
  const [dataRef, setDataRef] = useState(() => new Date().toISOString().slice(0, 10));
  const rows = useMemo(() => agrupar(raw, dataRef || new Date().toISOString().slice(0, 10)), [raw, dataRef]);
  const [fim, setFim] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [kpi, setKpi] = useState<{ ativos?: number; futuros?: number; cancelados?: number; total?: number } | null>(null);
  useEffect(() => {
    if (!dataRef) return;
    setKpi(null);
    hostinger.rpc("carteira_trial_kpis", { p_data: dataRef, p_q: df.q.trim() || null, p_empresa: df.empresa.trim() || null, p_cidade: df.cidade.trim() || null }).then(({ data, error }: any) => {
      if (error) { console.error(error); return; }
      const r = Array.isArray(data) ? data[0] : data;
      if (r) setKpi({ ativos: Number(r.ativos), futuros: Number(r.futuros), cancelados: Number(r.cancelados), total: Number(r.total) });
    });
  }, [dataRef, df.q, df.empresa, df.cidade]);
  const vis = useMemo(() => {
    const v = f.status === ALL ? rows : rows.filter((r) => r.st === f.status);
    return sort.key === "st" ? [...v].sort((a, b) => (sort.asc ? 1 : -1) * String(a.st).localeCompare(String(b.st))) : v;
  }, [rows, f.status, sort]);
  useEffect(() => { if (!loading && !fim && f.status !== ALL && vis.length < 50 && raw.length > 0) setPage((p) => p + 1); }, [loading, fim, vis.length, f.status, raw.length]);
  const cnt = (k: string) => rows.filter((r) => r.st === k).length;
  const [sel, setSel] = useState<Row | null>(null);

  const dfKey = JSON.stringify({ ...df, status: "" });
  useEffect(() => { setPage(0); }, [dfKey, sort.key, sort.asc]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      let q = applyFilters(hostinger.from(TABLE).select("*"), df);
      if (sort.key && sort.key !== "st") q = q.order(sort.key, { ascending: sort.asc, nullsFirst: false });
      const { data, error } = await q.range(page * PAGE, page * PAGE + PAGE - 1);
      if (cancel) return;
      if (error) console.error(error);
      setRaw((old) => (page === 0 ? data ?? [] : [...old, ...(data ?? [])]));
      setFim((data?.length ?? 0) < PAGE);
      setLoading(false);
      const { count } = await applyFilters(hostinger.from(TABLE).select("cd_matricula", { count: "exact", head: true }), df);
      if (!cancel) setTotal(count ?? null);
    })();
    return () => { cancel = true; };
  }, [dfKey, page, sort.key === "st" ? "" : sort.key, sort.asc]);

  const pages = total ? Math.ceil(total / PAGE) : 1;
  const set = (k: keyof Filters, v: string) => setF((p) => ({ ...p, [k]: v }));
  const activeChips = useMemo(() => (Object.keys(f) as (keyof Filters)[]).filter((k) => f[k] && f[k] !== ALL && f[k] !== EMPTY[k]), [f]);

  const exportCsv = () => {
    const head = COLS.map((c) => c.label).join(";");
    const body = vis.map((r) => COLS.map((c) => `"${String(c.fmt ? c.fmt(r[c.key]) : r[c.key] ?? "").trim().replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + head + "\n" + body], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `carteira.csv`;
    a.click();
  };

  const Kpi = ({ icon: I, label, v, onClick, on }: any) => (
    <button onClick={onClick} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${on ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent"}`}>
      <I className="h-5 w-5 text-primary" />
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums text-foreground">{v == null ? "…" : v.toLocaleString("pt-BR")}</p>
      </div>
    </button>
  );

  return (
    <div className="h-full flex flex-col gap-4 min-h-0">
      <div className="flex flex-wrap items-center gap-2 shrink-0 bg-card border border-border rounded-xl p-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">Ativos em:
          <Input type="date" className="w-40" value={dataRef} onChange={(e) => setDataRef(e.target.value)} />
        </label>
        <span className="text-sm text-muted-foreground">Total de Ativos: <b className="text-foreground tabular-nums">{kpi?.ativos == null ? "…" : kpi.ativos.toLocaleString("pt-BR")}</b></span>
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Nome, matrícula ou contrato" value={f.q} onChange={(e) => set("q", e.target.value)} />
        </div>
        <Input className="w-48" placeholder="Empresa" value={f.empresa} onChange={(e) => set("empresa", e.target.value)} />
        <Input className="w-40" placeholder="Cidade" value={f.cidade} onChange={(e) => set("cidade", e.target.value)} />
        {([
          ["status", "Status", [["A", "Ativo"], ["F", "Futuro"], ["C", "Cancelado"]]],
        ] as [keyof Filters, string, string[][]][]).map(([k, label, opts]) => (
          <Select key={k} value={f[k]} onValueChange={(v) => set(k, v)}>
            <SelectTrigger className="w-32"><SelectValue placeholder={label} /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{label}: todos</SelectItem>
              {opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        ))}
        <div className="ml-auto flex gap-2">
          {activeChips.length > 0 && <Button variant="ghost" size="sm" onClick={() => setF({ ...EMPTY, status: ALL })}><X className="h-4 w-4 mr-1" />Limpar</Button>}
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4 mr-1" />Exportar</Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto" onScroll={(e) => { const el = e.currentTarget; if (!loading && !fim && el.scrollTop + el.clientHeight > el.scrollHeight - 300) setPage((p) => p + 1); }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted z-10">
              <tr>
                {COLS.map((c) => (
                  <th key={c.key} onClick={() => setSort((s) => ({ key: c.key, asc: s.key === c.key ? !s.asc : true }))}
                    className={`px-3 py-2 font-medium text-muted-foreground whitespace-nowrap cursor-pointer select-none hover:text-foreground ${c.align === "right" ? "text-right" : "text-left"}`}>
                    <span className="inline-flex items-center gap-1">{c.label}{sort.key === c.key && (sort.asc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vis.map((r, i) => (
                <tr key={`${r.cd_matricula}-${i}`} onClick={() => setSel(r)} className="border-t border-border hover:bg-accent cursor-pointer">
                  {COLS.map((c) => (
                    <td key={c.key} className={`px-3 py-1.5 whitespace-nowrap max-w-[260px] truncate ${c.align === "right" ? "text-right tabular-nums" : ""}`}>
                      {c.key === "st" ? (
                        <Badge variant={ST[r.st][1]}>{ST[r.st][0]}</Badge>
                      ) : c.key === "nm_cidade_plano" ? cidadeUf(r) : c.fmt ? c.fmt(r[c.key]) : String(r[c.key] ?? "—").trim()}
                    </td>
                  ))}
                </tr>
              ))}
              {!loading && vis.length === 0 && (
                <tr><td colSpan={COLS.length} className="text-center text-muted-foreground py-10">Nenhum beneficiário encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="shrink-0 border-t border-border px-4 py-2 flex items-center justify-between text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {(() => {
              const n = f.status === "A" ? kpi?.ativos : f.status === "F" ? kpi?.futuros : f.status === "C" ? kpi?.cancelados : kpi?.total;
              return n == null ? "…" : n.toLocaleString("pt-BR");
            })()} registros selecionados
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 shrink-0">
        <Kpi icon={UserCheck} label="Ativos" v={kpi?.ativos} on={f.status === "A"} onClick={() => set("status", f.status === "A" ? ALL : "A")} />
        <Kpi icon={Building2} label="Futuros" v={kpi?.futuros} on={f.status === "F"} onClick={() => set("status", f.status === "F" ? ALL : "F")} />
        <Kpi icon={UserX} label="Cancelados" v={kpi?.cancelados} on={f.status === "C"} onClick={() => set("status", f.status === "C" ? ALL : "C")} />
        <Kpi icon={Users} label="Total" v={kpi?.total} on={false} onClick={() => set("status", ALL)} />
      </div>

      <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-auto">
          {sel && (
            <>
              <SheetHeader><SheetTitle>{sel.nm_beneficiario}</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                {[
                  ["Cadastro", [["Matrícula", fmtMat(sel.cd_mat_alternativa)], ["Contrato", sel.cd_contrato], ["Status", ST[sel.st][0]], ["Nascimento", fmtDate(sel.dt_nascimento)], ["Idade", sel.qt_idade], ["Faixa", sel.ds_faixa_etaria], ["Sexo", sel.tp_sexo]]],
                  ["Plano", [["Plano", sel.ds_plano], ["Acomodação", sel.tp_acomodacao], ["Contratação", sel.tp_contratacao], ["Recuperação", sel.tp_recuperacao], ["PME", sel.sn_pme], ["Mensalidade", brl(sel.vl_tmm)], ["Últ. reajuste", fmtDate(sel.dt_ult_reajuste)]]],
                  ["Empresa / Local", [["Estipulante", sel.nm_empresa_estipulante], ["Resp. financeiro", sel.nm_resp_financeiro], ["Cidade", `${sel.nm_cidade_plano ?? "—"} / ${sel.cd_uf_plano ?? ""}`], ["Regional", sel.nm_regional_plano], ["Vendedor", sel.nm_vendedor]]],
                  ["Datas", [["Cadastro", fmtDate(sel.dt_cadastro)], ["Vigência contrato", fmtDate(sel.dt_vigencia_contrato)], ["Vigência beneficiário", fmtDate(sel.dt_vigencia_beneficiario)], ["Cancelamento", fmtDate(sel.dt_desligamento)], ["Reativação", fmtDate(sel.dt_reativacao)], ["Motivo cancel.", sel.ds_motivo_cancelamento]]],
                ].map(([t, items]: any) => (
                  <div key={t}>
                    <p className="text-xs font-semibold uppercase text-primary mb-2">{t}</p>
                    <dl className="grid grid-cols-[140px_1fr] gap-y-1">
                      {items.map(([l, v]: any) => (<div key={l} className="contents"><dt className="text-muted-foreground">{l}</dt><dd className="text-foreground">{v == null || v === "" ? "—" : String(v).trim()}</dd></div>))}
                    </dl>
                  </div>
                ))}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
