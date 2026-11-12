import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Download, LoaderCircle, RotateCw } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { hostinger } from "@/lib/hostingerClient";
import { carregarUltimaCompetenciaValida } from "@/lib/sinistralidadeValida";
import {
  anoMesCampo, financeiroAteUltimaValida, INDICADORES_PER_CAPITA, lerAnoMes, mascaraAnoMes, mesesPeriodo, modeloDadosCidades, montarGrade, montarGradeCidades,
  periodoPadrao, TIPOS_PLANO, TIPOS_PRODUTO, validarPeriodo, type AnoMes, type Celulas, type GradeCidades, type GradeComTotais,
  type GrupoCidadeId, type IndicadorFinanceiro, type LinhaFinanceira, type LinhaFinanceiraCidade, type LinhaModeloCidade, type LinhaProduto, type LinhaVidasCidade, type TipoPlano,
  type TipoProduto,
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

// Visão Cidade (UF): uma chamada por período (AAAAMM), cada uma devolve o período inteiro de uma vez.
const aaaamm = (a: AnoMes) => a.ano * 100 + a.mes;
const cacheCidades = new Map<string, Promise<unknown[]>>();
function carregarCidades<T>(fn: string, p: Periodo): Promise<T[]> {
  const k = `${fn}|${chave(p)}`;
  let c = cacheCidades.get(k);
  if (!c) {
    c = Promise.resolve(hostinger.rpc(fn, { p_de: aaaamm(p.de), p_ate: aaaamm(p.ate) })).then(({ data, error }) => {
      if (error) throw new Error(error.message);
      return (Array.isArray(data) ? data : []) as unknown[];
    });
    c.catch(() => cacheCidades.delete(k));
    cacheCidades.set(k, c);
  }
  return c as Promise<T[]>;
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

const AGRUPAMENTOS = [
  { id: "produto", rotulo: "Tipo × Produto" },
  { id: "cidade", rotulo: "Cidade (UF)" },
] as const;
type Agrupamento = (typeof AGRUPAMENTOS)[number]["id"];

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
  Receita: "Mensalidade (vl_rec_cpp) + outras receitas (vl_rec_outros) · view_eard_mensal",
  "Coparticipação": "Coparticipação (vl_rec_copart) · view_eard_mensal",
  "Total Receitas": "Receita (vl_rec_cpp + vl_rec_outros) + Coparticipação (vl_rec_copart) · view_eard_mensal",
  Despesas: "Consulta + urgência + internação + terapia + exame + outros · view_eard_mensal",
  Saldo: "Total Receitas − Despesas · view_eard_mensal",
  Sinistralidade: "Despesas ÷ Total Receitas · view_eard_mensal",
};

// Coluna Total sem soma (Vidas são posição de fim de mês, não se acumulam no período).
const SemSoma = ({ claro = false }: { claro?: boolean }) => (
  <span title="Vidas são contadas no fim de cada mês e não se somam no período" className={`text-sm font-normal ${claro ? "text-primary-foreground/80" : "text-muted-foreground"}`}>—</span>
);
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
  linhas: GradeComTotais[]; periodo: Celulas | null; fmt?: Fmt;
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
            <th scope="col" title={periodo ? "Soma do período" : "Vidas não se somam no período"} className="rounded-lg bg-secondary px-2 py-1 text-sm font-bold text-secondary-foreground ring-1 ring-primary/40">
              Total
            </th>
          </tr>
        </thead>
        {TIPOS_PLANO.map((t) => (
          <tbody key={t}>
            {t !== "PIF" && <tr aria-hidden="true"><td colSpan={colunas} className="h-1 p-0" /></tr>}
            {TIPOS_PRODUTO.map((p, i) => {
              // Só as células do produto ficam claras; a coluna Tipo mantém a cor normal.
              const fraco = apagado(p.id) ? "opacity-40" : "";
              return (
                <tr key={p.id}>
                  {i === 0 && (
                    <th scope="rowgroup" rowSpan={TIPOS_PRODUTO.length + 1} className="rounded-lg bg-secondary px-2 text-left align-middle text-sm font-bold text-secondary-foreground" title={DESC_TIPO[t]}>
                      {t}
                    </th>
                  )}
                  <th scope="row" className={`${fraco} whitespace-nowrap rounded-lg bg-muted/60 p-0 text-left text-sm font-medium text-foreground transition-opacity`}>
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
                    <td key={m.dataFim} className={`${fraco} rounded-lg border border-border bg-accent/30 px-2 py-1 text-sm font-semibold tabular-nums text-foreground transition-opacity`}>
                      <Valor v={m.valores[t][p.id]} fmt={fmt} />
                    </td>
                  ))}
                  <td className={`${fraco} ${thTotal} border border-primary/30 bg-accent/60 text-foreground transition-opacity`}>
                    {periodo ? <Valor v={periodo.valores[t][p.id]} fmt={fmt} /> : <SemSoma />}
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
                {periodo ? <Valor v={periodo.subtotais[t]} fmt={fmt} /> : <SemSoma />}
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
              {periodo ? <Valor v={periodo.total} claro fmt={fmt} /> : <SemSoma claro />}
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

type FiltroOpcao<T extends string> = { id: T | null; rotulo: string; titulo?: string };
function Filtro<T extends string>({ rotulo, opcoes, valor, onChange }: { rotulo: string; opcoes: FiltroOpcao<T>[]; valor: T | null; onChange: (v: T | null) => void }) {
  return (
    <div role="group" aria-label={rotulo} className="flex flex-wrap items-center gap-1 text-sm">
      <span className="mr-1 text-muted-foreground">{rotulo}</span>
      {opcoes.map((o) => (
        <Button key={o.id ?? "todos"} variant="ghost" size="sm" aria-pressed={valor === o.id} title={o.titulo} onClick={() => onChange(o.id)}
          className={`h-7 rounded-full px-3 text-sm ${valor === o.id ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "bg-muted"}`}>
          {o.rotulo}
        </Button>
      ))}
    </div>
  );
}

function GradeCidadesTabela({ grade, fmt = fmtInt }: { grade: GradeCidades; fmt?: Fmt }) {
  const { meses, grupos, total, fora } = grade;
  // Praça e Região abrem recolhidas: só o subtotal de cada grupo aparece até o clique.
  const [abertos, setAbertos] = useState<Set<GrupoCidadeId>>(() => new Set());
  const alternar = (id: GrupoCidadeId) => setAbertos((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const colunas = meses.length + 2;
  const somaPeriodo = total.periodo != null || grupos.some((g) => g.subtotal.periodo != null);
  const thTotal = "rounded-lg px-2 py-1 text-sm font-bold tabular-nums";
  const comFora = meses.map((m, i) => ({ m, v: fora[i] })).filter((x) => x.v);
  const nCidades = grupos.reduce((s, g) => s + g.cidades.length, 0);
  return (
    <div className="overflow-x-auto">
      <p className="mb-2 text-xs text-muted-foreground">
        {nCidades.toLocaleString("pt-BR")} cidades · Praça: São José do Rio Preto (SP) · Região: demais cidades · município do plano, o mesmo da Área Geográfica · ordem pelas vidas em {meses[meses.length - 1]?.rotulo}
      </p>
      <table className="w-full min-w-[1280px] border-separate border-spacing-x-1.5 border-spacing-y-[3px] text-center">
        <thead>
          <tr>
            <th scope="col" className="w-64 px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cidade (UF)</th>
            {meses.map((m) => (
              <th key={m.dataFim} scope="col" className="rounded-lg bg-primary px-2 py-1 text-sm font-semibold text-primary-foreground">{m.rotulo}</th>
            ))}
            <th scope="col" title={somaPeriodo ? "Soma do período" : "Vidas não se somam no período"} className="rounded-lg bg-secondary px-2 py-1 text-sm font-bold text-secondary-foreground ring-1 ring-primary/40">
              Total
            </th>
          </tr>
        </thead>
        {grupos.map((g, gi) => {
          const aberto = abertos.has(g.id);
          return (
            <tbody key={g.id}>
              {gi > 0 && <tr aria-hidden="true"><td colSpan={colunas} className="h-1 p-0" /></tr>}
              <tr>
                <th scope="row" className="whitespace-nowrap rounded-lg bg-secondary p-0 text-left text-sm font-bold text-secondary-foreground">
                  <button type="button" aria-expanded={aberto} onClick={() => alternar(g.id)}
                    title={aberto ? `Recolher ${g.rotulo}` : `Abrir as ${g.cidades.length.toLocaleString("pt-BR")} cidades de ${g.rotulo}`}
                    className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-left hover:bg-accent">
                    <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${aberto ? "rotate-90" : ""}`} />
                    {g.rotulo}
                    <span className="text-xs font-normal text-muted-foreground">· {g.cidades.length.toLocaleString("pt-BR")} {g.cidades.length === 1 ? "cidade" : "cidades"}</span>
                  </button>
                </th>
                {g.subtotal.valores.map((v, j) => (
                  <td key={meses[j].dataFim} className="rounded-lg border border-primary/30 bg-secondary px-2 py-1 text-sm font-bold tabular-nums text-secondary-foreground">
                    <Valor v={v} fmt={fmt} />
                  </td>
                ))}
                <td className={`${thTotal} border border-primary/40 bg-secondary text-secondary-foreground`}>
                  {somaPeriodo ? <Valor v={g.subtotal.periodo} fmt={fmt} /> : <SemSoma />}
                </td>
              </tr>
              {aberto && g.cidades.map((c) => (
                <tr key={`${c.uf}|${c.cidade}`}>
                  <th scope="row" className="whitespace-nowrap rounded-lg bg-muted/60 py-1 pl-8 pr-2 text-left text-sm font-medium text-foreground">{c.rotulo}</th>
                  {c.linha.valores.map((v, j) => (
                    <td key={meses[j].dataFim} className="rounded-lg border border-border bg-accent/30 px-2 py-1 text-sm font-semibold tabular-nums text-foreground">
                      <Valor v={v} fmt={fmt} />
                    </td>
                  ))}
                  <td className={`${thTotal} border border-primary/30 bg-accent/60 text-foreground`}>
                    {somaPeriodo ? <Valor v={c.linha.periodo} fmt={fmt} /> : <SemSoma />}
                  </td>
                </tr>
              ))}
            </tbody>
          );
        })}
        <tfoot>
          <tr aria-hidden="true"><td colSpan={colunas} className="h-1 p-0" /></tr>
          <tr>
            <th scope="row" className="rounded-lg bg-primary px-3 py-1.5 text-left text-sm font-bold uppercase tracking-wide text-primary-foreground">Total Geral</th>
            {total.valores.map((v, j) => (
              <td key={meses[j].dataFim} className="rounded-lg bg-primary px-2 py-1.5 text-base font-bold tabular-nums text-primary-foreground">
                <Valor v={v} claro fmt={fmt} />
              </td>
            ))}
            <td className="rounded-lg bg-primary px-2 py-1.5 text-base font-bold tabular-nums text-primary-foreground ring-2 ring-primary/40 ring-offset-1 ring-offset-card">
              {somaPeriodo ? <Valor v={total.periodo} claro fmt={fmt} /> : <SemSoma claro />}
            </td>
          </tr>
        </tfoot>
      </table>
      {comFora.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Fora dos totais (sem tipo de plano ou produto informado): {comFora.map((x) => `${x.m.rotulo} ${fmt(x.v)}`).join(" · ")}
        </p>
      )}
    </div>
  );
}

// Modelo de dados em XLSX: uma linha por cidade × mês × tipo × produto, com os filtros escolhidos.
const COLUNAS_MODELO = [
  ["Competência", 11], ["Ano", 6], ["Mês", 5], ["Grupo", 8], ["UF", 5], ["Cidade", 30], ["Cidade (UF)", 34], ["Tipo", 6], ["Produto", 22],
  ["Vidas", 9], ["Receita (R$)", 15], ["Coparticipação (R$)", 18], ["Total Receitas (R$)", 18], ["Despesas (R$)", 15], ["Saldo (R$)", 15],
] as const;
function gerarXlsxCidades(linhas: LinhaModeloCidade[], parametros: [string, string][], arquivo: string) {
  const col = (i: number) => XLSX.utils.encode_col(i);
  const ws: XLSX.WorkSheet = {};
  COLUNAS_MODELO.forEach(([nome], c) => { ws[`${col(c)}1`] = { t: "s", v: nome }; });
  const num = (v: number | null, z: string, f?: string): XLSX.CellObject | undefined => (v == null ? undefined : { t: "n", v, z, ...(f ? { f } : {}) });
  linhas.forEach((l, i) => {
    const r = i + 2;
    const cel: (XLSX.CellObject | undefined)[] = [
      { t: "s", v: l.competencia }, { t: "n", v: l.ano }, { t: "n", v: l.mes }, { t: "s", v: l.grupo },
      { t: "s", v: l.uf ?? "" }, { t: "s", v: l.cidade ?? "" }, { t: "s", v: l.cidadeUf }, { t: "s", v: l.tipo }, { t: "s", v: l.produto },
      num(l.vidas, "#,##0"), num(l.receita, "#,##0.00"), num(l.coparticipacao, "#,##0.00"),
      num(l.totalReceitas, "#,##0.00", `K${r}+L${r}`), num(l.despesas, "#,##0.00"), num(l.saldo, "#,##0.00", `M${r}-N${r}`),
    ];
    cel.forEach((c, j) => { if (c) ws[`${col(j)}${r}`] = c; });
  });
  const ref = `A1:${col(COLUNAS_MODELO.length - 1)}${linhas.length + 1}`;
  ws["!ref"] = ref;
  ws["!autofilter"] = { ref };
  ws["!cols"] = COLUNAS_MODELO.map(([, w]) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");
  const par = XLSX.utils.aoa_to_sheet([["Parâmetro", "Valor"], ...parametros]);
  par["!cols"] = [{ wch: 26 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, par, "Parâmetros");
  XLSX.writeFile(wb, arquivo);
}

function TelaEvolucaoProdutos({ ultima }: { ultima: AnoMes }) {
  const [visao, setVisao] = useState<Visao>("Vidas");
  const [modo, setModo] = useState<Modo>("Total");
  const [periodo, setPeriodo] = useState<Periodo>(() => periodoAplicado ?? periodoPadrao(ultima));
  const [produto, setProduto] = useState<TipoProduto | null>(null);
  const [agrupar, setAgrupar] = useState<Agrupamento>("produto");
  const [tipoCidade, setTipoCidade] = useState<TipoPlano | null>(null);
  const [vidasCid, setVidasCid] = useState<{ k: string; linhas: LinhaVidasCidade[] } | null>(null);
  const [finCid, setFinCid] = useState<{ k: string; linhas: LinhaFinanceiraCidade[] } | null>(null);
  const [errCid, setErrCid] = useState<string | null>(null);
  const [deCampo, setDeCampo] = useState(() => anoMesCampo(periodo.de));
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

  const porCidade = agrupar === "cidade";
  const buscarCidades = useCallback(() => {
    setErrCid(null);
    const alvo = periodo;
    const falha = (e: unknown) => setErrCid(e instanceof Error ? e.message : String(e));
    carregarCidades<LinhaVidasCidade>("carteira_evolucao_produtos_cidade", alvo).then((linhas) => setVidasCid({ k: chave(alvo), linhas })).catch(falha);
    if (visao !== "Vidas") carregarCidades<LinhaFinanceiraCidade>("evolucao_produtos_financeiro_cidade", alvo).then((linhas) => setFinCid({ k: chave(alvo), linhas })).catch(falha);
  }, [periodo, visao]);
  useEffect(() => { if (porCidade) buscarCidades(); }, [porCidade, buscarCidades]);

  const vidasLinhas = vidasBrutas?.k === k ? vidasBrutas.linhas : null;
  const fin = useMemo(() => (finBruto?.k === k ? financeiroAteUltimaValida(finBruto.linhas, ultima) : null), [finBruto, k, ultima]);

  useEffect(() => { buscarVidas(); }, [buscarVidas]);
  // Financeiro só é buscado ao abrir uma visão financeira (uma vez por período para todas).
  useEffect(() => { if (visao !== "Vidas") buscarFin(); }, [visao === "Vidas", buscarFin]); // eslint-disable-line react-hooks/exhaustive-deps

  const deSel = lerAnoMes(deCampo);
  const ateSel = lerAnoMes(ateCampo);
  const erroPeriodo = validarPeriodo(deSel, ateSel, new Date());
  const alterado = deCampo !== anoMesCampo(periodo.de) || ateCampo !== anoMesCampo(periodo.ate);
  const aplicar = () => {
    if (erroPeriodo || !deSel || !ateSel) return;
    const novo = { de: deSel, ate: ateSel };
    periodoAplicado = novo;
    setPeriodo(novo);
  };

  const aceitaPerCapita = INDICADORES_PER_CAPITA.includes(visao as IndicadorFinanceiro);
  const emPerCapita = modo === "Per capita" && aceitaPerCapita;
  const grade = useMemo(
    () => montarGrade(meses, visao, { vidas: vidasLinhas, fin }, { perCapita: emPerCapita, produto }),
    [meses, visao, vidasLinhas, fin, emPerCapita, produto],
  );

  const vidasCidLinhas = vidasCid?.k === k ? vidasCid.linhas : null;
  const finCidLinhas = useMemo(() => (finCid?.k === k ? financeiroAteUltimaValida(finCid.linhas, ultima) : null), [finCid, k, ultima]);
  const gradeCid = useMemo(
    () => (porCidade ? montarGradeCidades(meses, visao, { vidas: vidasCidLinhas, fin: finCidLinhas }, { perCapita: emPerCapita, tipo: tipoCidade, produto }) : null),
    [porCidade, meses, visao, vidasCidLinhas, finCidLinhas, emPerCapita, tipoCidade, produto],
  );

  const [gerandoXlsx, setGerandoXlsx] = useState(false);
  const [erroXlsx, setErroXlsx] = useState<string | null>(null);
  const baixarXlsx = async () => {
    setGerandoXlsx(true);
    setErroXlsx(null);
    try {
      const alvo = periodo;
      const [v, f] = await Promise.all([
        carregarCidades<LinhaVidasCidade>("carteira_evolucao_produtos_cidade", alvo),
        carregarCidades<LinhaFinanceiraCidade>("evolucao_produtos_financeiro_cidade", alvo),
      ]);
      const linhas = modeloDadosCidades(meses, { vidas: v, fin: financeiroAteUltimaValida(f, ultima) }, { tipo: tipoCidade, produto });
      const tipoTxt = tipoCidade ? `${tipoCidade} (${DESC_TIPO[tipoCidade]})` : "Todos";
      const produtoTxt = TIPOS_PRODUTO.find((p) => p.id === produto)?.rotulo ?? "Todos";
      gerarXlsxCidades(linhas, [
        ["Tela", "Evolução Produtos · Cidade (UF)"],
        ["Período", `${anoMesCampo(alvo.de)} a ${anoMesCampo(alvo.ate)}`],
        ["Valores em R$ até", `${anoMesCampo(ultima)} (último mês com despesas acima de R$ 20 milhões; meses seguintes ficam em branco)`],
        ["Filtro Tipo", tipoTxt],
        ["Filtro Produto", produtoTxt],
        ["Grupo", "Praça = São José do Rio Preto (SP); Região = demais cidades"],
        ["Cidade", "Município do plano (código IBGE), o mesmo da Área Geográfica"],
        ["Vidas", "Ativos no último dia do mês; não se somam entre meses"],
        ["Receita", "vl_rec_cpp + vl_rec_outros · view_eard_mensal"],
        ["Coparticipação", "vl_rec_copart · view_eard_mensal"],
        ["Total Receitas", "Receita + Coparticipação"],
        ["Despesas", "Consulta + urgência + internação + terapia + exame + outros · view_eard_mensal"],
        ["Saldo", "Total Receitas − Despesas"],
        ["Sinistralidade / Per capita", "Calcular pela razão das somas: Despesas ÷ Total Receitas; valor ÷ Vidas do mesmo mês"],
        ["Fora do modelo", "Valores sem tipo de plano ou produto informado, como no grid"],
        ["Linhas", linhas.length.toLocaleString("pt-BR")],
        ["Gerado em", new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })],
      ], `evolucao_produtos_cidades_${aaaamm(alvo.de)}_${aaaamm(alvo.ate)}.xlsx`);
    } catch (e) {
      setErroXlsx(e instanceof Error ? e.message : String(e));
    } finally {
      setGerandoXlsx(false);
    }
  };

  const erro = porCidade ? errCid : visao === "Vidas" ? errVidas : errFin ?? (emPerCapita ? errVidas : null);
  const fmtVisao = visao === "Vidas" ? fmtInt : visao === "Sinistralidade" ? fmtPct : fmtDec;
  const tituloBase = porCidade ? TITULOS[visao].replace("por tipo de produto", "por cidade (UF)") : TITULOS[visao];
  const rotuloProduto = TIPOS_PRODUTO.find((p) => p.id === produto)?.rotulo;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <nav aria-label="Indicadores" className="flex shrink-0 flex-wrap items-center justify-center gap-3">
        <form
          aria-label="Período"
          onSubmit={(e) => { e.preventDefault(); aplicar(); }}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 shadow-sm"
        >
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground" title={`Mês inicial a partir de 01/2019 · valores em R$ até ${anoMesCampo(ultima)}, último mês com despesas acima de R$ 20 milhões`}>
            De
            <input inputMode="numeric" placeholder="mm/aaaa" maxLength={7} aria-label={"De (mm/aaaa)"} value={deCampo}
              onChange={(e) => setDeCampo(mascaraAnoMes(e.target.value))}
              className="h-8 w-[5.5rem] rounded-md border border-input bg-background px-2 text-center text-sm tabular-nums text-foreground" />
          </label>
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
        <div role="group" aria-label="Agrupar o grid por" className="flex items-center gap-1 rounded-full border border-border bg-card p-1.5 shadow-sm">
          {AGRUPAMENTOS.map((a) => (
            <Button
              key={a.id}
              variant="ghost"
              aria-pressed={agrupar === a.id}
              onClick={() => setAgrupar(a.id)}
              className={`h-8 rounded-full px-4 text-sm ${agrupar === a.id ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "bg-muted"}`}
            >
              {a.rotulo}
            </Button>
          ))}
        </div>
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
              {emPerCapita ? tituloBase.replace("(R$)", "· per capita (R$ por vida)") : tituloBase}
            </h2>
            {porCidade && (
              <Button variant="outline" size="sm" className="ml-auto h-8" onClick={baixarXlsx} disabled={gerandoXlsx}
                title="Baixa uma tabela (modelo de dados) com uma linha por cidade, mês, tipo e produto, com o período e os filtros escolhidos">
                {gerandoXlsx ? <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
                {gerandoXlsx ? "Gerando XLSX…" : "Gerar XLSX"}
              </Button>
            )}
            {rotuloProduto && !porCidade && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                Subtotais e totais somando só <span className="font-semibold text-primary">{rotuloProduto}</span>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setProduto(null)}>Ver todos</Button>
              </p>
            )}
          </header>
          {porCidade && (
            <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2">
              <Filtro<TipoPlano> rotulo="Tipo" valor={tipoCidade} onChange={setTipoCidade}
                opcoes={[{ id: null, rotulo: "Todos" }, ...TIPOS_PLANO.map((t) => ({ id: t, rotulo: t, titulo: DESC_TIPO[t] }))]} />
              <Filtro<TipoProduto> rotulo="Produto" valor={produto} onChange={setProduto}
                opcoes={[{ id: null, rotulo: "Todos" }, ...TIPOS_PRODUTO.map((p) => ({ id: p.id, rotulo: p.rotulo, titulo: p.descricao }))]} />
            </div>
          )}
          {porCidade && erroXlsx && <p className="mb-2 text-sm text-destructive">Não foi possível gerar o XLSX: {erroXlsx}</p>}
          {erroPeriodo && alterado && <p className="mb-2 text-sm text-destructive">{erroPeriodo}</p>}
          {erro ? (
            <Aviso erro={erro} onRetry={porCidade ? buscarCidades : visao === "Vidas" || !errFin ? buscarVidas : buscarFin} />
          ) : porCidade ? (
            !gradeCid ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Carregando cidades…</p>
            ) : (
              <GradeCidadesTabela grade={gradeCid} fmt={fmtVisao} />
            )
          ) : !grade ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Carregando…</p>
          ) : (
            <Grade linhas={grade.meses} periodo={grade.periodo} produto={produto} onProduto={setProduto} fmt={fmtVisao} />
          )}
        </section>
      </div>
    </div>
  );
}

/** Abre no último mês com despesas acima de R$ 20 milhões (competência válida da sinistralidade). */
const EvolucaoProdutos = () => {
  const [ultima, setUltima] = useState<AnoMes | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const buscar = useCallback(() => {
    setErro(null);
    carregarUltimaCompetenciaValida()
      .then((u) => (u ? setUltima(u) : setErro("nenhum mês da base tem despesas acima de R$ 20 milhões")))
      .catch((e) => setErro(e instanceof Error ? e.message : String(e)));
  }, []);
  useEffect(() => { buscar(); }, [buscar]);
  if (ultima) return <TelaEvolucaoProdutos ultima={ultima} />;
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      {erro ? <Aviso erro={erro} onRetry={buscar} /> : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Carregando…</p>
      )}
    </section>
  );
};

export default EvolucaoProdutos;
