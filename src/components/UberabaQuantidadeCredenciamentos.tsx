import { useState } from "react";
import { Input } from "@/components/ui/input";
import { carregarAutorizados, lerAutorizado, linhasQuantidadeCredenciamentos, salvarAutorizados, type AutorizadosCredenciamento } from "@/lib/uberabaQuantidadeCredenciamentos";

const numero = (v: number) => v.toLocaleString("pt-BR");

// Grid Tipo Credenciado · Disponível · Autorizado; Autorizado editável (começa pelo Limite), gravado neste navegador.
export default function UberabaQuantidadeCredenciamentos() {
  const [autorizados, setAutorizados] = useState<AutorizadosCredenciamento>(carregarAutorizados);
  const { linhas, total } = linhasQuantidadeCredenciamentos(autorizados);
  const alterar = (id: keyof AutorizadosCredenciamento, texto: string) => {
    const valor = lerAutorizado(texto);
    if (valor === null) return;
    const proximo = { ...autorizados };
    if (valor === undefined) delete proximo[id]; else proximo[id] = valor;
    setAutorizados(proximo);
    salvarAutorizados(proximo);
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-left font-semibold">TIPO CREDENCIADO</th>
            <th className="px-3 py-2 text-right font-semibold">DISPONÍVEL</th>
            <th className="px-3 py-2 text-right font-semibold">AUTORIZADO</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.id} className="border-b border-border">
              <td className="px-3 py-1.5">{l.tipo}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{numero(l.disponivel)}</td>
              <td className="px-3 py-1.5 text-right">
                <Input inputMode="numeric" aria-label={`Autorizado — ${l.tipo}`} title={`Limite: ${numero(l.limite)} (apague para restaurar)`}
                  value={autorizados[l.id] ?? ""} placeholder={String(l.limite)}
                  onChange={(e) => alterar(l.id, e.target.value)}
                  className="ml-auto h-8 w-24 text-right tabular-nums placeholder:text-foreground" />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td className="px-3 py-2">TOTAL</td>
            <td className="px-3 py-2 text-right tabular-nums">{numero(total.disponivel)}</td>
            <td className="px-3 py-2 text-right tabular-nums">{numero(total.autorizado)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="px-3 pt-2 text-xs text-muted-foreground">Autorizado começa pelo Limite de cada tipo; apague o campo para restaurá-lo.</p>
    </div>
  );
}
