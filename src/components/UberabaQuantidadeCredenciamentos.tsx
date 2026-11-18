import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { QUANTIDADE_PADRAO_ITEM, alterarItem, carregarAutorizados, carregarQuantidadesItens, chaveItem, itensExibidos, salvarQuantidadesItens, somaItens, type QuantidadesItens, lerAutorizado, linhasQuantidadeCredenciamentos, salvarAutorizados, type AutorizadosCredenciamento } from "@/lib/uberabaQuantidadeCredenciamentos";

const numero = (v: number) => v.toLocaleString("pt-BR");

// Grid Tipo Credenciado · Disponível · Autorizado; Autorizado editável (começa pelo Limite), gravado neste navegador.
export default function UberabaQuantidadeCredenciamentos() {
  const [autorizados, setAutorizados] = useState<AutorizadosCredenciamento>(carregarAutorizados);
  const { linhas, total } = linhasQuantidadeCredenciamentos(autorizados);
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const [itensQtd, setItensQtd] = useState<QuantidadesItens>(carregarQuantidadesItens);
  const alterarQtdItem = (chave: string, texto: string) => {
    const proximo = alterarItem(itensQtd, chave, texto);
    if (!proximo) return;
    setItensQtd(proximo);
    salvarQuantidadesItens(proximo);
  };
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
          {linhas.map((l) => {
            const itens = itensExibidos(l.id);
            const aberto = !!abertos[l.id];
            const Icone = aberto ? ChevronDown : ChevronRight;
            return (
            <Fragment key={l.id}>
            <tr className="border-b border-border">
              <td className="px-3 py-1.5">
                <button type="button" onClick={() => setAbertos((a) => ({ ...a, [l.id]: !a[l.id] }))} aria-expanded={aberto}
                  aria-label={`${aberto ? "Recolher" : "Abrir"} ${l.tipo}`} className="inline-flex items-center gap-1 text-left hover:underline">
                  <Icone className="h-4 w-4 shrink-0" />{l.tipo}<span className="ml-1 text-xs text-muted-foreground">({itens.length})</span>
                </button>
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums">{l.disponivel == null ? "—" : numero(l.disponivel)}</td>
              <td className="px-3 py-1.5 text-right">
                <Input inputMode="numeric" aria-label={`Autorizado — ${l.tipo}`} title={`Limite: ${numero(l.limite)} (apague para restaurar)`}
                  value={autorizados[l.id] ?? ""} placeholder={String(l.limite)}
                  onChange={(e) => alterar(l.id, e.target.value)}
                  className="ml-auto h-8 w-24 text-right tabular-nums placeholder:text-foreground" />
              </td>
            </tr>
            {aberto && itens.map((item) => { const k = chaveItem(l.id, item.nome); return (
              <tr key={item.nome} className="border-b border-border/60 bg-muted/40 text-xs">
                <td className="py-1 pl-8 pr-3" colSpan={2}>
                  <span className="font-medium" title={item.inclui?.join(" + ")}>{item.nome}</span>
                  {item.guia && <span className="ml-2 text-muted-foreground">Guia Médico: {item.guia.join(" · ")}</span>}
                </td>
                <td className="px-3 py-0.5 text-right">
                  <Input inputMode="numeric" aria-label={`Quantidade — ${item.nome}`} value={itensQtd[k] ?? ""} placeholder={String(QUANTIDADE_PADRAO_ITEM[l.id])}
                    title={`Padrão: ${QUANTIDADE_PADRAO_ITEM[l.id]} (apague para restaurar)`}
                    onChange={(e) => alterarQtdItem(k, e.target.value)}
                    className="ml-auto h-7 w-24 text-right text-xs tabular-nums placeholder:text-foreground" />
                </td>
              </tr>
            ); })}
            {aberto && (() => { const s = somaItens(l.id, itensQtd); return (
              <tr className="border-b border-border bg-muted/40 text-xs font-semibold">
                <td className="py-1 pl-8 pr-3" colSpan={2}>Soma dos itens <span className="font-normal text-muted-foreground">({s.itens} itens{s.alterados ? `, ${s.alterados} alterado${s.alterados > 1 ? "s" : ""}` : ""})</span></td>
                <td className="px-3 py-1 text-right tabular-nums">{numero(s.soma)}</td>
              </tr>
            ); })()}
            </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td className="px-3 py-2">TOTAL</td>
            <td className="px-3 py-2 text-right tabular-nums">{numero(total.disponivel)}</td>
            <td className="px-3 py-2 text-right tabular-nums">{numero(total.autorizado)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
