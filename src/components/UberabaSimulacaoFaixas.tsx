import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { consolidarFaixasSimulacao, inteiroSimulacao as int, numeroSimulacao as num, percentualSimulacao as pct, type ResultadoSimulacao } from '@/lib/uberabaSimulacao';

export default function UberabaSimulacaoFaixas({ resultados }: { resultados: ResultadoSimulacao[] }) {
  const { linhas, total } = consolidarFaixasSimulacao(resultados);
  const cells = (l: typeof total) => <>
    <td className="p-3 text-center tabular-nums">{int(l.entradas)}</td>
    <td className="p-3 text-center tabular-nums">{pct(l.percentual)}</td>
    <td className="p-3 text-center tabular-nums">{num(l.tmm)}</td>
    <td className="p-3 text-center tabular-nums">{num(l.ticket)}</td>
  </>;
  return <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Resumo por faixa etária</DialogTitle>
      <DialogDescription>Enfermaria · Quatro modalidades consolidadas · Mensalidades das vidas vendidas, sem acumulação mensal</DialogDescription>
    </DialogHeader>
    <div className="overflow-x-auto"><table className="w-full text-sm [&_td]:border [&_td]:border-border [&_th]:border [&_th]:border-border">
      <thead className="bg-muted text-muted-foreground"><tr>
        <th className="p-3 text-left">Faixa etária</th><th className="p-3 text-center">Entradas</th><th className="p-3 text-center">%CART</th><th className="p-3 text-center">Soma TMM</th><th className="p-3 text-center">Ticket médio</th>
      </tr></thead>
      <tbody>{linhas.map(l => <tr key={l.faixa}><th scope="row" className="p-3 text-left font-normal">{l.faixa}</th>{cells(l)}</tr>)}</tbody>
      <tfoot className="bg-secondary font-semibold text-primary"><tr><th scope="row" className="p-3 text-left">Total</th>{cells(total)}</tr></tfoot>
    </table></div>
  </DialogContent>;
}