import { useMemo, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  CAMPOS_GESTAO_REDE, GESTAO_REDE_PADRAO, VIDAS_MES_PADRAO, MESES_ADIANTAMENTO,
  calcularGestaoRede, formatarCampo, gravarGestaoRede, gravarVidasMes, lerGestaoRede, lerVidasMes, parseNumeroBR, totaisGestaoRede,
  type CampoGestaoRede, type ChaveGestaoRede, type TipoMes, type VariaveisGestaoRede,
} from "@/lib/uberabaGestaoRede";

const campo = (k: ChaveGestaoRede) => CAMPOS_GESTAO_REDE.find((c) => c.chave === k)!;
const textos = (v: VariaveisGestaoRede) => Object.fromEntries(CAMPOS_GESTAO_REDE.map((c) => [c.chave, formatarCampo(c, v[c.chave])])) as Record<ChaveGestaoRede, string>;
const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const fmtInt = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

const GRUPOS: { titulo: string; chaves: ChaveGestaoRede[] }[] = [
  { titulo: "Valor por vida", chaves: ["valorVidaPaulo", "valorVidaAdeir"] },
  { titulo: "Teto", chaves: ["tetoPaulo", "tetoAdeir"] },
  { titulo: "Adiantamento", chaves: ["adiantamentoPaulo", "adiantamentoAdeir"] },
  { titulo: "Vidas", chaves: ["numeroVidasTotal"] },
];
const nomeCurto = (c: CampoGestaoRede) => c.label.replace(/^(Valor Vida|Teto|Adiantamento) /, "");

const DICA_TIPO: Record<TipoMes, string> = {
  adiantamento: "Adiantamento",
  mensal: "Igual ao mensal",
  recuperacao: "Mensal menos o adiantado a mais, em partes iguais nos meses que alcançam o teto",
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
  const [vidasGravadas, setVidasGravadas] = useState<number[]>(() => lerVidasMes(localStorage));
  const [edit, setEdit] = useState(() => textos(gravado));
  const [vidasEdit, setVidasEdit] = useState<string[]>(() => vidasGravadas.map(fmtInt));

  const numeros = useMemo(() => Object.fromEntries(CAMPOS_GESTAO_REDE.map((c) => [c.chave, parseNumeroBR(edit[c.chave])])) as VariaveisGestaoRede, [edit]);
  const vidas = useMemo(() => vidasEdit.map(parseNumeroBR), [vidasEdit]);
  const invalido = (c: CampoGestaoRede) => !Number.isFinite(numeros[c.chave]) || numeros[c.chave] < 0;
  const vidaInvalida = (i: number) => !Number.isFinite(vidas[i]) || vidas[i] < 0;
  const algumInvalido = CAMPOS_GESTAO_REDE.some(invalido) || vidas.some((_, i) => vidaInvalida(i));
  const alterado = CAMPOS_GESTAO_REDE.some((c) => numeros[c.chave] !== gravado[c.chave]) || vidas.some((v, i) => v !== vidasGravadas[i]);

  const linhas = useMemo(() => (algumInvalido ? null : calcularGestaoRede(numeros, vidas)), [algumInvalido, numeros, vidas]);
  const totais = linhas ? totaisGestaoRede(linhas) : null;

  const gravar = () => {
    try {
      const salvo = gravarGestaoRede(localStorage, numeros);
      const v = gravarVidasMes(localStorage, vidas);
      setGravado(salvo); setVidasGravadas(v);
      setEdit(textos(salvo)); setVidasEdit(v.map(fmtInt));
      toast({ title: "Gestão Rede gravada" });
    } catch (e) {
      toast({ title: "Não foi possível gravar", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };
  const restaurar = () => { setEdit(textos(GESTAO_REDE_PADRAO)); setVidasEdit(VIDAS_MES_PADRAO.map(fmtInt)); };

  const th = "px-3 py-2 text-right text-xs font-semibold text-muted-foreground";
  const sep = "border-l border-border";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:items-start">
      <aside aria-label="Variáveis" className="w-full shrink-0 space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm lg:w-64">
        {GRUPOS.map((g) => (
          <fieldset key={g.titulo} className="space-y-2">
            <legend className="mb-1 text-sm font-semibold text-foreground">{g.titulo}</legend>
            {g.chaves.map((k) => {
              const c = campo(k);
              const erro = invalido(c);
              return (
                <div key={k} className="grid grid-cols-[4.5rem_1fr] items-center gap-2">
                  <Label htmlFor={`gr-${k}`} className="text-xs text-muted-foreground" title={c.label}>{k === "numeroVidasTotal" ? "Total" : nomeCurto(c)}</Label>
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
        {algumInvalido && <p className="text-xs text-destructive">Corrija os campos em vermelho (número igual ou maior que zero).</p>}
        <div className="flex flex-col gap-2 pt-1">
          <Button onClick={gravar} disabled={algumInvalido || !alterado}><Save />Gravar</Button>
          <Button variant="outline" onClick={restaurar}><RotateCcw />Restaurar</Button>
          {alterado && <span className="text-center text-xs text-muted-foreground">Alterações não gravadas</span>}
        </div>
      </aside>

      <section aria-label="Antecipação e Mensal" className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th />
              <th colSpan={3} className={cn("px-3 py-2 text-center text-sm font-semibold text-foreground", sep)}>Antecipação</th>
              <th colSpan={4} className={cn("px-3 py-2 text-center text-sm font-semibold text-foreground", sep)}>Mensal</th>
            </tr>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Mês</th>
              <th className={cn(th, sep)}>Paulo</th><th className={th}>Adeir</th><th className={th}>Total</th>
              <th className={cn(th, sep)}>Vidas</th><th className={th}>Paulo</th><th className={th}>Adeir</th><th className={th}>Total</th>
            </tr>
          </thead>
          <tbody>
            {vidasEdit.map((txt, i) => {
              const l = linhas?.[i];
              return (
                <tr key={i} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-1.5 text-center tabular-nums text-muted-foreground">{i + 1}</td>
                  {l ? <><CelulaAntecipacao valor={l.antecipacaoPaulo} tipo={l.tipoPaulo} /><CelulaAntecipacao valor={l.antecipacaoAdeir} tipo={l.tipoAdeir} /></> : <><td /><td /></>}
                  <td className="px-3 py-1.5 text-right font-medium tabular-nums">{l ? fmt(l.antecipacaoTotal) : "—"}</td>
                  <td className={cn("px-1.5 py-1", sep)}>
                    <Input
                      aria-label={`Vidas mês ${i + 1}`}
                      inputMode="numeric"
                      value={txt}
                      aria-invalid={vidaInvalida(i)}
                      onChange={(e) => setVidasEdit((s) => s.map((x, j) => (j === i ? e.target.value : x)))}
                      onBlur={() => { if (!vidaInvalida(i)) setVidasEdit((s) => s.map((x, j) => (j === i ? fmtInt(vidas[i]) : x))); }}
                      className={cn("h-7 text-right tabular-nums", vidaInvalida(i) && "border-destructive")}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{l ? fmt(l.mensalPaulo) : "—"}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{l ? fmt(l.mensalAdeir) : "—"}</td>
                  <td className="px-3 py-1.5 text-right font-medium tabular-nums">{l ? fmt(l.mensalTotal) : "—"}</td>
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
                <td className={cn("px-3 py-2", sep)} />
                <td className="px-3 py-2 text-right tabular-nums">{fmt(totais.mensalPaulo)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(totais.mensalAdeir)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(totais.mensalTotal)}</td>
              </tr>
            </tfoot>
          )}
        </table>
        <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          Antecipação: meses 1 a {MESES_ADIANTAMENTO} pagam o adiantamento; depois, o mensal (vidas × valor por vida). O valor adiantado a mais é descontado em partes iguais nos meses em que o mensal alcança o teto.
        </p>
      </section>
    </div>
  );
}
