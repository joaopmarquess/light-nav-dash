import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, LoaderCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hostinger } from "@/lib/hostingerClient";
import {
  anoMesCampo, INDICADORES_PER_CAPITA, lerAnoMes, mascaraAnoMes, mesesPeriodo, montarGrade, periodoAte, periodoPadrao,
  TIPOS_PLANO, TIPOS_PRODUTO, validarAte, type AnoMes, type Celulas, type GradeComTotais, type IndicadorFinanceiro,
  type LinhaFinanceira, type LinhaProduto, type TipoProduto,
} from "@/lib/evolucaoProdutos";

const fmtInt = (n: number) => Math.round(n).toLocaleString("pt-BR");
// Receita, Coparticipação e Despesas: formato #,#0 (duas casas decimais, padrão pt-BR).
const fmtDec = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n: number) => `${(n * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
type Fmt = (n: number) => string;

type Periodo = { de: AnoMes; ate: AnoMes };
const chave = (p: Periodo) => `${anoMesCampo(p.de)}|${anoMesCampo(p.ate)}`;

// Cache por período aplicado (vidas pelos anos do período; financeiro pelos meses AAAAMM).
const cacheVidas = new Map<string, LinhaProduto[]>();
async function carregarVidas(p: Periodo): Promise<LinhaProduto[]> {
  const k = `${p.de.ano}|${p.ate.ano}`;
  const c = cacheVidas.get(k);
  if (c) return c;
  const { data, error } = await hostinger.rpc("carteira_evolucao_produtos", { p_de: p.de.ano, p_ate: p.ate.ano });
  if (error) throw new Error(error.message);
  const linhas = (Array.isArray(data) ? data : []) as LinhaProduto[];
  cacheVidas.set(k, linhas);
  return linhas;
}

const cacheFin = new Map<string, LinhaFinanceira[]>();
async function carregarFinanceiro(p: Periodo): Promise<LinhaFinanceira[]> {
  const k = chave(p);
  const c = cacheFin.get(k);
  if (c) return c;
  const { data, error } = await hostinger.rpc("evolucao_produtos_financeiro", {
    p_de: p.de.ano * 100 + p.de.mes,
    p_ate: p.ate.ano * 100 + p.ate.mes,
  });
  if (error) throw new Error(error.message);
  const linhas = (Array.isArray(data) ? data : []) as LinhaFinanceira[];
  cacheFin.set(k, linhas);
  return linhas;
}

let periodoAplicado: Periodo | null = null;

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

type GradeProps = {
  linhas: GradeComTotais[]; periodo: Celulas; fmt?: Fmt;
  produto: TipoProduto | null; onProduto: (p: TipoProduto | null) => void;
};

function Grade({ linhas, periodo, fmt = fmtInt, produto, onProduto }: GradeProps) {
  const colunas = linhas.length + 3;
  const fora = linhas.filter((m) => m.foraDosTotais);
  // Produto selecionado: os demais ficam em segundo plano (tons claros).
  const apagado = (id: TipoProduto) => produto != null && produto !== id;
  const thTotal = "rounded-lg px-2 py-1 text-sm font-bold tabular-nums";
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1280px] border-separate border-spacing-x-1.5 border-spacing-y-[3px] text-center">
        <thead>
          <tr>
            <th scope="col" className="w-16 px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo</th>
            <th scope="col" className="w-44 px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Produto</th>
            {linhas.map((m) => (
              <th key={m.dataFim} scope="col" className="rounded-lg bg-primary px-2 py-1 text-sm font-semibold text-primary-foreground">
                {m.rotulo}
              </th>
            ))}
            <th scope="col" title="Soma do período" className="rounded-lg bg-secondary px-2 py-1 text-sm font-bold text-secondary-foreground ring-1 ring-primary/40">
              Total
            </th>
          </tr>
        </thead>
        {TIPOS_PLANO.map((t) => (
          <tbody key={t}>
            {t !== "PIF" && <tr aria-hidden="true"><td colSpan={colunas} className="h-1 p-0" /></tr>}
            {TIPOS_PRODUTO.map((p, i) => {
              const fraco = apagado(p.id);
              return (
                <tr key={p.id} className={fraco ? "opacity-35 transition-opacity" : "transition-opacity"}>
                  {i === 0 && (
                    <th scope="rowgroup" rowSpan={TIPOS_PRODUTO.length + 1} className="rounded-lg bg-secondary px-2 text-left align-middle text-sm font-bold text-secondary-foreground" title={DESC_TIPO[t]}>
                      {t}
                    </th>
                  )}
                  <th scope="row" className="whitespace-nowrap rounded-lg bg-muted/60 p-0 text-left text-sm font-medium text-foreground">
                    <button
                      type="button"
                      aria-pressed={produto === p.id}
                      title={produto === p.id ? "Clique para voltar a todos os produtos" : `${p.descricao} · clique para somar só ${p.rotulo}`}
                      onClick={() => onProduto(produto === p.id ? null : p.id)}
                      className={`w-full rounded-lg px-2 py-1 text-left hover:bg-accent ${produto === p.id ? "font-semibold text-primary ring-1 ring-primary" : ""}`}
                    >
                      {p.rotulo}
                    </button>
                  </th>
                  {linhas.map((m) => (
                    <td key={m.dataFim} className="rounded-lg border border-border bg-accent/30 px-2 py-1 text-sm font-semibold tabular-nums text-foreground">
                      <Valor v={m.valores[t][p.id]} fmt={fmt} />
                    </td>
                  ))}
                  <td className={`${thTotal} border border-primary/30 bg-accent/60 text-foreground`}>
                    <Valor v={periodo.valores[t][p.id]} fmt={fmt} />
                  </td>
                </tr>
              );
            })}
            <tr>
              <th scope="row" className="rounded-lg bg-secondary px-2 py-1 text-left text-sm font-bold text-secondary-foreground">
                Subtotal {t}
              </th>
              {linhas.map((m) => (
                <td key={m.dataFim} className="rounded-lg border border-primary/30 bg-secondary px-2 py-1 text-sm font-bold tabular-nums text-secondary-foreground">
                  <Valor v={m.subtotais[t]} fmt={fmt} />
                </td>
              ))}
              <td className={`${thTotal} border border-primary/40 bg-secondary text-secondary-foreground`}>
                <Valor v={periodo.subtotais[t]} fmt={fmt} />
              </td>
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
            <td className="rounded-lg bg-primary px-2 py-1.5 text-base font-bold tabular-nums text-primary-foreground ring-2 ring-primary/40 ring-offset-1 ring-offset-card">
              <Valor v={periodo.total} claro fmt={fmt} />
            </td>
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
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoAplicado ?? periodoPadrao(new Date()));
  const [produto, setProduto] = useState<TipoProduto | null>(null);
  const [ateCampo, setAteCampo] = useState(() => anoMesCampo(periodo.ate));
  const meses = useMemo(() => mesesPeriodo(periodo.de, periodo.ate), [periodo]);
  const [vidasBrutas, setVidasBrutas] = useState<{ k: string; linhas: LinhaProduto[] } | null>(null);
  const [errVidas, setErrVidas] = useState<string | null>(null);
  const [finBruto, setFinBruto] = useState<{ k: string; linhas: LinhaFinanceira[] } | null>(null);
  const [errFin, setErrFin] = useState<string | null>(null);
  const k = chave(periodo);

  const buscarVidas = useCallback(() => {
    setErrVidas(null);
    const alvo = periodo;
    carregarVidas(alvo).then((linhas) => setVidasBrutas({ k: chave(alvo), linhas }))
      .catch((e) => setErrVidas(e instanceof Error ? e.message : String(e)));
  }, [periodo]);
  const buscarFin = useCallback(() => {
    setErrFin(null);
    const alvo = periodo;
    carregarFinanceiro(alvo).then((linhas) => setFinBruto({ k: chave(alvo), linhas }))
      .catch((e) => setErrFin(e instanceof Error ? e.message : String(e)));
  }, [periodo]);

  const vidasLinhas = vidasBrutas?.k === k ? vidasBrutas.linhas : null;
  const fin = finBruto?.k === k ? finBruto.linhas : null;

  useEffect(() => { buscarVidas(); }, [buscarVidas]);
  // Financeiro só é buscado ao abrir uma visão financeira (uma vez por período para todas).
  useEffect(() => { if (visao !== "Vidas") buscarFin(); }, [visao === "Vidas", buscarFin]); // eslint-disable-line react-hooks/exhaustive-deps

  const ateSel = lerAnoMes(ateCampo);
  const erroPeriodo = validarAte(ateSel, new Date());
  const deMostrado = ateSel && !erroPeriodo ? anoMesCampo(periodoAte(ateSel).de) : "—";
  const alterado = ateCampo !== anoMesCampo(periodo.ate);
  const aplicar = () => {
    if (erroPeriodo || !ateSel) return;
    const novo = periodoAte(ateSel);
    periodoAplicado = novo;
    setPeriodo(novo);
  };

  const aceitaPerCapita = INDICADORES_PER_CAPITA.includes(visao as IndicadorFinanceiro);
  const emPerCapita = modo === "Per capita" && aceitaPerCapita;
  const grade = useMemo(
    () => montarGrade(meses, visao, { vidas: vidasLinhas, fin }, { perCapita: emPerCapita, produto }),
    [meses, visao, vidasLinhas, fin, emPerCapita, produto],
  );

  const erro = visao === "Vidas" ? errVidas : errFin ?? (emPerCapita ? errVidas : null);
  const rotuloProduto = TIPOS_PRODUTO.find((p) => p.id === produto)?.rotulo;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <nav aria-label="Indicadores" className="flex shrink-0 flex-wrap items-center justify-center gap-3">
        <form
          aria-label="Período"
          onSubmit={(e) => { e.preventDefault(); aplicar(); }}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 shadow-sm"
        >
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground" title="Sempre 12 meses até o mês final">
            De
            <span className="w-[4.5rem] text-center text-sm tabular-nums text-foreground">{deMostrado}</span>
          </span>
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            Até
            <input inputMode="numeric" placeholder="mm/aaaa" maxLength={7} aria-label={"Até (mm/aaaa)"} value={ateCampo}
              onChange={(e) => setAteCampo(mascaraAnoMes(e.target.value))}
              className="h-8 w-[5.5rem] rounded-md border border-input bg-background px-2 text-center text-sm tabular-nums text-foreground" />
          </label>
          <Button type="submit" size="sm" disabled={!!erroPeriodo || !alterado} title={erroPeriodo ?? "Aplicar o período"}
            className="h-8 rounded-full px-3">
            <Check className="mr-1 h-3.5 w-3.5" />Aplicar
          </Button>
        </form>
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
              className={`h-8 rounded-full px-4 text-sm ${modo === m ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "bg-muted"}`}
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
          <header className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <h2 className="text-lg font-semibold text-foreground" title={DICAS[visao]}>
              {emPerCapita ? TITULOS[visao].replace("(R$)", "· per capita (R$ por vida)") : TITULOS[visao]}
            </h2>
            {rotuloProduto && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                Subtotais e totais somando só <span className="font-semibold text-primary">{rotuloProduto}</span>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setProduto(null)}>Ver todos</Button>
              </p>
            )}
          </header>
          {erroPeriodo && alterado && <p className="mb-2 text-sm text-destructive">{erroPeriodo}</p>}
          {erro ? (
            <Aviso erro={erro} onRetry={visao === "Vidas" || !errFin ? buscarVidas : buscarFin} />
          ) : !grade ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Carregando…</p>
          ) : (
            <Grade linhas={grade.meses} periodo={grade.periodo} produto={produto} onProduto={setProduto}
              fmt={visao === "Vidas" ? fmtInt : visao === "Sinistralidade" ? fmtPct : fmtDec} />
          )}
        </section>
      </div>
    </div>
  );
};

export default EvolucaoProdutos;
