import { useEffect, useMemo, useState } from "react";
import { hostinger } from "@/lib/hostingerClient";
import { normalizarVendedor } from "@/lib/vendedorTransferencia";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Loader2, Search, X, Users, UserCheck, UserX, Building2, Copy, Printer } from "lucide-react";
import { toast } from "sonner";

type Row = Record<string, any>;
const TABLE = "view_ecarteira";

const valorDetalhe = (v: any) => (v == null || v === "" ? "—" : String(v).trim());
function secoesDetalhe(sel: Row): [string, [string, any][]][] {
  return [
                  ["Cadastro", [["Beneficiário", sel.nm_beneficiario], ["Matrícula", fmtMat(sel.cd_mat_alternativa)], ["Contrato", sel.cd_contrato], ["Relacionamento", relacionamento(sel)], ["Titular", sel._titular ?? "Buscando…"], ["Status", ST[sel.st]?.[0] ?? sel.st], ["Nascimento", fmtDate(sel.dt_nascimento)], ["Idade", sel.qt_idade], ["Faixa", sel.ds_faixa_etaria], ["Sexo", sel.tp_sexo]]],
                  ["Plano", [["Plano", sel.ds_plano], ["Acomodação", sel.tp_acomodacao], ["Contratação", sel.tp_contratacao], ["Recuperação", sel.tp_recuperacao], ["PME", sel.sn_pme], ["Mensalidade", brl(sel.vl_tmm)], ["Últ. reajuste", fmtDate(sel.dt_ult_reajuste)]]],
                  ["Empresa / Local", [["Estipulante", sel.nm_empresa_estipulante], ["Resp. financeiro", sel.nm_resp_financeiro], ["Cidade", `${sel.nm_cidade_plano ?? "—"} / ${sel.cd_uf_plano ?? ""}`], ["Regional", sel.nm_regional_plano], ["Vendedor", sel.nm_vendedor]]],
                  ["Datas", [["Cadastro", fmtDate(sel.dt_cadastro)], ["Vigência contrato", fmtDate(sel.dt_vigencia_contrato)], ["Vigência beneficiário", fmtDate(sel.dt_vigencia_beneficiario)], ["Cancelamento", fmtDate(sel.dt_desligamento)], ["Reativação", fmtDate(sel.dt_reativacao)], ["Motivo cancel.", sel.ds_motivo_cancelamento]]],
  ] as any;
}
const tituloDetalhe = (_sel: Row) => "FICHA CADASTRAL";
const matTitular = (m: any) => Math.floor(Number(m) / 100) * 100;
const relacionamento = (sel: Row) => sel._relac === undefined ? "Buscando…" : sel._relac ? sel._relac.charAt(0) + sel._relac.slice(1).toLowerCase() : (Number(sel.cd_mat_alternativa) % 100 === 0 ? "Titular" : "Dependente");
function textoDetalhe(sel: Row) {
  return [tituloDetalhe(sel), ...secoesDetalhe(sel).map(([t, it]) => `\n${t.toUpperCase()}\n` + it.map(([l, v]) => `${l}: ${valorDetalhe(v)}`).join("\n"))].join("\n");
}
async function copiarDetalhe(sel: Row) {
  try { await navigator.clipboard.writeText(textoDetalhe(sel)); toast.success("Dados copiados"); }
  catch { toast.error("Não foi possível copiar"); }
}
function imprimirDetalhe(sel: Row) {
  const esc = (x: string) => x.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
  const corpo = secoesDetalhe(sel).map(([t, it]) => `<h2>${esc(t)}</h2><table>${it.map(([l, v]) => `<tr><th>${esc(l)}</th><td>${esc(valorDetalhe(v))}</td></tr>`).join("")}</table>`).join("");
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) { toast.error("Libere pop-ups para imprimir"); return; }
  w.document.write(`<html><head><title>${esc(String(sel.nm_beneficiario ?? "Beneficiário"))}</title><style>@page{size:A4 portrait;margin:12mm}html,body{height:auto}body{font-family:Arial,sans-serif;font-size:11px;margin:0;line-height:1.25}h1{font-size:16px;margin:0 0 6px}h2{font-size:11px;text-transform:uppercase;margin:10px 0 4px;border-bottom:1px solid #999;break-after:avoid}table{page-break-inside:avoid}table{border-collapse:collapse;width:100%}th{text-align:left;width:160px;color:#555;font-weight:normal;padding:2px 0}td{padding:2px 0}</style></head><body><h1>${esc(tituloDetalhe(sel))}</h1>${corpo}</body></html>`);
  w.document.close(); w.focus(); w.print();
}
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
  if (!vig) return "C";
  if (can && can <= hoje && !(rea && rea <= hoje && rea > can)) return "C";
  return "A";
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

function applyFilters(q: any, f: Filters, data?: string) {
  if (f.status === "F" && data) q = q.gt("dt_vigencia_beneficiario", data);
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
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ key: string; asc: boolean }>({ key: "nm_beneficiario", asc: true });
  const [raw, setRaw] = useState<Row[]>([]);
  const [dataRef, setDataRef] = useState(() => new Date().toISOString().slice(0, 10));
  const [ap, setAp] = useState<{ f: Filters; d: string } | null>(() => ({ f: { ...EMPTY }, d: new Date().toISOString().slice(0, 10) }));
  const df = ap?.f ?? EMPTY;
  const dRef = ap?.d ?? "";
  const buscar = () => (setGrid(true), setAp({ f: { ...f }, d: dataRef || new Date().toISOString().slice(0, 10) }));
  const rows = useMemo(() => agrupar(raw, dRef || new Date().toISOString().slice(0, 10)), [raw, dRef]);
  const [fim, setFim] = useState(false);
  const [grid, setGrid] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [kpi, setKpi] = useState<{ ativos?: number; futuros?: number; cancelados?: number; total?: number; contratos?: number } | null>(null);
  useEffect(() => {
    if (!ap) return;
    setKpi(null);
    hostinger.rpc("carteira_trial_kpis", { p_data: dRef, p_q: df.q.trim() || null, p_empresa: df.empresa.trim() || null, p_cidade: df.cidade.trim() || null }).then(({ data, error }: any) => {
      if (error) { console.error(error); return; }
      const r = Array.isArray(data) ? data[0] : data;
      if (r) setKpi((k) => ({ ...k, ativos: Number(r.ativos), futuros: Number(r.futuros), cancelados: Number(r.cancelados), total: Number(r.total) }));
    });
    hostinger.rpc("carteira_trial_contratos", { p_data: dRef, p_q: df.q.trim() || null, p_empresa: df.empresa.trim() || null, p_cidade: df.cidade.trim() || null }).then(({ data, error }: any) => {
      if (error) { console.error(error); setKpi((k) => ({ ...k, contratos: -1 })); return; }
      setKpi((k) => ({ ...k, contratos: Number(data) }));
    });
  }, [ap]);
  const vis = useMemo(() => {
    const v = df.status === ALL ? rows : rows.filter((r) => r.st === df.status);
    return sort.key === "st" ? [...v].sort((a, b) => (sort.asc ? 1 : -1) * String(a.st).localeCompare(String(b.st))) : v;
  }, [rows, df.status, sort]);
  useEffect(() => { if (!loading && !fim && df.status !== ALL && vis.length < 50 && raw.length > 0) setPage((p) => p + 1); }, [loading, fim, vis.length, df.status, raw.length]);
  const cnt = (k: string) => rows.filter((r) => r.st === k).length;
  const [sel, setSel] = useState<Row | null>(null);
  useEffect(() => {
    if (!sel || sel._titular !== undefined) return;
    const m = sel.cd_mat_alternativa;
    if (Number(m) % 100 === 0) { setSel({ ...sel, _titular: sel.nm_beneficiario ?? "—" }); return; }
    hostinger.from(TABLE).select("nm_beneficiario").eq("cd_mat_alternativa", matTitular(m)).limit(1)
      .then(({ data }) => setSel((cur) => (cur && cur.cd_mat_alternativa === m ? { ...cur, _titular: data?.[0]?.nm_beneficiario ?? "—" } : cur)));
  }, [sel]);

  useEffect(() => {
    if (!sel || sel._relac !== undefined) return;
    const m = sel.cd_mat_alternativa;
    const k = String(m);
    hostinger.from("beneficiarios").select("tp_relacionamento").in("cd_mat_alternativa", [k, k.padStart(12, "0")]).limit(1)
      .then(({ data }) => setSel((cur) => (cur && cur.cd_mat_alternativa === m ? { ...cur, _relac: data?.[0]?.tp_relacionamento ?? null } : cur)));
  }, [sel]);

  const dfKey = JSON.stringify({ ...df, status: df.status === "F" ? "F" : "", d: dRef, n: ap ? 1 : 0 });
  useEffect(() => { setPage(0); }, [dfKey, sort.key, sort.asc]);

  useEffect(() => {
    let cancel = false;
    if (!ap || !grid) return;
    (async () => {
      setLoading(true);
      let q = applyFilters(hostinger.from(TABLE).select("*"), df, dRef);
      if (sort.key && sort.key !== "st") q = q.order(sort.key, { ascending: sort.asc, nullsFirst: false });
      const { data, error } = await q.range(page * PAGE, page * PAGE + PAGE - 1);
      if (cancel) return;
      if (error) console.error(error);
      const norm = (data ?? []).map(normalizarVendedor);
      setRaw((old) => (page === 0 ? norm : [...old, ...norm]));
      setFim((data?.length ?? 0) < PAGE);
      setLoading(false);
      const { count } = await applyFilters(hostinger.from(TABLE).select("cd_matricula", { count: "exact", head: true }), df);
      if (!cancel) setTotal(count ?? null);
    })();
    return () => { cancel = true; };
  }, [dfKey, page, sort.key === "st" ? "" : sort.key, sort.asc, grid]);

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
        <span className="text-sm text-muted-foreground">Total de Ativos: <b className="text-foreground tabular-nums">{!ap ? "—" : kpi?.ativos == null ? "…" : kpi.ativos.toLocaleString("pt-BR")}</b></span>
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
        <Button size="sm" onClick={buscar}><Search className="h-4 w-4 mr-1" />Buscar</Button>
        <div className="ml-auto flex gap-2">
          {activeChips.length > 0 && <Button variant="ghost" size="sm" onClick={() => { const e = { ...EMPTY, status: ALL }; setF(e); setAp({ f: e, d: dataRef || new Date().toISOString().slice(0, 10) }); }}><X className="h-4 w-4 mr-1" />Limpar</Button>}
          <Button variant="outline" size="sm" onClick={() => setGrid((g) => !g)}>{grid ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}{grid ? "Ocultar lista" : "Mostrar lista"}</Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4 mr-1" />Exportar</Button>
        </div>
      </div>

      {!grid && (
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4 content-start">
          {([
            ["A", UserCheck, "Vidas Ativas", kpi?.ativos],
            ["F", Users, "Vidas a iniciar", kpi?.futuros],
            ["T", Building2, "Contratos Ativos", kpi?.contratos],
          ] as const).map(([st, I, label, v]) => (
            <button key={st} onClick={() => { if (st === "T") return; const e = { ...f, status: st }; setF(e); setAp({ f: e, d: dataRef || new Date().toISOString().slice(0, 10) }); setGrid(true); }}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-8 hover:bg-accent transition-colors">
              <I className="h-8 w-8 text-primary" />
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-4xl font-semibold tabular-nums text-foreground">{!ap || v === -1 ? "—" : v == null ? "…" : v.toLocaleString("pt-BR")}</p>
            </button>
          ))}
        </div>
      )}
      <div className={`flex-1 min-h-0 bg-card border border-border rounded-xl overflow-hidden flex-col ${grid ? "flex" : "hidden"}`}>
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
              {!ap && (
                <tr><td colSpan={COLS.length} className="text-center text-muted-foreground py-10">Preencha os filtros e clique em Buscar.</td></tr>
              )}
              {ap && !loading && fim && vis.length === 0 && (
                <tr><td colSpan={COLS.length} className="text-center text-muted-foreground py-10">Nenhum beneficiário encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="shrink-0 border-t border-border px-4 py-2 flex items-center justify-between text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {(() => {
              const n = !ap ? 0 : df.status === "A" ? kpi?.ativos : df.status === "F" ? kpi?.futuros : df.status === "C" ? kpi?.cancelados : kpi?.total;
              return n == null ? "…" : n.toLocaleString("pt-BR");
            })()} registros selecionados
          </span>
        </div>
      </div>


      <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-auto">
          {sel && (
            <>
              <SheetHeader><SheetTitle className="pr-8 tracking-wide">{tituloDetalhe(sel)}</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                {secoesDetalhe(sel).map(([t, items]: any) => (
                  <div key={t}>
                    <p className="text-xs font-semibold uppercase text-primary mb-2">{t}</p>
                    <dl className="grid grid-cols-[140px_1fr] gap-y-1">
                      {items.map(([l, v]: any) => (<div key={l} className="contents"><dt className="text-muted-foreground">{l}</dt><dd className="text-foreground">{v == null || v === "" ? "—" : String(v).trim()}</dd></div>))}
                    </dl>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-border flex gap-2">
                <Button size="sm" variant="outline" onClick={() => copiarDetalhe(sel)}><Copy className="h-4 w-4 mr-1" />Copiar</Button>
                <Button size="sm" variant="outline" onClick={() => imprimirDetalhe(sel)}><Printer className="h-4 w-4 mr-1" />Imprimir</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
