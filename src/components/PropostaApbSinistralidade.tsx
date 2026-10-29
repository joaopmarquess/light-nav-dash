import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Grid } from "@/components/SinistralidadeEmpresas";
import { carregarSb } from "@/lib/sinistralidadeEmpresasSb";
import { projecaoFaixas, gridPlano } from "@/lib/propostaApb";
import { gridFaixas, FAIXAS_EMP, type LinhaEmp } from "@/lib/sinistralidadeEmpresas";

const PLANOS = ["2290", "2490", "2890"];
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const rel = (a: number, b: number) => (b ? ` (${((a / b) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)` : "");
const pct = (v: number | null) => (v == null ? "—" : `${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);

/** Container direito da Proposta APB: sinistralidade da mesma fonte de Sinistralidade › Empresas Menu. */
type Grids = Record<string, ReturnType<typeof gridPlano>>;
const deProjecao = (g: Grids): LinhaEmp[] => {
  const fs = Object.keys(g).flatMap((p) => g[p].faixas.map((f) => ({ p, f })));
  const { faixas } = projecaoFaixas(fs.map(({ f }) => f.mensalidade));
  return fs.map(({ p, f }, i) => ({ plano: p, faixa: f.faixa, vidas: f.total, ...faixas[i] }));
};

/** Consolida linhas de mesma faixa (vinham uma por plano). */
export function porFaixa(ls: LinhaEmp[]): LinhaEmp[] {
  const m = new Map<string, LinhaEmp>();
  for (const l of ls) { const a = m.get(l.faixa); m.set(l.faixa, a ? { ...a, vidas: a.vidas + l.vidas, recCpp: a.recCpp + l.recCpp, recCopart: a.recCopart + l.recCopart, recTotal: a.recTotal + l.recTotal, despTotal: a.despTotal + l.despTotal } : { ...l }); }
  return [...m.values()];
}

/** Nível 2: rateia "Sem faixa" entre as 10 faixas na proporção das vidas de cada faixa (vidas, receitas e despesas). */
export function distribuirSemFaixa(ls: LinhaEmp[]): LinhaEmp[] {
  const sem = ls.filter((l) => !FAIXAS_EMP.includes(l.faixa)), com = ls.filter((l) => FAIXAS_EMP.includes(l.faixa));
  const totV = com.reduce((a, l) => a + l.vidas, 0);
  if (!sem.length || !totV) return ls;
  const s = (k: keyof LinhaEmp) => sem.reduce((a, l) => a + (l[k] as number), 0);
  const ks = ["vidas", "recCpp", "recCopart", "recTotal", "despTotal"] as const;
  const tot = Object.fromEntries(ks.map((k) => [k, s(k)]));
  return com.map((l) => { const w = l.vidas / totV; const r = { ...l }; ks.forEach((k) => { r[k] = l[k] + tot[k] * w; }); return r; });
}

export default function PropostaApbSinistralidade({ proj, grupo, fixo }: { proj?: Grids; grupo?: ReturnType<typeof gridPlano>; fixo?: boolean }) {
  const [base, setLinhas] = useState<LinhaEmp[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  useEffect(() => {
    carregarSb(0, 0, "", PLANOS, "menu_sb_sinistralidade.csv").then(setLinhas).catch((e) => setErro(String(e)));
  }, []);

  if (erro) return <section className="rounded-lg border border-border bg-card p-4 text-sm text-destructive">{erro}</section>;
  let linhas = base;
  const vidasArquivo = grupo && base ? base.reduce((a, l) => a + l.vidas, 0) : null; // Nível 2: cards de cima mostram as vidas do arquivo
  if (!linhas && !proj) return <section className="flex items-center gap-2 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando sinistralidade…</section>;

  if (proj) linhas = deProjecao(proj);
  else if (grupo && linhas) {
    const g = grupo;
    linhas = porFaixa(distribuirSemFaixa(linhas.map((l) => ({ ...l, plano: "GRUPO" })))).map((l) => ({ ...l, vidas: g.faixas.find((f) => f.faixa === l.faixa)?.total ?? 0 }));
  }
  if (!linhas) return null;
  const total = gridFaixas(linhas).total;
  const planos = proj ? Object.keys(proj) : grupo ? ["GRUPO"] : PLANOS;
  const cards = [
    { t: "Vidas", v: Math.round(vidasArquivo ?? total.vidas).toLocaleString("pt-BR") },
    { t: "Receita CPP", v: brl(total.recCpp) },
    { t: "Receita Copart", v: brl(total.recCopart) + rel(total.recCopart, total.recCpp) },
    { t: "Receita total", v: brl(total.recTotal) },
    { t: "Despesas", v: brl(total.despTotal) },
    { t: "Saldo", v: brl(total.saldo), neg: total.saldo < 0 },
    { t: "Sinistralidade", v: pct(total.sin) },
  ];

  return (
    <div className="flex h-full flex-col gap-2 [&_section]:p-3 [&_h3]:mb-1">
      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h3 className="text-base font-semibold text-foreground">{proj ? "Projeção anual — tabela proposta" : "Sinistralidade 09/2025 a 08/2026"}</h3>
        <p className="mb-2 text-xs text-muted-foreground">{proj ? "Vidas atuais × preço proposto × 12 · copart 20% da CPP · despesas de R$ 2.950.000,00 · despesas da faixa = receita total × sinistralidade" : "Fonte: MENU_SB_SINISTRALIDA.XLS (mesma de Sinistralidade › Empresas Menu)"}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cards.map((c) => (
            <div key={c.t} className="rounded-md border border-border px-2 py-1">
              <p className="truncate text-xs text-muted-foreground">{c.t}</p>
              <p className={`truncate text-base font-semibold ${c.neg ? "text-destructive" : "text-foreground"}`}>{c.v}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 overflow-x-auto"><table className="w-full text-xs">
          <thead className="text-muted-foreground"><tr><th className="px-2 py-1 text-left">Plano</th><th className="px-2 py-1 text-center">Vidas</th><th className="px-2 py-1 text-right">Rec. CPP</th><th className="px-2 py-1 text-right">Rec. Copart</th><th className="px-2 py-1 text-right">Rec. Total</th><th className="px-2 py-1 text-right">Despesas</th><th className="px-2 py-1 text-right">Saldo</th><th className="px-2 py-1 text-center">Sinistr.</th></tr></thead>
          <tbody>
            {planos.map((p) => {
              const t = gridFaixas(linhas.filter((l) => l.plano === p)).total;
              return (
                <tr key={p} className="border-t border-border">
                  <td className="px-2 py-1 font-medium">{p}</td>
                  <td className="px-2 py-1 text-center">{Math.round(vidasArquivo ?? t.vidas).toLocaleString("pt-BR")}</td>
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
      {planos.map((p) => (
        <div key={p} className="flex flex-1 flex-col">
          {!fixo && <button type="button" onClick={() => setAberto(aberto === p ? null : p)} className={`mb-1 flex w-full items-center gap-2 rounded-lg border ${aberto === p ? "" : "flex-1"} border-border bg-card px-3 py-1.5 text-left text-sm font-semibold shadow-sm hover:bg-accent`}>
            {aberto === p ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}Sinistralidade por faixa · Plano {p}
          </button>}
          {(fixo || aberto === p) && <Grid fill={fixo} titulo={`Plano ${p}`} linhas={linhas.filter((l) => l.plano === p)} />}
        </div>
      ))}
    </div>
  );
}
