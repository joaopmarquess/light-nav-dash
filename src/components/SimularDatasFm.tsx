import { Fragment, useState } from "react";
import { Copy, Plus, Printer, Save, Trash2, X } from "lucide-react";
import PdfPreview from "@/components/PdfPreview";
import { loadTimbrado } from "@/lib/pdfTimbrado";
import { loadMarcaAxis } from "@/lib/pdfMarcaAxis";
import { EM_BLOCOS_FM, buildCenariosFmPdf } from "@/lib/simularDatasFmPdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { quantidadeBlocosFm } from "@/lib/simularDatasFm";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { carregarSimulacoesFm, carregarUltimoNumeroFm, gravarSimulacaoFm, salvarUltimoNumeroFm, simulacaoAlteradaFm, DESCRICAO_FM_MAX, duplicarSimulacaoFm, formatarNumeroFm, prazoFolhaFm, novaSimulacaoFm, proximoNumeroFm, ordenarSimulacoesFm, salvarSimulacoesFm, type NivelImpactoFm, type SimulacaoFm, formatarCompetencia, lerCompetencia, lerDiaMes, avaliarImpactosFm, formatarPrazo, lerInteiro, periodoFm, blocosPeriodoFm, blocosRedeFm, arquivoDigitadoFm, hospitalBeneFm, beneNoBlocoFm, PARTES_BLOCOS_FM, simularDatasFm, fechamentosFm, type EntradaDatasFm, type IdDataFm } from "@/lib/simularDatasFm";

const novoId = () => globalThis.crypto?.randomUUID?.() ?? `fm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const agora = () => new Date().toISOString();
const corNivel = (n: NivelImpactoFm) => n === "critico" ? "text-destructive" : n === "moderado" ? "text-[hsl(var(--impacto-moderado))]" : n === "aceito" ? "text-[hsl(var(--impacto-aceito))]" : "text-[hsl(var(--impacto-ok))]"; // Aceito num verde mais claro que o Ideal
// PEONA Ideal em verde e negrito (pedido de 18/11/2026); demais situações em seminegrito.
const pesoImpacto = (imp: { id: string; nivel: NivelImpactoFm }) => imp.id.startsWith("peona") && imp.nivel === "ideal" ? "font-bold" : "font-semibold";
const dataHora = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? "" : d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); };

// Lista e Simulação rolam dentro da própria tela (a área principal nunca rola), para o quadro Simular em blocos não esconder o restante (pedido de 18/11/2026).
// Controle de Simulações de Datas FM (pedido de 18/11/2026): tela Lista de Simulações → tela Simulação (a anterior, com o Cenário — antes "Descrição" — numerado por ordem de inserção, e botões Gravar/Cancelar/Excluir); tudo fica neste navegador.
export default function SimularDatasFm() {
  const [lista, setLista] = useState<SimulacaoFm[]>(carregarSimulacoesFm);
  const [ultimoNumero, setUltimoNumero] = useState(carregarUltimoNumeroFm);
  // Tela Simulação edita um rascunho; só o botão Gravar leva as alterações à lista (pedido de 18/11/2026).
  const [rascunho, setRascunho] = useState<SimulacaoFm | null>(null);
  const [excluir, setExcluir] = useState<SimulacaoFm | null>(null);
  const [imprimir, setImprimir] = useState(false);
  const gravar = (proxima: SimulacaoFm[]) => {
    setLista(proxima); salvarSimulacoesFm(proxima);
    const maior = Math.max(ultimoNumero, ...proxima.map((s) => s.numero));
    if (maior !== ultimoNumero) { setUltimoNumero(maior); salvarUltimoNumeroFm(maior); }
  };
  const proximo = () => proximoNumeroFm(lista, ultimoNumero);
  if (rascunho) {
    const original = lista.find((s) => s.id === rascunho.id);
    return (
      <SimulacaoDatasFm key={rascunho.id} simulacao={rascunho} gravada={original !== undefined} alterada={simulacaoAlteradaFm(original, rascunho)}
        onAlterar={(m) => setRascunho({ ...rascunho, ...m })}
        onGravar={() => { gravar(gravarSimulacaoFm(lista, rascunho, agora())); setRascunho(null); }}
        onCancelar={() => setRascunho(null)}
        onExcluir={() => { gravar(lista.filter((s) => s.id !== rascunho.id)); setRascunho(null); }} />
    );
  }
  const nova = () => setRascunho(novaSimulacaoFm(novoId(), agora(), proximo()));
  const ordenada = ordenarSimulacoesFm(lista);
  return (
    <div className="h-full space-y-4 overflow-y-auto pb-4 pr-2 [scrollbar-gutter:stable]">
      <div className="flex items-center justify-between gap-4 max-w-screen-2xl">
        <h1 className="text-xl font-semibold">Lista de Simulações — Datas FM</h1>
        <div className="flex items-center gap-2">
          {/* Imprimir Cenários (pedido de 18/11/2026): relatório padrão com uma página por cenário. */}
          <Button size="icon" variant="outline" className="h-9 w-9" title={lista.length ? "Imprimir Cenários" : "Nenhum cenário para imprimir"} aria-label="Imprimir Cenários"
            disabled={lista.length === 0} onClick={() => setImprimir(true)}><Printer className="h-4 w-4" /></Button>
          <Button size="sm" onClick={nova}><Plus className="mr-1 h-4 w-4" />Nova simulação</Button>
        </div>
      </div>
      <div className="max-w-screen-2xl overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse whitespace-nowrap text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary text-secondary-foreground">
              <th className="w-12 px-3 py-2 text-right font-semibold">Nº</th>
              <th className="px-3 py-2 text-left font-semibold">CENÁRIO</th>
              <th className="px-3 py-2 text-center font-semibold">COMPETÊNCIA</th>
              <th className="px-3 py-2 text-right font-semibold">ARQUIVO</th>
              <th className="px-3 py-2 text-right font-semibold">FECHAMENTO</th>
              <th className="px-3 py-2 text-left font-semibold">PRAZO</th>
              <th className="px-3 py-2 text-left font-semibold">IMPACTOS</th>
              <th className="px-3 py-2 text-right font-semibold">ALTERADA EM</th>
              <th className="w-20 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {ordenada.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">Nenhuma simulação. Use “Nova simulação” para começar.</td></tr>
            ) : ordenada.map((s) => {
              const linhas = simularDatasFm(s.entrada);
              const data = (id: IdDataFm) => linhas.find((l) => l.id === id)!.data;
              return (
                <tr key={s.id} className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/50" onClick={() => setRascunho(s)} title="Abrir simulação">
                  <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{formatarNumeroFm(s.numero)}</td>
                  <td className="px-3 py-1.5">
                    <span className={s.descricao ? "font-medium" : "italic text-muted-foreground"}>{s.descricao || "Sem nome"}</span>
                    {/* Cenários simulados em blocos citados na Lista (pedido de 18/11/2026). */}
                    {s.entrada.blocos && <span className="ml-2 text-xs font-semibold text-primary">· {EM_BLOCOS_FM}</span>}
                  </td>
                  <td className="px-3 py-1.5 text-center tabular-nums">{formatarCompetencia(s.entrada.mes, s.entrada.ano)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{data("arquivo")}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{data("fechamento")}</td>
                  <td className="px-3 py-1.5 tabular-nums">{prazoFolhaFm(s.entrada)}</td>
                  <td className="px-3 py-1.5 text-xs">
                    {avaliarImpactosFm(s.entrada).map((imp, i) => (
                      <Fragment key={imp.id}>{i > 0 && <span className="text-muted-foreground"> · </span>}<span className={`${pesoImpacto(imp)} ${corNivel(imp.nivel)}`} title={`${imp.rotulo}: ${imp.status}`}>{imp.rotulo}</span></Fragment>
                    ))}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{dataHora(s.atualizadaEm)}</td>
                  <td className="px-3 py-1.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicar" aria-label={`Duplicar Cenário ${formatarNumeroFm(s.numero)}`}
                      onClick={() => gravar([...lista, duplicarSimulacaoFm(s, novoId(), agora(), proximo())])}><Copy className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Excluir" aria-label={`Excluir Cenário ${formatarNumeroFm(s.numero)}`}
                      onClick={() => setExcluir(s)}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {imprimir && (
        <PdfPreview build={async () => buildCenariosFmPdf(await loadTimbrado(), lista, { marcaAxis: await loadMarcaAxis() })}
          fileName={`Simulacoes_Datas_FM_${new Date().toISOString().slice(0, 10)}.pdf`} onClose={() => setImprimir(false)} />
      )}
      <AlertDialog open={excluir !== null} onOpenChange={(o) => { if (!o) setExcluir(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir simulação?</AlertDialogTitle>
            <AlertDialogDescription>Cenário {excluir ? formatarNumeroFm(excluir.numero) : ""}{excluir?.descricao ? ` — “${excluir.descricao}”` : ""} será removido da lista. Isso não pode ser desfeito.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (excluir) gravar(lista.filter((s) => s.id !== excluir.id)); setExcluir(null); }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Tela Simulação — Competência (MM/AAAA) e Período (dia seguinte ao Último Dia, um mês antes, a Último Dia) acima do grid, sem a linha Último Dia (pedido de 18/11/2026), Arquivo como dia/mês fora do grid e o dia de cada linha, com a data calculada; valores digitados só vão para a lista ao Gravar.
type PropsSimulacao = {
  simulacao: SimulacaoFm; gravada: boolean; alterada: boolean;
  onAlterar: (m: { descricao?: string; entrada?: EntradaDatasFm }) => void; onGravar: () => void; onCancelar: () => void; onExcluir: () => void;
};
function SimulacaoDatasFm({ simulacao, gravada, alterada, onAlterar, onGravar, onCancelar, onExcluir }: PropsSimulacao) {
  const entrada = simulacao.entrada;
  const [confirmar, setConfirmar] = useState<"cancelar" | "excluir" | null>(null);
  const [perguntarBlocos, setPerguntarBlocos] = useState(false);
  const [quantidadeTexto, setQuantidadeTexto] = useState(String(quantidadeBlocosFm(entrada)));
  const quantidadeEscolhida = quantidadeTexto === "2" ? 2 : quantidadeTexto === "1" ? 1 : 4;
  const cancelar = () => (gravada && !alterada) ? onCancelar() : setConfirmar("cancelar");
  const [texto, setTexto] = useState<Record<string, string>>({});
  const gravar = (proximo: EntradaDatasFm) => onAlterar({ entrada: proximo });
  const campo = (chave: string, valorAtual: number, min: number, max: number, aplicar: (v: number | undefined) => void) => ({
    value: texto[chave] ?? String(valorAtual),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const t = e.target.value;
      if (t !== "" && !/^\d*$/.test(t)) return;
      setTexto((p) => ({ ...p, [chave]: t }));
      const v = lerInteiro(t, min, max);
      if (v !== null) aplicar(v);
    },
    onBlur: () => setTexto((p) => { const n = { ...p }; delete n[chave]; return n; }),
  });
  const todas = simularDatasFm(entrada);
  // Arquivo da Rede (todos os blocos) e do Benê digitados à parte (pedido de 26/11/2026); vazio = data calculada.
  const campoArquivo = (chave: "arquivoRede" | "arquivoBene", rotulo: string) => {
    const padrao = chave === "arquivoRede" ? blocosPeriodoFm(entrada).at(-1)!.arquivo : hospitalBeneFm({ ...entrada, arquivoBene: undefined }).arquivo;
    const v = entrada[chave], t = texto[chave];
    return (
      <span className="flex items-center gap-2">
        <span className="font-semibold">{rotulo}:</span>
        <Input aria-label={rotulo} inputMode="numeric" placeholder={padrao.slice(0, 5)} maxLength={5} title="DD/MM; apague para usar a data calculada"
          value={t ?? (v ? `${String(v.dia).padStart(2, "0")}/${String(v.mes).padStart(2, "0")}` : "")}
          onChange={(e) => {
            const x = e.target.value; if (!/^[\d/]*$/.test(x)) return;
            setTexto((p) => ({ ...p, [chave]: x }));
            const lido = lerDiaMes(x); if (lido === null) return;
            if (lido === undefined) { const { [chave]: _, ...resto } = entrada; gravar(resto); } else gravar({ ...entrada, [chave]: lido });
          }}
          onBlur={() => setTexto((p) => { const n = { ...p }; delete n[chave]; return n; })}
          className={`h-8 w-20 text-center tabular-nums ${t && !lerDiaMes(t) ? "border-destructive" : ""}`} />
        <span className="tabular-nums text-muted-foreground">{arquivoDigitadoFm(padrao, v)}</span>
      </span>
    );
  };
  // Arquivo fica fora do grid de variáveis (pedido de 18/11/2026), logo abaixo da Competência.
  const arquivo = todas.find((l) => l.id === "arquivo")!;
  const linhas = todas.filter((l) => l.id !== "arquivo");
  const periodo = periodoFm(entrada);
  const impactos = avaliarImpactosFm(entrada);
  const [competenciaTexto, setCompetenciaTexto] = useState<string | null>(null);
  const alterarCompetencia = (t: string) => {
    if (!/^[\d/]*$/.test(t)) return;
    setCompetenciaTexto(t);
    const c = lerCompetencia(t);
    if (c) gravar({ ...entrada, ...c });
  };
  const cls = "h-8 w-20 text-right tabular-nums";
  return (
    <div className="h-full space-y-4 overflow-y-auto pb-4 pr-2 [scrollbar-gutter:stable]">
      <h1 className="text-xl font-semibold">Simulação de Datas FM</h1>
      <AlertDialog open={confirmar !== null} onOpenChange={(o) => { if (!o) setConfirmar(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmar === "excluir" ? "Excluir simulação?" : gravada ? "Descartar alterações?" : "Descartar novo cenário?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmar === "excluir"
                ? `Cenário ${formatarNumeroFm(simulacao.numero)}${simulacao.descricao ? ` — “${simulacao.descricao}”` : ""} será removido da lista. Isso não pode ser desfeito.`
                : gravada ? "As alterações feitas desde a última gravação serão perdidas." : `O Cenário ${formatarNumeroFm(simulacao.numero)} não foi gravado e não entrará na lista.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { const c = confirmar; setConfirmar(null); if (c === "excluir") onExcluir(); else onCancelar(); }}>
              {confirmar === "excluir" ? "Excluir" : "Descartar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Cenário da Simulação (antes "Descrição", pedidos de 18/11/2026), com o número por ordem de inserção. */}
      <label className="flex max-w-3xl items-center gap-2 text-sm">
        <span className="whitespace-nowrap font-semibold">Cenário {formatarNumeroFm(simulacao.numero)}:</span>
        <Input aria-label="Cenário da Simulação" placeholder="Descreva este cenário" maxLength={DESCRICAO_FM_MAX} className="h-8"
          value={simulacao.descricao} onChange={(e) => onAlterar({ descricao: e.target.value })} autoFocus={!simulacao.descricao} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <span className="font-semibold">Competência:</span>
        <Input aria-label="Competência" inputMode="numeric" placeholder="MM/AAAA" maxLength={7}
          value={competenciaTexto ?? formatarCompetencia(entrada.mes, entrada.ano)}
          onChange={(e) => alterarCompetencia(e.target.value)}
          onBlur={() => setCompetenciaTexto(null)}
          className={`h-8 w-28 text-center tabular-nums ${competenciaTexto !== null && !lerCompetencia(competenciaTexto) ? "border-destructive" : ""}`} />
      </label>
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold">Arquivo:</span>
        <Input aria-label={`Dia/mês — ${arquivo.rotulo}`} inputMode="numeric" placeholder="DD/MM" maxLength={5} title="Dia/mês (DD/MM); apague para restaurar o padrão"
          value={texto[arquivo.id] ?? arquivo.diaMes}
          onChange={(e) => {
            const t = e.target.value;
            if (!/^[\d/]*$/.test(t)) return;
            setTexto((p) => ({ ...p, [arquivo.id]: t }));
            const v = lerDiaMes(t);
            if (v === null) return;
            const dias = { ...entrada.dias };
            if (v === undefined) { delete dias[arquivo.id]; const { arquivoMes: _, ...resto } = entrada; gravar({ ...resto, dias }); }
            else { dias[arquivo.id] = v.dia; gravar({ ...entrada, dias, arquivoMes: v.mes }); }
          }}
          onBlur={() => setTexto((p) => { const n = { ...p }; delete n[arquivo.id]; return n; })}
          className={`h-8 w-20 text-center tabular-nums font-bold ${texto[arquivo.id] !== undefined && texto[arquivo.id] !== "" && !lerDiaMes(texto[arquivo.id]) ? "border-destructive" : ""}`} />
        <span className="tabular-nums font-semibold">{arquivo.data}{arquivo.ajustado ? " *" : ""}</span>
      </div>
      <p className="text-sm" title="De = dia seguinte ao Último Dia, um mês antes; Até = Último Dia">
        <span className="font-semibold">Período:</span>{" "}
        <span className="tabular-nums">{periodo.de} a {periodo.ate}</span>
      </p>
      <div className="flex flex-wrap items-center gap-3 text-sm">
      <label className="flex w-fit cursor-pointer items-center gap-2">
        <Checkbox checked={!!entrada.blocos} aria-label="Simular em blocos"
          onCheckedChange={(v) => {
            if (v === true) { setQuantidadeTexto(String(quantidadeBlocosFm(entrada))); setPerguntarBlocos(true); }
            else { const { blocos: _, quantidadeBlocos: __, beneNoBloco: ___, arquivoRede: ____, arquivoBene: _____, ...resto } = entrada; gravar(resto); }
          }} />
        <span className="font-semibold">Simular em blocos</span>
      </label>
      {entrada.blocos && <Button size="sm" variant="outline" onClick={() => { setQuantidadeTexto(String(quantidadeBlocosFm(entrada))); setPerguntarBlocos(true); }}>{quantidadeBlocosFm(entrada)} {quantidadeBlocosFm(entrada) === 1 ? "bloco" : "blocos"}</Button>}
      {entrada.blocos && <label className="flex w-fit cursor-pointer items-center gap-2">
        <Checkbox checked={!!entrada.beneNoBloco} aria-label="Benê entra nos blocos"
          onCheckedChange={(v) => { if (v === true) gravar({ ...entrada, beneNoBloco: true }); else { const { beneNoBloco: _, ...resto } = entrada; gravar(resto); } }} />
        <span className="font-semibold">Benê entra nos blocos</span>
      </label>}
      {entrada.blocos && campoArquivo("arquivoRede", "Arquivo da Rede")}
      {entrada.blocos && !entrada.beneNoBloco && campoArquivo("arquivoBene", "Arquivo do Benê")}
      </div>
      <Dialog open={perguntarBlocos} onOpenChange={setPerguntarBlocos}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Quantos blocos?</DialogTitle></DialogHeader>
          <div role="radiogroup" aria-label="Quantidade de blocos" className="flex gap-2">
            {[4, 2, 1].map((n) => <Button key={n} role="radio" aria-checked={quantidadeEscolhida === n}
              variant={quantidadeEscolhida === n ? "default" : "outline"} className="flex-1"
              onClick={() => setQuantidadeTexto(String(n))}>{n} {n === 1 ? "bloco" : "blocos"}</Button>)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPerguntarBlocos(false)}>Cancelar</Button>
            <Button onClick={() => {
              gravar({ ...entrada, blocos: true, quantidadeBlocos: quantidadeEscolhida }); setPerguntarBlocos(false);
            }}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {entrada.blocos && (() => {
        // Duas partes (pedido de 18/11/2026): Parte 1 Outros Credenciados em blocos; Parte 2 Hospital Benê com o Período geral e o Arquivo na data limite.
        const hospital = hospitalBeneFm(entrada);
        const parte = (n: number, nome: string) => (
          <tr className="border-b border-border bg-muted/30"><td colSpan={4} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parte {n} — {nome}</td></tr>
        );
        const linha = (rotulo: string, b: { de: string; ate: string; dias: number; arquivo: string }) => (
          <tr key={rotulo} className="border-b border-border last:border-b-0">
            <td className="px-3 py-1.5 font-semibold">{rotulo}</td>
            <td className="px-3 py-1.5 text-right tabular-nums">{b.de} a {b.ate}</td>
            <td className="px-3 py-1.5 text-right tabular-nums">{formatarPrazo(b.dias)} <span className="text-xs text-muted-foreground">dias</span></td>
            <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{b.arquivo}</td>
          </tr>
        );
        return (
          <div className="max-w-3xl overflow-hidden rounded-md border border-border">
            <div className="border-b border-border bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground">SIMULAÇÃO EM BLOCOS</div>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-1.5 text-left font-semibold">BLOCO</th>
                  <th className="px-3 py-1.5 text-right font-semibold">PERÍODO</th>
                  <th className="px-3 py-1.5 text-right font-semibold">DIAS</th>
                  <th className="px-3 py-1.5 text-right font-semibold" title="Outros Credenciados: dia seguinte ao fim do bloco; Hospital Benê: data limite (Arquivo do cenário)">ARQUIVO</th>
                </tr>
              </thead>
              <tbody>
                {beneNoBlocoFm(entrada) ? <>
                  {parte(1, PARTES_BLOCOS_FM.todos)}
                  {blocosRedeFm(entrada).map((b) => linha(`Bloco ${b.bloco}`, b))}
                </> : <>
                  {parte(1, PARTES_BLOCOS_FM.outros)}
                  {blocosRedeFm(entrada).map((b) => linha(`Bloco ${b.bloco}`, b))}
                  {parte(2, PARTES_BLOCOS_FM.hospital)}
                  {linha("Período geral", hospital)}
                </>}
              </tbody>
            </table>
          </div>
        );
      })()}
      <div className="max-w-3xl overflow-hidden rounded-md border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary text-secondary-foreground">
              <th className="px-3 py-2 text-left font-semibold">VARIÁVEL</th>
              <th className="px-3 py-2 text-right font-semibold">REFERÊNCIA</th>
              <th className="px-3 py-2 text-right font-semibold">DATA</th>
              <th className="px-3 py-2 text-left font-semibold" title="Dias corridos: Fechamento desde o Arquivo; DeRE, DIOPS e Pagamento desde o Fechamento">PRAZO</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const referencia = (rotulo: string, dias?: number) => (
                <td className="px-3 py-1.5">
                  {/* DeRE, DIOPS e Pagamento: REFERÊNCIA fixa, só exibida (pedido de 18/11/2026). */}
                  {l.fixo || l.id === "fechamento" ? <div className="ml-auto w-20 pr-3 text-right tabular-nums" aria-label={`Dia — ${rotulo}`} title={l.id === "fechamento" ? "Fechamento travado no dia 09 do mês seguinte ao Arquivo" : undefined}>{l.id === "fechamento" && dias !== undefined ? formatarPrazo(dias) : l.dia}</div> :
                  <Input aria-label={`Dia — ${rotulo}`} inputMode="numeric" title={l.somaAoArquivo ? "Dias somados à data do Arquivo; apague para restaurar o padrão" : "Apague para restaurar o padrão"} className={`ml-auto ${cls} ${l.destaque ? "font-bold" : ""}`}
                    {...campo(l.id, l.dia, 1, 31, (v) => {
                      const dias = { ...entrada.dias };
                      if (v === undefined) delete dias[l.id as IdDataFm]; else dias[l.id as IdDataFm] = v;
                      gravar({ ...entrada, dias });
                    })} />}
                </td>
              );
              const classe = `border-b border-border ${l.separadorAntes ? "border-t-2 border-t-foreground" : ""} ${l.destaque ? "font-bold" : ""}`;
              // Em blocos, sem linha única de Fechamento: só Fechamento Benê e Fechamento Rede (pedido de 26/11/2026).
              if (l.id === "fechamento" && entrada.blocos) return (
                <Fragment key={l.id}>
                  {fechamentosFm(entrada).map((f, i) => (
                    <tr key={f.id} className={i === 0 ? classe : "border-b border-border"}>
                      <td className="px-3 py-1.5 uppercase">{f.rotulo}</td>
                      {referencia(f.rotulo, f.dias)}
                      <td className="px-3 py-1.5 text-right tabular-nums">{f.data}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-left tabular-nums">{formatarPrazo(f.dias)} <span className="text-xs font-normal text-muted-foreground">dias desde o Arquivo {f.arquivo.slice(0, 5)}</span></td>
                    </tr>
                  ))}
                </Fragment>
              );
              return (
              <tr key={l.id} className={classe}>
                <td className="px-3 py-1.5 uppercase">{l.rotulo}</td>
                {referencia(l.rotulo, l.id === "fechamento" ? l.dia : undefined)}
                <td className="px-3 py-1.5 text-right tabular-nums" title={l.ajustado ? "Dia limitado ao último dia do mês" : undefined}>
                  {l.data}{l.ajustado ? " *" : ""}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-left tabular-nums">{formatarPrazo(l.diasBase)} <span className="text-xs font-normal text-muted-foreground">{Math.abs(l.diasBase) === 1 ? "dia" : "dias"} desde o {l.base}</span></td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="max-w-3xl overflow-hidden rounded-md border border-border">
        <div className="border-b border-border bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground">IMPACTOS</div>
        <table className="w-full border-collapse text-sm">
          <tbody>
            {impactos.map((imp) => (
              <tr key={imp.id} className="border-b border-border align-middle last:border-b-0">
                <td className="w-20 px-3 py-1.5 font-semibold">{imp.rotulo}</td>
                <td className="w-14 px-3 py-1.5 text-right tabular-nums">{formatarPrazo(imp.dias)}</td>
                {/* Três níveis (pedido de 18/11/2026): Ideal em verde claro, Moderado em laranja, Crítico em vermelho, sem setas. */}
                <td className={`w-36 whitespace-nowrap px-3 py-1.5 ${pesoImpacto(imp)} ${corNivel(imp.nivel)}`}>
                  {imp.status}
                </td>
                <td className="px-3 py-1.5 text-muted-foreground">{imp.descricao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Botões Gravar, Cancelar e Excluir no final da tela (pedidos de 18/11/2026): Gravar e Cancelar voltam à Lista; Excluir só para Cenário já gravado. */}
      <div className="flex max-w-3xl items-center justify-end gap-2 border-t border-border pt-4">
        <Button size="sm" onClick={onGravar}><Save className="mr-1 h-4 w-4" />Gravar</Button>
        <Button size="sm" variant="outline" onClick={cancelar}><X className="mr-1 h-4 w-4" />Cancelar</Button>
        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" disabled={!gravada}
          title={gravada ? undefined : "Cenário ainda não gravado"} onClick={() => setConfirmar("excluir")}><Trash2 className="mr-1 h-4 w-4" />Excluir</Button>
      </div>
    </div>
  );
}
