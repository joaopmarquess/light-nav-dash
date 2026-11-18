import { Fragment, useState } from "react";
import { ArrowLeft, Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { alterarSimulacaoFm, carregarSimulacoesFm, DESCRICAO_FM_MAX, duplicarSimulacaoFm, novaSimulacaoFm, ordenarSimulacoesFm, salvarSimulacoesFm, type NivelImpactoFm, type SimulacaoFm, formatarCompetencia, lerCompetencia, lerDiaMes, avaliarImpactosFm, formatarPrazo, lerInteiro, periodoFm, REFERENCIA_ULTIMO_DIA_PADRAO, simularDatasFm, type EntradaDatasFm, type IdDataFm } from "@/lib/simularDatasFm";

const novoId = () => globalThis.crypto?.randomUUID?.() ?? `fm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const agora = () => new Date().toISOString();
const corNivel = (n: NivelImpactoFm) => n === "critico" ? "text-destructive" : n === "moderado" ? "text-[hsl(var(--impacto-moderado))]" : "text-[hsl(var(--impacto-ok))]";
const dataHora = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? "" : d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); };

// Controle de Simulações de Datas FM (pedido de 18/11/2026): tela Lista de Simulações → tela Simulação (a anterior, com Descrição); tudo fica neste navegador.
export default function SimularDatasFm() {
  const [lista, setLista] = useState<SimulacaoFm[]>(carregarSimulacoesFm);
  const [aberta, setAberta] = useState<string | null>(null);
  const [excluir, setExcluir] = useState<SimulacaoFm | null>(null);
  const gravar = (proxima: SimulacaoFm[]) => { setLista(proxima); salvarSimulacoesFm(proxima); };
  const atual = lista.find((s) => s.id === aberta);
  if (atual) return (
    <SimulacaoDatasFm key={atual.id} simulacao={atual} onVoltar={() => setAberta(null)}
      onAlterar={(m) => gravar(alterarSimulacaoFm(lista, atual.id, m, agora()))} />
  );
  const nova = () => { const s = novaSimulacaoFm(novoId(), agora()); gravar([...lista, s]); setAberta(s.id); };
  const ordenada = ordenarSimulacoesFm(lista);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 max-w-5xl">
        <h1 className="text-xl font-semibold">Lista de Simulações — Datas FM</h1>
        <Button size="sm" onClick={nova}><Plus className="mr-1 h-4 w-4" />Nova simulação</Button>
      </div>
      <div className="max-w-5xl overflow-hidden rounded-md border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary text-secondary-foreground">
              <th className="px-3 py-2 text-left font-semibold">DESCRIÇÃO</th>
              <th className="px-3 py-2 text-center font-semibold">COMPETÊNCIA</th>
              <th className="px-3 py-2 text-right font-semibold">ARQUIVO</th>
              <th className="px-3 py-2 text-right font-semibold">FECHAMENTO</th>
              <th className="px-3 py-2 text-left font-semibold">IMPACTOS</th>
              <th className="px-3 py-2 text-right font-semibold">ALTERADA EM</th>
              <th className="w-20 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {ordenada.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Nenhuma simulação. Use “Nova simulação” para começar.</td></tr>
            ) : ordenada.map((s) => {
              const linhas = simularDatasFm(s.entrada);
              const data = (id: IdDataFm) => linhas.find((l) => l.id === id)!.data;
              return (
                <tr key={s.id} className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/50" onClick={() => setAberta(s.id)} title="Abrir simulação">
                  <td className={`px-3 py-1.5 ${s.descricao ? "font-medium" : "italic text-muted-foreground"}`}>{s.descricao || "Sem descrição"}</td>
                  <td className="px-3 py-1.5 text-center tabular-nums">{formatarCompetencia(s.entrada.mes, s.entrada.ano)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{data("arquivo")}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{data("fechamento")}</td>
                  <td className="px-3 py-1.5 text-xs">
                    {avaliarImpactosFm(s.entrada).map((imp, i) => (
                      <Fragment key={imp.id}>{i > 0 && <span className="text-muted-foreground"> · </span>}<span className={`font-semibold ${corNivel(imp.nivel)}`} title={`${imp.rotulo}: ${imp.status}`}>{imp.rotulo}</span></Fragment>
                    ))}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{dataHora(s.atualizadaEm)}</td>
                  <td className="px-3 py-1.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicar" aria-label={`Duplicar ${s.descricao || "simulação"}`}
                      onClick={() => gravar([...lista, duplicarSimulacaoFm(s, novoId(), agora())])}><Copy className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Excluir" aria-label={`Excluir ${s.descricao || "simulação"}`}
                      onClick={() => setExcluir(s)}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <AlertDialog open={excluir !== null} onOpenChange={(o) => { if (!o) setExcluir(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir simulação?</AlertDialogTitle>
            <AlertDialogDescription>“{excluir?.descricao || "Sem descrição"}” será removida da lista. Isso não pode ser desfeito.</AlertDialogDescription>
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

// Tela Simulação — Competência (MM/AAAA) e Período (dia seguinte ao Último Dia, um mês antes, a Último Dia) acima do grid, sem a linha Último Dia (pedido de 18/11/2026), Arquivo como dia/mês fora do grid e o dia de cada linha, com a data calculada; valores digitados ficam neste navegador.
function SimulacaoDatasFm({ simulacao, onAlterar, onVoltar }: { simulacao: SimulacaoFm; onAlterar: (m: { descricao?: string; entrada?: EntradaDatasFm }) => void; onVoltar: () => void }) {
  const entrada = simulacao.entrada;
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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onVoltar} className="-ml-2"><ArrowLeft className="mr-1 h-4 w-4" />Lista de Simulações</Button>
      </div>
      <h1 className="text-xl font-semibold">Simulação de Datas FM</h1>
      {/* Descrição da Simulação (pedido de 18/11/2026), mostrada na Lista de Simulações. */}
      <label className="flex max-w-3xl items-center gap-2 text-sm">
        <span className="whitespace-nowrap font-semibold">Descrição:</span>
        <Input aria-label="Descrição da Simulação" placeholder="Descreva esta simulação" maxLength={DESCRICAO_FM_MAX} className="h-8"
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
      {/* Referência de Último Dia logo após a Competência (pedido de 18/11/2026); padrão 20, ainda sem efeito nos cálculos. */}
      <label className="flex items-center gap-2 text-sm">
        <span className="font-semibold">Referência de Último Dia:</span>
        <Input aria-label="Referência de Último Dia" inputMode="numeric" title="Apague para restaurar o padrão" className="h-8 w-16 text-center tabular-nums"
          {...campo("referenciaUltimoDia", entrada.referenciaUltimoDia ?? REFERENCIA_ULTIMO_DIA_PADRAO, 1, 31, (v) => {
            const { referenciaUltimoDia: _, ...resto } = entrada;
            gravar(v === undefined ? resto : { ...resto, referenciaUltimoDia: v });
          })} />
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
      <div className="max-w-3xl overflow-hidden rounded-md border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary text-secondary-foreground">
              <th className="px-3 py-2 text-left font-semibold">VARIÁVEL</th>
              <th className="px-3 py-2 text-right font-semibold">REFERÊNCIA</th>
              <th className="px-3 py-2 text-right font-semibold">DATA</th>
              <th className="px-3 py-2 text-left font-semibold" title="Dias corridos: Fechamento desde o Arquivo; Dare, DIOPS e Pagamento desde o Fechamento">PRAZO</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <Fragment key={l.id}>
              <tr className={`border-b border-border ${l.separadorAntes ? "border-t-2 border-t-foreground" : ""} ${l.destaque ? "font-bold" : ""}`}>
                <td className="px-3 py-1.5 uppercase">{l.rotulo}</td>
                <td className="px-3 py-1.5">
                  {/* Dare, DIOPS e Pagamento: REFERÊNCIA fixa, só exibida (pedido de 18/11/2026). */}
                  {l.fixo ? <div className="ml-auto w-20 pr-3 text-right tabular-nums" aria-label={`Dia — ${l.rotulo}`}>{l.dia}</div> :
                  <Input aria-label={`Dia — ${l.rotulo}`} inputMode="numeric" title={l.somaAoArquivo ? "Dias somados à data do Arquivo; apague para restaurar o padrão" : "Apague para restaurar o padrão"} className={`ml-auto ${cls} ${l.destaque ? "font-bold" : ""}`}
                    {...campo(l.id, l.dia, 1, 31, (v) => {
                      const dias = { ...entrada.dias };
                      if (v === undefined) delete dias[l.id as IdDataFm]; else dias[l.id as IdDataFm] = v;
                      gravar({ ...entrada, dias });
                    })} />}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums" title={l.ajustado ? "Dia limitado ao último dia do mês" : undefined}>
                  {l.data}{l.ajustado ? " *" : ""}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-left tabular-nums">{formatarPrazo(l.diasBase)} <span className="text-xs font-normal text-muted-foreground">{Math.abs(l.diasBase) === 1 ? "dia" : "dias"} desde o {l.base}</span></td>
              </tr>
              </Fragment>
            ))}
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
                <td className={`w-36 whitespace-nowrap px-3 py-1.5 font-semibold ${corNivel(imp.nivel)}`}>
                  {imp.status}
                </td>
                <td className="px-3 py-1.5 text-muted-foreground">{imp.descricao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
