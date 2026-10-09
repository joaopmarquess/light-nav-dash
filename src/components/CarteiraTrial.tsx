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
const PAGE = 50;

const fmtD = (v: any) => v ? new Date(v).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—";
const brl = (v: any) => v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtMat = (v: any) => {
  if (v == null || String(v).trim() === "") return "—";
  const d = String(v).trim().replace(/\D/g, "");
  if (d.length <= 8) return String(v).trim();
  const r = d.slice(-8);
  return `${Number(d.slice(0, -8))}/${r.slice(0, 6)}-${r.slice(6)}`;
};
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
  { key: "tp_status", label: "Status" },
];
const cidadeUf = (r: Row) => r.nm_cidade_plano ? `${String(r.nm_cidade_plano).trim()} (${String(r.cd_uf_plano ?? "").trim()})` : "—";

const fmtDate = (v: any) => v ? new Date(v).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—";
const ALL = "__all__";

type Filters = { q: string; status: string; tipo: string; sexo: string; pme: string; uf: string; cidade: string; empresa: string };
const EMPTY: Filters = { q: "", status: "A", tipo: "SAUDE", sexo: ALL, pme: ALL, uf: ALL, cidade: "", empresa: "" };

function applyFilters(q: any, f: Filters) {
  if (f.q.trim()) {
    const t = f.q.trim();
    q = /^\d+$/.test(t) ? q.or(`cd_mat_alternativa.eq.${t},cd_contrato.eq.${t}`) : q.ilike("nm_beneficiario", `%${t}%`);
  }
  if (f.status !== ALL) q = q.eq("tp_status", f.status);
  q = q.eq("tp_plano", "SAUDE");
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
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [kpi, setKpi] = useState<{ ativos?: number; cancel?: number; total?: number }>({});
  const [sel, setSel] = useState<Row | null>(null);

  useEffect(() => { setPage(0); }, [df]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      let q = applyFilters(hostinger.from(TABLE).select("*"), df);
      if (sort.key) q = q.order(sort.key, { ascending: sort.asc, nullsFirst: false });
      const { data, error } = await q.range(page * PAGE, page * PAGE + PAGE - 1);
      if (cancel) return;
      if (error) console.error(error);
      setRows(data ?? []);
      setLoading(false);
      const { count } = await applyFilters(hostinger.from(TABLE).select("cd_matricula", { count: "exact", head: true }), df);
      if (!cancel) setTotal(count ?? null);
    })();
    return () => { cancel = true; };
  }, [df, page, sort]);

  // KPIs respeitam os filtros (exceto status/tipo que eles próprios segmentam)
  useEffect(() => {
    let cancel = false;
    const c = async (over: Partial<Filters>) => {
      const { count } = await applyFilters(hostinger.from(TABLE).select("cd_matricula", { count: "exact", head: true }), { ...df, ...over });
      return count ?? 0;
    };
    (async () => {
      const [ativos, cancelados, total] = await Promise.all([
        c({ status: "A" }), c({ status: "C" }), c({ status: ALL }),
      ]);
      if (!cancel) setKpi({ ativos, cancel: cancelados, total });
    })();
    return () => { cancel = true; };
  }, [df]);

  const pages = total ? Math.ceil(total / PAGE) : 1;
  const set = (k: keyof Filters, v: string) => setF((p) => ({ ...p, [k]: v }));
  const activeChips = useMemo(() => (Object.keys(f) as (keyof Filters)[]).filter((k) => f[k] && f[k] !== ALL && f[k] !== EMPTY[k]), [f]);

  const exportCsv = () => {
    const head = COLS.map((c) => c.label).join(";");
    const body = rows.map((r) => COLS.map((c) => `"${String(c.fmt ? c.fmt(r[c.key]) : r[c.key] ?? "").trim().replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + head + "\n" + body], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `carteira_pagina_${page + 1}.csv`;
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
      <div className="grid grid-cols-3 gap-3 shrink-0">
        <Kpi icon={UserCheck} label="Ativos" v={kpi.ativos} on={f.status === "A"} onClick={() => set("status", f.status === "A" ? ALL : "A")} />
        <Kpi icon={UserX} label="Cancelados" v={kpi.cancel} on={f.status === "C"} onClick={() => set("status", f.status === "C" ? ALL : "C")} />
        <Kpi icon={Users} label="Total Saúde" v={kpi.total} on={f.status === ALL} onClick={() => set("status", ALL)} />
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0 bg-card border border-border rounded-xl p-3">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Nome, matrícula ou contrato" value={f.q} onChange={(e) => set("q", e.target.value)} />
        </div>
        <Input className="w-48" placeholder="Empresa" value={f.empresa} onChange={(e) => set("empresa", e.target.value)} />
        <Input className="w-40" placeholder="Cidade" value={f.cidade} onChange={(e) => set("cidade", e.target.value)} />
        {([
          ["status", "Status", [["A", "Ativo"], ["C", "Cancelado"]]],
          ["sexo", "Sexo", [["F", "Feminino"], ["M", "Masculino"]]],
          ["pme", "PME", [["S", "Sim"], ["N", "Não"]]],
          ["uf", "UF", [["SP", "SP"], ["MG", "MG"], ["MS", "MS"], ["GO", "GO"]]],
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
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4 mr-1" />Exportar página</Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
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
              {rows.map((r, i) => (
                <tr key={`${r.cd_matricula}-${i}`} onClick={() => setSel(r)} className="border-t border-border hover:bg-accent cursor-pointer">
                  {COLS.map((c) => (
                    <td key={c.key} className={`px-3 py-1.5 whitespace-nowrap max-w-[260px] truncate ${c.align === "right" ? "text-right tabular-nums" : ""}`}>
                      {c.key === "tp_status" ? (
                        <Badge variant={r.tp_status === "A" ? "default" : "destructive"}>{r.tp_status === "A" ? "Ativo" : "Cancelado"}</Badge>
                      ) : c.key === "nm_cidade_plano" ? cidadeUf(r) : c.fmt ? c.fmt(r[c.key]) : String(r[c.key] ?? "—").trim()}
                    </td>
                  ))}
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={COLS.length} className="text-center text-muted-foreground py-10">Nenhum beneficiário encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="shrink-0 border-t border-border px-4 py-2 flex items-center justify-between text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {total != null ? `${total.toLocaleString("pt-BR")} registros` : "—"}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="tabular-nums">Página {page + 1} de {pages.toLocaleString("pt-BR")}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-auto">
          {sel && (
            <>
              <SheetHeader><SheetTitle>{sel.nm_beneficiario}</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                {[
                  ["Cadastro", [["Matrícula", fmtMat(sel.cd_mat_alternativa)], ["Contrato", sel.cd_contrato], ["Status", sel.tp_status === "A" ? "Ativo" : "Cancelado"], ["Nascimento", fmtDate(sel.dt_nascimento)], ["Idade", sel.qt_idade], ["Faixa", sel.ds_faixa_etaria], ["Sexo", sel.tp_sexo]]],
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
