import { useState } from "react";
import { Tags } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ACOMODACOES_LANCERS, formatarValorLancers, linhasFaixaLancers, produtosFiltroLancers, produtosLancers, rotuloProdutoLancers, type AcomodacaoLancers } from "@/lib/produtosLancers";

const TODOS = produtosLancers();
// Filtro com as tabelas dos planos que o Dênis nomeou; "Incluir Tabelas de Produtos mais Antigos" (desmarcado) traz as demais (pedido de 19/11/2026).

// Laboratory › Produtos Lancers (pedido de 19/11/2026): filtro por Plano e chave de acomodação; mostra a descrição e o grid
// Faixa / Net / Venda / Spread; valores da planilha TABELAS_LANCERS.xlsx, sem recálculo.
export default function ProdutosLancers() {
  const [incluirAntigos, setIncluirAntigos] = useState(false);
  const PRODUTOS = produtosFiltroLancers(TODOS, incluirAntigos);
  const [chave, setChave] = useState(PRODUTOS[0].chave);
  const [acomodacao, setAcomodacao] = useState<AcomodacaoLancers>("PRATA");
  const produto = PRODUTOS.find((p) => p.chave === chave) ?? PRODUTOS[0];
  const linhas = linhasFaixaLancers(produto, acomodacao);
  const estimada = produto.vendaEstimada;
  return (
    <section className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5 max-w-3xl">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground"><Tags className="h-5 w-5 text-primary" />Produtos Lancers</h2>
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-xs text-muted-foreground">Plano
          <select value={produto.chave} onChange={(e) => setChave(e.target.value)}
            className="block h-10 mt-1 px-3 min-w-64 rounded-md border border-border bg-background text-sm text-foreground">
            {PRODUTOS.map((p) => <option key={p.chave} value={p.chave}>{rotuloProdutoLancers(p, TODOS)}</option>)}
          </select>
        </label>
        <label className="flex h-10 items-center gap-2 text-sm text-foreground cursor-pointer">
          <Checkbox checked={incluirAntigos} onCheckedChange={(v) => {
            const marcar = v === true; setIncluirAntigos(marcar);
            const lista = produtosFiltroLancers(TODOS, marcar);
            if (!lista.some((p) => p.chave === chave)) setChave(lista[0].chave); // desmarcar volta ao primeiro plano nomeado
          }} />
          Incluir Tabelas de Produtos mais Antigos
        </label>
        <div className="flex flex-col text-xs text-muted-foreground">Acomodação
          <div role="group" aria-label="Acomodação" className="mt-1 inline-flex h-10 items-center rounded-md border border-border bg-background p-0.5">
            {ACOMODACOES_LANCERS.map((a) => (
              <button key={a.id} type="button" aria-pressed={acomodacao === a.id} onClick={() => setAcomodacao(a.id)}
                className={cn("h-full px-4 rounded text-sm font-medium transition-colors", acomodacao === a.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                {a.rotulo}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Descrição</p>
        <p className="text-lg font-semibold text-foreground">{produto.nome ?? produto.descricao}</p>
        {produto.nome && <p className="text-sm text-muted-foreground">Na planilha: {produto.descricao}</p>}
        {estimada && <p className="text-xs text-muted-foreground">Preço de venda desconhecido: venda estimada pela planilha a partir do net (Venda = Net ÷ 0,77).</p>}
      </div>
      <table className="w-full text-sm border border-border">
        <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Faixa</th>
            <th className="px-3 py-2 text-right">Net (R$)</th>
            <th className="px-3 py-2 text-right">Venda (R$){estimada && "*"}</th>
            <th className="px-3 py-2 text-right">Spread</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.faixa} className="border-t border-border">
              <td className="px-3 py-1.5">{l.faixa}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{formatarValorLancers(l.net, "net")}</td>
              <td className={cn("px-3 py-1.5 text-right tabular-nums", estimada && "italic text-muted-foreground")}>{formatarValorLancers(l.venda, "venda")}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{formatarValorLancers(l.spread, "spread")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {incluirAntigos && <p className="text-xs text-muted-foreground">* Tabela de produto mais antigo.</p>}
      <p className="text-xs text-muted-foreground">Valores mensais por beneficiário. Spread = (Venda − Net) ÷ Venda. Fonte: planilha TABELAS_LANCERS.xlsx enviada em 19/11/2026.</p>
    </section>
  );
}
