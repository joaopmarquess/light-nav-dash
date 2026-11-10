import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hostinger } from "@/lib/hostingerClient";
import {
  financeiroPorMes, mesesPeriodo, PERIODO_EVOLUCAO_PRODUTOS, produtosPorMes, subtotalTipo, TIPOS_PLANO, TIPOS_PRODUTO,
  totalGeral, type IndicadorFinanceiro, type LinhaFinanceira, type LinhaProduto,
} from "@/lib/evolucaoProdutos";

const MESES = mesesPeriodo(PERIODO_EVOLUCAO_PRODUTOS.de, PERIODO_EVOLUCAO_PRODUTOS.ate);
const { de: DE, ate: ATE } = PERIODO_EVOLUCAO_PRODUTOS;
const fmtInt = (n: number) => Math.round(n).toLocaleString("pt-BR");

type LinhaGrade = ReturnType<typeof produtosPorMes>[number];

let cacheVidas: LinhaGrade[] | null = null;
async function carregarVidas(): Promise<LinhaGrade[]> {
  if (cacheVidas) return cacheVidas;
  const { data, error } = await hostinger.rpc("carteira_evolucao_produtos", { p_de: DE.ano, p_ate: ATE.ano });
  if (error) throw new Error(error.message);
  cacheVidas = produtosPorMes(MESES, (Array.isArray(data) ? data : []) as LinhaProduto[]);
  return cacheVidas;
}

let cacheFin: LinhaFinanceira[] | null = null;
async function carregarFinanceiro(): Promise<LinhaFinanceira[]> {
  if (cacheFin) return cacheFin;
  const { data, error } = await hostinger.rpc("evolucao_produtos_financeiro", {
    p_de: DE.ano * 100 + DE.mes,
    p_ate: ATE.ano * 100 + ATE.mes,
  });
  if (error) throw new Error(error.message);
  cacheFin = (Array.isArray(data) ? data : []) as LinhaFinanceira[];
  return cacheFin;
}

const DESC_TIPO: Record<(typeof TIPOS_PLANO)[number], string> = {
  PIF: "Pessoa física (individual/familiar)",
  PCA: "Coletivo por adesão",
  PCE: "Coletivo empresarial",
};

const VISOES = ["Vidas", "Receita", "Coparticipação", "Despesas"] as const;
type Visao = (typeof VISOES)[number];

const TITULOS: Record<Visao, string> = {
  Vidas: "Vidas por tipo de produto",
  Receita: "Receita por tipo de produto (R$)",
  "Coparticipação": "Coparticipação por tipo de produto (R$)",
  Despesas: "Despesas por tipo de produto (R$)",
};
const DICAS: Partial<Record<Visao, string>> = {
  Receita: "Mensalidade (vl_rec_cpp) + coparticipação (vl_rec_copart) + outras receitas (vl_rec_outros) · view_eard_mensal",
  "Coparticipação": "Receita de coparticipação (vl_rec_copart) · view_eard_mensal",
  Despesas: "Consulta + urgência + internação + terapia + exame + outros · view_eard_mensal",
};

const Valor = ({ v }: { v: number | null }) =>
  v == null ? <span className="text-sm font-normal text-muted-foreground">Sem dado</span> : <>{fmtInt(v)}</>;

const naoInstalado = (e: string) => /could not find the function/i.test(e);

function Aviso({ erro, onRetry }: { erro: string; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className={naoInstalado(erro) ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
        {naoInstalado(erro) ? "Aguardando a instalação do cálculo na base." : `Não foi possível carregar os dados: ${erro}`}
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}><RotateCw className="mr-1.5 h-3.5 w-3.5" />Tentar novamente</Button>
    </div>
  );
}

function Grade({ linhas }: { linhas: LinhaGrade[] }) {
  const colunas = linhas.length + 2;
  const fora = linhas.filter((m) => m.foraDosTotais);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1200px] border-separate border-spacing-x-1.5 border-spacing-y-[3px] text-center">
        <thead>
          <tr>
            <th scope="col" className="w-16 px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo</th>
            <th scope="col" className="w-44 px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Produto</th>
            {linhas.map((m) => (
              <th key={m.dataFim} scope="col" className="rounded-lg bg-primary px-2 py-1 text-sm font-semibold text-primary-foreground">
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
                {linhas.map((m) => (
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
              {linhas.map((m) => (
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
            {linhas.map((m) => (
              <td key={m.dataFim} className="rounded-lg bg-primary px-2 py-1.5 text-base font-bold tabular-nums text-primary-foreground">
                <Valor v={totalGeral(m.valores)} />
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
      {fora.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Fora dos totais (sem tipo de plano ou produto informado): {fora.map((m) => `${m.rotulo} ${fmtInt(m.foraDosTotais)}`).join(" · ")}
        </p>
      )}
    </div>
  );
}

const EvolucaoProdutos = () => {
  const [visao, setVisao] = useState<Visao>("Vidas");
  const [vidas, setVidas] = useState<LinhaGrade[] | null>(cacheVidas);
  const [errVidas, setErrVidas] = useState<string | null>(null);
  const [fin, setFin] = useState<LinhaFinanceira[] | null>(cacheFin);
  const [errFin, setErrFin] = useState<string | null>(null);

  const buscarVidas = useCallback(() => {
    setErrVidas(null);
    carregarVidas().then(setVidas).catch((e) => setErrVidas(e instanceof Error ? e.message : String(e)));
  }, []);
  const buscarFin = useCallback(() => {
    setErrFin(null);
    carregarFinanceiro().then(setFin).catch((e) => setErrFin(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => { if (!vidas) buscarVidas(); }, [vidas, buscarVidas]);
  // Financeiro só é buscado ao abrir Receita, Coparticipação ou Despesas (uma vez para as três).
  useEffect(() => { if (visao !== "Vidas" && !fin && !errFin) buscarFin(); }, [visao, fin, errFin, buscarFin]);

  const gradeFin = useMemo(
    () => (fin && visao !== "Vidas" ? financeiroPorMes(MESES, fin, visao as IndicadorFinanceiro) : null),
    [fin, visao],
  );

  const erro = visao === "Vidas" ? errVidas : errFin;
  const linhas = visao === "Vidas" ? vidas : gradeFin;

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
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <header className="mb-3">
            <h2 className="text-lg font-semibold text-foreground" title={DICAS[visao]}>{TITULOS[visao]}</h2>
          </header>
          {erro ? (
            <Aviso erro={erro} onRetry={visao === "Vidas" ? buscarVidas : buscarFin} />
          ) : !linhas ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Carregando…</p>
          ) : (
            <Grade linhas={linhas} />
          )}
        </section>
      </div>
    </div>
  );
};

export default EvolucaoProdutos;
