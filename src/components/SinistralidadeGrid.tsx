import { gridFaixas, type FaixaEmp, type LinhaEmp } from "@/lib/sinistralidadeEmpresas";

// Grade por faixa etária (receitas, despesas, saldo e sinistralidade), usada pela Proposta APB.
const brl = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (v: number | null) => (v == null ? "—" : `${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);
const COLS = ["Faixa", "Vidas", "Rec. CPP", "Rec. CPA", "Rec. Total", "Vr. Despesas", "Saldo", "Sinistralidade"];

export function Grid({ titulo, linhas, fill }: { titulo: string; linhas: LinhaEmp[]; fill?: boolean }) {
  const { faixas, total } = gridFaixas(linhas);
  const Row = ({ f, bold }: { f: FaixaEmp; bold?: boolean }) => (
    <tr className={`border-t border-border ${bold ? "bg-muted font-semibold" : ""}`}>
      <td className="px-3 py-1.5 font-medium">{f.faixa}</td>
      <td className="px-3 py-1.5 text-center">{Math.round(f.vidas).toLocaleString("pt-BR")}</td>
      {[f.recCpp, f.recCopart, f.recTotal, f.despTotal].map((v, i) => <td key={i} className="px-3 py-1.5 text-right">{brl(v)}</td>)}
      <td className={`px-3 py-1.5 text-right ${f.saldo < 0 ? "text-destructive" : ""}`}>{brl(f.saldo)}</td>
      <td className="px-3 py-1.5 text-center">{pct(f.sin)}</td>
    </tr>
  );
  return (
    <section className={`rounded-lg border border-border bg-card p-4 shadow-sm ${fill ? "flex flex-1 flex-col" : ""}`}>
      <h3 className="mb-3 text-base font-semibold text-foreground">{titulo}</h3>
      <div className={`overflow-x-auto ${fill ? "flex flex-1 flex-col" : ""}`}>
        <table className={`w-full text-sm ${fill ? "h-full flex-1" : ""}`}>
          <thead className="text-muted-foreground"><tr>{COLS.map((c, i) => <th key={c} className={`px-3 py-1.5 ${i === 0 ? "text-left" : "text-center"}`}>{c}</th>)}</tr></thead>
          <tbody>{faixas.map((f) => <Row key={f.faixa} f={f} />)}<Row f={total} bold /></tbody>
        </table>
      </div>
    </section>
  );
}
