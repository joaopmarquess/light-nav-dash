import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, ChevronsDownUp, ChevronsUpDown, Download, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { hostinger } from "@/lib/hostingerClient";
import { AvisoErroDados } from "@/components/AvisoErroDados";
import { cn } from "@/lib/utils";
import {
  agrupar, COLUNAS_CR, consolidarTitulos, DIMENSOES, medir, normalizarLinha, pctInadimplencia, pctRecebido,
  rotuloCompetencia, SITUACOES, titulosDobrados, total, type Dimensao, type Filtros, type Metricas, type No, type Titulo,
} from "@/lib/inadimplencia";

/** Tabela definitiva na base externa (DW); enquanto não existir, a tela usa o arquivo de amostra gravado na base do AXIS. */
const TABELA_DW = "contas_a_receber";
const TABELA_AMOSTRA = "financeiro_contas_receber";
type Fonte = "dw" | "amostra";
const tabelaInexistente = (e: unknown) => !!e && typeof e === "object" && ["PGRST205", "42P01"].includes(String((e as { code?: string }).code));

async function lerTudo(fonte: Fonte) {
  const linhas: Record<string, unknown>[] = [];
  for (let de = 0; ; de += 1000) {
    const q = fonte === "dw"
      ? hostinger.from(TABELA_DW).select(COLUNAS_CR).order("cd_itcon_rec").order("dt_recebimento", { nullsFirst: true }).order("vl_recebido")
      : supabase.from(TABELA_AMOSTRA).select(COLUNAS_CR).order("id");
    const { data, error } = await q.range(de, de + 999);
    if (error) throw error;
    linhas.push(...((data ?? []) as unknown as Record<string, unknown>[]));
    if (!data || data.length < 1000) break;
  }
  return linhas.map(normalizarLinha);
}
const hoje = () => new Date().toISOString().slice(0, 10);
const brl = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const int = (n: number) => n.toLocaleString("pt-BR");
const pct = (n: number | null) => (n == null ? "—" : `${(n * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);
const NIVEIS_PADRAO: Dimensao[] = ["competencia", "faixaAtraso", "plano"];

type Coluna = { rotulo: string; valor: (m: Metricas) => string; destaque?: boolean; titulo?: string };
const COLUNAS: Coluna[] = [
  { rotulo: "Títulos", valor: (m) => int(m.titulos) },
  { rotulo: "A receber", valor: (m) => brl(m.aReceber), titulo: "Valor dos títulos vencidos até a posição (duplicata − desconto)" },
  { rotulo: "Recebido", valor: (m) => brl(m.recebido), titulo: "Principal recebido até a posição, sem acréscimos" },
  { rotulo: "Em aberto", valor: (m) => brl(m.emAberto) },
  { rotulo: "% Recebido", valor: (m) => pct(pctRecebido(m)), titulo: "Recebido ÷ A receber" },
  { rotulo: "% Inadimplência", valor: (m) => pct(pctInadimplencia(m)), destaque: true, titulo: "Em aberto ÷ A receber" },
  { rotulo: "Inadimplentes", valor: (m) => int(m.inadimplentes), titulo: "Títulos com saldo em aberto na posição" },
  { rotulo: "Recebido em atraso", valor: (m) => brl(m.recebidoAtraso), titulo: "Principal recebido depois do vencimento" },
  { rotulo: "Acréscimos", valor: (m) => brl(m.acrescimos), titulo: "Juros e multas recebidos" },
];

const sel = "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground";

export default function FinanceiroInadimplencia() {
  const [titulos, setTitulos] = useState<Titulo[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<unknown>(null);
  const [fonte, setFonte] = useState<Fonte | null>(null);

  const [posicao, setPosicao] = useState(hoje());
  const [filtros, setFiltros] = useState<Filtros>({});
  const [niveis, setNiveis] = useState<(Dimensao | "")[]>([...NIVEIS_PADRAO, ""]);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [dobradoAberto, setDobradoAberto] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null);
    try {
      let origem: Fonte = "dw";
      let linhas;
      try { linhas = await lerTudo("dw"); } catch (e) {
        if (!tabelaInexistente(e)) throw e;
        origem = "amostra"; linhas = await lerTudo("amostra");
      }
      setFonte(origem);
      const ts = consolidarTitulos(linhas);
      setTitulos(ts);
      const comps = [...new Set(ts.map((t) => t.dt_competencia))].sort();
      setFiltros((f) => ({ ...f, competenciaDe: comps[0], competenciaAte: comps.at(-1) }));
    } catch (e) { setErro(e); } finally { setCarregando(false); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  const opcoes = useMemo(() => {
    const u = (f: (t: Titulo) => string | null) => [...new Set((titulos ?? []).map(f).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
    return { comps: u((t) => t.dt_competencia), tipos: u((t) => t.tp_plano), bancos: u((t) => t.ds_con_cor), planos: u((t) => t.cd_plano), situacoes: u((t) => t.tp_quitacao) };
  }, [titulos]);

  const niveisAtivos = useMemo(() => { const out: Dimensao[] = []; for (const n of niveis) { if (!n) break; out.push(n); } return out; }, [niveis]);
  const medidos = useMemo(() => (titulos ? medir(titulos, posicao, filtros) : []), [titulos, posicao, filtros]);
  const arvore = useMemo(() => agrupar(medidos, niveisAtivos, posicao), [medidos, niveisAtivos, posicao]);
  const tot = useMemo(() => total(medidos), [medidos]);
  const dobrados = useMemo(() => titulosDobrados(medidos), [medidos]);

  const todosIds = useMemo(() => { const ids: string[] = []; const walk = (ns: No[]) => ns.forEach((n) => { if (n.filhos.length) { ids.push(n.id); walk(n.filhos); } }); walk(arvore); return ids; }, [arvore]);
  const alternar = (id: string) => setAbertos((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const setF = (k: keyof Filtros, v: string | boolean) => setFiltros((f) => ({ ...f, [k]: v === "" ? undefined : v }));
  const setNivel = (i: number, v: string) => setNiveis((ns) => { const n = [...ns]; n[i] = v as Dimensao | ""; if (!v) for (let j = i + 1; j < n.length; j++) n[j] = ""; return n; });

  const exportar = () => {
    const linhas: (string | number)[][] = [["Nível", ...niveisAtivos.map((d) => DIMENSOES.find((x) => x.id === d)!.rotulo), "Títulos", "A receber", "Recebido", "Em aberto", "% Recebido", "% Inadimplência", "Inadimplentes", "Recebido em atraso", "Acréscimos"]];
    const linha = (rot: string[], nivel: number | string, m: Metricas) => [nivel, ...niveisAtivos.map((_, i) => rot[i] ?? ""), m.titulos, m.aReceber, m.recebido, m.emAberto, pctRecebido(m) ?? "", pctInadimplencia(m) ?? "", m.inadimplentes, m.recebidoAtraso, m.acrescimos];
    const walk = (ns: No[], rot: string[]) => ns.forEach((n) => { linhas.push(linha([...rot, n.rotulo], n.nivel + 1, n.metricas)); walk(n.filhos, [...rot, n.rotulo]); });
    walk(arvore, []);
    linhas.push(linha(["Total"], "Total", tot));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[`Inadimplência · posição em ${posicao.split("-").reverse().join("/")}`], [], ...linhas]), "Inadimplência");
    if (dobrados.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Título", "Contrato", "Responsável financeiro", "Plano", "Vencimento", "Linhas", "Valor do título", "Recebido no arquivo", "Contado", "Dobrado"], ...dobrados.map(({ t, m }) => [t.cd_itcon_rec, t.cd_contrato ?? "", t.nm_responsavel_financeiro ?? "", t.cd_plano ?? "", t.dt_vencimento ?? "", t.linhas, t.valor, t.recebidoArquivo, m.recebido, t.excesso])]), "Dobrado");
    XLSX.writeFile(wb, `inadimplencia_${posicao}.xlsx`);
  };

  const linhasGrid: No[] = [];
  const walk = (ns: No[]) => ns.forEach((n) => { linhasGrid.push(n); if (abertos.has(n.id)) walk(n.filhos); });
  walk(arvore);

  const vazio = titulos && titulos.length === 0;

  return (
    <section className="h-full min-h-0 overflow-y-auto flex flex-col gap-3 bg-card rounded-xl border border-border shadow-sm p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-muted-foreground">Posição em
          <input type="date" value={posicao} onChange={(e) => e.target.value && setPosicao(e.target.value)} className={cn(sel, "block mt-1")} />
        </label>
        <label className="text-xs text-muted-foreground">Competência de
          <select value={filtros.competenciaDe ?? ""} onChange={(e) => setF("competenciaDe", e.target.value)} className={cn(sel, "block mt-1")}>
            {opcoes.comps.map((c) => <option key={c} value={c}>{rotuloCompetencia(c)}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">até
          <select value={filtros.competenciaAte ?? ""} onChange={(e) => setF("competenciaAte", e.target.value)} className={cn(sel, "block mt-1")}>
            {opcoes.comps.map((c) => <option key={c} value={c}>{rotuloCompetencia(c)}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">Tipo de plano
          <select value={filtros.tipoPlano ?? ""} onChange={(e) => setF("tipoPlano", e.target.value)} className={cn(sel, "block mt-1")}>
            <option value="">Todos</option>{opcoes.tipos.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">Plano
          <select value={filtros.plano ?? ""} onChange={(e) => setF("plano", e.target.value)} className={cn(sel, "block mt-1")}>
            <option value="">Todos</option>{opcoes.planos.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">Coparticipativo
          <select value={filtros.coparticipativo ?? ""} onChange={(e) => setF("coparticipativo", e.target.value)} className={cn(sel, "block mt-1")}>
            <option value="">Todos</option><option value="S">Sim</option><option value="N">Não</option>
          </select>
        </label>
        <label className="text-xs text-muted-foreground">Banco
          <select value={filtros.banco ?? ""} onChange={(e) => setF("banco", e.target.value)} className={cn(sel, "block mt-1 max-w-48")}>
            <option value="">Todos</option>{opcoes.bancos.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">Quitação
          <select value={filtros.situacao ?? ""} onChange={(e) => setF("situacao", e.target.value)} className={cn(sel, "block mt-1")}>
            <option value="">Todas</option>{opcoes.situacoes.filter((s) => filtros.incluirCancelados || s !== "C").map((c) => <option key={c} value={c}>{SITUACOES[c] ?? c}</option>)}
          </select>
        </label>
        <label className="h-9 inline-flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={!!filtros.incluirCancelados} onChange={(e) => setF("incluirCancelados", e.target.checked)} />Incluir cancelados
        </label>
        <div className="ml-auto flex items-end gap-2">
          <button onClick={exportar} disabled={!medidos.length} title="Gerar XLSX do grid em níveis" className="h-9 px-3 rounded-md border border-border bg-background text-sm inline-flex items-center gap-1.5 hover:bg-accent/40 disabled:opacity-50">
            <Download className="h-4 w-4" />XLSX
          </button>
        </div>
      </div>

      <AvisoErroDados erro={erro} onTentar={carregar} />
      {fonte === "amostra" && <p className="text-xs text-muted-foreground">Fonte: arquivo contas_a_receber.csv enviado em 23/11/2026 (amostra de 1.000 linhas). A tela passa a ler a tabela {TABELA_DW} da base externa assim que ela existir.</p>}
      {carregando && <p className="text-sm text-muted-foreground inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Carregando contas a receber…</p>}
      {vazio && <p className="text-sm text-muted-foreground">Nenhuma conta a receber gravada ainda.</p>}

      {titulos && !vazio && <>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
          {[
            ["A receber", brl(tot.aReceber)], ["Recebido", brl(tot.recebido)], ["Em aberto", brl(tot.emAberto)],
            ["% Recebido", pct(pctRecebido(tot))], ["% Inadimplência", pct(pctInadimplencia(tot))], ["Títulos · inadimplentes", `${int(tot.titulos)} · ${int(tot.inadimplentes)}`],
          ].map(([r, v]) => (
            <div key={r} className="rounded-lg border border-border px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{r}</div>
              <div className={cn("text-lg font-semibold tabular-nums", r === "% Inadimplência" ? "text-destructive" : "text-foreground")}>{v}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Níveis do grid:</span>
          {niveis.map((n, i) => (i === 0 || niveis[i - 1]) ? (
            <span key={i} className="inline-flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              <select aria-label={`Nível ${i + 1}`} value={n} onChange={(e) => setNivel(i, e.target.value)} className={cn(sel, "h-8")}>
                {i > 0 && <option value="">—</option>}
                {DIMENSOES.filter((d) => d.id === n || !niveis.includes(d.id)).map((d) => <option key={d.id} value={d.id}>{d.rotulo}</option>)}
              </select>
            </span>
          ) : null)}
          <button onClick={() => setAbertos(new Set(todosIds))} title="Expandir todos os níveis" className="ml-2 h-8 px-2 rounded-md border border-border text-xs inline-flex items-center gap-1 hover:bg-accent/40"><ChevronsUpDown className="h-3.5 w-3.5" />Expandir</button>
          <button onClick={() => setAbertos(new Set())} title="Recolher todos os níveis" className="h-8 px-2 rounded-md border border-border text-xs inline-flex items-center gap-1 hover:bg-accent/40"><ChevronsDownUp className="h-3.5 w-3.5" />Recolher</button>

        </div>

        <div className="flex-1 min-h-[18rem] overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted">
              <tr>
                <th className="text-left font-semibold px-3 py-2">{niveisAtivos.map((d) => DIMENSOES.find((x) => x.id === d)!.rotulo).join(" › ")}</th>
                {COLUNAS.map((c) => <th key={c.rotulo} title={c.titulo} className="text-right font-semibold px-3 py-2 whitespace-nowrap">{c.rotulo}</th>)}
              </tr>
            </thead>
            <tbody>
              {linhasGrid.map((n) => {
                const temFilhos = n.filhos.length > 0;
                return (
                  <tr key={n.id} className={cn("border-t border-border", n.nivel === 0 ? "font-medium" : "", temFilhos && "cursor-pointer hover:bg-accent/40")} onClick={() => temFilhos && alternar(n.id)}>
                    <td className="px-3 py-1.5" style={{ paddingLeft: `${0.75 + n.nivel * 1.25}rem` }}>
                      <span className="inline-flex items-center gap-1">
                        {temFilhos ? <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", abertos.has(n.id) && "rotate-90")} /> : <span className="w-3.5" />}
                        {n.rotulo}
                      </span>
                    </td>
                    {COLUNAS.map((c) => <td key={c.rotulo} className={cn("px-3 py-1.5 text-right tabular-nums whitespace-nowrap", c.destaque && n.metricas.emAberto > 0.005 && "text-destructive font-semibold")}>{c.valor(n.metricas)}</td>)}
                  </tr>
                );
              })}
              {!linhasGrid.length && <tr><td colSpan={COLUNAS.length + 1} className="px-3 py-6 text-center text-muted-foreground">Nenhum título vencido até a posição com os filtros escolhidos.</td></tr>}
            </tbody>
            <tfoot className="sticky bottom-0 bg-muted font-semibold">
              <tr className="border-t border-border">
                <td className="px-3 py-2">Total</td>
                {COLUNAS.map((c) => <td key={c.rotulo} className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{c.valor(tot)}</td>)}
              </tr>
            </tfoot>
          </table>
        </div>
        {dobrados.length > 0 && (
          <div className="rounded-lg border border-border">
            <button onClick={() => setDobradoAberto((v) => !v)} aria-expanded={dobradoAberto} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-left hover:bg-accent/40">
              <ChevronRight className={cn("h-4 w-4 transition-transform", dobradoAberto && "rotate-90")} />
              Dobrado
              <span className="font-normal text-muted-foreground">· {int(dobrados.length)} títulos com linhas repetidas no arquivo · R$ {brl(tot.excesso)} além do valor, fora do cálculo (cada título conta uma vez)</span>
            </button>
            {dobradoAberto && (
              <div className="max-h-56 overflow-auto border-t border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr>{["Título", "Contrato", "Responsável financeiro", "Plano", "Vencimento", "Recebimento", "Linhas", "Valor do título", "Recebido no arquivo", "Contado", "Dobrado"].map((h, i) => <th key={h} className={cn("px-3 py-1.5 font-semibold whitespace-nowrap", i >= 6 ? "text-right" : "text-left")}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {dobrados.map(({ t, m }) => (
                      <tr key={t.cd_itcon_rec} className="border-t border-border">
                        <td className="px-3 py-1 tabular-nums">{t.cd_itcon_rec}</td>
                        <td className="px-3 py-1 tabular-nums">{t.cd_contrato ?? "—"}</td>
                        <td className="px-3 py-1">{t.nm_responsavel_financeiro ?? "—"}</td>
                        <td className="px-3 py-1">{t.cd_plano ?? "—"}</td>
                        <td className="px-3 py-1 tabular-nums">{t.dt_vencimento?.split("-").reverse().join("/") ?? "—"}</td>
                        <td className="px-3 py-1 tabular-nums">{t.recebimentos.at(-1)?.data.split("-").reverse().join("/") ?? "—"}</td>
                        <td className="px-3 py-1 text-right tabular-nums">{t.linhas}</td>
                        <td className="px-3 py-1 text-right tabular-nums">{brl(t.valor)}</td>
                        <td className="px-3 py-1 text-right tabular-nums">{brl(t.recebidoArquivo)}</td>
                        <td className="px-3 py-1 text-right tabular-nums">{brl(m.recebido)}</td>
                        <td className="px-3 py-1 text-right tabular-nums font-semibold">{brl(t.excesso)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Entram os títulos vencidos até a posição; o recebido conta só o principal pago até essa data. Cancelados ficam fora, salvo quando incluídos.</p>
      </>}
    </section>
  );
}
