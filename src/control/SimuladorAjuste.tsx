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
    : valor < 0 ? "text-[hsl(var(--ajuste-negativo))]" : "";

const fundoCelula = (linha: LinhaAjuste, cenario: CenarioAjuste) =>
  linha.tipo === "item" || linha.tipo === "linha" ? (cenario === "realista" ? "bg-[hsl(var(--ajuste-coluna))]" : "") : "";

const lerAlteracoes = (): AlteracoesAjuste => {
  try { return JSON.parse(localStorage.getItem(CHAVE_ALTERACOES_AJUSTE) ?? "{}") ?? {}; } catch { return {}; }
};

const temAlteracoes = (a: AlteracoesAjuste) =>
  CENARIOS_AJUSTE.some((c) => a[c]?.faturamento !== undefined || Object.keys(a[c]?.percentuais ?? {}).length > 0);

/** Campo de texto que mostra o número formatado e, enquanto digita, guarda o rascunho. */
function CampoAjuste({ valor, aoMudar, rotulo, alterado, largura }: { valor: string; aoMudar: (texto: string) => void; rotulo: string; alterado: boolean; largura: string }) {
  const [rascunho, setRascunho] = useState<string | null>(null);
  return <input
    type="text" inputMode="decimal" aria-label={rotulo} title={rotulo}
    value={rascunho ?? valor}
    onFocus={(e) => e.currentTarget.select()}
    onChange={(e) => { setRascunho(e.target.value); aoMudar(e.target.value); }}
    onBlur={() => setRascunho(null)}
    onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setRascunho(null); e.currentTarget.blur(); } }}
    className={cn(
      "h-6 rounded-sm border border-dashed border-border bg-background/70 px-1 text-right tabular-nums text-inherit focus:outline-none focus:ring-1 focus:ring-ring",
      alterado && "border-solid bg-[hsl(var(--ajuste-editado))] font-semibold text-foreground",
      largura,
    )}
  />;
}

export default function SimuladorAjuste({ onVoltar }: { onVoltar: () => void }) {
  const [alteracoes, setAlteracoes] = useState<AlteracoesAjuste>(lerAlteracoes);
  useEffect(() => { localStorage.setItem(CHAVE_ALTERACOES_AJUSTE, JSON.stringify(alteracoes)); }, [alteracoes]);
  const valores = useMemo(
    () => Object.fromEntries(CENARIOS_AJUSTE.map((c) => [c, valoresCenarioAjuste(c, alteracoes[c])])) as Record<CenarioAjuste, Record<ChaveLinhaAjuste, number>>,
    [alteracoes],
  );
  const alterado = temAlteracoes(alteracoes);

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

  return <div className="h-full min-h-0 flex flex-col gap-3">
    <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
      <Button size="icon" variant="ghost" className="h-8 w-8" title="Voltar às simulações" aria-label="Voltar às simulações" onClick={onVoltar}><ArrowLeft /></Button>
      <h2 className="text-lg font-semibold">Ajuste</h2>
      <span className="text-sm text-muted-foreground">% sobre o Faturamento de cada cenário</span>
      <Button size="sm" variant="outline" className="ml-auto h-8" disabled={!alterado} title="Voltar aos percentuais e valores originais" onClick={() => setAlteracoes({})}>
        <RotateCcw /> Reverter
      </Button>
    </div>
    <div className="flex-1 min-h-0 overflow-auto">
      <table className="w-full text-sm tabular-nums border-collapse" aria-label="Ajuste por cenário">
        <thead>
          <tr className="bg-[hsl(var(--ajuste-head))] text-primary-foreground">
            <th className="px-4 py-2 text-left font-semibold"><span className="sr-only">Linha</span></th>
            {CENARIOS_AJUSTE.map((c) => <th key={c} colSpan={2} className="px-5 py-2 text-right font-bold w-[24%]">{ROTULOS_CENARIO_AJUSTE[c]}</th>)}
          </tr>
        </thead>
        <tbody>
          {LINHAS_AJUSTE.map((l) => <tr key={l.chave} className={cn(
            "border-b border-border",
            l.tipo === "grupo" && "bg-[hsl(var(--ajuste-grupo))] font-bold",
            l.tipo === "resultado" && "bg-[hsl(var(--ajuste-head))] text-primary-foreground font-bold text-[15px] border-0",
          )}>
            <td className={cn("py-1", l.tipo === "item" ? "pl-10 pr-4" : "px-4")}>{l.rotulo}</td>
            {CENARIOS_AJUSTE.map((c) => {
              const valor = valores[c][l.chave];
              const pct = percentualSobreFaturamento(valor, valores[c].faturamento);
              const pctAlterado = alteracoes[c]?.percentuais?.[l.chave] !== undefined;
              const nome = `${l.rotulo} · ${ROTULOS_CENARIO_AJUSTE[c]}`;
              return [
                <td key={`${c}-p`} className={cn("pl-5 pr-1 py-0.5 text-right whitespace-nowrap", fundoCelula(l, c), corValor(l, valor), l.tipo !== "resultado" && "opacity-90")}>
                  {percentualEditavel(l.chave)
                    ? <><CampoAjuste valor={formatarPercentualAjuste(pct)} rotulo={`Percentual sobre o Faturamento · ${nome}`} alterado={pctAlterado} largura="w-[4.6rem]" aoMudar={(t) => mudarPercentual(c, l.chave, t)} /><span className="inline-block w-3 text-left">%</span></>
                    : <>{formatarPercentualAjuste(pct)}<span className="inline-block w-3 text-left">%</span></>}
                </td>,
                <td key={`${c}-v`} className={cn("pl-2 pr-5 py-0.5 text-right whitespace-nowrap", fundoCelula(l, c), corValor(l, valor))}>
                  {l.chave === "faturamento"
                    ? <CampoAjuste valor={formatarAjuste(valor)} rotulo={`Valor · ${nome}`} alterado={alteracoes[c]?.faturamento !== undefined} largura="w-[9rem]" aoMudar={(t) => mudarFaturamento(c, t)} />
                    : formatarAjuste(valor)}
                </td>,
              ];
            })}
          </tr>)}
        </tbody>
      </table>
    </div>
  </div>;
}
