import { useMemo, useState } from "react";
import { RotateCcw, Save, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  CAMPOS_GESTAO_REDE, GESTAO_REDE_PADRAO, formatarCampo, gravarGestaoRede, lerGestaoRede, parseNumeroBR,
  type CampoGestaoRede, type ChaveGestaoRede, type VariaveisGestaoRede,
} from "@/lib/uberabaGestaoRede";

const campo = (k: ChaveGestaoRede) => CAMPOS_GESTAO_REDE.find((c) => c.chave === k)!;
const textos = (v: VariaveisGestaoRede) => Object.fromEntries(CAMPOS_GESTAO_REDE.map((c) => [c.chave, formatarCampo(c, v[c.chave])])) as Record<ChaveGestaoRede, string>;

const GRUPOS: { titulo: string; icon: typeof User; chaves: ChaveGestaoRede[] }[] = [
  { titulo: "Paulo", icon: User, chaves: ["valorVidaPaulo", "tetoPaulo", "adiantamentoPaulo"] },
  { titulo: "Adeir", icon: User, chaves: ["valorVidaAdeir", "tetoAdeir", "adiantamentoAdeir"] },
  { titulo: "Vidas", icon: Users, chaves: ["numeroVidasTotal"] },
];

export default function UberabaGestaoRede() {
  const [gravado, setGravado] = useState<VariaveisGestaoRede>(() => lerGestaoRede(localStorage));
  const [edit, setEdit] = useState(() => textos(gravado));

  const numeros = useMemo(() => Object.fromEntries(CAMPOS_GESTAO_REDE.map((c) => [c.chave, parseNumeroBR(edit[c.chave])])) as VariaveisGestaoRede, [edit]);
  const invalido = (c: CampoGestaoRede) => !Number.isFinite(numeros[c.chave]) || numeros[c.chave] < 0;
  const algumInvalido = CAMPOS_GESTAO_REDE.some(invalido);
  const alterado = CAMPOS_GESTAO_REDE.some((c) => numeros[c.chave] !== gravado[c.chave]);

  const gravar = () => {
    try {
      const salvo = gravarGestaoRede(localStorage, numeros);
      setGravado(salvo);
      setEdit(textos(salvo));
      toast({ title: "Variáveis gravadas" });
    } catch (e) {
      toast({ title: "Não foi possível gravar", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };
  const restaurar = () => setEdit(textos(GESTAO_REDE_PADRAO));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        {GRUPOS.map((g) => (
          <section key={g.titulo} aria-label={g.titulo} className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground"><g.icon className="h-4 w-4 text-primary" />{g.titulo}</h3>
            <div className="space-y-3">
              {g.chaves.map((k) => {
                const c = campo(k);
                const erro = invalido(c);
                return (
                  <div key={k} className="space-y-1">
                    <Label htmlFor={`gr-${k}`} className="text-xs text-muted-foreground">{c.label}</Label>
                    <div className="relative">
                      {c.tipo === "moeda" && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>}
                      <Input
                        id={`gr-${k}`}
                        inputMode={c.tipo === "moeda" ? "decimal" : "numeric"}
                        value={edit[k]}
                        aria-invalid={erro}
                        onChange={(e) => setEdit((s) => ({ ...s, [k]: e.target.value }))}
                        onBlur={() => { if (!erro) setEdit((s) => ({ ...s, [k]: formatarCampo(c, numeros[k]) })); }}
                        className={cn("text-right tabular-nums", c.tipo === "moeda" && "pl-10", erro && "border-destructive focus-visible:ring-destructive")}
                      />
                    </div>
                    {erro && <p className="text-xs text-destructive">Informe um número igual ou maior que zero.</p>}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2">
        {alterado && <span className="text-xs text-muted-foreground">Alterações não gravadas</span>}
        <Button variant="outline" onClick={restaurar}><RotateCcw />Restaurar</Button>
        <Button onClick={gravar} disabled={algumInvalido || !alterado}><Save />Gravar</Button>
      </div>
    </div>
  );
}
