import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CENARIOS_AJUSTE, CHAVE_ALTERACOES_AJUSTE, LINHAS_AJUSTE, ROTULOS_CENARIO_AJUSTE, formatarAjuste, formatarPercentualAjuste,
  lerPercentualAjuste, lerValorAjuste, percentualEditavel, percentualSobreFaturamento, valorAjuste, valoresCenarioAjuste,
  type AlteracoesAjuste, type CenarioAjuste, type ChaveLinhaAjuste, type LinhaAjuste,
} from "@/control/simulador/ajuste";

const corValor = (linha: LinhaAjuste, valor: number) =>
  linha.tipo === "resultado"
    ? valor < 0 ? "text-[hsl(var(--ajuste-negativo-claro))]" : "text-[hsl(var(--ajuste-positivo-claro))]"
    : "";

const fundoCelula = (linha: LinhaAjuste, cenario: CenarioAjuste) =>
  linha.tipo === "item" || linha.tipo === "linha" ? (cenario === "realista" ? "bg-[hsl(var(--ajuste-coluna))]" : "") : "";

const lerAlteracoes = (): AlteracoesAjuste => {
  try { return JSON.parse(localStorage.getItem(CHAVE_ALTERACOES_AJUSTE) ?? "{}") ?? {}; } catch { return {}; }
};

const temAlteracoes = (a: AlteracoesAjuste) =>
  CENARIOS_AJUSTE.some((c) => a[c]?.faturamento !== undefined || Object.keys(a[c]?.percentuais ?? {}).length > 0);

/** Alterações do Ajuste, guardadas neste navegador e compartilhadas entre a tela e o slide 4. */
export function useAlteracoesAjuste() {
  const [alteracoes, setAlteracoes] = useState<AlteracoesAjuste>(lerAlteracoes);
  useEffect(() => { localStorage.setItem(CHAVE_ALTERACOES_AJUSTE, JSON.stringify(alteracoes)); }, [alteracoes]);
  return { alteracoes, setAlteracoes, alterado: temAlteracoes(alteracoes), reverter: () => setAlteracoes({}) };
}

export function BotaoReverterAjuste({ alterado, reverter, className }: { alterado: boolean; reverter: () => void; className?: string }) {
  return <Button size="sm" variant="outline" className={cn("h-8", className)} disabled={!alterado} title="Voltar aos percentuais e valores originais" onClick={reverter}>
    <RotateCcw /> Reverter
  </Button>;
}

/** Campo de texto que mostra o número formatado e, enquanto digita, guarda o rascunho. */
function CampoAjuste({ valor, aoMudar, rotulo, alterado, largura, altura }: { valor: string; aoMudar: (texto: string) => void; rotulo: string; alterado: boolean; largura: string; altura: string }) {
  const [rascunho, setRascunho] = useState<string | null>(null);
  return <input
    type="text" inputMode="decimal" aria-label={rotulo} title={rotulo}
    value={rascunho ?? valor}
    onFocus={(e) => e.currentTarget.select()}
    onChange={(e) => { setRascunho(e.target.value); aoMudar(e.target.value); }}
    onBlur={() => setRascunho(null)}
    onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setRascunho(null); e.currentTarget.blur(); } }}
    className={cn(
      "rounded-sm border border-[hsl(var(--ajuste-editado-borda))] bg-[hsl(var(--ajuste-editado))] px-1 text-right tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-ring",
      alterado && "border-[hsl(var(--ajuste-alterado-borda))] bg-[hsl(var(--ajuste-alterado))] font-semibold",
      largura, altura,
    )}
  />;
}

/** Grid do Ajuste (% sobre o Faturamento editável + valor), usado na tela e no slide 4 de Slides Simulação. */
export function GradeAjuste({ alteracoes, setAlteracoes, slide = false }: {
  alteracoes: AlteracoesAjuste;
  setAlteracoes: React.Dispatch<React.SetStateAction<AlteracoesAjuste>>;
  slide?: boolean;
}) {
  const valores = useMemo(
    () => Object.fromEntries(CENARIOS_AJUSTE.map((c) => [c, valoresCenarioAjuste(c, alteracoes[c])])) as Record<CenarioAjuste, Record<ChaveLinhaAjuste, number>>,
    [alteracoes],
  );
  const mudarPercentual = (c: CenarioAjuste, chave: ChaveLinhaAjuste, texto: string) => {
    const pct = lerPercentualAjuste(texto, valorAjuste(chave, c) < 0);
    if (pct === null) return;
    setAlteracoes((a) => ({ ...a, [c]: { ...a[c], percentuais: { ...a[c]?.percentuais, [chave]: pct } } }));
  };
  const mudarFaturamento = (c: CenarioAjuste, texto: string) => {
    const centavos = lerValorAjuste(texto);
    if (centavos === null || centavos <= 0) return;
    setAlteracoes((a) => ({ ...a, [c]: { ...a[c], faturamento: centavos } }));
  };
  const py = slide ? "py-px" : "py-0.5";
  const altura = slide ? "h-[30px]" : "h-6";
  const largPct = slide ? "w-[6.2rem]" : "w-[4.6rem]";
  const largValor = slide ? "w-[12rem]" : "w-[9rem]";
  const larg = slide ? "w-4" : "w-3";

  return <table className={cn("w-full tabular-nums border-collapse", slide ? "text-[19px]" : "text-sm")} aria-label="Ajuste por cenário">
    <thead>
      <tr className="bg-[hsl(var(--ajuste-head))] text-primary-foreground">
        <th className={cn("px-4 text-left font-semibold", slide ? "py-1.5" : "py-2")}><span className="sr-only">Linha</span></th>
        {CENARIOS_AJUSTE.map((c) => <th key={c} colSpan={2} className={cn("px-5 text-right font-bold w-[24%]", slide ? "py-1.5" : "py-2")}>{ROTULOS_CENARIO_AJUSTE[c]}</th>)}
      </tr>
    </thead>
    <tbody>
      {LINHAS_AJUSTE.map((l) => <tr key={l.chave} className={cn(
        "border-b border-border",
        l.tipo === "grupo" && "bg-[hsl(var(--ajuste-grupo))] font-bold",
        l.tipo === "resultado" && cn("bg-[hsl(var(--ajuste-head))] text-primary-foreground font-bold border-0", slide ? "text-[20px]" : "text-[15px]"),
      )}>
        <td className={cn(py, l.tipo === "item" ? (slide ? "pl-12 pr-4" : "pl-10 pr-4") : "px-4")}>{l.rotulo}</td>
        {CENARIOS_AJUSTE.map((c) => {
          const valor = valores[c][l.chave];
          const pct = percentualSobreFaturamento(valor, valores[c].faturamento);
          const pctAlterado = alteracoes[c]?.percentuais?.[l.chave] !== undefined;
          const nome = `${l.rotulo} · ${ROTULOS_CENARIO_AJUSTE[c]}`;
          return [
            <td key={`${c}-p`} className={cn("pl-5 pr-1 text-right whitespace-nowrap", py, fundoCelula(l, c), corValor(l, valor), l.tipo !== "resultado" && "opacity-90")}>
              {percentualEditavel(l.chave)
                ? <><CampoAjuste valor={formatarPercentualAjuste(pct)} rotulo={`Percentual sobre o Faturamento · ${nome}`} alterado={pctAlterado} largura={largPct} altura={altura} aoMudar={(t) => mudarPercentual(c, l.chave, t)} /><span className={cn("inline-block text-left", larg)}>%</span></>
                : <>{formatarPercentualAjuste(pct)}<span className={cn("inline-block text-left", larg)}>%</span></>}
            </td>,
            <td key={`${c}-v`} className={cn("pl-2 pr-5 text-right whitespace-nowrap", py, fundoCelula(l, c), corValor(l, valor))}>
              {l.chave === "faturamento"
                ? <CampoAjuste valor={formatarAjuste(valor)} rotulo={`Valor · ${nome}`} alterado={alteracoes[c]?.faturamento !== undefined} largura={largValor} altura={altura} aoMudar={(t) => mudarFaturamento(c, t)} />
                : formatarAjuste(valor)}
            </td>,
          ];
        })}
      </tr>)}
    </tbody>
  </table>;
}

export default function SimuladorAjuste({ onVoltar }: { onVoltar: () => void }) {
  const { alteracoes, setAlteracoes, alterado, reverter } = useAlteracoesAjuste();
  return <div className="h-full min-h-0 flex flex-col gap-3">
    <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
      <Button size="icon" variant="ghost" className="h-8 w-8" title="Voltar às simulações" aria-label="Voltar às simulações" onClick={onVoltar}><ArrowLeft /></Button>
      <h2 className="text-lg font-semibold">Ajuste</h2>
      <span className="text-sm text-muted-foreground">% sobre o Faturamento de cada cenário</span>
      <BotaoReverterAjuste alterado={alterado} reverter={reverter} className="ml-auto" />
    </div>
    <div className="flex-1 min-h-0 overflow-auto">
      <GradeAjuste alteracoes={alteracoes} setAlteracoes={setAlteracoes} />
    </div>
  </div>;
}
