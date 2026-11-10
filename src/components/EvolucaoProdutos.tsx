import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { hostinger } from "@/lib/hostingerClient";
import {
  mesesPeriodo, PERIODO_EVOLUCAO_PRODUTOS, produtosPorMes, TIPOS_PLANO, TIPOS_PRODUTO, vidasPorMes,
  type LinhaMensal, type LinhaProduto,
} from "@/lib/evolucaoProdutos";

const MESES = mesesPeriodo(PERIODO_EVOLUCAO_PRODUTOS.de, PERIODO_EVOLUCAO_PRODUTOS.ate);
type Linha = ReturnType<typeof vidasPorMes>[number];
let cache: Linha[] | null = null;
const fmt = (n: number) => n.toLocaleString("pt-BR");

async function carregar(): Promise<Linha[]> {
  if (cache) return cache;
  const { de, ate } = PERIODO_EVOLUCAO_PRODUTOS;
  const { data, error } = await hostinger.rpc("carteira_evolucao_mensal", { p_de: de.ano, p_ate: ate.ano });
  let linhas: LinhaMensal[];
  if (!error && Array.isArray(data) && data.length) {
    linhas = data as any;
  } else {
    // Reserva: mesma regra "Ativos em", uma consulta por fim de mês (sem abertura por tipo de plano).
    linhas = await Promise.all(MESES.map(async (m) => {
      const r = await hostinger.rpc("carteira_trial_geo", { p_data: m.dataFim });
      if (r.error) throw new Error(r.error.message);
      const total = (Array.isArray(r.data) ? r.data : []).reduce((s: number, x: any) => s + (Number(x.ativos) || 0), 0);
      return { ano: m.ano, mes: m.mes, total };
    }));
  }
  cache = vidasPorMes(MESES, linhas);
  return cache;
}

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

const SemDado = () => <span className="text-sm font-normal text-muted-foreground">Sem dado</span>;

const EvolucaoProdutos = () => {
  const [dados, setDados] = useState<Linha[] | null>(cache);
  const [err, setErr] = useState<string | null>(null);
  const [prod, setProd] = useState<LinhaProd[] | null>(cacheProd);
  const [errProd, setErrProd] = useState<string | null>(null);

  useEffect(() => {
    if (prod) return;
    carregarProdutos().then(setProd).catch((e) => setErrProd(e instanceof Error ? e.message : String(e)));
  }, [prod]);

  useEffect(() => {
    if (dados) return;
    carregar().then(setDados).catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, [dados]);

  return (
    <div className="h-full overflow-y-auto">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Vidas ativas no fim do mês</h2>
            <p className="text-sm text-muted-foreground">Out/2025 a Set/2026 · posição no último dia de cada mês</p>
          </div>
        </header>
        {err ? (
          <p className="text-sm text-destructive">Não foi possível carregar as vidas: {err}</p>
        ) : !dados ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Carregando vidas…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-separate border-spacing-x-1.5 text-center">
              <thead>
                <tr>
                  {dados.map((m) => (
                    <th key={m.dataFim} scope="col" className="rounded-t-lg bg-primary px-2 py-2 text-sm font-semibold text-primary-foreground" title={`Ativos em ${m.dataFim.split("-").reverse().join("/")}`}>
                      {m.rotulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {dados.map((m) => (
                    <td key={m.dataFim} className="rounded-b-lg border border-t-0 border-border bg-accent/40 px-2 py-3 text-lg font-semibold tabular-nums text-foreground">
                      {m.vidas == null ? <SemDado /> : fmt(m.vidas)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {dados && !err && (
        <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-sm">
          <header className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">Vidas por tipo de plano</h2>
            <p className="text-sm text-muted-foreground">Cada mês aberto em PIF, PCA e PCE · mesma posição do último dia do mês</p>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-separate border-spacing-x-1.5 border-spacing-y-1 text-center">
              <thead>
                <tr>
                  <th scope="col" className="w-20 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo</th>
                  {dados.map((m) => (
                    <th key={m.dataFim} scope="col" className="rounded-lg bg-primary px-2 py-2 text-sm font-semibold text-primary-foreground" title={`Ativos em ${m.dataFim.split("-").reverse().join("/")}`}>
                      {m.rotulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIPOS_PLANO.map((t) => (
                  <tr key={t}>
                    <th scope="row" className="rounded-lg bg-secondary px-2 py-2.5 text-left text-sm font-bold text-secondary-foreground" title={DESC_TIPO[t]}>{t}</th>
                    {dados.map((m) => {
                      const v = m.porTipo[t];
                      return (
                        <td key={m.dataFim} className="rounded-lg border border-border bg-accent/30 px-2 py-2.5 text-base font-semibold tabular-nums text-foreground">
                          {v == null ? <SemDado /> : fmt(v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Vidas por tipo de produto</h2>
          <p className="text-sm text-muted-foreground">Cada tipo de plano aberto em Convencional, Fácil 50 e Outros coparticipativos</p>
        </header>
        {errProd ? (
          <p className="text-sm text-muted-foreground">
            A abertura por tipo de produto ainda não está disponível na base de carteira.
            <span className="block text-xs">Detalhe: {errProd}</span>
          </p>
        ) : !prod ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Carregando tipos de produto…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] border-separate border-spacing-x-1.5 border-spacing-y-1 text-center">
              <thead>
                <tr>
                  <th scope="col" className="w-16 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo</th>
                  <th scope="col" className="w-44 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Produto</th>
                  {prod.map((m) => (
                    <th key={m.dataFim} scope="col" className="rounded-lg bg-primary px-2 py-2 text-sm font-semibold text-primary-foreground" title={`Ativos em ${m.dataFim.split("-").reverse().join("/")}`}>
                      {m.rotulo}
                    </th>
                  ))}
                </tr>
              </thead>
              {TIPOS_PLANO.map((t) => (
                <tbody key={t}>
                  {t !== "PIF" && <tr aria-hidden="true"><td colSpan={prod.length + 2} className="h-2 p-0" /></tr>}
                  {TIPOS_PRODUTO.map((p, i) => (
                    <tr key={p.id}>
                      {i === 0 && (
                        <th scope="rowgroup" rowSpan={TIPOS_PRODUTO.length} className="rounded-lg bg-secondary px-2 text-left align-middle text-sm font-bold text-secondary-foreground" title={DESC_TIPO[t]}>
                          {t}
                        </th>
                      )}
                      <th scope="row" className="rounded-lg bg-muted/60 px-2 py-2 text-left text-sm font-medium text-foreground" title={p.descricao}>
                        {p.rotulo}
                      </th>
                      {prod.map((m) => {
                        const v = m.valores[t][p.id];
                        return (
                          <td key={m.dataFim} className="rounded-lg border border-border bg-accent/30 px-2 py-2 text-sm font-semibold tabular-nums text-foreground">
                            {v == null ? <SemDado /> : fmt(v)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default EvolucaoProdutos;
