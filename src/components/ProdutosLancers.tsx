import { useState } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ACOMODACOES_LANCERS, formatarSpreadTabela, formatarValorLancers, linhasFaixaLancers, spreadTabelaLancers, produtosFiltroLancers, produtosLancers, rotuloProdutoLancers, rotuloFaixaLancers, type AcomodacaoLancers } from "@/lib/produtosLancers";

const TODOS = produtosLancers();
// Filtro com as tabelas dos planos que o Dênis nomeou; "Incluir Tabelas de Produtos mais Antigos" (desmarcado) traz as demais (pedido de 19/11/2026).

// Laboratory › Produtos Lancers (pedido de 19/11/2026): filtro por Plano e chave de acomodação; mostra a descrição e o grid
// Faixa / Net / Venda, com o spread da tabela (net ÷ venda) acima; valores da planilha TABELAS_LANCERS.xlsx, sem recálculo.
export default function ProdutosLancers() {
  const [incluirAntigos, setIncluirAntigos] = useState(false);
  const PRODUTOS = produtosFiltroLancers(TODOS, incluirAntigos);
  const [chave, setChave] = useState(PRODUTOS[0].chave);
  const [acomodacao, setAcomodacao] = useState<AcomodacaoLancers>("PRATA");
  const produto = PRODUTOS.find((p) => p.chave === chave) ?? PRODUTOS[0];
  const linhas = linhasFaixaLancers(produto, acomodacao);
  const estimada = produto.vendaEstimada;
  const spread = spreadTabelaLancers(produto, acomodacao);
  return (
    <section className="h-full min-h-0 w-full overflow-auto bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <label className="text-xs text-muted-foreground">Plano
          <select value={produto.chave} onChange={(e) => setChave(e.target.value)}
            className="block h-10 mt-1 px-3 min-w-72 rounded-md border border-border bg-background text-sm text-foreground">
            {PRODUTOS.map((p) => <option key={p.chave} value={p.chave}>{rotuloProdutoLancers(p, TODOS)}</option>)}
          </select>
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
        <label className="flex h-10 items-center gap-2 text-sm text-foreground cursor-pointer">
          <Checkbox checked={incluirAntigos} onCheckedChange={(v) => {
            const marcar = v === true; setIncluirAntigos(marcar);
            const lista = produtosFiltroLancers(TODOS, marcar);
            if (!lista.some((p) => p.chave === chave)) setChave(lista[0].chave); // desmarcar volta ao primeiro plano nomeado
          }} />
          Incluir Tabelas de Produtos mais Antigos
        </label>
      </div>
      <div className="flex-1 min-h-0 grid gap-6 lg:grid-cols-[minmax(0,620px)_minmax(260px,1fr)] lg:items-start">
        <div className="flex flex-col gap-5 border-t border-border pt-4 lg:self-stretch lg:border-t-0 lg:pt-0 lg:order-2 lg:border-l lg:pl-6">
          <div>
            <p className="text-xs text-muted-foreground">Descrição</p>
            <p className="text-lg font-semibold text-foreground">{produto.nome ?? produto.descricao}</p>
            {estimada && <p className="text-xs text-muted-foreground">Preço de venda desconhecido: venda estimada pela planilha a partir do net (Venda = Net ÷ 0,77).</p>}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Spread da tabela</p>
            <p className="text-2xl font-semibold text-foreground tabular-nums">{formatarSpreadTabela(spread)}</p>
            <p className="text-xs text-muted-foreground">Spread = 1 − (Net ÷ Venda), somando as 10 faixas.</p>
          </div>
          <div className="mt-auto space-y-2">
            {incluirAntigos && <p className="text-xs text-muted-foreground">* Tabela de produto mais antigo.</p>}
          </div>
        </div>
        <table className="w-full text-sm border border-border lg:order-1">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Faixa</th>
              <th className="px-4 py-2 text-right">Net (R$)</th>
              <th className="px-4 py-2 text-right">Venda (R$){estimada && "*"}</th>
              <th className="px-4 py-2 text-right">Spread</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.faixa} className="border-t border-border even:bg-muted/30 hover:bg-muted/50">
                <td className="px-4 py-1.5 tabular-nums">{rotuloFaixaLancers(l.faixa)}</td>
                <td className="px-4 py-1.5 text-right tabular-nums">{formatarValorLancers(l.net, "net")}</td>
                <td className={cn("px-4 py-1.5 text-right tabular-nums", estimada && "italic text-muted-foreground")}>{formatarValorLancers(l.venda, "venda")}</td>
                <td className="px-4 py-1.5 text-right tabular-nums">{formatarSpreadTabela(l.spread)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
