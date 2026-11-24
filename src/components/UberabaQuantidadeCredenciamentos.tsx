import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { limiteItem, alterarLimiteItem, carregarLimitesItens, salvarLimitesItens, type CampoLimiteItem, type LimitesItens } from "@/lib/uberabaQuantidadeCredenciamentos";
import { QUANTIDADE_PADRAO_ITEM, alterarItem, carregarAutorizados, carregarQuantidadesItens, chaveItem, itensExibidos, salvarQuantidadesItens, somaItens, type QuantidadesItens, lerAutorizado, linhasQuantidadeCredenciamentos, salvarAutorizados, type AutorizadosCredenciamento, carregarValores, salvarValores, lerValor, replicarValorEspecialidades, ajusteTecnico, AJUSTE_TECNICO, type ValoresCredenciamento } from "@/lib/uberabaQuantidadeCredenciamentos";

const numero = (v: number) => v.toLocaleString("pt-BR");
const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const valorTexto = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Grid Credenciamento: Tipo Credenciado · Qtde. · Valor · Adesão (Qtde. × Valor); Qtde. (começa pelo Limite) e Valor editáveis, gravados neste navegador.
export default function UberabaQuantidadeCredenciamentos() {
  const [autorizados, setAutorizados] = useState<AutorizadosCredenciamento>(carregarAutorizados);
  const [valores, setValores] = useState<ValoresCredenciamento>(carregarValores);
  const [editandoValor, setEditandoValor] = useState<Record<string, string>>({});
  const { linhas, total } = linhasQuantidadeCredenciamentos(autorizados, valores);
  const alterarValor = (id: keyof ValoresCredenciamento, texto: string) => {
    const valor = lerValor(texto);
    if (valor === null) return;
    setEditandoValor((e) => ({ ...e, [id]: texto }));
    const proximo = { ...valores };
    if (valor === undefined) delete proximo[id]; else proximo[id] = valor;
    setValores(proximo);
    salvarValores(proximo);
  };
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const [itensQtd, setItensQtd] = useState<QuantidadesItens>(carregarQuantidadesItens);
  const [limitesItens, setLimitesItens] = useState<LimitesItens>(carregarLimitesItens);
  const algumAberto = linhas.some((l) => abertos[l.id]);
  const alterarLimite = (chave: string, campo: CampoLimiteItem, texto: string) => {
    const proximo = alterarLimiteItem(limitesItens, chave, campo, texto);
    if (!proximo) return;
    setLimitesItens(proximo);
    salvarLimitesItens(proximo);
  };
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
  const replicarValor = () => {
    const proximo = replicarValorEspecialidades(valores);
    setEditandoValor({});
    setValores(proximo);
    salvarValores(proximo);
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-left font-semibold">TIPO CREDENCIADO</th>
            <th className="px-3 py-2 text-right font-semibold">QTDE.</th>
            {algumAberto && <><th className="px-3 py-2 text-right font-semibold">MÍNIMO</th><th className="px-3 py-2 text-right font-semibold">MÁXIMO</th></>}
            <th className="px-3 py-2 text-right font-semibold">VALOR</th>
            <th className="px-3 py-2 text-right font-semibold">ADESÃO</th>
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
                <Button type="button" variant="ghost" onClick={() => setAbertos((a) => ({ ...a, [l.id]: !a[l.id] }))} aria-expanded={aberto}
                  aria-label={`${aberto ? "Recolher" : "Abrir"} ${l.tipo}`} className="h-auto justify-start gap-1 whitespace-normal p-0 text-left font-normal hover:bg-transparent hover:underline">
                  <Icone className="h-4 w-4 shrink-0" />{l.tipo}<span className="ml-1 text-xs text-muted-foreground">({itens.length})</span>
                </Button>
              </td>
              <td className="px-3 py-1.5 text-right">
                <Input inputMode="numeric" aria-label={`Qtde. — ${l.tipo}`} title={`Limite: ${numero(l.limite)} (apague para restaurar)`}
                  value={autorizados[l.id] ?? ""} placeholder={String(l.limite)}
                  onChange={(e) => alterar(l.id, e.target.value)}
                  className="ml-auto h-8 w-24 text-right tabular-nums placeholder:text-foreground" />
              </td>
              {algumAberto && <><td /><td /></>}
              <td className="px-3 py-1.5 text-right">
                <div className="flex items-center justify-end gap-1">
                {l.id === "medicos"
                  ? <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Replicar Valor de Especialidades nos demais" onClick={replicarValor}><Copy className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Replicar</TooltipContent></Tooltip>
                  : <span aria-hidden className="h-7 w-7 shrink-0" />}
                <Input inputMode="decimal" aria-label={`Valor — ${l.tipo}`} title="Valor por credenciado, em R$ (apague para restaurar)"
                  value={editandoValor[l.id] ?? (valores[l.id] !== undefined ? valorTexto(valores[l.id] ?? l.valor) : "")} placeholder={valorTexto(l.valor)}
                  onChange={(e) => alterarValor(l.id, e.target.value)}
                  onBlur={() => setEditandoValor((e) => { const p = { ...e }; delete p[l.id]; return p; })}
                  className="h-8 w-28 text-right tabular-nums placeholder:text-foreground" />
                </div>
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums" title={`${numero(l.autorizado)} × ${moeda(l.valor)}`}>{moeda(l.adesao)}</td>
            </tr>
            {aberto && itens.map((item) => { const k = chaveItem(l.id, item.nome); return (
              <tr key={item.nome} className="border-b border-border/60 bg-muted/40 text-xs">
                <td className="py-1 pl-8 pr-3" >
                  <span className="font-medium" title={item.inclui?.join(" + ")}>{item.nome}</span>
                </td>
                <td className="px-3 py-0.5 text-right">
                  <Input inputMode="numeric" aria-label={`Quantidade — ${item.nome}`} value={itensQtd[k] ?? ""} placeholder={String(QUANTIDADE_PADRAO_ITEM[l.id])}
                    title={`Padrão: ${QUANTIDADE_PADRAO_ITEM[l.id]} (apague para restaurar)`}
                    onChange={(e) => alterarQtdItem(k, e.target.value)}
                    className="ml-auto h-7 w-24 text-right text-xs tabular-nums placeholder:text-foreground" />
                </td>
                {(["minimo", "maximo"] as const).map((campo) => (
                  <td key={campo} className="px-3 py-0.5 text-right">
                    <Input inputMode="numeric" aria-label={`${campo === "minimo" ? "Mínimo" : "Máximo"} — ${item.nome}`} value={limitesItens[k]?.[campo] ?? ""}
                      placeholder={String(limiteItem(l.id, item.nome, campo, limitesItens, itensQtd) ?? "")}
                      onChange={(e) => alterarLimite(k, campo, e.target.value)}
                      className="ml-auto h-7 w-24 text-right text-xs tabular-nums placeholder:text-foreground" />
                  </td>
                ))}
                <td colSpan={2} />
              </tr>
            ); })}
            {aberto && (() => { const s = somaItens(l.id, itensQtd); const ajuste = ajusteTecnico(l.id, l.autorizado, itensQtd); return (<>
              {ajuste !== null && (
                <tr className="border-b border-border/60 bg-muted/40 text-xs">
                  <td className="py-1 pl-8 pr-3"><span className="font-medium" title={`Qtde. ${numero(l.autorizado)} − ${numero(s.soma)} dos itens`}>{AJUSTE_TECNICO}</span></td>
                  <td className={`px-3 py-1 text-right tabular-nums ${ajuste < 0 ? "text-destructive" : ""}`}>{numero(ajuste)}</td>
                  <td colSpan={4} />
                </tr>
              )}
              <tr className="border-b border-border bg-muted/40 text-xs font-semibold">
                <td className="py-1 pl-8 pr-3" >{ajuste !== null ? "Soma dos itens + ajuste técnico" : "Soma dos itens"} <span className="font-normal text-muted-foreground">({s.itens} itens{s.alterados ? `, ${s.alterados} alterado${s.alterados > 1 ? "s" : ""}` : ""})</span></td>
                <td className="px-3 py-1 text-right tabular-nums">{numero(s.soma + (ajuste ?? 0))}</td>
                <td colSpan={4} />
              </tr>
            </>); })()}
            </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td className="px-3 py-2">TOTAL</td>
            <td className="px-3 py-2 text-right tabular-nums">{numero(total.autorizado)}</td>
            {algumAberto && <><td /><td /></>}
            <td />
            <td className="px-3 py-2 text-right tabular-nums">{moeda(total.adesao)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
