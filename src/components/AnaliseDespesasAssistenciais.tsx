import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AvisoErroDados } from "@/components/AvisoErroDados";
import { arvoreAssistencial, chaveCredenciado, conciliacaoAssistencial, filtrarAssistencial, resumoAssistencial, tipoGuia, type FiltroAssistencial, type NoAssistencial } from "@/lib/analiseDespesasAssistenciais";
import { carregarAnaliseAssistencial, ultimaCompetenciaAssistencial } from "@/lib/analiseDespesasAssistenciaisCarga";

const moeda = (n: number | null) => n === null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const percentual = (n: number | null) => n === null ? "—" : n.toLocaleString("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });
type Carga = Awaited<ReturnType<typeof carregarAnaliseAssistencial>>;

export default function AnaliseDespesasAssistenciais() {
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [dados, setDados] = useState<Carga | null>(null);
  const [erro, setErro] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [iniciando, setIniciando] = useState(true);
  const [lidos, setLidos] = useState(0);
  const [filtro, setFiltro] = useState<FiltroAssistencial>({});
  const ctrl = useRef<AbortController | null>(null);
  const cache = useRef(new Map<string, Carga>());
  const iniciar = async () => {
    setIniciando(true); setErro(null);
    try { const mes = await ultimaCompetenciaAssistencial(); setDe(mes); setAte(mes); }
    catch (e) { setErro(e); }
    finally { setIniciando(false); }
  };
  useEffect(() => { void iniciar(); return () => ctrl.current?.abort(); }, []);
  const buscar = async () => {
    ctrl.current?.abort();
    const c = new AbortController(); ctrl.current = c;
    const chave = `${de}:${ate}`;
    setErro(null); setDados(null); setLoading(true); setLidos(0); setFiltro({});
    try {
      const r = cache.current.get(chave) ?? await carregarAnaliseAssistencial(de, ate, c.signal, setLidos);
      if (c.signal.aborted) return;
      if (!r.erroContabil) { if (cache.current.size >= 3) cache.current.clear(); cache.current.set(chave, r); }
      setDados(r); setPeriodo(`${de.split("-").reverse().join("/")} a ${ate.split("-").reverse().join("/")}`);
    } catch (e) { if (!c.signal.aborted) setErro(e); }
    finally { if (!c.signal.aborted) setLoading(false); }
  };
  const rows = dados?.rows ?? [];
  const selecionadas = useMemo(() => filtrarAssistencial(rows, filtro), [rows, filtro]);
  const resumo = useMemo(() => resumoAssistencial(selecionadas), [selecionadas]);
  const completo = useMemo(() => resumoAssistencial(rows), [rows]);
  const arvoreA = useMemo(() => arvoreAssistencial(selecionadas, "credenciados"), [selecionadas]);
  const arvoreB = useMemo(() => arvoreAssistencial(selecionadas, "guias"), [selecionadas]);
  const opcoes = useMemo(() => {
    const ex = new Map<string, string>(), rec = new Map<string, string>(), guias = new Set<string>();
    for (const r of rows) { ex.set(chaveCredenciado(r.cdcrdexe, r.dscrdexe), r.dscrdexe || "Executor não informado"); rec.set(chaveCredenciado(r.cdcrdrec, r.dscrdrec), r.dscrdrec || "Recebedor não informado"); guias.add(tipoGuia(r)); }
    const ordenar = (m: Map<string, string>) => [...m].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
    return { executor: ordenar(ex), recebedor: ordenar(rec), guia: [...guias].sort().map(g => [g, g]), tipo: [["É Benê", "É Benê"], ["Não é Benê", "Não é Benê"]] };
  }, [rows]);
  const ativo = Object.values(filtro).some(Boolean);
  // Sem vínculo contábil por prestador/guia, não rateia o total entre seleções.
  const conciliacao = conciliacaoAssistencial(dados?.contabil ?? null, completo.total);
  const indicadores: [string, string, string?][] = [
    ["Despesa Assistencial Contábil", moeda(dados?.contabil ?? null), "Total do período · contas analíticas, líquido de recuperações"],
    ["Despesa na base assistencial", moeda(completo.total), "Total do período · soma dos valores pagos"],
    ["Diferença Contábil − Assistencial", moeda(conciliacao.diferenca), "Conciliação do período completo, sem rateio por credenciado"],
    ["Diferença percentual", percentual(conciliacao.percentual), "Diferença ÷ despesa contábil do período"],
    ["Executor · É Benê", moeda(resumo.bene)], ["Executor · Não é Benê", moeda(resumo.naoBene)],
  ];
  return <section className="flex h-full min-h-0 flex-col overflow-auto bg-background">
    <div className="border-b border-border pb-3">
      <h1 className="mb-3 text-lg font-semibold">Análise de Despesas Assistenciais</h1>
      <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); void buscar(); }}>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-foreground">Período base · De<Input aria-label="Período base inicial" type="month" className="h-9 w-56 max-w-full px-3 py-0 text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:ml-3 [&::-webkit-calendar-picker-indicator]:shrink-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-datetime-edit]:min-w-0 [&::-webkit-datetime-edit]:p-0" value={de} onChange={e => setDe(e.target.value)} disabled={loading || iniciando} /></label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted-foreground">Até<Input aria-label="Período base final" type="month" className="h-9 w-56 max-w-full px-3 py-0 text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:ml-3 [&::-webkit-calendar-picker-indicator]:shrink-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-datetime-edit]:min-w-0 [&::-webkit-datetime-edit]:p-0" value={ate} onChange={e => setAte(e.target.value)} disabled={loading || iniciando} /></label>
        <Button size="sm" type="submit" disabled={loading || iniciando || !de || !ate || de > ate}>{loading || iniciando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}Buscar</Button>
        {loading && <Button type="button" size="sm" variant="ghost" onClick={() => { ctrl.current?.abort(); setLoading(false); }}>Cancelar</Button>}
        {periodo && dados && <span className="text-xs text-muted-foreground">Base aplicada: {periodo}</span>}
      </form>
    </div>
    <AvisoErroDados erro={erro} onTentar={() => { void (de ? buscar() : iniciar()); }} className="mt-3" />
    {loading ? <div role="status" className="flex flex-1 items-center justify-center gap-2 py-20 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />{lidos.toLocaleString("pt-BR")} movimentos carregados</div> : dados ? <>
      <AvisoErroDados erro={dados.erroContabil} onTentar={() => void buscar()} className="mt-3" />
      {dados.contabil === null && !dados.erroContabil && <p className="py-2 text-sm text-destructive">Não foram encontradas contas analíticas de despesas assistenciais neste período; total contábil e diferença indisponíveis.</p>}
      <div className="grid grid-cols-2 gap-x-5 gap-y-3 border-b border-border py-4 lg:grid-cols-3 xl:grid-cols-6">{indicadores.map(([nome, valor, dica]) => <div key={nome} title={dica}><div className="mb-1 text-xs text-muted-foreground">{nome}</div><div className="text-base font-semibold tabular-nums">{valor}</div>{dica && <div className="mt-1 text-[11px] text-muted-foreground">{dica}</div>}</div>)}</div>
      <div className="flex flex-wrap items-end gap-3 py-3">
        {([["tipo", "Tipo de credenciado"], ["executor", "Credenciado executor"], ["recebedor", "Credenciado recebedor"], ["guia", "Tipo de guia"]] as const).map(([campo, nome]) => <label key={campo} className="min-w-0 flex-1 text-xs text-muted-foreground">{nome}<select aria-label={nome} className="mt-1 h-9 w-full min-w-40 max-w-full rounded-md border border-input bg-background px-2 text-sm text-foreground" value={filtro[campo] ?? ""} onChange={e => setFiltro(f => ({ ...f, [campo]: e.target.value || undefined }))}><option value="">Todos</option>{opcoes[campo].map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}</select></label>)}
        <Button variant="outline" size="sm" disabled={!ativo} onClick={() => setFiltro({})}><X className="mr-1 h-4 w-4" />Limpar seleção</Button>
      </div>
      <div className="mb-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{resumo.registros.toLocaleString("pt-BR")} movimentos · Despesa {ativo ? "selecionada" : "assistencial"}: <b className="text-foreground">{moeda(resumo.total)}</b></span>{ativo && <span>Contabilidade e conciliação mantêm o período completo: vínculo por credenciado/guia não disponível.</span>}</div>
      {!rows.length ? <p className="py-12 text-center text-sm text-muted-foreground">Nenhum movimento assistencial encontrado no período.</p> : !selecionadas.length ? <p className="py-12 text-center text-sm text-muted-foreground">Nenhum movimento corresponde à seleção.</p> : <div className="grid min-h-0 gap-5 xl:grid-cols-2">
        <Grid titulo="Credenciados" nodes={arvoreA} onSelecionar={f => setFiltro(prev => ({ ...prev, ...f }))} total={resumo.total} />
        <Grid titulo="Tipos de guia" nodes={arvoreB} onSelecionar={f => setFiltro(prev => ({ ...prev, ...f }))} total={resumo.total} />
      </div>}
      <details className="mt-4 border-t border-border py-3 text-xs text-muted-foreground"><summary className="cursor-pointer">Fontes e critérios da análise</summary><ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Contabilidade: icontabil, contas analíticas A classificadas em PRINCIPAL / DESP. ASSISTENCIAL; REALIZADO com sinal invertido para apresentar despesa líquida.</li>
        <li>Assistencial: view_eassistencial, período dt_competencia, despesa vl_total_pago; cada linha de procedimento é somada uma vez, sem adicionar valores glosados.</li>
        <li>Executor: cd_prestador / nm_prestador. Recebedor: cd_prestador_pagamento / nm_prestador_pagamento; conceitos independentes, inclusive quando iguais.</li>
        <li>É Benê: executor com nome exato HOSP BENEF PORTUGUESA DE S J RIO PRETO, conforme a regra assistencial já utilizada no AXIS.</li>
        <li>Tipos originais de ds_tipo_atendimento. Quantidade: nr_guia distintas por competência e tipo; subtotais de guias não são aditivos entre credenciados.</li>
        <li>Não localizado cadastro geral de credenciados conectado a esta fonte nem vínculo contábil por movimento. Nomes e códigos vêm do próprio movimento; nenhuma despesa contábil é atribuída artificialmente aos credenciados.</li>
      </ul></details>
    </> : !erro && !iniciando && <p className="py-12 text-center text-sm text-muted-foreground">Nenhum período base aplicado.</p>}
  </section>;
}

function Grid({ titulo, nodes, onSelecionar, total }: { titulo: string; nodes: NoAssistencial[]; onSelecionar: (f: FiltroAssistencial) => void; total: number }) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const render = (ns: NoAssistencial[], nivel = 0): React.ReactNode => ns.map(n => {
    const aberto = abertos.has(n.chave);
    return <Fragment key={n.chave}><tr className={`border-b border-border ${nivel === 0 ? "bg-muted/40 font-medium" : ""}`}>
      <td className="py-1"><div className={`flex min-w-0 items-center ${nivel === 1 ? "pl-4" : nivel === 2 ? "pl-8" : ""}`}>
        {n.filhos.length ? <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label={`${aberto ? "Recolher" : "Expandir"} ${n.nome}`} onClick={() => setAbertos(p => { const s = new Set(p); if (s.has(n.chave)) s.delete(n.chave); else s.add(n.chave); return s; })}>{aberto ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</Button> : <span className="w-7 shrink-0" />}
        <Button variant="link" className="h-auto min-w-0 justify-start whitespace-normal break-words px-1 py-1 text-left text-xs font-inherit text-foreground" title={`Filtrar por ${n.nome}`} onClick={() => onSelecionar(n.filtro)}>{n.nome}</Button>
      </div></td><td className="whitespace-nowrap px-2 text-right tabular-nums">{moeda(n.valor)}</td><td className="px-2 text-right tabular-nums">{percentual(n.percentual)}</td><td className="px-2 text-right tabular-nums">{n.quantidade.toLocaleString("pt-BR")}</td>
    </tr>{aberto && render(n.filhos, nivel + 1)}</Fragment>;
  });
  return <div className="min-w-0"><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">{titulo}</h2><Button variant="ghost" size="sm" onClick={() => setAbertos(new Set())}>Recolher</Button></div>
    <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="border-y border-border text-muted-foreground"><tr><th className="min-w-44 py-2 text-left">Descrição</th><th className="px-2 text-right">Despesa assistencial</th><th className="px-2 text-right">% da despesa</th><th className="px-2 text-right" title="Guias distintas no recorte">Guias</th></tr></thead><tbody>{render(nodes)}</tbody><tfoot><tr className="border-t border-border font-semibold"><td className="py-2">Total geral</td><td className="whitespace-nowrap px-2 text-right">{moeda(total)}</td><td className="px-2 text-right">{percentual(total ? 1 : 0)}</td><td /></tr></tfoot></table></div>
  </div>;
}