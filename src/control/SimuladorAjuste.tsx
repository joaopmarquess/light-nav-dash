import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CENARIOS_AJUSTE, LINHAS_AJUSTE, ROTULOS_CENARIO_AJUSTE, formatarAjuste, type CenarioAjuste, type LinhaAjuste } from "@/control/simulador/ajuste";

const corValor = (linha: LinhaAjuste, valor: number) =>
  linha.tipo === "resultado"
    ? valor < 0 ? "text-[hsl(var(--ajuste-negativo-claro))]" : "text-[hsl(var(--ajuste-positivo-claro))]"
    : valor < 0 ? "text-[hsl(var(--ajuste-negativo))]" : "";

const fundoCelula = (linha: LinhaAjuste, cenario: CenarioAjuste) =>
  linha.tipo === "item" || linha.tipo === "linha" ? (cenario === "realista" ? "bg-[hsl(var(--ajuste-coluna))]" : "") : "";

export default function SimuladorAjuste({ onVoltar }: { onVoltar: () => void }) {
  return <div className="h-full min-h-0 flex flex-col gap-3">
    <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
      <Button size="icon" variant="ghost" className="h-8 w-8" title="Voltar às simulações" aria-label="Voltar às simulações" onClick={onVoltar}><ArrowLeft /></Button>
      <h2 className="text-lg font-semibold">Ajuste</h2>
    </div>
    <div className="flex-1 min-h-0 overflow-auto">
      <table className="w-full text-sm tabular-nums border-collapse" aria-label="Ajuste por cenário">
        <thead>
          <tr className="bg-[hsl(var(--ajuste-head))] text-primary-foreground">
            <th className="px-4 py-2 text-left font-semibold"><span className="sr-only">Linha</span></th>
            {CENARIOS_AJUSTE.map((c) => <th key={c} className="px-5 py-2 text-right font-bold w-[20%]">{ROTULOS_CENARIO_AJUSTE[c]}</th>)}
          </tr>
        </thead>
        <tbody>
          {LINHAS_AJUSTE.map((l) => <tr key={l.chave} className={cn(
            "border-b border-border",
            l.tipo === "grupo" && "bg-[hsl(var(--ajuste-grupo))] font-bold",
            l.tipo === "resultado" && "bg-[hsl(var(--ajuste-head))] text-primary-foreground font-bold text-[15px] border-0",
          )}>
            <td className={cn("py-1", l.tipo === "item" ? "pl-10 pr-4" : "px-4")}>{l.rotulo}</td>
            {CENARIOS_AJUSTE.map((c) => <td key={c} className={cn("px-5 py-1 text-right whitespace-nowrap", fundoCelula(l, c), corValor(l, l.valores[c]))}>{formatarAjuste(l.valores[c])}</td>)}
          </tr>)}
        </tbody>
      </table>
    </div>
  </div>;
}
