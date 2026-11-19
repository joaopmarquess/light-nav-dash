import { Fragment, useState } from "react";
import { Tags } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACOMODACOES_LANCERS, FAIXAS_LANCERS, formatarValorLancers, formatarVfe, produtosLancers, valorLancers, vfeLancers, type ValorLancers } from "@/lib/produtosLancers";

const PRODUTOS = produtosLancers();
const VFE = vfeLancers();
const OPCOES: { id: ValorLancers; rotulo: string; dica: string }[] = [
  { id: "venda", rotulo: "Venda", dica: "Preço de venda mensal por beneficiário (R$)" },
  { id: "net", rotulo: "Net", dica: "Preço net mensal por beneficiário (R$)" },
  { id: "spread", rotulo: "Spread", dica: "Spread = (Venda − Net) ÷ Venda" },
];

// Laboratory › Produtos Lancers (pedido de 19/11/2026): planos, descrição e tabela por faixa em Enfermaria (Prata) e Apartamento (Ouro),
// com chave Venda/Net/Spread; valores da planilha TABELAS_LANCERS.xlsx, sem recálculo.
export default function ProdutosLancers() {
  const [valor, setValor] = useState<ValorLancers>("venda");
  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground"><Tags className="h-5 w-5 text-primary" />Produtos Lancers</h2>
          <p className="text-sm text-muted-foreground">Tabelas por faixa etária dos planos com estipulante Lancers · {PRODUTOS.length} tabelas</p>
        </div>
        <div role="group" aria-label="Valor exibido no grid" className="inline-flex rounded-md border border-border bg-background p-0.5">
          {OPCOES.map((o) => (
            <button key={o.id} type="button" aria-pressed={valor === o.id} title={o.dica} onClick={() => setValor(o.id)}
              className={cn("h-8 px-4 rounded text-sm font-medium transition-colors", valor === o.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {o.rotulo}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-border">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th rowSpan={2} className="px-2 py-2 text-left align-bottom">Plano</th>
              <th rowSpan={2} className="px-2 py-2 text-left align-bottom">Descrição</th>
              <th rowSpan={2} className="px-2 py-2 text-left align-bottom">Acomodação</th>
              {FAIXAS_LANCERS.map((f) => <th key={f} className="px-2 pt-2 text-right whitespace-nowrap uppercase">{f === "59 anos ou mais" ? "59 ou +" : f}</th>)}
            </tr>
            <tr>
              {VFE.map((v, i) => <th key={i} className="px-2 pb-2 text-right font-normal tabular-nums" title="Variação para a faixa anterior (VFE)">{formatarVfe(v)}</th>)}
            </tr>
          </thead>
          <tbody>
            {PRODUTOS.map((p) => (
              <Fragment key={p.chave}>
                {ACOMODACOES_LANCERS.map((a, j) => (
                  <tr key={a.id} className={cn(j === 0 ? "border-t-2 border-border" : "border-t border-border/50")}>
                    {j === 0 && <>
                      <td rowSpan={2} className="px-2 py-1.5 align-top font-semibold tabular-nums">{p.plano}</td>
                      <td rowSpan={2} className="px-2 py-1.5 align-top">
                        <span className="font-medium text-foreground">{p.descricao}</span>
                        {p.vendaEstimada && <span className="block text-xs text-muted-foreground">Venda estimada*</span>}
                      </td>
                    </>}
                    <td className="px-2 py-1.5 whitespace-nowrap text-muted-foreground">{a.rotulo}</td>
                    {p.porAcomodacao[a.id].map((l, i) => (
                      <td key={i} className={cn("px-2 py-1.5 text-right tabular-nums whitespace-nowrap", p.vendaEstimada && valor !== "net" && "italic text-muted-foreground")}>
                        {formatarValorLancers(valorLancers(l, valor), valor)}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>Valores mensais por beneficiário em R$ (Spread em %). Linha abaixo das faixas: variação para a faixa anterior (VFE).</p>
        <p>* Preço de venda desconhecido: a planilha estima a venda a partir do net com spread de 23% (Venda = Net ÷ 0,77). Os valores aparecem em itálico.</p>
        <p>Fonte: planilha TABELAS_LANCERS.xlsx enviada em 19/11/2026.</p>
      </div>
    </section>
  );
}
