import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Grid } from "@/components/SinistralidadeEmpresas";
import { carregarSb } from "@/lib/sinistralidadeEmpresasSb";
import { projecaoAnual, gridPlano } from "@/lib/propostaApb";
import { gridFaixas, type LinhaEmp } from "@/lib/sinistralidadeEmpresas";

const PLANOS = ["2290", "2490", "2890"];
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const rel = (a: number, b: number) => (b ? ` (${((a / b) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)` : "");
const pct = (v: number | null) => (v == null ? "—" : `${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);

/** Container direito da Proposta APB: sinistralidade da mesma fonte de Sinistralidade › Empresas Menu. */
type Grids = Record<string, ReturnType<typeof gridPlano>>;
const deProjecao = (g: Grids): LinhaEmp[] => PLANOS.flatMap((p) => g[p].faixas.map((f) => ({ plano: p, faixa: f.faixa, vidas: f.total, ...projecaoAnual(f.mensalidade) })));

export default function PropostaApbSinistralidade({ proj }: { proj?: Grids }) {
  const [base, setLinhas] = useState<LinhaEmp[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  useEffect(() => {
    carregarSb(0, 0, "", PLANOS, "menu_sb_sinistralidade.csv").then(setLinhas).catch((e) => setErro(String(e)));
  }, []);

  if (erro) return <section className="rounded-lg border border-border bg-card p-4 text-sm text-destructive">{erro}</section>;
  let linhas = base;
  if (!linhas && !proj) return <section className="flex items-center gap-2 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando sinistralidade…</section>;

  if (proj) linhas = deProjecao(proj);
  if (!linhas) return null;
  const total = gridFaixas(linhas).total;
  const cards = [
    { t: "Vidas", v: total.vidas.toLocaleString("pt-BR") },
    { t: "Receita CPP", v: brl(total.recCpp) },
    { t: "Receita Copart", v: brl(total.recCopart) + rel(total.recCopart, total.recCpp) },
    { t: "Receita total", v: brl(total.recTotal) },
    { t: "Despesas", v: brl(total.despTotal) },
    { t: "Saldo", v: brl(total.saldo), neg: total.saldo < 0 },
    { t: "Sinistralidade", v: pct(total.sin) },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h3 className="text-base font-semibold text-foreground">{proj ? "Projeção anual — tabela proposta" : "Sinistralidade 09/2025 a 08/2026"}</h3>
        <p className="mb-3 text-xs text-muted-foreground">{proj ? "Vidas atuais × preço proposto × 12 · copart 16% da CPP · sinistralidade 75%" : "Fonte: MENU_SB_SINISTRALIDA.XLS (mesma de Sinistralidade › Empresas Menu)"}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cards.map((c) => (
            <div key={c.t} className="rounded-md border border-border p-3">
              <p className="text-xs text-muted-foreground">{c.t}</p>
              <p className={`text-lg font-semibold ${c.neg ? "text-destructive" : "text-foreground"}`}>{c.v}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-sm">
          <thead className="text-muted-foreground"><tr><th className="px-2 py-1 text-left">Plano</th><th className="px-2 py-1 text-center">Vidas</th><th className="px-2 py-1 text-right">Rec. CPP</th><th className="px-2 py-1 text-right">Rec. Copart</th><th className="px-2 py-1 text-right">Rec. Total</th><th className="px-2 py-1 text-right">Despesas</th><th className="px-2 py-1 text-right">Saldo</th><th className="px-2 py-1 text-center">Sinistr.</th></tr></thead>
          <tbody>
            {PLANOS.map((p) => {
              const t = gridFaixas(linhas.filter((l) => l.plano === p)).total;
              return (
                <tr key={p} className="border-t border-border">
                  <td className="px-2 py-1 font-medium">{p}</td>
                  <td className="px-2 py-1 text-center">{t.vidas.toLocaleString("pt-BR")}</td>
                  <td className="px-2 py-1 text-right">{brl(t.recCpp)}</td>
                  <td className="px-2 py-1 text-right">{brl(t.recCopart)}<span className="text-muted-foreground">{rel(t.recCopart, t.recCpp)}</span></td>
                  <td className="px-2 py-1 text-right">{brl(t.recTotal)}</td>
                  <td className="px-2 py-1 text-right">{brl(t.despTotal)}</td>
                  <td className={`px-2 py-1 text-right ${t.saldo < 0 ? "text-destructive" : ""}`}>{brl(t.saldo)}</td>
                  <td className="px-2 py-1 text-center">{pct(t.sin)}</td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </section>
      {PLANOS.map((p) => (
        <div key={p}>
          <button type="button" onClick={() => setAberto(aberto === p ? null : p)} className="mb-2 flex w-full items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-left text-sm font-semibold shadow-sm hover:bg-accent">
            {aberto === p ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}Sinistralidade por faixa · Plano {p}
          </button>
          {aberto === p && <Grid titulo={`Plano ${p}`} linhas={linhas.filter((l) => l.plano === p)} />}
        </div>
      ))}
    </div>
  );
}
