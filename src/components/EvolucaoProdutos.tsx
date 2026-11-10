import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hostinger } from "@/lib/hostingerClient";
import {
  mesesPeriodo, PERIODO_EVOLUCAO_PRODUTOS, produtosPorMes, subtotalTipo, TIPOS_PLANO, TIPOS_PRODUTO, totalGeral,
  type LinhaProduto,
} from "@/lib/evolucaoProdutos";

const MESES = mesesPeriodo(PERIODO_EVOLUCAO_PRODUTOS.de, PERIODO_EVOLUCAO_PRODUTOS.ate);
const fmt = (n: number) => n.toLocaleString("pt-BR");

type LinhaProd = ReturnType<typeof produtosPorMes>[number];
let cacheProd: LinhaProd[] | null = null;

async function carregarProdutos(): Promise<LinhaProd[]> {
  if (cacheProd) return cacheProd;
  const { de, ate } = PERIODO_EVOLUCAO_PRODUTOS;
  const { data, error } = await hostinger.rpc("carteira_evolucao_produtos", { p_de: de.ano, p_ate: ate.ano });
  if (error) throw new Error(error.message);
  cacheProd = produtosPorMes(MESES, (Array.isArray(data) ? data : []) as LinhaProduto[]);
  return cacheProd;
}

const DESC_TIPO: Record<(typeof TIPOS_PLANO)[number], string> = {
  PIF: "Pessoa física (individual/familiar)",
  PCA: "Coletivo por adesão",
  PCE: "Coletivo empresarial",
};

const Valor = ({ v }: { v: number | null }) =>
  v == null ? <span className="text-sm font-normal text-muted-foreground">Sem dado</span> : <>{fmt(v)}</>;

const VISOES = ["Vidas", "Receita", "Coparticipação", "Despesas"] as const;
type Visao = (typeof VISOES)[number];

const EvolucaoProdutos = () => {
  const [visao, setVisao] = useState<Visao>("Vidas");
  const [prod, setProd] = useState<LinhaProd[] | null>(cacheProd);
  const [errProd, setErrProd] = useState<string | null>(null);

  const buscar = useCallback(() => {
    setErrProd(null);
    carregarProdutos().then(setProd).catch((e) => setErrProd(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    if (!prod) buscar();
  }, [prod, buscar]);

  const colunas = MESES.length + 2;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <nav aria-label="Indicadores" className="flex shrink-0 justify-center">
        <div className="flex max-w-full flex-wrap items-center justify-center gap-1 rounded-lg border border-border bg-card p-1.5 shadow-sm sm:rounded-full">
          {VISOES.map((v) => (
            <Button
              key={v}
              variant="ghost"
              aria-pressed={visao === v}
              onClick={() => setVisao(v)}
              className={`h-8 rounded-full px-4 text-sm ${visao === v ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "bg-muted"}`}
            >
              {v}
            </Button>
          ))}
        </div>
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto">
      {visao !== "Vidas" ? (
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">{visao} por tipo de produto</h2>
          <p className="mt-2 text-sm text-muted-foreground">Em definição.</p>
        </section>
      ) : (
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <header className="mb-3">
          <h2 className="text-lg font-semibold text-foreground">Vidas por tipo de produto</h2>
        </header>
        {errProd ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className={/could not find the function/i.test(errProd) ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
              {/could not find the function/i.test(errProd)
                ? "Aguardando a instalação do cálculo por tipo de produto na base de carteira."
                : `Não foi possível carregar os tipos de produto: ${errProd}`}
            </p>
            <Button variant="outline" size="sm" onClick={buscar}><RotateCw className="mr-1.5 h-3.5 w-3.5" />Tentar novamente</Button>
          </div>
        ) : !prod ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Carregando tipos de produto…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] border-separate border-spacing-x-1.5 border-spacing-y-[3px] text-center">
              <thead>
                <tr>
                  <th scope="col" className="w-16 px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo</th>
                  <th scope="col" className="w-44 px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Produto</th>
                  {prod.map((m) => (
                    <th key={m.dataFim} scope="col" className="rounded-lg bg-primary px-2 py-1 text-sm font-semibold text-primary-foreground" title={`Ativos em ${m.dataFim.split("-").reverse().join("/")}`}>
                      {m.rotulo}
                    </th>
                  ))}
                </tr>
              </thead>
              {TIPOS_PLANO.map((t) => (
                <tbody key={t}>
                  {t !== "PIF" && <tr aria-hidden="true"><td colSpan={colunas} className="h-1 p-0" /></tr>}
                  {TIPOS_PRODUTO.map((p, i) => (
                    <tr key={p.id}>
                      {i === 0 && (
                        <th scope="rowgroup" rowSpan={TIPOS_PRODUTO.length + 1} className="rounded-lg bg-secondary px-2 text-left align-middle text-sm font-bold text-secondary-foreground" title={DESC_TIPO[t]}>
                          {t}
                        </th>
                      )}
                      <th scope="row" className="rounded-lg bg-muted/60 px-2 py-1 text-left text-sm font-medium text-foreground" title={p.descricao}>
                        {p.rotulo}
                      </th>
                      {prod.map((m) => (
                        <td key={m.dataFim} className="rounded-lg border border-border bg-accent/30 px-2 py-1 text-sm font-semibold tabular-nums text-foreground">
                          <Valor v={m.valores[t][p.id]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" className="rounded-lg bg-secondary px-2 py-1 text-left text-sm font-bold text-secondary-foreground">
                      Subtotal {t}
                    </th>
                    {prod.map((m) => (
                      <td key={m.dataFim} className="rounded-lg border border-primary/30 bg-secondary px-2 py-1 text-sm font-bold tabular-nums text-secondary-foreground">
                        <Valor v={subtotalTipo(m.valores, t)} />
                      </td>
                    ))}
                  </tr>
                </tbody>
              ))}
              <tfoot>
                <tr aria-hidden="true"><td colSpan={colunas} className="h-1 p-0" /></tr>
                <tr>
                  <th scope="row" colSpan={2} className="rounded-lg bg-primary px-3 py-1.5 text-left text-sm font-bold uppercase tracking-wide text-primary-foreground">
                    Total Geral
                  </th>
                  {prod.map((m) => (
                    <td key={m.dataFim} className="rounded-lg bg-primary px-2 py-1.5 text-base font-bold tabular-nums text-primary-foreground">
                      <Valor v={totalGeral(m.valores)} />
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
      )}
      </div>
    </div>
  );
};

export default EvolucaoProdutos;
