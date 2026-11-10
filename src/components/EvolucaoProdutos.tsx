import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hostinger } from "@/lib/hostingerClient";
import {
  financeiroPorMes, INDICADORES_PER_CAPITA, mesesPeriodo, perCapita, PERIODO_EVOLUCAO_PRODUTOS, produtosPorMes, TIPOS_PLANO, TIPOS_PRODUTO,
  type IndicadorFinanceiro, type LinhaFinanceira, type LinhaProduto,
} from "@/lib/evolucaoProdutos";

const MESES = mesesPeriodo(PERIODO_EVOLUCAO_PRODUTOS.de, PERIODO_EVOLUCAO_PRODUTOS.ate);
const { de: DE, ate: ATE } = PERIODO_EVOLUCAO_PRODUTOS;
const fmtInt = (n: number) => Math.round(n).toLocaleString("pt-BR");
// Receita, Coparticipação e Despesas: formato #,#0 (duas casas decimais, padrão pt-BR).
const fmtDec = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n: number) => `${(n * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
type Fmt = (n: number) => string;

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

const VISOES = ["Vidas", "Receita", "Coparticipação", "Total Receitas", "Despesas", "Saldo", "Sinistralidade"] as const;
type Visao = (typeof VISOES)[number];

const MODOS = ["Total", "Per capita"] as const;
type Modo = (typeof MODOS)[number];

const TITULOS: Record<Visao, string> = {
  Vidas: "Vidas por tipo de produto",
  Receita: "Receita por tipo de produto (R$)",
  "Coparticipação": "Coparticipação por tipo de produto (R$)",
  "Total Receitas": "Total Receitas por tipo de produto (R$)",
  Despesas: "Despesas por tipo de produto (R$)",
  Saldo: "Saldo por tipo de produto (R$)",
  Sinistralidade: "Sinistralidade por tipo de produto (%)",
};
const DICAS: Partial<Record<Visao, string>> = {
  Receita: "Mensalidade (vl_rec_cpp) · view_eard_mensal",
  "Coparticipação": "Coparticipação (vl_rec_copart) + outras receitas (vl_rec_outros) · view_eard_mensal",
  "Total Receitas": "Receita (vl_rec_cpp) + Coparticipação (vl_rec_copart + vl_rec_outros) · view_eard_mensal",
  Despesas: "Consulta + urgência + internação + terapia + exame + outros · view_eard_mensal",
  Saldo: "Total Receitas − Despesas · view_eard_mensal",
  Sinistralidade: "Despesas ÷ Total Receitas · view_eard_mensal",
};

const Valor = ({ v, claro = false, fmt = fmtInt }: { v: number | null; claro?: boolean; fmt?: Fmt }) =>
  v == null ? <span className={`text-sm font-normal ${claro ? "text-primary-foreground/80" : "text-muted-foreground"}`}>Sem dado</span> : <>{fmt(v)}</>;

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

function Grade({ linhas, fmt = fmtInt }: { linhas: LinhaGrade[]; fmt?: Fmt }) {
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
                    <Valor v={m.valores[t][p.id]} fmt={fmt} />
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
                  <Valor v={m.subtotais[t]} fmt={fmt} />
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
                <Valor v={m.total} claro fmt={fmt} />
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
      {fora.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Fora dos totais (sem tipo de plano ou produto informado): {fora.map((m) => `${m.rotulo} ${fmt(m.foraDosTotais)}`).join(" · ")}
        </p>
      )}
    </div>
  );
}

const EvolucaoProdutos = () => {
  const [visao, setVisao] = useState<Visao>("Vidas");
  const [modo, setModo] = useState<Modo>("Total");
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
  // Financeiro só é buscado ao abrir uma visão financeira (uma vez para todas).
  useEffect(() => { if (visao !== "Vidas" && !fin && !errFin) buscarFin(); }, [visao, fin, errFin, buscarFin]);

  const aceitaPerCapita = INDICADORES_PER_CAPITA.includes(visao as IndicadorFinanceiro);
  const emPerCapita = modo === "Per capita" && aceitaPerCapita;
  const gradeFin = useMemo(() => {
    if (!fin || visao === "Vidas") return null;
    const g = financeiroPorMes(MESES, fin, visao as IndicadorFinanceiro);
    if (!emPerCapita) return g;
    return vidas ? perCapita(g, vidas) : null;
  }, [fin, visao, emPerCapita, vidas]);

  const erro = visao === "Vidas" ? errVidas : errFin ?? (emPerCapita ? errVidas : null);
  const linhas = visao === "Vidas" ? vidas : gradeFin;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <nav aria-label="Indicadores" className="flex shrink-0 flex-wrap items-center justify-center gap-3">
        <div
          role="group"
          aria-label="Total ou per capita"
          title={aceitaPerCapita ? "Per capita = valor ÷ vidas no último dia do mês" : "Vale de Receita até Saldo"}
          className="flex items-center gap-1 rounded-full border border-border bg-card p-1.5 shadow-sm"
        >
          {MODOS.map((m) => (
            <Button
              key={m}
              variant="ghost"
              aria-pressed={modo === m}
              disabled={!aceitaPerCapita}
              onClick={() => setModo(m)}
              className={`h-8 rounded-full px-4 text-sm ${modo === m ? "bg-secondary font-semibold text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground" : "bg-muted"}`}
            >
              {m}
            </Button>
          ))}
        </div>
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
            <h2 className="text-lg font-semibold text-foreground" title={DICAS[visao]}>
              {emPerCapita ? TITULOS[visao].replace("(R$)", "· per capita (R$ por vida)") : TITULOS[visao]}
            </h2>
          </header>
          {erro ? (
            <Aviso erro={erro} onRetry={visao === "Vidas" || !errFin ? buscarVidas : buscarFin} />
          ) : !linhas ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Carregando…</p>
          ) : (
            <Grade linhas={linhas} fmt={visao === "Vidas" ? fmtInt : visao === "Sinistralidade" ? fmtPct : fmtDec} />
          )}
        </section>
      </div>
    </div>
  );
};

export default EvolucaoProdutos;
