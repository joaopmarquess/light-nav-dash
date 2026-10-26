import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { hostinger } from "@/lib/hostingerClient";

type Row = Record<string, any>;
const LIMITE = 30000;
const hoje = () => new Date().toISOString().slice(0, 10);
const fmtD = (v: any) => (v ? String(v).slice(0, 10).split("-").reverse().join("/") : "—");
const num = (n: number) => n.toLocaleString("pt-BR");
const brl = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const percentualEntradasFaixa = (entradas: number, total: number) => total > 0 ? entradas / total * 100 : 0;
export const ticketMedioEntradas = (tmm: number, entradas: number) => entradas > 0 ? tmm / entradas : 0;
// Faixas etárias ANS
const FAIXAS: [number, number, string][] = [
  [0, 18, "00 a 18"], [19, 23, "19 a 23"], [24, 28, "24 a 28"], [29, 33, "29 a 33"], [34, 38, "34 a 38"],
  [39, 43, "39 a 43"], [44, 48, "44 a 48"], [49, 53, "49 a 53"], [54, 58, "54 a 58"], [59, 999, "59 ou mais"],
];
const idade = (nasc: any, ref: any) => {
  if (!nasc || !ref) return null;
  const n = new Date(String(nasc).slice(0, 10)), r = new Date(String(ref).slice(0, 10));
  let a = r.getFullYear() - n.getFullYear();
  if (r.getMonth() < n.getMonth() || (r.getMonth() === n.getMonth() && r.getDate() < n.getDate())) a--;
  return a;
};

export default function CarteiraTrialLancers() {
  const [de, setDe] = useState(`${new Date().getFullYear()}-01-01`);
  const [ate, setAte] = useState(hoje());
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consultar = async () => {
    setLoading(true); setError(null); setRows(null);
    const all: Row[] = [];
    for (let from = 0; from < LIMITE; from += 1000) {
      const { data, error } = await hostinger.from("view_ecarteira")
        .select("cd_mat_alternativa,nm_empresa_estipulante,dt_nascimento,vl_tmm,dt_vigencia_beneficiario")
        .eq("tp_plano", "SAUDE").eq("tp_acomodacao", "PRATA").lte("cd_mat_alternativa", 399999999999)
        .ilike("nm_empresa_estipulante", "%lancers%")
        .gte("dt_vigencia_beneficiario", de).lte("dt_vigencia_beneficiario", `${ate}T23:59:59`)
        .order("cd_mat_alternativa").order("dt_vigencia_beneficiario").range(from, from + 999);
      if (error) { setError(error.message); setLoading(false); return; }
      all.push(...(data ?? []));
      if ((data ?? []).length < 1000) break;
    }
    const m = new Map<string, Row>();
    for (const r of all) m.set(`${r.cd_mat_alternativa}|${String(r.dt_vigencia_beneficiario).slice(0, 10)}`, r);
    setRows([...m.values()]);
    setLoading(false);
  };
  useEffect(() => { consultar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const grid = useMemo(() => {
    const g = FAIXAS.map(([, , l]) => ({ faixa: l, qtd: 0, tmm: 0 }));
    const sem = { faixa: "Sem nascimento", qtd: 0, tmm: 0 };
    for (const r of rows ?? []) {
      const a = idade(r.dt_nascimento, r.dt_vigencia_beneficiario);
      const i = a == null ? -1 : FAIXAS.findIndex(([mn, mx]) => a >= mn && a <= mx);
      const t = i < 0 ? sem : g[i];
      t.qtd++; t.tmm += Number(r.vl_tmm) || 0;
    }
    return sem.qtd ? [...g, sem] : g;
  }, [rows]);
  const tot = grid.reduce((s, x) => ({ qtd: s.qtd + x.qtd, tmm: s.tmm + x.tmm }), { qtd: 0, tmm: 0 });
  const inp = "h-9 rounded-md border border-border bg-background text-sm px-2";

  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-6">
      <div className="flex flex-wrap items-end gap-2 mb-4">
        <div><label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1">De</label>
          <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className={inp} /></div>
        <div><label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Até</label>
          <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className={inp} /></div>
        <button onClick={consultar} disabled={loading} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
        </button>
        <span className="text-xs text-muted-foreground ml-2">Estipulantes contendo "LANCERS" · Enfermaria (Prata) · {fmtD(de)} a {fmtD(ate)}</span>
      </div>
      {error && <div className="mb-3 text-sm text-destructive">Erro: {error}</div>}
      {loading && !rows && <div className="text-sm text-muted-foreground flex items-center"><Loader2 className="h-4 w-4 animate-spin mr-2" />Carregando…</div>}
      {rows && (
        <table className="w-full max-w-2xl text-sm [&_td]:border [&_td]:border-border [&_th]:border [&_th]:border-border">
          <thead className="bg-muted/60 text-muted-foreground"><tr>
            <th className="p-2 text-left">Faixa etária</th><th className="p-2 text-right">Entradas</th><th className="p-2 text-right">%CART</th><th className="p-2 text-right">Soma TMM (R$)</th><th className="p-2 text-right">Ticket médio</th></tr></thead>
          <tbody>{grid.map((g) => (
            <tr key={g.faixa}><td className="p-2">{g.faixa}</td><td className="p-2 text-right tabular-nums">{num(g.qtd)}</td><td className="p-2 text-right tabular-nums">{brl(percentualEntradasFaixa(g.qtd, tot.qtd))}%</td><td className="p-2 text-right tabular-nums">{brl(g.tmm)}</td><td className="p-2 text-right tabular-nums">{brl(ticketMedioEntradas(g.tmm, g.qtd))}</td></tr>))}</tbody>
          <tfoot className="font-semibold bg-muted/30"><tr>
            <td className="p-2">Total</td><td className="p-2 text-right tabular-nums">{num(tot.qtd)}</td><td className="p-2 text-right tabular-nums">{brl(percentualEntradasFaixa(tot.qtd, tot.qtd))}%</td><td className="p-2 text-right tabular-nums">{brl(tot.tmm)}</td><td className="p-2 text-right tabular-nums">{brl(ticketMedioEntradas(tot.tmm, tot.qtd))}</td></tr></tfoot>
        </table>
      )}
    </section>
  );
}
