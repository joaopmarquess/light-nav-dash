import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { hostinger } from "@/lib/hostingerClient";
import { useGruposVendedor } from "@/lib/vendedorGrupo";

type Row = Record<string, any>;
type Modo = "entradas" | "saidas";
const LIMITE = 30000;
const hoje = () => new Date().toISOString().slice(0, 10);
const fmtD = (v: any) => (v ? String(v).slice(0, 10).split("-").reverse().join("/") : "—");
const num = (n: number) => n.toLocaleString("pt-BR");
const fmtMat = (v: any) => {
  const d = String(v ?? "").replace(/\D/g, "");
  if (d.length <= 8) return d || "—";
  const r = d.slice(-8);
  return `${Number(d.slice(0, -8))}/${r.slice(0, 6)}-${r.slice(6)}`;
};
const cidade = (r: Row) => (r.nm_cidade_plano ? `${r.nm_cidade_plano}${r.cd_uf_plano ? ` (${r.cd_uf_plano})` : ""}` : "");

export default function CarteiraTrialES({ modo }: { modo: Modo }) {
  const campo = modo === "entradas" ? "dt_vigencia_beneficiario" : "dt_desligamento";
  const [de, setDe] = useState(`${new Date().getFullYear()}-01-01`);
  const [ate, setAte] = useState(hoje());
  const [groupBy, setGroupBy] = useState(modo === "saidas" ? "motivo" : "grupo");
  const [filtro, setFiltro] = useState("");
  const [chave, setChave] = useState<"venda" | "outros">("venda");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cortado, setCortado] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const grupos = useGruposVendedor();
  const consultar = async () => {
    setLoading(true); setError(null); setRows(null); setExpanded({}); setCortado(false);
    const all: Row[] = [];
    for (let from = 0; from < LIMITE; from += 1000) {
      const { data, error } = await hostinger.from("view_ecarteira")
        .select(`cd_mat_alternativa,cd_vendedor,nm_beneficiario,ds_plano,nm_vendedor,nm_empresa_estipulante,nm_cidade_plano,cd_uf_plano,ds_motivo_cancelamento,${campo}`)
        .eq("tp_plano", "SAUDE").lte("cd_mat_alternativa", 399999999999)
        .gte(campo, de).lte(campo, `${ate}T23:59:59`)
        .range(from, from + 999);
      if (error) { setError(error.message); setLoading(false); return; }
      all.push(...(data ?? []));
      if ((data ?? []).length < 1000) break;
      if (from + 1000 >= LIMITE) setCortado(true);
    }
    // uma linha por matrícula
    const m = new Map<string, Row>();
    for (const r of all) m.set(`${r.cd_mat_alternativa}|${String(r[campo]).slice(0, 10)}`, r);
    setRows([...m.values()]);
    setLoading(false);
  };

  useEffect(() => { consultar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const filtered = useMemo(() => {
    if (!rows) return null;
    const f = filtro.trim().toLowerCase();
    const ehOutros = (r: Row) => ["NEV", "OUTROS"].includes(String(grupos[r.cd_vendedor] ?? "").toUpperCase());
    const base = rows.filter((r) => (chave === "outros") === ehOutros(r));
    if (!f) return base;
    return base.filter((r) => [r.nm_beneficiario, r.ds_plano, r.nm_vendedor, r.nm_empresa_estipulante, r.cd_mat_alternativa]
      .some((v) => String(v ?? "").toLowerCase().includes(f)));
  }, [rows, filtro, chave, grupos]);

  const grouped = useMemo(() => {
    if (!filtered) return [];
    const key = (r: Row) => String(
      groupBy === "grupo" ? grupos[r.cd_vendedor] || "SEM GRUPO"
      : groupBy === "plano" ? r.ds_plano || "SEM PLANO"
      : groupBy === "empresa" ? r.nm_empresa_estipulante || "SEM EMPRESA"
      : groupBy === "cidade" ? cidade(r) || "SEM CIDADE"
      : r.ds_motivo_cancelamento || "SEM MOTIVO").trim();
    const map = new Map<string, Row[]>();
    for (const r of filtered) { const k = key(r); if (!map.has(k)) map.set(k, []); map.get(k)!.push(r); }
    return [...map.entries()].map(([key, itens]) => ({ key, itens, qtd: new Set(itens.map((i) => i.cd_mat_alternativa)).size }))
      .sort((a, b) => b.qtd - a.qtd);
  }, [filtered, groupBy, grupos]);

  const subVend = (its: Row[]) => { const m = new Map<string, Row[]>(); for (const r of its) { const k = String(r.nm_vendedor || "SEM VENDEDOR").trim(); if (!m.has(k)) m.set(k, []); m.get(k)!.push(r); }
    return [...m.entries()].map(([key, itens]) => ({ key, itens, qtd: new Set(itens.map((i) => i.cd_mat_alternativa)).size })).sort((a, b) => b.qtd - a.qtd); };
  const tabela = (its: Row[]) => (
                        <div className="max-h-80 overflow-auto border-t border-border/60">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/40 sticky top-0"><tr>
                              <th className="px-3 py-1.5 text-left">Matrícula</th><th className="px-3 py-1.5 text-left">Beneficiário</th>
                              <th className="px-3 py-1.5 text-left">Plano</th><th className="px-3 py-1.5 text-left">Vendedor</th>
                              {modo === "saidas" && <th className="px-3 py-1.5 text-left">Motivo</th>}
                              <th className="px-3 py-1.5 text-left">Data</th></tr></thead>
                            <tbody>{its.map((r, i) => (
                              <tr key={i} className="border-t border-border/60">
                                <td className="px-3 py-1 whitespace-nowrap tabular-nums">{fmtMat(r.cd_mat_alternativa)}</td>
                                <td className="px-3 py-1">{r.nm_beneficiario ?? "—"}</td>
                                <td className="px-3 py-1">{r.ds_plano ?? "—"}</td>
                                <td className="px-3 py-1">{r.nm_vendedor ?? "—"}</td>
                                {modo === "saidas" && <td className="px-3 py-1">{r.ds_motivo_cancelamento ?? "—"}</td>}
                                <td className="px-3 py-1 tabular-nums">{fmtD(r[campo])}</td>
                              </tr>))}</tbody>
                          </table>
                        </div>
  );
  const total = filtered ? new Set(filtered.map((r) => r.cd_mat_alternativa)).size : 0;
  const max = grouped[0]?.qtd ?? 0;
  const inp = "h-9 rounded-md border border-border bg-background text-sm px-2";

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-6 h-[calc(100vh-9rem)] flex flex-col">
      <div className="flex flex-wrap items-end gap-2 mb-4">
        <div><label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1">De</label>
          <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className={inp} /></div>
        <div><label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Até</label>
          <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className={inp} /></div>
        <div><label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Agrupar por</label>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className={inp}>
            {modo === "saidas" && <option value="motivo">Motivo</option>}
            <option value="grupo">Grupo de vendedor</option>
            <option value="plano">Plano</option>
            <option value="empresa">Empresa</option>
            <option value="cidade">Cidade</option>
          </select></div>
        <div><label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Chave</label>
          <div className="flex h-9 rounded-md border border-border overflow-hidden">
            {(["venda", "outros"] as const).map((c) => (
              <button key={c} onClick={() => setChave(c)} className={`px-3 text-sm ${chave === c ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent/40"}`}>{c === "venda" ? "Venda" : "Outros"}</button>))}
          </div></div>
        <div className="flex-1 min-w-[200px]"><label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Filtrar</label>
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar por nome, vendedor, plano…" className={`${inp} w-full px-3`} /></div>
        <button onClick={consultar} disabled={loading} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
        </button>
      </div>

      {error && <div className="mb-3 text-sm text-destructive">Erro: {error}</div>}
      {loading && !rows && <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" />Carregando…</div>}

      {rows && (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <span>Período: <span className="text-foreground font-medium">{fmtD(de)}</span> a <span className="text-foreground font-medium">{fmtD(ate)}</span>
              {cortado && <span className="text-destructive ml-2">(limitado a {num(LIMITE)} registros)</span>}</span>
            <span><span className="font-semibold text-foreground tabular-nums">{num(total)}</span> {modo === "entradas" ? "entrada(s)" : "saída(s)"} · <span className="font-semibold text-foreground tabular-nums">{num(grouped.length)}</span> grupo(s)</span>
          </div>
          <div className="flex-1 overflow-auto border border-border rounded-lg p-4">
            {grouped.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Nenhuma {modo === "entradas" ? "entrada" : "saída"} no período.</div>
            ) : (
              <div className="space-y-2">
                {grouped.map((g) => {
                  const pct = max ? (g.qtd / max) * 100 : 0;
                  const share = total ? (g.qtd / total) * 100 : 0;
                  const open = !!expanded[g.key];
                  return (
                    <div key={g.key} className="border border-border/60 rounded-md">
                      <button onClick={() => setExpanded((p) => ({ ...p, [g.key]: !p[g.key] }))} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent/40 rounded-md">
                        <div className="w-64 shrink-0 text-xs font-medium text-foreground truncate text-left" title={g.key}>{g.key}</div>
                        <div className="flex-1 h-5 bg-muted/40 rounded overflow-hidden">
                          <div className={`h-full ${modo === "saidas" ? "bg-destructive/80" : "bg-primary/80"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="w-32 shrink-0 text-right text-xs tabular-nums text-foreground">{num(g.qtd)} <span className="text-muted-foreground">({share.toFixed(1)}%)</span></div>
                      </button>
                      {open && (
                        groupBy === "grupo" ? (
                          <div className="border-t border-border/60 p-2 space-y-1">
                            {subVend(g.itens).map((v) => { const id = `${g.key}||${v.key}`; const o = !!expanded[id]; return (
                              <div key={id} className="border border-border/40 rounded">
                                <button onClick={() => setExpanded((p) => ({ ...p, [id]: !p[id] }))} className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-accent/40 rounded">
                                  <div className="w-60 shrink-0 text-xs text-foreground truncate text-left pl-2" title={v.key}>{v.key}</div>
                                  <div className="flex-1 h-3 bg-muted/40 rounded overflow-hidden"><div className={`h-full ${modo === "saidas" ? "bg-destructive/60" : "bg-primary/60"}`} style={{ width: `${g.qtd ? (v.qtd / g.qtd) * 100 : 0}%` }} /></div>
                                  <div className="w-32 shrink-0 text-right text-xs tabular-nums">{num(v.qtd)}</div>
                                </button>
                                {o && tabela(v.itens)}
                              </div>); })}
                          </div>
                        ) : tabela(g.itens)
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
