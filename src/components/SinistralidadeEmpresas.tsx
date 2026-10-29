import { useState } from "react";
import { Building2, Loader2, Search } from "lucide-react";
import { hostinger } from "@/lib/hostingerClient";
import { Button } from "@/components/ui/button";
import { competencia, gridFaixas, normFaixa, parsePlanos, type FaixaEmp, type LinhaEmp } from "@/lib/sinistralidadeEmpresas";

const brl = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (v: number | null) => (v == null ? "—" : `${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);
const inp = "h-9 rounded-md border border-input bg-background px-2 text-sm";
const COLS = ["Faixa", "Vidas", "Rec. CPP", "Rec. CPA", "Rec. Total", "Vr. Despesas", "Saldo", "Sinistralidade"];

function Grid({ titulo, linhas }: { titulo: string; linhas: LinhaEmp[] }) {
  const { faixas, total } = gridFaixas(linhas);
  const Row = ({ f, bold }: { f: FaixaEmp; bold?: boolean }) => (
    <tr className={`border-t border-border ${bold ? "bg-muted font-semibold" : ""}`}>
      <td className="px-3 py-1.5 font-medium">{f.faixa}</td>
      <td className="px-3 py-1.5 text-center">{f.vidas.toLocaleString("pt-BR")}</td>
      {[f.recCpp, f.recCopart, f.recTotal, f.despTotal].map((v, i) => <td key={i} className="px-3 py-1.5 text-right">{brl(v)}</td>)}
      <td className={`px-3 py-1.5 text-right ${f.saldo > 0 ? "text-destructive" : ""}`}>{brl(f.saldo)}</td>
      <td className="px-3 py-1.5 text-center">{pct(f.sin)}</td>
    </tr>
  );
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-base font-semibold text-foreground">{titulo}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground"><tr>{COLS.map((c, i) => <th key={c} className={`px-3 py-1.5 ${i === 0 ? "text-left" : "text-center"}`}>{c}</th>)}</tr></thead>
          <tbody>{faixas.map((f) => <Row key={f.faixa} f={f} />)}<Row f={total} bold /></tbody>
        </table>
      </div>
    </section>
  );
}

export default function SinistralidadeEmpresas() {
  const ano = new Date().getFullYear();
  const [de, setDe] = useState(`${ano}-01`);
  const [ate, setAte] = useState(`${ano}-${String(new Date().getMonth() + 1).padStart(2, "0")}`);
  const [empresa, setEmpresa] = useState("");
  const [planos, setPlanos] = useState("");
  const [linhas, setLinhas] = useState<LinhaEmp[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const buscar = async () => {
    setLoading(true); setErro(null);
    const ps = parsePlanos(planos);
    const { data, error } = await hostinger.rpc("sinistralidade_mv_empresas", { p_de: competencia(de), p_ate: competencia(ate), p_empresa: empresa.trim() || null, p_planos: ps.length ? ps : null });
    setLoading(false);
    if (error) { setErro(/does not exist|Could not find/i.test(error.message) ? "Cálculo ainda não instalado na base." : error.message); setLinhas(null); return; }
    setLinhas((data ?? []).map((d: Record<string, unknown>) => ({ plano: String(d.plano ?? "—"), faixa: normFaixa(d.faixa as string), vidas: Number(d.vidas), recCpp: Number(d.rec_cpp), recCopart: Number(d.rec_copart), recTotal: Number(d.rec_total), despTotal: Number(d.desp_total) })));
  };

  const planosRes = linhas ? [...new Set(linhas.map((l) => l.plano))].sort() : [];

  return (
    <div className="h-full space-y-5 overflow-auto">
      <header>
        <h2 className="flex items-center gap-2 text-2xl font-semibold text-foreground"><Building2 className="h-6 w-6 text-primary" />Empresas</h2>
        <p className="text-sm text-muted-foreground">Sinistralidade por plano e faixa etária · Fonte: view_eard_mensal + view_ecarteira</p>
      </header>
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
        <label className="text-xs text-muted-foreground">De<br /><input type="month" value={de} onChange={(e) => setDe(e.target.value)} className={inp} /></label>
        <label className="text-xs text-muted-foreground">Até<br /><input type="month" value={ate} onChange={(e) => setAte(e.target.value)} className={inp} /></label>
        <label className="text-xs text-muted-foreground">Estipulante<br /><input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="parte do nome" className={`${inp} w-56`} /></label>
        <label className="text-xs text-muted-foreground">Planos (4 dígitos)<br /><input value={planos} onChange={(e) => setPlanos(e.target.value)} placeholder="ex.: 2290, 2490" className={`${inp} w-44`} /></label>
        <Button onClick={buscar} disabled={loading || !de || !ate} className="gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Buscar</Button>
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      {linhas && !linhas.length && <p className="text-sm text-muted-foreground">Nenhum resultado para os filtros.</p>}
      {linhas && linhas.length > 0 && (
        <>
          <Grid titulo="Total" linhas={linhas} />
          {planosRes.map((p) => <Grid key={p} titulo={`Plano ${p}`} linhas={linhas.filter((l) => l.plano === p)} />)}
          <p className="text-xs text-muted-foreground">Vidas = matrículas diferentes no período. Saldo = despesas − receita total. Sinistralidade = despesas ÷ receita total.</p>
        </>
      )}
    </div>
  );
}
