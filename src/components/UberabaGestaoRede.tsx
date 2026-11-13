import { useMemo, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import BlocoRecolhido from "@/components/BlocoRecolhido";
import {
  CAMPOS_GESTAO_REDE, GESTAO_REDE_PADRAO, MESES_ADIANTAMENTO, MESES_GESTAO_REDE,
  calcularGestaoRede, formatarCampo, gravarGestaoRede, lerGestaoRede, parseNumeroBR, totaisGestaoRede,
  type CampoGestaoRede, type ChaveGestaoRede, type TipoMes, type VariaveisGestaoRede,
} from "@/lib/uberabaGestaoRede";

const campo = (k: ChaveGestaoRede) => CAMPOS_GESTAO_REDE.find((c) => c.chave === k)!;
const textos = (v: VariaveisGestaoRede) => Object.fromEntries(CAMPOS_GESTAO_REDE.map((c) => [c.chave, formatarCampo(c, v[c.chave])])) as Record<ChaveGestaoRede, string>;
const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtMoeda = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

const GRUPOS: { titulo: string; chaves: ChaveGestaoRede[] }[] = [
  { titulo: "Valor por vida", chaves: ["valorVidaPaulo", "valorVidaAdeir"] },
  { titulo: "Teto", chaves: ["tetoPaulo", "tetoAdeir"] },
  { titulo: "Adiantamento", chaves: ["adiantamentoPaulo", "adiantamentoAdeir"] },
  { titulo: "Vidas", chaves: ["numeroVidasTotal"] },
  { titulo: "Ticket", chaves: ["ticket"] },
];
const nomeCurto = (c: CampoGestaoRede) => c.label.replace(/^(Valor Vida|Teto|Adiantamento) /, "");

const DICA_TIPO: Record<TipoMes, string> = {
  adiantamento: "Adiantamento",
  mensal: "Igual ao mensal",
  recuperacao: `Mensal menos o adiantado a mais nos ${MESES_ADIANTAMENTO} primeiros meses, em partes iguais`,
};

function CelulaAntecipacao({ valor, tipo }: { valor: number; tipo: TipoMes }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <td className={cn("px-3 py-1.5 text-right tabular-nums", tipo === "adiantamento" && "bg-accent font-medium text-primary", tipo === "recuperacao" && "bg-muted font-medium", valor < 0 && "text-destructive")}>{fmt(valor)}</td>
      </TooltipTrigger>
      <TooltipContent>{DICA_TIPO[tipo]}</TooltipContent>
    </Tooltip>
  );
}

export default function UberabaGestaoRede() {
  const [gravado, setGravado] = useState<VariaveisGestaoRede>(() => lerGestaoRede(localStorage));
  const [edit, setEdit] = useState(() => textos(gravado));

  const numeros = useMemo(() => Object.fromEntries(CAMPOS_GESTAO_REDE.map((c) => [c.chave, parseNumeroBR(edit[c.chave])])) as VariaveisGestaoRede, [edit]);
  const invalido = (c: CampoGestaoRede) => !Number.isFinite(numeros[c.chave]) || numeros[c.chave] < 0;
  const algumInvalido = CAMPOS_GESTAO_REDE.some(invalido);
  const alterado = CAMPOS_GESTAO_REDE.some((c) => numeros[c.chave] !== gravado[c.chave]);

  const linhas = useMemo(() => (algumInvalido ? null : calcularGestaoRede(numeros)), [algumInvalido, numeros]);
  const totais = linhas ? totaisGestaoRede(linhas) : null;

  const gravar = () => {
    try {
      const salvo = gravarGestaoRede(localStorage, numeros);
      setGravado(salvo);
      setEdit(textos(salvo));
      toast({ title: "Gestão Rede gravada" });
    } catch (e) {
      toast({ title: "Não foi possível gravar", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };
  const restaurar = () => setEdit(textos(GESTAO_REDE_PADRAO));

  const th = "px-3 py-2 text-right text-xs font-semibold text-muted-foreground";
  const sep = "border-l border-border";

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <BlocoRecolhido titulo="Variáveis">
      <div className="grid gap-4 bg-card p-4 sm:grid-cols-3 xl:grid-cols-6">
        {GRUPOS.map((g) => (
          <fieldset key={g.titulo} className="space-y-2">
            <legend className="mb-1 text-sm font-semibold text-foreground">{g.titulo}</legend>
            {g.chaves.map((k) => {
              const c = campo(k);
              const erro = invalido(c);
              return (
                <div key={k} className="grid grid-cols-[4.5rem_1fr] items-center gap-2">
                  <Label htmlFor={`gr-${k}`} className="text-xs text-muted-foreground" title={c.label}>{k === "numeroVidasTotal" ? "Total" : k === "ticket" ? "Valor" : nomeCurto(c)}</Label>
                  <Input
                    id={`gr-${k}`}
                    aria-label={c.label}
                    inputMode={c.tipo === "moeda" ? "decimal" : "numeric"}
                    value={edit[k]}
                    aria-invalid={erro}
                    onChange={(e) => setEdit((s) => ({ ...s, [k]: e.target.value }))}
                    onBlur={() => { if (!erro) setEdit((s) => ({ ...s, [k]: formatarCampo(c, numeros[k]) })); }}
                    className={cn("h-8 text-right tabular-nums", erro && "border-destructive focus-visible:ring-destructive")}
                  />
                </div>
              );
            })}
          </fieldset>
        ))}
        <div className="flex flex-col gap-2">
          <Button size="sm" onClick={gravar} disabled={algumInvalido || !alterado}><Save />Gravar</Button>
          <Button size="sm" variant="outline" onClick={restaurar}><RotateCcw />Restaurar</Button>
          {alterado && <span className="text-center text-xs text-muted-foreground">Alterações não gravadas</span>}
        </div>
      </div>
      {algumInvalido && <p className="px-4 pb-3 text-xs text-destructive">Corrija os campos em vermelho (número igual ou maior que zero).</p>}
      </BlocoRecolhido>

      <BlocoRecolhido titulo="Antecipação × Mensal" recolhivel={false}>
      <div className="min-w-0 overflow-x-auto bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th />
              <th colSpan={3} className={cn("px-3 py-2 text-center text-sm font-semibold text-foreground", sep)}>Antecipação</th>
              <th colSpan={5} className={cn("px-3 py-2 text-center text-sm font-semibold text-foreground", sep)}>Mensal</th>
              <th className={sep} />
            </tr>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Mês</th>
              <th className={cn(th, sep)}>Paulo</th><th className={th}>Adeir</th><th className={th}>Total</th>
              <th className={cn(th, sep)} title="Vidas que entram no mês">Entradas</th><th className={th} title="Vidas acumuladas no fim do mês">Vidas</th><th className={th}>Paulo</th><th className={th}>Adeir</th><th className={th}>Total</th>
              <th className={cn(th, sep)} title="Vidas do mês × ticket">Faturamento</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: MESES_GESTAO_REDE }, (_, i) => {
              const l = linhas?.[i];
              return (
                <tr key={i} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-1.5 text-center tabular-nums text-muted-foreground">{i + 1}</td>
                  {l ? <><CelulaAntecipacao valor={l.antecipacaoPaulo} tipo={l.tipoPaulo} /><CelulaAntecipacao valor={l.antecipacaoAdeir} tipo={l.tipoAdeir} /></> : <><td /><td /></>}
                  <td className="px-3 py-1.5 text-right font-medium tabular-nums">{l ? fmt(l.antecipacaoTotal) : "—"}</td>
                  <td className={cn("px-3 py-1.5 text-right tabular-nums text-muted-foreground", sep)}>{l ? fmtInt(l.entradas) : "—"}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{l ? fmtInt(l.vidas) : "—"}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums" title={l?.tetoPaulo ? "Limitado ao teto" : undefined}>{l ? fmt(l.mensalPaulo) : "—"}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums" title={l?.tetoAdeir ? "Limitado ao teto" : undefined}>{l ? fmt(l.mensalAdeir) : "—"}</td>
                  <td className="px-3 py-1.5 text-right font-medium tabular-nums">{l ? fmt(l.mensalTotal) : "—"}</td>
                  <td className={cn("px-3 py-1.5 text-right font-medium tabular-nums", sep)}>{l ? fmtMoeda(l.faturamento) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
          {totais && (
            <tfoot>
              <tr className="border-t-2 border-foreground/70 font-semibold">
                <td className="px-3 py-2 text-center text-xs text-muted-foreground">Total</td>
                <td className={cn("px-3 py-2 text-right tabular-nums", sep)}>{fmt(totais.antecipacaoPaulo)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(totais.antecipacaoAdeir)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(totais.antecipacaoTotal)}</td>
                <td className={cn("px-3 py-2 text-right tabular-nums", sep)}>{fmtInt(totais.entradas)}</td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-right tabular-nums">{fmt(totais.mensalPaulo)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(totais.mensalAdeir)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(totais.mensalTotal)}</td>
                <td className={cn("px-3 py-2 text-right tabular-nums", sep)}>{fmtMoeda(totais.faturamento)}</td>
              </tr>
            </tfoot>
          )}
        </table>
        <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          Vidas: o total entra em partes iguais ao longo dos {MESES_GESTAO_REDE} meses. Mensal: vidas acumuladas × valor por vida, limitado ao teto. Faturamento: vidas do mês × ticket. Antecipação: meses 1 a {MESES_ADIANTAMENTO} pagam o adiantamento; os {MESES_ADIANTAMENTO} últimos meses abatem o que foi adiantado a mais, em partes iguais.
        </p>
      </div>
      </BlocoRecolhido>
    </div>
  );
}
