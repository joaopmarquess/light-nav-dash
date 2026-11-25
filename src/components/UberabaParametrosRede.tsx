import { useState } from "react";
import { Input } from "@/components/ui/input";
import GuardarDefaultButton from "@/components/GuardarDefaultButton";
import { guardarDefaultParametrosRede, CAMPOS_PARAMETROS_REDE, carregarParametrosRede, lerParametroRede, parametrosRede, salvarParametrosRede, type CampoParametroRede, type ParametrosRede } from "@/lib/uberabaParametrosRede";

const formatar = (v: number, moeda: boolean) => v.toLocaleString("pt-BR", moeda ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 });

// Parâmetros de Resultados Rede: Parcelas fixas, Valor Parcela e Valor por vida, editáveis e gravados neste navegador (apague para restaurar o padrão).
export default function UberabaParametrosRede() {
  const [digitados, setDigitados] = useState<Partial<ParametrosRede>>(carregarParametrosRede);
  const [editando, setEditando] = useState<Partial<Record<CampoParametroRede, string>>>({});
  const efetivos = parametrosRede(digitados);
  const alterar = (campo: CampoParametroRede, inteiro: boolean, texto: string) => {
    const v = lerParametroRede(texto, inteiro);
    if (v === null) return;
    setEditando((e) => ({ ...e, [campo]: texto }));
    const proximo = { ...digitados };
    if (v === undefined) delete proximo[campo]; else proximo[campo] = v;
    setDigitados(proximo);
    salvarParametrosRede(proximo);
  };
  return (
    <div>
    <div className="grid gap-x-6 gap-y-2 sm:grid-cols-4">
      {CAMPOS_PARAMETROS_REDE.map(({ campo, rotulo, moeda, inteiro }) => (
        <label key={campo} className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">{rotulo}{moeda ? " (R$)" : ""}</span>
          <Input inputMode={inteiro ? "numeric" : "decimal"} aria-label={rotulo} title="Apague para restaurar o padrão"
            value={editando[campo] ?? (digitados[campo] !== undefined ? formatar(efetivos[campo], moeda) : "")}
            placeholder={formatar(efetivos[campo], moeda)}
            onChange={(e) => alterar(campo, inteiro, e.target.value)}
            onBlur={() => setEditando((e) => { const p = { ...e }; delete p[campo]; return p; })}
            className="h-8 w-36 text-right tabular-nums placeholder:text-foreground" />
        </label>
      ))}
    </div>
    <GuardarDefaultButton onGuardar={() => guardarDefaultParametrosRede(digitados)} />
    </div>
  );
}
